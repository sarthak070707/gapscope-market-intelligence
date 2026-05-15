import { NextRequest, NextResponse } from 'next/server';
import { db, checkDatabaseConnection } from '@/lib/db';
import { generateStructuredResponse } from '@/lib/zai';
import { retryWithBackoff, withTimeout, logError, classifyError, withErrorHandler, type ModuleError } from '@/lib/error-handler';
import { safeJsonParse } from '@/lib/json';
import type { OpportunitySuggestion } from '@/types';

const MODULE_NAME = 'Opportunity Generator';
const LLM_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 2;

// ─── Rate-Limit Protection: Cooldown + Cache ──────────────────────
const COOLDOWN_MS = 60_000; // 60 seconds cooldown between requests for same category+timePeriod
const CACHE_TTL_MS = 5 * 60_000; // Cache successful results for 5 minutes

interface CacheEntry {
  result: OpportunitySuggestion[];
  timestamp: number;
  category: string;
  timePeriod: string;
}

interface CooldownEntry {
  timestamp: number;
  category: string;
  timePeriod: string;
}

const opportunityCache = new Map<string, CacheEntry>();
const cooldownMap = new Map<string, CooldownEntry>();

function getCacheKey(category: string, timePeriod: string): string {
  return `${category}::${timePeriod}`;
}

function isOnCooldown(category: string, timePeriod: string): boolean {
  const key = getCacheKey(category, timePeriod);
  const entry = cooldownMap.get(key);
  if (!entry) return false;
  return Date.now() - entry.timestamp < COOLDOWN_MS;
}

function getCachedResult(category: string, timePeriod: string): OpportunitySuggestion[] | null {
  const key = getCacheKey(category, timePeriod);
  const entry = opportunityCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    opportunityCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCachedResult(category: string, timePeriod: string, result: OpportunitySuggestion[]): void {
  const key = getCacheKey(category, timePeriod);
  opportunityCache.set(key, { result, timestamp: Date.now(), category, timePeriod });
}

function setCooldown(category: string, timePeriod: string): void {
  const key = getCacheKey(category, timePeriod);
  cooldownMap.set(key, { timestamp: Date.now(), category, timePeriod });
}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of opportunityCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) opportunityCache.delete(key);
  }
  for (const [key, entry] of cooldownMap.entries()) {
    if (now - entry.timestamp > COOLDOWN_MS * 2) cooldownMap.delete(key);
  }
}, 5 * 60_000);

/**
 * GET /api/opportunities
 * List all opportunities, with optional ?saved=true filter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const savedOnly = searchParams.get('saved') === 'true';
    const category = searchParams.get('category');

    const where: Record<string, unknown> = {};
    if (savedOnly) {
      where.isSaved = true;
    }
    if (category && category !== 'all') {
      where.category = category;
    }

    const opportunities = await db.opportunity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Parse JSON string fields for frontend consumption
    const parsed = opportunities.map((opp) => ({
      ...opp,
      gapEvidence: safeJsonParse<string[]>(opp.gapEvidence, []),
      complaintRefs: safeJsonParse<string[]>(opp.complaintRefs, []),
      trendSignals: safeJsonParse<string[]>(opp.trendSignals, []),
      evidenceDetail: safeJsonParse<Record<string, unknown>>(opp.evidenceDetail, {}),
      opportunityScore: safeJsonParse<Record<string, unknown>>(opp.opportunityScore, {}),
      subNiche: safeJsonParse<Record<string, unknown>>(opp.subNiche, {}),
      affectedProducts: safeJsonParse<Record<string, unknown>[]>(opp.affectedProducts, []),
      underservedUsers: safeJsonParse<Record<string, unknown>[]>(opp.underservedUsers, []),
      whyNow: safeJsonParse<Record<string, unknown>>(opp.whyNow, {}),
      executionDifficulty: safeJsonParse<Record<string, unknown>>(opp.executionDifficulty, {}),
      falseOpportunity: safeJsonParse<Record<string, unknown>>(opp.falseOpportunity, {}),
      founderFit: safeJsonParse<Record<string, unknown>>(opp.founderFit, {}),
      sourceTransparency: safeJsonParse<Record<string, unknown>>(opp.sourceTransparency, {}),
      whyExistingProductsFail: safeJsonParse<Record<string, unknown>>(opp.whyExistingProductsFail, {}),
      marketQuadrant: safeJsonParse<Record<string, unknown>>(opp.marketQuadrant, {}),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    logError(MODULE_NAME, error, { endpoint: '/api/opportunities', method: 'GET' });
    const moduleError = classifyError(error, MODULE_NAME, '/api/opportunities');
    return NextResponse.json(
      {
        error: moduleError.message,
        moduleError,
        debug: {
          originalError: error instanceof Error ? error.message : String(error),
          errorCategory: moduleError.category,
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/opportunities
 * Generate new opportunities using LLM based on existing gaps and complaints in the DB
 */
