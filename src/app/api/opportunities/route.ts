import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateStructuredResponse } from '@/lib/zai';
import type { OpportunitySuggestion, OpportunityScoreBreakdown, SubNiche, ProductReference, UnderservedUserGroup } from '@/types';

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
      gapEvidence: safeJsonParse(opp.gapEvidence, []),
      complaintRefs: safeJsonParse(opp.complaintRefs, []),
      trendSignals: safeJsonParse(opp.trendSignals, []),
      evidenceDetail: safeJsonParse(opp.evidenceDetail, {}),
      opportunityScore: safeJsonParse(opp.opportunityScore, {}),
      subNiche: safeJsonParse(opp.subNiche, {}),
      affectedProducts: safeJsonParse(opp.affectedProducts, []),
      underservedUsers: safeJsonParse(opp.underservedUsers, []),
      whyNow: safeJsonParse(opp.whyNow, {}),
      executionDifficulty: safeJsonParse(opp.executionDifficulty, {}),
      falseOpportunity: safeJsonParse(opp.falseOpportunity, {}),
      founderFit: safeJsonParse(opp.founderFit, {}),
      sourceTransparency: safeJsonParse(opp.sourceTransparency, {}),
      whyExistingProductsFail: safeJsonParse(opp.whyExistingProductsFail, {}),
      marketQuadrant: safeJsonParse(opp.marketQuadrant, {}),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('List opportunities error:', error);
    return NextResponse.json(
      {
        error: 'Failed to list opportunities',
        details: error instanceof Error ? error.message : 'Unknown error',
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

    // Generate opportunities using LLM with ALL enriched fields
    const opportunities = await generateStructuredResponse<OpportunitySuggestion[]>(
      `You are a startup opportunity analyst. Based on REAL market gaps, user complaints, and trend data, 
generate specific product/service opportunities. 

CRITICAL RULES:
1. Every opportunity MUST be grounded in the provided gap evidence and complaint data
2. Do NOT generate random ideas - each opportunity must address a real identified gap or complaint
3. For each opportunity, reference specific gaps and complaints that support it
4. Rate the quality score based on: market size potential, evidence strength, competitive advantage, and feasibility
5. Assign saturation levels based on the number of existing products and feature overlap
6. NEVER show mysterious AI numbers - always explain WHY scores are what they are

For each opportunity, provide:
- title: Clear, specific opportunity name
- description: Detailed description of the opportunity and why it exists
- category: "${category}"
- saturation: "low" | "medium" | "high" - how saturated this specific niche is
- saturationScore: 0-100 numeric saturation score
- gapEvidence: Array of specific gap descriptions that support this opportunity
- complaintRefs: Array of specific complaint descriptions that support this opportunity  
- trendSignals: Array of trend signals that support this opportunity
- qualityScore: 0-10 score indicating opportunity quality (higher = better)

EVIDENCE DETAIL (for each opportunity):
- evidenceDetail: Object with:
  - similarProducts: number of similar products found
  - repeatedComplaints: count of complaints supporting this gap
  - launchFrequency: how many products launched recently (number)
  - commentSnippets: array of 2-3 actual comment snippets
  - pricingOverlap: percentage (0-100) of products with similar pricing

OPPORTUNITY SCORE (0-100, NOT magic - based on explainable factors):
- opportunityScore: Object with:
  - complaintFrequency: 0-20 (how frequently users complain about this)
  - competitionDensity: 0-20 (lower = less competition = higher score)
  - pricingDissatisfaction: 0-20 (higher = users unhappy with current pricing)
  - launchGrowth: 0-20 (growth in this category)
  - underservedAudience: 0-20 (how underserved the target audience is)
  - total: sum of the above (0-100)
  - explanation: 1-2 sentence explanation of why this score

WHY THIS MATTERS:
- whyThisMatters: "Why This Opportunity Exists" — must contain BUSINESS REASONING, not generic AI text. Use one of these patterns:
  Pattern A: "Existing products focus heavily on [SEGMENT], leaving [UNSERVED_SEGMENT] underserved because [BUSINESS_REASON]"
  Pattern B: "Current solutions price at [AMOUNT] which exceeds [SEGMENT]'s budget by [AMOUNT], creating a pricing ceiling"
  Pattern C: "Recent [TECH_CHANGE] makes [NEW_APPROACH] viable, but incumbents haven't adapted because [REASON]"
  Example: "Existing resume builders focus on enterprise recruiting workflows ($29-99/mo), leaving engineering students applying for internships completely underserved because these tools charge more per month than a student's hourly wage."

SUB-NICHE (be SPECIFIC, not broad):
- subNiche: Object with:
  - name: Specific sub-niche (e.g., "ATS resume tools for engineering students" not just "resume tools")
  - description: What this sub-niche encompasses
  - parentCategory: Broader category
  - opportunityScore: 0-100

AFFECTED PRODUCTS (reference real products from the data):
- affectedProducts: Array of 2-3 objects with:
  - name: Product name
  - pricing: Their pricing model
  - strengths: 1-2 key strengths
  - weaknesses: 1-2 key weaknesses related to this gap

UNDERSERVED USERS:
- underservedUsers: Array of 1-2 objects with:
  - userGroup: Name of underserved group (e.g., "junior developers", "elderly users")
  - description: Why this group is underserved
  - evidence: Specific evidence
  - opportunityScore: 0-100

FEASIBILITY SUMMARY (derive from other fields):
- feasibilitySummary: Object with:
  - opportunityLevel: "high" if total opportunity score ≥ 70, "medium" if ≥ 40, "low" if < 40
  - executionDifficulty: "easy" if executionDifficulty.level is low/low-medium, "medium" if medium, "hard" if medium-high/high
  - competitionLevel: same as executionDifficulty.competitionLevel
  - overallVerdict: "strong_pursue" if high opportunity + easy difficulty, "pursue" if high opportunity, "caution" if medium opportunity or medium difficulty, "avoid" if low opportunity or hard difficulty

WHY NOW? ANALYSIS:
- whyNow: Object with:
  - marketGrowthDriver: Why this market is growing RIGHT NOW
  - incumbentWeakness: Why incumbents are vulnerable NOW
  - timingAdvantage: Why timing matters for this opportunity
  - catalystEvents: Array of recent events enabling this opportunity

EXECUTION DIFFICULTY:
- executionDifficulty: Object with:
  - level: "low" | "low-medium" | "medium" | "medium-high" | "high"
  - demandLevel: "low" | "medium" | "high"
  - competitionLevel: "low" | "medium" | "high"
  - technicalComplexity: "low" | "medium" | "high"
  - timeToMvp: Estimated time to MVP (e.g., "2-4 weeks", "3-6 months")
  - estimatedBudget: Estimated budget needed (e.g., "$0-500", "$5k-20k", "$50k+")
  - keyChallenges: Array of top 2-3 challenges

FALSE OPPORTUNITY DETECTION:
- falseOpportunity: Object with:
  - isFalseOpportunity: boolean — is this actually a trap?
  - reason: Why this might or might not be a false opportunity
  - estimatedMarketSize: e.g., "<$1M", "$1-10M", "$10-100M", "$100M+"
  - riskFactors: Array of reasons this might not be worth pursuing
  - verdict: "pursue" | "caution" | "avoid"

FOUNDER FIT SUGGESTIONS:
- founderFit: Object with:
  - bestFit: Array of best founder types from: "solo_developer", "b2b_saas", "content_creator", "student_founder", "agency", "enterprise"
  - rationale: Why these founder types are best suited
  - requiredSkills: Array of skills needed to execute
  - idealTeamSize: e.g., "Solo", "2-3 people", "5+ team"

SOURCE TRANSPARENCY:
- sourceTransparency: Object with:
  - sourcePlatforms: Array of platforms data came from (e.g., ["Product Hunt", "G2", "Reddit"])
  - totalComments: Total number of comments/reviews analyzed
  - complaintFrequency: Complaints per 100 reviews
  - reviewSources: Array of { platform, count, avgScore }
  - dataFreshness: e.g., "Data from last 30 days"
  - confidenceLevel: "high" | "medium" | "low"

WHY EXISTING PRODUCTS FAIL:
- whyExistingProductsFail: Object with:
  - rootCause: Business reasoning for why existing products fail, not feature listing
  - userImpact: How this failure affects users
  - missedByCompetitors: Why competitors haven't addressed this gap

MARKET QUADRANT POSITION:
- marketQuadrant: Object with:
  - competitionScore: 0-100 (higher = more competition)
  - opportunityScore: 0-100 (higher = more opportunity)
  - quadrant: "goldmine" | "blue_ocean" | "crowded" | "dead_zone"
    goldmine = low competition, high opportunity
    blue_ocean = low competition, moderate opportunity
    crowded = high competition, low differentiation
    dead_zone = high competition, low opportunity
  - label: Human-readable quadrant label${focusAreaPrompt}`,
      `Based on the following REAL data, generate 3-7 product opportunities (time period: ${timePeriod}):

MARKET GAPS:
${gapsContext || 'No gaps data available'}

USER COMPLAINTS:
${complaintsContext || 'No complaints data available'}

TREND SIGNALS:
${trendsContext || 'No trend data available'}`,
      `Return a JSON array of objects with fields: title (string), description (string), category (string), saturation (string: "low"|"medium"|"high"), saturationScore (number 0-100), gapEvidence (string[]), complaintRefs (string[]), trendSignals (string[]), qualityScore (number 0-10), evidenceDetail (object: { similarProducts: number, repeatedComplaints: number, launchFrequency: number, commentSnippets: string[], pricingOverlap: number }), opportunityScore (object: { complaintFrequency: number, competitionDensity: number, pricingDissatisfaction: number, launchGrowth: number, underservedAudience: number, total: number, explanation: string }), whyThisMatters (string), subNiche (object: { name: string, description: string, parentCategory: string, opportunityScore: number }), affectedProducts (array of { name: string, pricing: string, strengths: string[], weaknesses: string[] }), underservedUsers (array of { userGroup: string, description: string, evidence: string, opportunityScore: number }), feasibilitySummary (object: { opportunityLevel: string, executionDifficulty: string, competitionLevel: string, overallVerdict: string }), whyNow (object: { marketGrowthDriver: string, incumbentWeakness: string, timingAdvantage: string, catalystEvents: string[] }), executionDifficulty (object: { level: string, demandLevel: string, competitionLevel: string, technicalComplexity: string, timeToMvp: string, estimatedBudget: string, keyChallenges: string[] }), falseOpportunity (object: { isFalseOpportunity: boolean, reason: string, estimatedMarketSize: string, riskFactors: string[], verdict: string }), founderFit (object: { bestFit: string[], rationale: string, requiredSkills: string[], idealTeamSize: string }), sourceTransparency (object: { sourcePlatforms: string[], totalComments: number, complaintFrequency: number, reviewSources: array of { platform: string, count: number, avgScore: number }, dataFreshness: string, confidenceLevel: string }), whyExistingProductsFail (object: { rootCause: string, userImpact: string, missedByCompetitors: string }), marketQuadrant (object: { competitionScore: number, opportunityScore: number, quadrant: string, label: string })`
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
            whyNow: JSON.stringify((opp as any).whyNow || {}),
            executionDifficulty: JSON.stringify((opp as any).executionDifficulty || {}),
            falseOpportunity: JSON.stringify((opp as any).falseOpportunity || {}),
            founderFit: JSON.stringify((opp as any).founderFit || {}),
            sourceTransparency: JSON.stringify((opp as any).sourceTransparency || {}),
            whyExistingProductsFail: JSON.stringify((opp as any).whyExistingProductsFail || {}),
            marketQuadrant: JSON.stringify((opp as any).marketQuadrant || {}),
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
        console.error('Failed to save opportunity:', err);
      }
    }

    return NextResponse.json(savedOpportunities);
  } catch (error) {
    console.error('Generate opportunities error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate opportunities',
        details: error instanceof Error ? error.message : 'Unknown error',
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
      gapEvidence: safeJsonParse(updated.gapEvidence, []),
      complaintRefs: safeJsonParse(updated.complaintRefs, []),
      trendSignals: safeJsonParse(updated.trendSignals, []),
      evidenceDetail: safeJsonParse(updated.evidenceDetail, {}),
      opportunityScore: safeJsonParse(updated.opportunityScore, {}),
      subNiche: safeJsonParse(updated.subNiche, {}),
      affectedProducts: safeJsonParse(updated.affectedProducts, []),
      underservedUsers: safeJsonParse(updated.underservedUsers, []),
      whyNow: safeJsonParse(updated.whyNow, {}),
      executionDifficulty: safeJsonParse(updated.executionDifficulty, {}),
      falseOpportunity: safeJsonParse(updated.falseOpportunity, {}),
      founderFit: safeJsonParse(updated.founderFit, {}),
      sourceTransparency: safeJsonParse(updated.sourceTransparency, {}),
      whyExistingProductsFail: safeJsonParse(updated.whyExistingProductsFail, {}),
      marketQuadrant: safeJsonParse(updated.marketQuadrant, {}),
    });
  } catch (error) {
    console.error('Toggle save opportunity error:', error);
    return NextResponse.json(
      {
        error: 'Failed to update opportunity',
        details: error instanceof Error ? error.message : 'Unknown error',
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
    console.error('Delete opportunity error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete opportunity',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Helper to safely parse JSON strings
function safeJsonParse(jsonStr: string, fallback: unknown): unknown {
  try {
    return JSON.parse(jsonStr || '[]');
  } catch {
    return fallback;
  }
}
