import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateStructuredResponse } from '@/lib/zai';
import { retryWithBackoff, withTimeout, logError, classifyError, type ModuleError } from '@/lib/error-handler';
import { safeJsonParse } from '@/lib/json';
import type { OpportunitySuggestion } from '@/types';

const MODULE_NAME = 'Opportunity Generator';
const LLM_TIMEOUT_MS = 90_000;
const MAX_RETRIES = 2;

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
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/opportunities
 * Generate new opportunities using LLM based on existing gaps and complaints in the DB
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, focusArea, timePeriod = '30d' } = body;

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    // Fetch gaps and complaints from the database for this category
    const categoryFilter = category === 'all' ? {} : { category };

    const products = await db.product.findMany({
      where: categoryFilter,
      include: {
        gaps: true,
        complaints: true,
      },
    });

    const allGaps = products.flatMap((p) => p.gaps);
    const allComplaints = products.flatMap((p) => p.complaints);

    if (allGaps.length === 0 && allComplaints.length === 0) {
      return NextResponse.json(
        {
          error:
            'No gaps or complaints found for this category. Run an analysis first.',
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

For each opportunity provide:
- title, description, category ("${category}"), saturation ("low"|"medium"|"high"), saturationScore (0-100)
- gapEvidence (string[]), complaintRefs (string[]), trendSignals (string[]), qualityScore (0-10)
- evidenceDetail: { similarProducts, repeatedComplaints, launchFrequency, commentSnippets[], pricingOverlap }
- opportunityScore: { complaintFrequency, competitionDensity, pricingDissatisfaction, launchGrowth, underservedAudience (each 0-20), total (sum), explanation }
- whyThisMatters: Business reasoning (NOT generic AI text) explaining why this opportunity exists
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
          `Based on the following REAL data, generate 3-7 product opportunities (time period: ${timePeriod}):

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

    const safeOpportunities = Array.isArray(opportunities) ? opportunities : [];

    // Save generated opportunities to the database
    const savedOpportunities: OpportunitySuggestion[] = [];
    for (const opp of safeOpportunities) {
      try {
        const created = await db.opportunity.create({
          data: {
            title: opp.title || 'Untitled Opportunity',
            description: opp.description || '',
            category: opp.category || category,
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

    return NextResponse.json(savedOpportunities);
  } catch (error) {
    logError(MODULE_NAME, error, { endpoint: '/api/opportunities', method: 'POST' });
    const moduleError = classifyError(error, MODULE_NAME, '/api/opportunities');
    return NextResponse.json(
      {
        error: moduleError.message,
        moduleError,
      },
      { status: 500 }
    );
  }
}

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
      },
      { status: 500 }
    );
  }
}