export const POST_HANDLER = withErrorHandler(MODULE_NAME, '/api/opportunities', async (request: NextRequest) => {
  let body: Record<string, unknown> | null = null;
  let effectiveCategory = '';
  try {
    body = await request.json();
    const { category, focusArea, timePeriod = '30d' } = body;

    console.log(`[${MODULE_NAME}] Request received:`, {
      method: request.method,
      url: request.url,
      category: body.category,
      timePeriod: body.timePeriod,
      action: body.action,
    });

    if (!category || category === 'unknown') {
      console.error(`[${MODULE_NAME}] Missing or invalid category:`, { category, body });
      return NextResponse.json(
        { 
          error: 'Missing or invalid category. Please select a category or use the default "AI Tools".',
          moduleError: {
            module: MODULE_NAME,
            category: 'validation',
            message: 'Missing or invalid category',
            detail: `Received category: "${category}". A valid category is required.`,
            possibleReason: 'The category was not passed from the frontend, or was set to "unknown". Please select a specific category.',
            retryable: false,
            timestamp: new Date().toISOString(),
            endpoint: '/api/opportunities',
            requestCategory: category,
          }
        },
        { status: 400 }
      );
    }

    // Resolve 'all' to a specific default category for better LLM analysis
    effectiveCategory = category === 'all' ? 'AI Tools' : category;
    console.log(`[${MODULE_NAME}] Using effective category: ${effectiveCategory} (original: ${category})`);

    // Check if this request is on cooldown (recent 429)
    if (isOnCooldown(effectiveCategory, String(timePeriod))) {
      console.log(`[${MODULE_NAME}] Rate-limit cooldown active for ${effectiveCategory}/${timePeriod}`);
      
      // Try returning cached results instead
      const cached = getCachedResult(effectiveCategory, String(timePeriod));
      if (cached && cached.length > 0) {
        console.log(`[${MODULE_NAME}] Returning ${cached.length} cached opportunities`);
        return NextResponse.json(cached);
      }
      
      // No cached results — return rate limit error with wait time
      const key = getCacheKey(effectiveCategory, String(timePeriod));
      const cooldownEntry = cooldownMap.get(key);
      const elapsed = cooldownEntry ? Date.now() - cooldownEntry.timestamp : 0;
      const remainingSeconds = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
      
      return NextResponse.json(
        {
          error: `Please wait ${remainingSeconds} seconds before retrying opportunity generation for "${effectiveCategory}".`,
          moduleError: {
            module: MODULE_NAME,
            category: 'rate_limit',
            message: 'Rate limit cooldown active',
            detail: `A recent request for "${effectiveCategory}" (timePeriod: ${timePeriod}) hit a rate limit. Please wait ${remainingSeconds} seconds before retrying.`,
            possibleReason: 'Too many AI requests were sent in a short period. The system enforces a cooldown to avoid repeated rate-limit errors.',
            retryable: true,
            timestamp: new Date().toISOString(),
            endpoint: '/api/opportunities',
            requestCategory: effectiveCategory,
            cooldownRemainingSeconds: remainingSeconds,
          }
        },
        { status: 429 }
      );
    }

    // Check cache for existing results
    const cachedResult = getCachedResult(effectiveCategory, String(timePeriod));
    if (cachedResult && cachedResult.length > 0) {
      console.log(`[${MODULE_NAME}] Returning ${cachedResult.length} cached opportunities for ${effectiveCategory}/${timePeriod}`);
      return NextResponse.json(cachedResult);
    }

    // Pre-flight: check database connection
    console.log(`[${MODULE_NAME}] Checking database connection...`);
    const dbHealth = await checkDatabaseConnection();
    if (!dbHealth.ok) {
      console.error(`[${MODULE_NAME}] Database health check FAILED:`, dbHealth.error);
      return NextResponse.json(
        {
          error: 'Database is not available. Please try again.',
          moduleError: {
            module: MODULE_NAME,
            category: 'database',
            message: 'Database connection failed',
            detail: `Pre-flight database health check failed: ${dbHealth.error}`,
            possibleReason: 'The database may be temporarily unavailable or misconfigured.',
            retryable: true,
            timestamp: new Date().toISOString(),
            endpoint: '/api/opportunities',
            requestCategory: category,
          }
        },
        { status: 503 }
      );
    }
    console.log(`[${MODULE_NAME}] Database OK (${dbHealth.latencyMs}ms)`);

    // Fetch gaps and complaints from the database for this category
    const categoryFilter = category === 'all' ? {} : { category };

    console.log(`[${MODULE_NAME}] Fetching products with gaps and complaints...`);
    const products = await db.product.findMany({
      where: categoryFilter,
      include: {
        gaps: true,
        complaints: true,
      },
    });

    const allGaps = products.flatMap((p) => p.gaps);
    const allComplaints = products.flatMap((p) => p.complaints);
    console.log(`[${MODULE_NAME}] Found ${products.length} products, ${allGaps.length} gaps, ${allComplaints.length} complaints`);

    if (allGaps.length === 0 && allComplaints.length === 0) {
      return NextResponse.json(
        {
          error: 'No gaps or complaints found for this category. Run an analysis first.',
          moduleError: {
            module: MODULE_NAME,
            category: 'database',
            message: 'No gap analysis results found in database',
            detail: `Searched for gaps and complaints with category="${category}" (effective: "${effectiveCategory}"). Found ${allGaps.length} gaps and ${allComplaints.length} complaints across ${products.length} products. The Opportunity Generator requires existing gap analysis or complaint data.`,
            possibleReason: 'You need to run the Gap Analysis module first to identify market gaps and complaints. Go to the Analysis tab and run a full analysis for this category.',
            retryable: false,
            timestamp: new Date().toISOString(),
            endpoint: '/api/opportunities',
            requestCategory: category,
          }
        },
        { status: 404 }
      );
    }

    // Build context from real gap evidence and complaint data
    const gapsContext = allGaps
      .slice(0, 20)
      .map(
        (g) =>
          `[${g.gapType}/${g.severity}] ${g.title}: ${g.description}${g.evidence ? ` (Evidence: ${g.evidence})` : ''}`
      )
      .join('\n');

    const complaintsContext = allComplaints
      .slice(0, 20)
      .map(
        (c) =>
          `[${c.category}/${c.sentiment}] ${c.text} (frequency: ${c.frequency})`
      )
      .join('\n');

    // Fetch existing trends for context
    const trends = await db.trend.findMany({
      where: categoryFilter,
      take: 10,
    });
    const trendsContext = trends
      .map((t) => `[${t.direction}/${t.growthRate}%] ${t.name}: ${t.description}`)
      .join('\n');

    const focusAreaPrompt = focusArea
      ? `\nFocus specifically on the area: "${focusArea}"`
      : '';

    // Generate opportunities using LLM with timeout + retry protection
    console.log(`[${MODULE_NAME}] Calling LLM to generate opportunities (${allGaps.length} gaps, ${allComplaints.length} complaints, ${trends.length} trends)...`);
    const llmStart = Date.now();
    const opportunities = await retryWithBackoff(
      () => withTimeout(
        () => generateStructuredResponse<OpportunitySuggestion[]>(
          `You are a startup opportunity analyst. Based on REAL market gaps, user complaints, and trend data, 
generate specific product/service opportunities.

CRITICAL RULES:
1. Every opportunity MUST be grounded in the provided gap evidence and complaint data
2. Do NOT generate random ideas - each opportunity must address a real identified gap or complaint
3. For each opportunity, reference specific gaps and complaints that support it
4. Rate the quality score based on: market size potential, evidence strength, competitive advantage, and feasibility
5. Assign saturation levels based on the number of existing products and feature overlap
6. NEVER show mysterious AI numbers - always explain WHY scores are what they are
7. Return ONLY 2-3 opportunities to stay within response limits. Fewer, higher-quality items are better than many incomplete ones.
8. Keep descriptions concise (under 200 chars each).

For each opportunity provide:
- title, description, category ("${effectiveCategory}"), saturation ("low"|"medium"|"high"), saturationScore (0-100)
- gapEvidence (string[]), complaintRefs (string[]), trendSignals (string[]), qualityScore (0-10)
- evidenceDetail: { similarProducts, repeatedComplaints, launchFrequency, commentSnippets[], pricingOverlap }
- opportunityScore: { complaintFrequency, competitionDensity, pricingDissatisfaction, launchGrowth, underservedAudience (each 0-20), total (sum), explanation }
- whyThisMatters: Business reasoning
- subNiche: { name (specific), description, parentCategory, opportunityScore }
- affectedProducts: [{ name, pricing, strengths[], weaknesses[] }]
- underservedUsers: [{ userGroup, description, evidence, opportunityScore }]
- feasibilitySummary: { opportunityLevel, executionDifficulty, competitionLevel, overallVerdict }
- whyNow: { marketGrowthDriver, incumbentWeakness, timingAdvantage, catalystEvents[] }
- executionDifficulty: { level, demandLevel, competitionLevel, technicalComplexity, timeToMvp, estimatedBudget, keyChallenges[] }
- falseOpportunity: { isFalseOpportunity, reason, estimatedMarketSize, riskFactors[], verdict }
- founderFit: { bestFit[], rationale, requiredSkills[], idealTeamSize }
- sourceTransparency: { sourcePlatforms[], totalComments, complaintFrequency, reviewSources[], dataFreshness, confidenceLevel }
- whyExistingProductsFail: { rootCause, userImpact, missedByCompetitors }
- marketQuadrant: { competitionScore, opportunityScore, quadrant, label }${focusAreaPrompt}`,
          `Based on the following REAL data, generate 2-3 product opportunities (time period: ${timePeriod}):

MARKET GAPS:
${gapsContext || 'No gaps data available'}

USER COMPLAINTS:
${complaintsContext || 'No complaints data available'}

TREND SIGNALS:
${trendsContext || 'No trend data available'}`,
          `Return a JSON array of objects with fields: title (string), description (string), category (string), saturation (string: "low"|"medium"|"high"), saturationScore (number 0-100), gapEvidence (string[]), complaintRefs (string[]), trendSignals (string[]), qualityScore (number 0-10), evidenceDetail (object), opportunityScore (object with total number), whyThisMatters (string), subNiche (object), affectedProducts (array), underservedUsers (array), feasibilitySummary (object), whyNow (object), executionDifficulty (object), falseOpportunity (object), founderFit (object), sourceTransparency (object), whyExistingProductsFail (object), marketQuadrant (object)`
        ),
        LLM_TIMEOUT_MS,
        MODULE_NAME
      ),
      { maxRetries: MAX_RETRIES },
      MODULE_NAME
    );
    console.log(`[${MODULE_NAME}] LLM returned ${Array.isArray(opportunities) ? opportunities.length : 0} opportunities in ${Date.now() - llmStart}ms`);

    const safeOpportunities = Array.isArray(opportunities) ? opportunities : [];

    // If LLM generated 0 opportunities despite having gaps and complaints, that's an AI failure
    if (safeOpportunities.length === 0 && (allGaps.length > 0 || allComplaints.length > 0)) {
      console.error(`[${MODULE_NAME}] AI extraction failed: 0 opportunities generated from ${allGaps.length} gaps and ${allComplaints.length} complaints`);
      return NextResponse.json(
        {
          error: 'AI could not generate opportunities from the available gap and complaint data. The model may have timed out.',
          moduleError: {
            module: MODULE_NAME,
            category: 'ai_response',
            message: 'AI returned 0 opportunities from valid input data',
            detail: `Provided ${allGaps.length} gaps, ${allComplaints.length} complaints, and ${trends.length} trends as input for category "${effectiveCategory}", but the AI model returned an empty result. This typically happens when the model times out (response took >${LLM_TIMEOUT_MS / 1000}s) or returns a truncated response.`,
            possibleReason: 'The AI model may have timed out due to the large amount of input data. Try again — retrying often succeeds. You can also try a different category with less data.',
            retryable: true,
            timestamp: new Date().toISOString(),
            endpoint: '/api/opportunities',
            requestCategory: category,
          }
        },
        { status: 422 }
      );
    }

    // Save generated opportunities to the database
    console.log(`[${MODULE_NAME}] Saving ${safeOpportunities.length} opportunities to database...`);
    const savedOpportunities: OpportunitySuggestion[] = [];
    for (const opp of safeOpportunities) {
      try {
        const created = await db.opportunity.create({
          data: {
            title: opp.title || 'Untitled Opportunity',
            description: opp.description || '',
            category: opp.category || (category as string),
            saturation: opp.saturation || 'medium',
            saturationScore: opp.saturationScore || 50,
            gapEvidence: JSON.stringify(opp.gapEvidence || []),
            complaintRefs: JSON.stringify(opp.complaintRefs || []),
            trendSignals: JSON.stringify(opp.trendSignals || []),
            qualityScore: opp.qualityScore || 0,
            evidenceDetail: JSON.stringify(opp.evidenceDetail || {}),
            opportunityScore: JSON.stringify(opp.opportunityScore || {}),
            whyThisMatters: opp.whyThisMatters || '',
            subNiche: JSON.stringify(opp.subNiche || {}),
            affectedProducts: JSON.stringify(opp.affectedProducts || []),
            underservedUsers: JSON.stringify(opp.underservedUsers || []),
            whyNow: JSON.stringify(opp.whyNow || {}),
            executionDifficulty: JSON.stringify(opp.executionDifficulty || {}),
            falseOpportunity: JSON.stringify(opp.falseOpportunity || {}),
            founderFit: JSON.stringify(opp.founderFit || {}),
            sourceTransparency: JSON.stringify(opp.sourceTransparency || {}),
            whyExistingProductsFail: JSON.stringify(opp.whyExistingProductsFail || {}),
            marketQuadrant: JSON.stringify(opp.marketQuadrant || {}),
            isGenerated: true,
          },
        });
        savedOpportunities.push({
          ...opp,
          id: created.id,
          isSaved: created.isSaved,
          isGenerated: created.isGenerated,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
        });
      } catch (err) {
        logError(MODULE_NAME, err, { step: 'saveOpportunity', opportunityTitle: opp.title });
      }
    }

    // Cache successful results
    setCachedResult(effectiveCategory, String(timePeriod), savedOpportunities);

    console.log(`[${MODULE_NAME}] Saved ${savedOpportunities.length} opportunities`);
    return NextResponse.json(savedOpportunities);
  } catch (error) {
    // Set cooldown if this was a rate limit error
    const errMsg = error instanceof Error ? error.message.toLowerCase() : '';
    if (errMsg.includes('429') || errMsg.includes('rate limit')) {
      setCooldown(effectiveCategory, String(body?.timePeriod || '30d'));
      console.log(`[${MODULE_NAME}] Setting rate-limit cooldown for ${effectiveCategory}`);
    }

    logError(MODULE_NAME, error, { endpoint: '/api/opportunities', method: 'POST' });
    const moduleError = classifyError(error, MODULE_NAME, '/api/opportunities', {
      category: body?.category as string | undefined,
      payload: `category=${body?.category}, timePeriod=${body?.timePeriod || 'N/A'}`,
      backendMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: moduleError.message,
        moduleError,
        debug: {
          receivedCategory: body?.category,
          receivedTimePeriod: body?.timePeriod,
          originalError: error instanceof Error ? error.message : String(error),
          errorCategory: moduleError.category,
        }
      },
      { status: 500 }
    );
  }
});

