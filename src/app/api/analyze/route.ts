import { NextRequest, NextResponse } from 'next/server';
import { db, checkDatabaseConnection } from '@/lib/db';
import { generateStructuredResponse } from '@/lib/zai';
import { safeJsonParse } from '@/lib/json';
import { retryWithBackoff, withTimeout, logError, classifyError, withErrorHandler } from '@/lib/error-handler';
import type { GapAnalysis, MarketSaturation, ComplaintAnalysis, ComplaintCluster, SubNiche, ProductReference } from '@/types';

const MODULE_NAME = 'Gap Analysis';
const LLM_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 1; // Reduce from 2 to 1 to minimize rate limit impact
const INTER_CALL_DELAY_MS = 4000; // 4s pause between LLM calls to avoid rate limits

// ─── Stage Logger Helper ──────────────────────────────────────────
// Creates a step-by-step log for each major stage with BEFORE/AFTER markers
function stageLog(stage: string, event: 'START' | 'END' | 'ERROR' | 'INFO', detail?: string, data?: Record<string, unknown>) {
  const prefix = event === 'START' ? '▶' : event === 'END' ? '✔' : event === 'ERROR' ? '✖' : '●';
  const msg = `[${MODULE_NAME}] ${prefix} [${stage}]${detail ? ` ${detail}` : ''}`;
  if (data) {
    console.log(msg, JSON.stringify(data));
  } else {
    console.log(msg);
  }
}

export const POST = withErrorHandler(MODULE_NAME, '/api/analyze', async (request: NextRequest) => {
  let body: Record<string, unknown> | null = null;
  try {
    // ═══ STAGE 1: Request received ═══
    body = await request.json();
    const { category, analysisType = 'full', timePeriod = '30d' } = body;
    stageLog('REQUEST', 'START', 'Request received', {
      category: String(body.category || 'MISSING'),
      analysisType: String(body.analysisType || 'full'),
      timePeriod: String(body.timePeriod || '30d'),
    });

    if (!category || category === 'unknown') {
      stageLog('REQUEST', 'ERROR', `Invalid category: "${category}"`);
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
            endpoint: '/api/analyze',
            requestCategory: category,
          }
        },
        { status: 400 }
      );
    }

    // Resolve 'all' to a specific default category for better LLM analysis
    const effectiveCategory = category === 'all' ? 'AI Tools' : category;
    stageLog('REQUEST', 'INFO', `Effective category: ${effectiveCategory} (original: ${category})`);

    // ═══ STAGE 2: Database health check ═══
    stageLog('DB_HEALTH', 'START', 'Checking database connection...');
    let dbHealth: { ok: boolean; error?: string; latencyMs?: number };
    try {
      dbHealth = await checkDatabaseConnection();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stageLog('DB_HEALTH', 'ERROR', `Exception during health check: ${msg}`);
      return NextResponse.json(
        {
          error: 'Database health check threw an exception.',
          moduleError: classifyError(err, MODULE_NAME, '/api/analyze', {
            category: String(category),
            backendMessage: msg,
          }),
        },
        { status: 503 }
      );
    }
    if (!dbHealth.ok) {
      stageLog('DB_HEALTH', 'ERROR', `Database unavailable: ${dbHealth.error}`);
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
            endpoint: '/api/analyze',
            requestCategory: String(category),
          }
        },
        { status: 503 }
      );
    }
    stageLog('DB_HEALTH', 'END', `Database OK (${dbHealth.latencyMs}ms)`);

    // ═══ STAGE 3: Query products from DB ═══
    const whereClause: Record<string, unknown> = category === 'all' ? {} : { category };
    
    if (timePeriod && timePeriod !== '90d') {
      const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
      const days = daysMap[timePeriod as string] || 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      whereClause.launchDate = { gte: cutoff.toISOString().split('T')[0] };
    }

    stageLog('DB_QUERY', 'START', 'Querying products with filter', { whereClause });
    let products: Awaited<ReturnType<typeof db.product.findMany>> | null = null;
    try {
      products = await db.product.findMany({
        where: whereClause,
        include: { gaps: true, complaints: true },
      });
      stageLog('DB_QUERY', 'END', `Found ${products?.length ?? 0} products with time filter`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stageLog('DB_QUERY', 'ERROR', `Product query failed: ${msg}`);
      // Re-throw with better context for classifyError
      throw new Error(`Database query for products failed: ${msg}`);
    }

    // If no products with time filter, fall back to all products in category
    let effectiveProducts = products;
    if (!products || products.length === 0) {
      stageLog('DB_QUERY', 'INFO', 'No products with time filter, falling back to all products in category');
      try {
        effectiveProducts = await db.product.findMany({
          where: category === 'all' ? {} : { category },
          include: { gaps: true, complaints: true },
        });
        stageLog('DB_QUERY', 'END', `Found ${effectiveProducts?.length ?? 0} products without time filter`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        stageLog('DB_QUERY', 'ERROR', `Fallback product query failed: ${msg}`);
        throw new Error(`Database fallback query for products failed: ${msg}`);
      }
    }

    // Guard against null/undefined effectiveProducts
    if (!effectiveProducts || !Array.isArray(effectiveProducts)) {
      stageLog('DB_QUERY', 'ERROR', 'effectiveProducts is null or not an array');
      throw new Error('Database returned invalid product data (null or non-array). This may indicate a schema mismatch or database corruption.');
    }

    if (effectiveProducts.length === 0) {
      stageLog('DB_QUERY', 'ERROR', 'No products found for this category');
      return NextResponse.json(
        {
          error: 'No products found for this category. Run a scan first to populate the database.',
          moduleError: {
            module: MODULE_NAME,
            category: 'database',
            message: 'No scanned products found in database',
            detail: `Searched for products with category="${category}" (effective: "${effectiveCategory}") and timePeriod="${timePeriod}". The database has 0 products matching these filters. The Gap Analysis module requires scanned products to analyze.`,
            possibleReason: 'You need to run the Product Hunt Scanner first to populate the database with products. Go to the Scanner tab and run a scan for this category.',
            retryable: false,
            timestamp: new Date().toISOString(),
            endpoint: '/api/analyze',
            requestCategory: String(category),
          }
        },
        { status: 404 }
      );
    }

    // ═══ STAGE 4: Prepare product summaries ═══
    stageLog('PREPARE', 'START', `Preparing product summaries from ${effectiveProducts.length} products`);
    let productSummaries: Array<{
      id: string; name: string; tagline: string; description: string;
      features: string[]; pricing: string; upvotes: number; reviewScore: number;
      comments: string[]; category: string;
    }>;
    try {
      productSummaries = effectiveProducts.map((p) => ({
        id: p.id || '',
        name: p.name || '',
        tagline: p.tagline || '',
        description: p.description || '',
        features: safeJsonParse<string[]>(p.features, []),
        pricing: p.pricing || 'Unknown',
        upvotes: p.upvotes ?? 0,
        reviewScore: p.reviewScore ?? 0,
        comments: safeJsonParse<string[]>(p.comments, []),
        category: p.category || '',
      }));
      stageLog('PREPARE', 'END', `Prepared ${productSummaries.length} product summaries`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stageLog('PREPARE', 'ERROR', `Failed to prepare product summaries: ${msg}`);
      throw new Error(`Failed to prepare product summaries for LLM analysis: ${msg}`);
    }

    let productsContext: string;
    try {
      productsContext = JSON.stringify(productSummaries, null, 2);
      stageLog('PREPARE', 'INFO', `Products context: ${productsContext.length} chars`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stageLog('PREPARE', 'ERROR', `JSON.stringify failed for productsContext: ${msg}`);
      throw new Error(`Failed to serialize product data for LLM analysis: ${msg}`);
    }

    // ═══ Initialize result structure ═══
    const result: {
      gaps: GapAnalysis[];
      saturation: MarketSaturation[];
      complaints: ComplaintAnalysis[];
      complaintClusters: ComplaintCluster[];
      partialErrors?: Record<string, unknown>;
    } = {
      gaps: [],
      saturation: [],
      complaints: [],
      complaintClusters: [],
    };

    // Track partial errors so one failing analysis doesn't break the others
    const partialErrors: Record<string, unknown> = {};

    // ═══ STAGE 5: Gaps analysis ═══
    if (analysisType === 'gaps' || analysisType === 'full') {
      stageLog('GAPS', 'START', 'Starting gaps analysis');
      try {
        result.gaps = await analyzeGaps(productsContext, effectiveProducts, timePeriod as string, effectiveCategory);
        stageLog('GAPS', 'END', `${result.gaps.length} gaps found`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        stageLog('GAPS', 'ERROR', `Gaps analysis FAILED: ${msg}`);
        logError(MODULE_NAME, error, { endpoint: '/api/analyze', step: 'analyzeGaps', category: String(category) });
        const moduleError = classifyError(error, MODULE_NAME, '/api/analyze', {
          category: String(body.category),
          payload: `category=${body.category}, timePeriod=${body.timePeriod || 'N/A'}`,
          backendMessage: msg,
        });
        partialErrors.gaps = moduleError;
      }
      // Delay between LLM calls to avoid rate limits
      stageLog('DELAY', 'INFO', `Waiting ${INTER_CALL_DELAY_MS}ms before next LLM call...`);
      await new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));
    }

    // ═══ STAGE 6: Saturation analysis ═══
    if (analysisType === 'saturation' || analysisType === 'full') {
      stageLog('SATURATION', 'START', 'Starting saturation analysis');
      try {
        result.saturation = await analyzeSaturation(productsContext, category as string, effectiveProducts, effectiveCategory);
        stageLog('SATURATION', 'END', `${result.saturation.length} categories analyzed`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        stageLog('SATURATION', 'ERROR', `Saturation analysis FAILED: ${msg}`);
        logError(MODULE_NAME, error, { endpoint: '/api/analyze', step: 'analyzeSaturation', category: String(category) });
        const moduleError = classifyError(error, MODULE_NAME, '/api/analyze', {
          category: String(body.category),
          payload: `category=${body.category}, timePeriod=${body.timePeriod || 'N/A'}`,
          backendMessage: msg,
        });
        partialErrors.saturation = moduleError;
      }
      // Delay between LLM calls to avoid rate limits
      stageLog('DELAY', 'INFO', `Waiting ${INTER_CALL_DELAY_MS}ms before next LLM call...`);
      await new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));
    }

    // ═══ STAGE 7: Complaints analysis ═══
    if (analysisType === 'complaints' || analysisType === 'full') {
      stageLog('COMPLAINTS', 'START', 'Starting complaints analysis');
      try {
        const complaintResult = await analyzeComplaints(productsContext, effectiveProducts, effectiveCategory);
        // Guard: validate complaintResult shape before destructuring
        if (complaintResult && typeof complaintResult === 'object') {
          result.complaints = Array.isArray(complaintResult.complaints) ? complaintResult.complaints : [];
          result.complaintClusters = Array.isArray(complaintResult.clusters) ? complaintResult.clusters : [];
        } else {
          stageLog('COMPLAINTS', 'ERROR', `analyzeComplaints returned unexpected shape: ${typeof complaintResult}`);
          result.complaints = [];
          result.complaintClusters = [];
        }
        stageLog('COMPLAINTS', 'END', `${result.complaints.length} complaints, ${result.complaintClusters.length} clusters`);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        stageLog('COMPLAINTS', 'ERROR', `Complaints analysis FAILED: ${msg}`);
        logError(MODULE_NAME, error, { endpoint: '/api/analyze', step: 'analyzeComplaints', category: String(category) });
        const moduleError = classifyError(error, MODULE_NAME, '/api/analyze', {
          category: String(body.category),
          payload: `category=${body.category}, timePeriod=${body.timePeriod || 'N/A'}`,
          backendMessage: msg,
        });
        partialErrors.complaints = moduleError;
      }
    }

    // ═══ STAGE 8: Final response assembly ═══
    // Attach partial errors if any
    if (Object.keys(partialErrors).length > 0) {
      result.partialErrors = partialErrors;
      stageLog('RESPONSE', 'INFO', `Partial errors attached: ${Object.keys(partialErrors).join(', ')}`);
    }

    // If ALL sub-analyses failed, return a structured error instead of empty 200
    const allFailed = (analysisType === 'full' || analysisType === 'gaps') && !result.gaps.length
      && (analysisType === 'full' || analysisType === 'saturation') && !result.saturation.length
      && (analysisType === 'full' || analysisType === 'complaints') && !result.complaints.length
      && Object.keys(partialErrors).length > 0;

    if (allFailed) {
      stageLog('RESPONSE', 'ERROR', 'All sub-analyses failed — returning structured error');
      // Use the first partial error as the primary error, but include all
      const firstError = Object.values(partialErrors)[0] as Record<string, unknown>;
      const primaryError = firstError && typeof firstError === 'object' && 'category' in firstError
        ? firstError
        : { category: 'api', message: 'All analysis stages failed', detail: 'Every sub-analysis (gaps, saturation, complaints) encountered errors.' };

      return NextResponse.json(
        {
          error: primaryError.message || 'All analysis stages failed',
          moduleError: {
            module: MODULE_NAME,
            category: (primaryError.category as string) || 'api',
            message: String(primaryError.message || 'All analysis stages failed'),
            detail: `All sub-analyses failed. Partial errors: ${Object.keys(partialErrors).join(', ')}. The first error was: ${primaryError.detail || primaryError.message || 'unknown'}`,
            possibleReason: 'This is likely due to rate limiting or API issues. Wait 60 seconds and try again.',
            retryable: true,
            timestamp: new Date().toISOString(),
            endpoint: '/api/analyze',
            requestCategory: String(category),
            requestPayload: `category=${category}, analysisType=${analysisType}, timePeriod=${timePeriod}`,
          },
          partialErrors,
        },
        { status: 502 }
      );
    }

    stageLog('RESPONSE', 'END', `Analysis complete: ${result.gaps.length} gaps, ${result.saturation.length} saturation, ${result.complaints.length} complaints`);
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    stageLog('HANDLER', 'ERROR', `Unhandled error in main handler: ${msg}`);
    logError(MODULE_NAME, error, { endpoint: '/api/analyze' });
    const moduleError = classifyError(error, MODULE_NAME, '/api/analyze', {
      category: body?.category as string | undefined,
      payload: `category=${body?.category}, timePeriod=${body?.timePeriod || 'N/A'}`,
      backendMessage: msg,
    });
    return NextResponse.json(
      {
        error: moduleError.message,
        moduleError,
        debug: {
          receivedCategory: body?.category,
          receivedTimePeriod: body?.timePeriod,
          originalError: msg,
          errorConstructor: error instanceof Error ? error.constructor.name : typeof error,
          errorCategory: moduleError.category,
          caughtBy: 'main_handler_try_catch',
        }
      },
      { status: 500 }
    );
  }
});