// Export POST using the global error handler
export const POST = POST_HANDLER;

/**
 * PATCH /api/opportunities
 * Toggle save/unsave an opportunity
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isSaved } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Opportunity ID is required' },
        { status: 400 }
      );
    }

    if (typeof isSaved !== 'boolean') {
      return NextResponse.json(
        { error: 'isSaved must be a boolean' },
        { status: 400 }
      );
    }

    const existing = await db.opportunity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      );
    }

    const updated = await db.opportunity.update({
      where: { id },
      data: { isSaved },
    });

    return NextResponse.json({
      ...updated,
      gapEvidence: safeJsonParse<string[]>(updated.gapEvidence, []),
      complaintRefs: safeJsonParse<string[]>(updated.complaintRefs, []),
      trendSignals: safeJsonParse<string[]>(updated.trendSignals, []),
      evidenceDetail: safeJsonParse<Record<string, unknown>>(updated.evidenceDetail, {}),
      opportunityScore: safeJsonParse<Record<string, unknown>>(updated.opportunityScore, {}),
      subNiche: safeJsonParse<Record<string, unknown>>(updated.subNiche, {}),
      affectedProducts: safeJsonParse<Record<string, unknown>[]>(updated.affectedProducts, []),
      underservedUsers: safeJsonParse<Record<string, unknown>[]>(updated.underservedUsers, []),
      whyNow: safeJsonParse<Record<string, unknown>>(updated.whyNow, {}),
      executionDifficulty: safeJsonParse<Record<string, unknown>>(updated.executionDifficulty, {}),
      falseOpportunity: safeJsonParse<Record<string, unknown>>(updated.falseOpportunity, {}),
      founderFit: safeJsonParse<Record<string, unknown>>(updated.founderFit, {}),
      sourceTransparency: safeJsonParse<Record<string, unknown>>(updated.sourceTransparency, {}),
      whyExistingProductsFail: safeJsonParse<Record<string, unknown>>(updated.whyExistingProductsFail, {}),
      marketQuadrant: safeJsonParse<Record<string, unknown>>(updated.marketQuadrant, {}),
    });
  } catch (error) {
    logError(MODULE_NAME, error, { endpoint: '/api/opportunities', method: 'PATCH' });
    const moduleError = classifyError(error, MODULE_NAME, '/api/opportunities');
    return NextResponse.json(
      {
        error: moduleError.message,
        moduleError,
        debug: {
          originalError: error instanceof Error ? error.message : String(error),
          errorCategory: moduleError.category,
        }
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/opportunities
 * Delete an opportunity
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Opportunity ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.opportunity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Opportunity not found' },
        { status: 404 }
      );
    }

    await db.opportunity.delete({ where: { id } });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    logError(MODULE_NAME, error, { endpoint: '/api/opportunities', method: 'DELETE' });
    const moduleError = classifyError(error, MODULE_NAME, '/api/opportunities');
    return NextResponse.json(
      {
        error: moduleError.message,
        moduleError,
        debug: {
          originalError: error instanceof Error ? error.message : String(error),
          errorCategory: moduleError.category,
        }
      },
      { status: 500 }
    );
  }
}