// ═══════════════════════════════════════════════════════════════════
// SUB-ANALYSIS FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

async function analyzeGaps(
  productsContext: string,
  products: { id: string; name: string; category: string; pricing: string; comments: string; features: string }[],
  timePeriod: string,
  effectiveCategory: string
): Promise<GapAnalysis[]> {
  stageLog('GAPS_LLM', 'START', `Calling LLM for gap analysis (${products.length} products)`);

  let gaps: unknown;
  try {
    gaps = await retryWithBackoff(
      () => withTimeout(
        () => generateStructuredResponse<GapAnalysis[]>(
          `You are a rigorous product market analyst specializing in identifying gaps in product markets. You work for a market intelligence firm and your analysis must be evidence-backed, specific, and actionable — the kind of analysis a venture capitalist would trust.

Analyze the given products and identify market gaps. Focus on these gap types:
- missing_feature: Features that users commonly need but are absent across products
- weak_ux: Products with poor user experience or usability issues
- expensive: Products that are overpriced relative to their value
- underserved: User segments or use cases that are not well served
- overcrowded: Areas with too many similar products competing for the same users

=== CRITICAL RULES FOR EVIDENCE-BACKED OUTPUT ===

Rule 1: Be HYPER-SPECIFIC, never generic.
Rule 2: Cite specific numbers from the data in EVERY field.
Rule 3: Every insight must feel PROVABLE and ACTIONABLE.
Rule 4: For titles, be SPECIFIC about WHO is affected and WHAT is missing.
Rule 5: For "whyThisMatters", think like a venture capitalist.

Identify 3-8 meaningful gaps. Base your analysis ONLY on the product data provided. Every number must come from or be derived from the data.`,
          `Analyze these products for market gaps in the "${effectiveCategory}" category (time period: ${timePeriod}):\n\n${productsContext}`,
          `Return a JSON array of objects with fields: gapType (string), title (string), description (string), evidence (string), severity (string: "low"|"medium"|"high"), evidenceDetail (object: { similarProducts: number, repeatedComplaints: number, launchFrequency: number, commentSnippets: string[], pricingOverlap: number, launchGrowth: number }), whyThisMatters (string), subNiche (object: { name: string, description: string, parentCategory: string, opportunityScore: number }), affectedProducts (array of { name: string, pricing: string, strengths: string[], weaknesses: string[] }), underservedUsers (array of { userGroup: string, description: string, evidence: string, opportunityScore: number }), whyNow (object: { marketGrowthDriver: string, incumbentWeakness: string, timingAdvantage: string, catalystEvents: string[] }), executionDifficulty (object: { level: string, demandLevel: string, competitionLevel: string, technicalComplexity: string, timeToMvp: string, estimatedBudget: string, keyChallenges: string[] }), falseOpportunity (object: { isFalseOpportunity: boolean, reason: string, estimatedMarketSize: string, riskFactors: string[], verdict: string }), founderFit (object: { bestFit: string[], rationale: string, requiredSkills: string[], idealTeamSize: string }), sourceTransparency (object: { sourcePlatforms: string[], totalComments: number, complaintFrequency: number, reviewSources: array of { platform: string, count: number, avgScore: number }, dataFreshness: string, confidenceLevel: string }), whyExistingProductsFail (object: { rootCause: string, userImpact: string, missedByCompetitors: string }), marketQuadrant (object: { competitionScore: number, opportunityScore: number, quadrant: string, label: string })`
        ),
        LLM_TIMEOUT_MS,
        MODULE_NAME
      ),
      { maxRetries: MAX_RETRIES },
      MODULE_NAME
    );
    stageLog('GAPS_LLM', 'END', `LLM returned gaps response`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    stageLog('GAPS_LLM', 'ERROR', `LLM call failed after retries: ${msg}`);
    throw err; // Re-throw to be caught by the caller's try/catch
  }

  // Validate and normalize the LLM response
  const safeGaps = Array.isArray(gaps) ? gaps : [];
  stageLog('GAPS_PARSE', 'INFO', `Parsed ${safeGaps.length} gaps from LLM response`);

  // ═══ Save gaps to the database ═══
  stageLog('GAPS_SAVE', 'START', `Saving ${safeGaps.length} gaps to database`);
  let savedCount = 0;
  for (const gap of safeGaps) {
    try {
      const relevantProduct = findMostRelevantProduct(gap, products);
      if (relevantProduct) {
        await db.gap.create({
          data: {
            productId: relevantProduct.id,
            gapType: gap.gapType || 'missing_feature',
            title: gap.title || 'Untitled Gap',
            description: gap.description || '',
            evidence: gap.evidence || '',
            evidenceDetail: safeStringify(gap.evidenceDetail),
            whyThisMatters: gap.whyThisMatters || '',
            subNiche: safeStringify(gap.subNiche),
            affectedProducts: safeStringify(gap.affectedProducts),
            underservedUsers: safeStringify(gap.underservedUsers),
            severity: gap.severity || 'medium',
            whyNow: safeStringify(gap.whyNow),
            executionDifficulty: safeStringify(gap.executionDifficulty),
            falseOpportunity: safeStringify(gap.falseOpportunity),
            founderFit: safeStringify(gap.founderFit),
            sourceTransparency: safeStringify(gap.sourceTransparency),
            whyExistingProductsFail: safeStringify(gap.whyExistingProductsFail),
            marketQuadrant: safeStringify(gap.marketQuadrant),
          },
        });
        savedCount++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stageLog('GAPS_SAVE', 'ERROR', `Failed to save gap "${gap?.title || 'unknown'}": ${msg}`);
      logError(MODULE_NAME, err, { step: 'saveGap', gapTitle: gap?.title });
    }
  }
  stageLog('GAPS_SAVE', 'END', `Saved ${savedCount}/${safeGaps.length} gaps to database`);

  return safeGaps;
}

function findMostRelevantProduct(
  gap: GapAnalysis,
  products: { id: string; name: string; category: string }[]
) {
  try {
    const searchText = `${gap.evidence || ''} ${gap.description || ''} ${gap.title || ''}`.toLowerCase();
    for (const product of products) {
      if (product.name && searchText.includes(product.name.toLowerCase())) {
        return product;
      }
    }
    return products[0] || null;
  } catch {
    return products[0] || null;
  }
}

/**
 * Find the most relevant product for a complaint by matching
 * the complaint text against product names and categories.
 */
function findRelevantProductForComplaint(
  complaint: ComplaintAnalysis,
  products: { id: string; name: string; category: string }[]
) {
  try {
    const complaintText = (complaint?.text || '').toLowerCase();
    let bestProduct: { id: string; name: string; category: string } | null = null;
    let bestScore = 0;

    for (const product of products) {
      let score = 0;
      const nameLower = (product.name || '').toLowerCase();
      if (complaintText.includes(nameLower)) {
        score += 10;
      }
      const nameWords = nameLower.split(/\s+/);
      for (const word of nameWords) {
        if (word.length >= 3 && complaintText.includes(word)) {
          score += 3;
        }
      }
      const categoryLower = (product.category || '').toLowerCase();
      const categoryWords = categoryLower.split(/\s+/);
      for (const word of categoryWords) {
        if (word.length >= 3 && complaintText.includes(word)) {
          score += 2;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestProduct = product;
      }
    }

    return bestProduct || products[0] || null;
  } catch {
    return products[0] || null;
  }
}

async function analyzeSaturation(
  productsContext: string,
  category: string,
  products: { id: string; name: string; features: string; pricing: string; comments: string; category: string; upvotes: number; reviewScore: number; tagline: string; description: string }[],
  _effectiveCategory: string
): Promise<MarketSaturation[]> {
  try {
  stageLog('SATURATION_LOCAL', 'START', `Computing local saturation metrics for ${products.length} products`);
  
  // Guard: ensure products is a valid array
  if (!Array.isArray(products) || products.length === 0) {
    stageLog('SATURATION_LOCAL', 'ERROR', 'No products to analyze');
    return [];
  }

  // Group products by category
  const categoryGroups: Record<string, typeof products> = {};
  for (const product of products) {
    const cat = product.category || category;
    if (!categoryGroups[cat]) categoryGroups[cat] = [];
    categoryGroups[cat].push(product);
  }
  stageLog('SATURATION_LOCAL', 'INFO', `Grouped into ${Object.keys(categoryGroups).length} categories: ${Object.keys(categoryGroups).join(', ')}`);

  const saturationResults: MarketSaturation[] = [];

  for (const [cat, catProducts] of Object.entries(categoryGroups)) {
    const productCount = catProducts.length;
    stageLog('SATURATION_LOCAL', 'INFO', `Processing category "${cat}" with ${productCount} products`);

    // Feature overlap (computed locally, no LLM call needed)
    let featureOverlap = 0;
    try {
      const allFeatures = catProducts.map((p) => {
        try {
          const parsed = JSON.parse(p.features || '[]');
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      });
      const totalFeatures = allFeatures.flat().filter((f): f is string => typeof f === 'string');
      const uniqueFeatures = new Set(totalFeatures.map((f) => f.toLowerCase()));
      featureOverlap =
        uniqueFeatures.size > 0 && totalFeatures.length > 0
          ? Math.round(((totalFeatures.length - uniqueFeatures.size) / totalFeatures.length) * 100)
          : 0;
    } catch (err) {
      stageLog('SATURATION_LOCAL', 'ERROR', `Feature overlap calculation failed: ${err instanceof Error ? err.message : String(err)}`);
      featureOverlap = 0;
    }

    // Pricing similarity (computed locally)
    let pricingSimilarity = 0;
    try {
      const pricingModels = catProducts.map((p) => p.pricing || '');
      const freeCount = pricingModels.filter((p) => p === 'Free' || p === 'Freemium').length;
      pricingSimilarity = Math.round((freeCount / Math.max(productCount, 1)) * 100);
    } catch (err) {
      stageLog('SATURATION_LOCAL', 'ERROR', `Pricing similarity calculation failed: ${err instanceof Error ? err.message : String(err)}`);
      pricingSimilarity = 0;
    }

    // User complaints count (computed locally)
    let userComplaints = 0;
    try {
      for (const product of catProducts) {
        try {
          const parsed = JSON.parse(product.comments || '[]');
          const comments = Array.isArray(parsed) ? parsed : [];
          userComplaints += comments.filter((c: unknown) =>
            typeof c === 'string' && /bad|poor|expensive|slow|missing|lacking|terrible|awful|frustrating|annoying/i.test(c)
          ).length;
        } catch {
          // Skip this product's comments
        }
      }
    } catch (err) {
      stageLog('SATURATION_LOCAL', 'ERROR', `User complaints calculation failed: ${err instanceof Error ? err.message : String(err)}`);
      userComplaints = 0;
    }

    const launchFrequency = Math.min(Math.round(productCount / 3), 100);

    // Compute saturation score algorithmically
    const rawScore = Math.min(
      100,
      Math.round(
        productCount * 5 +
        featureOverlap * 0.3 +
        pricingSimilarity * 0.2 +
        launchFrequency * 0.2 +
        userComplaints * 0.1
      )
    );
    const score = Math.max(0, Math.min(100, rawScore));
    const level = score < 33 ? 'low' : score < 66 ? 'medium' : 'high';

    stageLog('SATURATION_LOCAL', 'END', `Category "${cat}": score=${score}, level=${level}`);

    // ═══ LLM: Generate competitor breakdown ═══
    let topCompetitors: ProductReference[] = [];
    try {
      stageLog('SATURATION_LLM_COMPETITORS', 'START', `Calling LLM for top competitors in "${cat}"`);
      topCompetitors = await retryWithBackoff(
        () => withTimeout(
          () => generateStructuredResponse<ProductReference[]>(
            `You are a rigorous competitive analyst. Based on the product data, identify the top competitors in the "${cat}" category.

RULES:
1. You MUST list at least 3 competitors if 3+ products exist in the data.
2. Strengths and weaknesses must be SPECIFIC, not generic.
3. Include pricing comparison context.
4. Base EVERY claim on the actual product data provided.

For each competitor, provide:
- name: Actual product name from the data
- pricing: Their actual pricing model as listed
- strengths: Array of 2-3 SPECIFIC competitive strengths with evidence
- weaknesses: Array of 2-3 SPECIFIC weaknesses with evidence`,
            `Products in category "${cat}" (${catProducts.length} total):\n${JSON.stringify(catProducts.map(p => ({ name: p.name, pricing: p.pricing, tagline: p.tagline, upvotes: p.upvotes, reviewScore: p.reviewScore })), null, 2)}`,
            `Return a JSON array of objects with fields: name (string), pricing (string), strengths (string[]), weaknesses (string[])`
          ),
          LLM_TIMEOUT_MS,
          MODULE_NAME
        ),
        { maxRetries: MAX_RETRIES },
        MODULE_NAME
      );
      if (!Array.isArray(topCompetitors)) topCompetitors = [];
      stageLog('SATURATION_LLM_COMPETITORS', 'END', `Got ${topCompetitors.length} top competitors`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stageLog('SATURATION_LLM_COMPETITORS', 'ERROR', `Failed: ${msg}`);
      logError(MODULE_NAME, err, { step: 'saturation-topCompetitors', category: cat });
      topCompetitors = [];
    }

    // Delay between LLM calls to avoid rate limits
    stageLog('DELAY', 'INFO', `Waiting ${INTER_CALL_DELAY_MS}ms before next LLM call...`);
    await new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));

    // ═══ LLM: Generate sub-niches ═══
    let subNiches: SubNiche[] = [];
    try {
      stageLog('SATURATION_LLM_SUBNICHES', 'START', `Calling LLM for sub-niches in "${cat}"`);
      subNiches = await retryWithBackoff(
        () => withTimeout(
          () => generateStructuredResponse<SubNiche[]>(
            `You are a market niche analyst specializing in finding hyper-specific, underserved sub-niches.

Based on the product data, identify 2-3 SUB-NICHES within the "${cat}" category.

CRITICAL: Sub-niches must be HYPER-SPECIFIC. The more specific, the better.

For each sub-niche:
- name: A hyper-specific name that names the WHO, WHAT, and CONTEXT
- description: What this sub-niche encompasses and why existing products don't serve it well
- parentCategory: "${cat}"
- opportunityScore: 0-100 score. Justify with data.`,
            `Products in category "${cat}" (${catProducts.length} total):\n${JSON.stringify(catProducts.map(p => ({ name: p.name, pricing: p.pricing, tagline: p.tagline, description: (p.description || '').substring(0, 200) })), null, 2)}`,
            `Return a JSON array of objects with fields: name (string), description (string), parentCategory (string), opportunityScore (number)`
          ),
          LLM_TIMEOUT_MS,
          MODULE_NAME
        ),
        { maxRetries: MAX_RETRIES },
        MODULE_NAME
      );
      if (!Array.isArray(subNiches)) subNiches = [];
      stageLog('SATURATION_LLM_SUBNICHES', 'END', `Got ${subNiches.length} sub-niches`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stageLog('SATURATION_LLM_SUBNICHES', 'ERROR', `Failed: ${msg}`);
      logError(MODULE_NAME, err, { step: 'saturation-subNiches', category: cat });
      subNiches = [];
    }

    // ═══ Build saturation result for this category ═══
    try {
      saturationResults.push({
        category: cat,
        score,
        level: level as 'low' | 'medium' | 'high',
        factors: {
          similarProducts: productCount,
          featureOverlap,
          launchFrequency,
          userComplaints,
          pricingSimilarity,
        },
        topCompetitors,
        subNiches,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stageLog('SATURATION_BUILD', 'ERROR', `Failed to build saturation result for "${cat}": ${msg}`);
      logError(MODULE_NAME, err, { step: 'saturationResults.push', category: cat });
    }
  }

  stageLog('SATURATION', 'END', `Returning ${saturationResults.length} saturation results`);
  return saturationResults;

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    stageLog('SATURATION', 'ERROR', `Saturation analysis outer catch: ${msg}`);
    logError(MODULE_NAME, error, { step: 'analyzeSaturation' });
    // Return empty array instead of throwing - let the main handler continue with other analyses
    return [];
  }
}

async function analyzeComplaints(
  productsContext: string,
  products: { id: string; name: string; category: string; comments: string }[],
  _effectiveCategory: string
): Promise<{ complaints: ComplaintAnalysis[]; clusters: ComplaintCluster[] }> {
  stageLog('COMPLAINTS_LLM', 'START', 'Calling LLM for complaint extraction');
  
  let rateLimitHit = false;
  let complaints: unknown;
  try {
    complaints = await retryWithBackoff(
      () => withTimeout(
        () => generateStructuredResponse<ComplaintAnalysis[]>(
          `You are a rigorous product review analyst. Analyze the product data below and extract common complaints.

RULES FOR SPECIFIC OUTPUT:
1. Each complaint text must be SPECIFIC and cite real details from the data.
2. Cite specific product names, prices, or feature names in the complaint text.
3. Count accurately.
4. Every complaint must be grounded in the actual comments/reviews data provided.

For each complaint, provide:
- text: A specific complaint description with evidence
- category: One of "pricing", "missing_feature", "performance", "ux", "support", "integration"
- sentiment: One of "negative", "neutral", "mixed"
- frequency: How many distinct users/comments express this complaint (1-10 scale)

Extract 3-10 distinct complaints.`,
          `Analyze these products for common complaints:\n\n${productsContext}`,
          `Return a JSON array of objects with fields: text (string), category (string), sentiment (string), frequency (number)`
        ),
        LLM_TIMEOUT_MS,
        MODULE_NAME
      ),
      { maxRetries: MAX_RETRIES },
      MODULE_NAME
    );
    stageLog('COMPLAINTS_LLM', 'END', 'LLM complaint extraction completed');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    stageLog('COMPLAINTS_LLM', 'ERROR', `LLM complaint extraction failed: ${msg}`);
    // Track if rate limit was hit to skip clustering call
    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many')) {
      rateLimitHit = true;
      stageLog('COMPLAINTS_LLM', 'INFO', 'Rate limit detected — will skip clustering call');
    }
    // Don't re-throw - return empty results so other analyses can continue
    return { complaints: [], clusters: [] };
  }

  const safeComplaints = Array.isArray(complaints) ? complaints : [];
  stageLog('COMPLAINTS_PARSE', 'INFO', `Extracted ${safeComplaints.length} complaints`);

  // ═══ LLM: Generate complaint clusters ═══
  // Delay before next LLM call to avoid rate limits
  stageLog('DELAY', 'INFO', `Waiting ${INTER_CALL_DELAY_MS}ms before next LLM call...`);
  await new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));

  let clusters: ComplaintCluster[] = [];
  if (safeComplaints.length > 0 && !rateLimitHit) {
    // Check if we've already hit rate limits recently
    try {
      stageLog('COMPLAINTS_LLM_CLUSTERS', 'START', 'Calling LLM for complaint clustering');
      clusters = await retryWithBackoff(
        () => withTimeout(
          () => generateStructuredResponse<ComplaintCluster[]>(
            `You are a data analyst specializing in complaint clustering. Group the following complaints into clusters by theme.

RULES:
1. Each cluster's "percentage" must represent what share of total complaints fall in this cluster.
2. All cluster percentages MUST add up to approximately 100%.
3. Each cluster MUST include 1-2 ACTUAL QUOTED complaint text snippets.
4. Count must be an integer ≥ 1.
5. Group into 3-6 clusters.

For each cluster, provide:
- category: The complaint category
- label: A short, specific human-readable label
- percentage: What % of total complaints this cluster represents
- count: Number of complaints in this cluster
- exampleSnippets: 1-2 ACTUAL QUOTED snippets from the complaint text`,
            `Complaints to cluster (${safeComplaints.length} total):\n${safeComplaints.map(c => `[${c?.category || 'unknown'}] "${c?.text || ''}" (frequency: ${c?.frequency || 0})`).join('\n')}`,
            `Return a JSON array of objects with fields: category (string), label (string), percentage (number), count (number), exampleSnippets (string[])`
          ),
          LLM_TIMEOUT_MS,
          MODULE_NAME
        ),
        { maxRetries: MAX_RETRIES },
        MODULE_NAME
      );
      if (!Array.isArray(clusters)) clusters = [];
      stageLog('COMPLAINTS_LLM_CLUSTERS', 'END', `Got ${clusters.length} clusters`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stageLog('COMPLAINTS_LLM_CLUSTERS', 'ERROR', `Clustering failed: ${msg}`);
      logError(MODULE_NAME, err, { step: 'complaintClusters' });
      clusters = [];
    }
  } else {
    const reason = rateLimitHit ? 'rate limit was hit' : 'no complaints extracted';
    stageLog('COMPLAINTS_LLM_CLUSTERS', 'INFO', `Skipping clustering — ${reason}`);
  }

  // ═══ Save complaints to the database ═══
  stageLog('COMPLAINTS_SAVE', 'START', `Saving ${safeComplaints.length} complaints to database`);
  let savedCount = 0;
  for (const complaint of safeComplaints) {
    try {
      const targetProduct = findRelevantProductForComplaint(complaint, products);
      if (targetProduct) {
        await db.complaint.create({
          data: {
            productId: targetProduct.id,
            text: complaint?.text || '',
            category: complaint?.category || 'performance',
            sentiment: complaint?.sentiment || 'negative',
            frequency: complaint?.frequency || 1,
          },
        });
        savedCount++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      stageLog('COMPLAINTS_SAVE', 'ERROR', `Failed to save complaint: ${msg}`);
      logError(MODULE_NAME, err, { step: 'saveComplaint' });
    }
  }
  stageLog('COMPLAINTS_SAVE', 'END', `Saved ${savedCount}/${safeComplaints.length} complaints to database`);

  return { complaints: safeComplaints, clusters };
}

// ═══════════════════════════════════════════════════════════════════
// SAFE JSON STRINGIFY — never throws, handles BigInt and circular refs
// ═══════════════════════════════════════════════════════════════════

function safeStringify(value: unknown): string {
  if (value === null || value === undefined) return '{}';
  if (typeof value === 'string') {
    // Already a string — verify it's valid JSON, or wrap it
    try {
      JSON.parse(value);
      return value;
    } catch {
      return JSON.stringify({ value });
    }
  }
  try {
    return JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v);
  } catch {
    return '{}';
  }
}
