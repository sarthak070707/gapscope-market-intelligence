import { NextRequest, NextResponse } from 'next/server';
import { db, checkDatabaseConnection } from '@/lib/db';
import { generateStructuredResponse } from '@/lib/zai';
import { safeJsonParse } from '@/lib/json';
import { retryWithBackoff, withTimeout, logError, classifyError, withErrorHandler } from '@/lib/error-handler';
import type { GapAnalysis, MarketSaturation, ComplaintAnalysis, ComplaintCluster, EvidenceDetail, SubNiche, ProductReference, UnderservedUserGroup, WhyNowAnalysis, ExecutionDifficulty, FalseOpportunityAnalysis, FounderFitSuggestion, SourceTransparency, WhyExistingProductsFail, MarketQuadrantPosition } from '@/types';

const MODULE_NAME = 'Gap Analysis';
const LLM_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 2;
const INTER_CALL_DELAY_MS = 2000; // 2s pause between LLM calls to avoid rate limits

export const POST = withErrorHandler(MODULE_NAME, '/api/analyze', async (request: NextRequest) => {
  let body: Record<string, unknown> | null = null;
  try {
    body = await request.json();
    const { category, analysisType = 'full', timePeriod = '30d' } = body;

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
            endpoint: '/api/analyze',
            requestCategory: category,
          }
        },
        { status: 400 }
      );
    }

    // Resolve 'all' to a specific default category for better LLM analysis
    const effectiveCategory = category === 'all' ? 'AI Tools' : category;
    console.log(`[${MODULE_NAME}] Using effective category: ${effectiveCategory} (original: ${category})`);

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
            endpoint: '/api/analyze',
            requestCategory: category,
          }
        },
        { status: 503 }
      );
    }
    console.log(`[${MODULE_NAME}] Database OK (${dbHealth.latencyMs}ms)`);

    // Fetch products from DB for the given category, with time filtering
    const whereClause: Record<string, unknown> = category === 'all' ? {} : { category };
    
    // Apply time filter based on launchDate
    if (timePeriod && timePeriod !== '90d') {
      const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
      const days = daysMap[timePeriod as string] || 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      whereClause.launchDate = { gte: cutoff.toISOString().split('T')[0] };
    }

    console.log(`[${MODULE_NAME}] Querying products with filter:`, JSON.stringify(whereClause));
    const products = await db.product.findMany({
      where: whereClause,
      include: { gaps: true, complaints: true },
    });
    console.log(`[${MODULE_NAME}] Found ${products.length} products with time filter`);

    // If no products with time filter, fall back to all products in category
    let effectiveProducts = products;
    if (products.length === 0) {
      console.log(`[${MODULE_NAME}] No products with time filter, falling back to all products in category`);
      effectiveProducts = await db.product.findMany({
        where: category === 'all' ? {} : { category },
        include: { gaps: true, complaints: true },
      });
      console.log(`[${MODULE_NAME}] Found ${effectiveProducts.length} products without time filter`);
    }

    if (effectiveProducts.length === 0) {
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
            requestCategory: category,
          }
        },
        { status: 404 }
      );
    }

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

    // Prepare product summaries for LLM analysis (use effectiveCategory in prompts)
    const productSummaries = effectiveProducts.map((p) => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      features: safeJsonParse<string[]>(p.features, []),
      pricing: p.pricing,
      upvotes: p.upvotes,
      reviewScore: p.reviewScore,
      comments: safeJsonParse<string[]>(p.comments, []),
      category: p.category,
    }));

    const productsContext = JSON.stringify(productSummaries, null, 2);

    // Track partial errors so one failing analysis doesn't break the others
    const partialErrors: Record<string, unknown> = {};

    // Run gaps analysis (individual try/catch) — with delay to avoid rate limits
    if (analysisType === 'gaps' || analysisType === 'full') {
      console.log(`[${MODULE_NAME}] Starting gaps analysis...`);
      try {
        result.gaps = await analyzeGaps(productsContext, effectiveProducts, timePeriod as string, effectiveCategory);
        console.log(`[${MODULE_NAME}] Gaps analysis complete: ${result.gaps.length} gaps found`);
      } catch (error) {
        logError(MODULE_NAME, error, { endpoint: '/api/analyze', step: 'analyzeGaps', category });
        const moduleError = classifyError(error, MODULE_NAME, '/api/analyze', {
          category: body.category as string,
          payload: `category=${body.category}, timePeriod=${body.timePeriod || 'N/A'}`,
          backendMessage: error instanceof Error ? error.message : String(error),
        });
        partialErrors.gaps = moduleError;
        console.error(`[${MODULE_NAME}] Gaps analysis FAILED: ${error instanceof Error ? error.message : String(error)}`);
      }
      // Delay between LLM calls to avoid rate limits
      console.log(`[${MODULE_NAME}] Waiting ${INTER_CALL_DELAY_MS}ms before next LLM call...`);
      await new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));
    }

    // Run saturation analysis (individual try/catch) — with delay to avoid rate limits
    if (analysisType === 'saturation' || analysisType === 'full') {
      console.log(`[${MODULE_NAME}] Starting saturation analysis...`);
      try {
        result.saturation = await analyzeSaturation(productsContext, category as string, effectiveProducts, effectiveCategory);
        console.log(`[${MODULE_NAME}] Saturation analysis complete: ${result.saturation.length} categories analyzed`);
      } catch (error) {
        logError(MODULE_NAME, error, { endpoint: '/api/analyze', step: 'analyzeSaturation', category });
        const moduleError = classifyError(error, MODULE_NAME, '/api/analyze', {
          category: body.category as string,
          payload: `category=${body.category}, timePeriod=${body.timePeriod || 'N/A'}`,
          backendMessage: error instanceof Error ? error.message : String(error),
        });
        partialErrors.saturation = moduleError;
        console.error(`[${MODULE_NAME}] Saturation analysis FAILED: ${error instanceof Error ? error.message : String(error)}`);
      }
      // Delay between LLM calls to avoid rate limits
      console.log(`[${MODULE_NAME}] Waiting ${INTER_CALL_DELAY_MS}ms before next LLM call...`);
      await new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));
    }

    // Run complaints analysis (individual try/catch)
    if (analysisType === 'complaints' || analysisType === 'full') {
      console.log(`[${MODULE_NAME}] Starting complaints analysis...`);
      try {
        const complaintResult = await analyzeComplaints(productsContext, effectiveProducts, effectiveCategory);
        result.complaints = complaintResult.complaints;
        result.complaintClusters = complaintResult.clusters;
        console.log(`[${MODULE_NAME}] Complaints analysis complete: ${result.complaints.length} complaints, ${result.complaintClusters.length} clusters`);
      } catch (error) {
        logError(MODULE_NAME, error, { endpoint: '/api/analyze', step: 'analyzeComplaints', category });
        const moduleError = classifyError(error, MODULE_NAME, '/api/analyze', {
          category: body.category as string,
          payload: `category=${body.category}, timePeriod=${body.timePeriod || 'N/A'}`,
          backendMessage: error instanceof Error ? error.message : String(error),
        });
        partialErrors.complaints = moduleError;
        console.error(`[${MODULE_NAME}] Complaints analysis FAILED: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Attach partial errors if any
    if (Object.keys(partialErrors).length > 0) {
      result.partialErrors = partialErrors;
    }

    console.log(`[${MODULE_NAME}] Analysis complete: ${result.gaps.length} gaps, ${result.saturation.length} saturation, ${result.complaints.length} complaints`);
    return NextResponse.json(result);
  } catch (error) {
    logError(MODULE_NAME, error, { endpoint: '/api/analyze' });
    const moduleError = classifyError(error, MODULE_NAME, '/api/analyze', {
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

async function analyzeGaps(
  productsContext: string,
  products: { id: string; name: string; category: string; pricing: string; comments: string; features: string }[],
  timePeriod: string,
  effectiveCategory: string
): Promise<GapAnalysis[]> {
  console.log(`[${MODULE_NAME}] analyzeGaps: calling LLM for gap analysis (${products.length} products)...`);
  const gaps = await retryWithBackoff(
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

  const safeGaps = Array.isArray(gaps) ? gaps : [];
  console.log(`[${MODULE_NAME}] analyzeGaps: LLM returned ${safeGaps.length} gaps`);

  // Save gaps to the database
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
            evidenceDetail: JSON.stringify(gap.evidenceDetail || {}),
            whyThisMatters: gap.whyThisMatters || '',
            subNiche: JSON.stringify(gap.subNiche || {}),
            affectedProducts: JSON.stringify(gap.affectedProducts || []),
            underservedUsers: JSON.stringify(gap.underservedUsers || []),
            severity: gap.severity || 'medium',
            whyNow: JSON.stringify(gap.whyNow || {}),
            executionDifficulty: JSON.stringify(gap.executionDifficulty || {}),
            falseOpportunity: JSON.stringify(gap.falseOpportunity || {}),
            founderFit: JSON.stringify(gap.founderFit || {}),
            sourceTransparency: JSON.stringify(gap.sourceTransparency || {}),
            whyExistingProductsFail: JSON.stringify(gap.whyExistingProductsFail || {}),
            marketQuadrant: JSON.stringify(gap.marketQuadrant || {}),
          },
        });
      }
    } catch (err) {
      logError(MODULE_NAME, err, { step: 'saveGap', gapTitle: gap.title });
    }
  }

  return safeGaps;
}

function findMostRelevantProduct(
  gap: GapAnalysis,
  products: { id: string; name: string; category: string }[]
) {
  const searchText = `${gap.evidence} ${gap.description} ${gap.title}`.toLowerCase();
  for (const product of products) {
    if (searchText.includes(product.name.toLowerCase())) {
      return product;
    }
  }
  return products[0] || null;
}

/**
 * Find the most relevant product for a complaint by matching
 * the complaint text against product names and categories.
 */
function findRelevantProductForComplaint(
  complaint: ComplaintAnalysis,
  products: { id: string; name: string; category: string }[]
) {
  const complaintText = (complaint.text || '').toLowerCase();
  let bestProduct: { id: string; name: string; category: string } | null = null;
  let bestScore = 0;

  for (const product of products) {
    let score = 0;
    const nameLower = product.name.toLowerCase();
    if (complaintText.includes(nameLower)) {
      score += 10;
    }
    const nameWords = nameLower.split(/\s+/);
    for (const word of nameWords) {
      if (word.length >= 3 && complaintText.includes(word)) {
        score += 3;
      }
    }
    const categoryLower = product.category.toLowerCase();
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
}

async function analyzeSaturation(
  productsContext: string,
  category: string,
  products: { id: string; name: string; features: string; pricing: string; comments: string; category: string; upvotes: number; reviewScore: number; tagline: string; description: string }[],
  _effectiveCategory: string
): Promise<MarketSaturation[]> {
  console.log(`[${MODULE_NAME}] analyzeSaturation: starting for ${products.length} products...`);
  
  // Group products by category
  const categoryGroups: Record<string, typeof products> = {};
  for (const product of products) {
    const cat = product.category || category;
    if (!categoryGroups[cat]) categoryGroups[cat] = [];
    categoryGroups[cat].push(product);
  }

  const saturationResults: MarketSaturation[] = [];

  for (const [cat, catProducts] of Object.entries(categoryGroups)) {
    const productCount = catProducts.length;

    // Feature overlap (computed locally, no LLM call needed)
    let featureOverlap = 0;
    try {
      const allFeatures = catProducts.map((p) => {
        try {
          return JSON.parse(p.features || '[]') as string[];
        } catch {
          return [];
        }
      });
      const totalFeatures = allFeatures.flat();
      const uniqueFeatures = new Set(totalFeatures.map((f) => f.toLowerCase()));
      featureOverlap =
        uniqueFeatures.size > 0
          ? Math.round(((totalFeatures.length - uniqueFeatures.size) / totalFeatures.length) * 100)
          : 0;
    } catch {
      featureOverlap = 0;
    }

    // Pricing similarity (computed locally)
    let pricingSimilarity = 0;
    try {
      const pricingModels = catProducts.map((p) => p.pricing);
      const freeCount = pricingModels.filter((p) => p === 'Free' || p === 'Freemium').length;
      pricingSimilarity = Math.round((freeCount / Math.max(productCount, 1)) * 100);
    } catch {
      pricingSimilarity = 0;
    }

    // User complaints count (computed locally)
    let userComplaints = 0;
    try {
      for (const product of catProducts) {
        const comments = JSON.parse(product.comments || '[]') as string[];
        userComplaints += comments.filter((c: string) =>
          /bad|poor|expensive|slow|missing|lacking|terrible|awful|frustrating|annoying/i.test(c)
        ).length;
      }
    } catch {
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

    // Generate competitor breakdown using LLM (with timeout + retry)
    let topCompetitors: ProductReference[] = [];
    try {
      console.log(`[${MODULE_NAME}] analyzeSaturation: calling LLM for top competitors in "${cat}"...`);
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
      console.log(`[${MODULE_NAME}] analyzeSaturation: got ${topCompetitors.length} top competitors`);
    } catch (err) {
      logError(MODULE_NAME, err, { step: 'saturation-topCompetitors', category: cat });
      topCompetitors = [];
    }

    // Delay between LLM calls to avoid rate limits
    await new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));

    // Generate sub-niches using LLM (with timeout + retry)
    let subNiches: SubNiche[] = [];
    try {
      console.log(`[${MODULE_NAME}] analyzeSaturation: calling LLM for sub-niches in "${cat}"...`);
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
            `Products in category "${cat}" (${catProducts.length} total):\n${JSON.stringify(catProducts.map(p => ({ name: p.name, pricing: p.pricing, tagline: p.tagline, description: p.description.substring(0, 200) })), null, 2)}`,
            `Return a JSON array of objects with fields: name (string), description (string), parentCategory (string), opportunityScore (number)`
          ),
          LLM_TIMEOUT_MS,
          MODULE_NAME
        ),
        { maxRetries: MAX_RETRIES },
        MODULE_NAME
      );
      if (!Array.isArray(subNiches)) subNiches = [];
      console.log(`[${MODULE_NAME}] analyzeSaturation: got ${subNiches.length} sub-niches`);
    } catch (err) {
      logError(MODULE_NAME, err, { step: 'saturation-subNiches', category: cat });
      subNiches = [];
    }

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
  }

  return saturationResults;
}

async function analyzeComplaints(
  productsContext: string,
  products: { id: string; name: string; category: string; comments: string }[],
  _effectiveCategory: string
): Promise<{ complaints: ComplaintAnalysis[]; clusters: ComplaintCluster[] }> {
  console.log(`[${MODULE_NAME}] analyzeComplaints: calling LLM for complaint extraction...`);
  
  const complaints = await retryWithBackoff(
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

  const safeComplaints = Array.isArray(complaints) ? complaints : [];
  console.log(`[${MODULE_NAME}] analyzeComplaints: extracted ${safeComplaints.length} complaints`);

  // Delay before next LLM call to avoid rate limits
  await new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));

  // Generate complaint clusters (with timeout + retry)
  let clusters: ComplaintCluster[] = [];
  try {
    console.log(`[${MODULE_NAME}] analyzeComplaints: calling LLM for complaint clustering...`);
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
          `Complaints to cluster (${safeComplaints.length} total):\n${safeComplaints.map(c => `[${c.category}] "${c.text}" (frequency: ${c.frequency})`).join('\n')}`,
          `Return a JSON array of objects with fields: category (string), label (string), percentage (number), count (number), exampleSnippets (string[])`
        ),
        LLM_TIMEOUT_MS,
        MODULE_NAME
      ),
      { maxRetries: MAX_RETRIES },
      MODULE_NAME
    );
    if (!Array.isArray(clusters)) clusters = [];
    console.log(`[${MODULE_NAME}] analyzeComplaints: got ${clusters.length} clusters`);
  } catch (err) {
    logError(MODULE_NAME, err, { step: 'complaintClusters' });
    clusters = [];
  }

  // Save complaints to the database — mapped to the most relevant product
  for (const complaint of safeComplaints) {
    try {
      const targetProduct = findRelevantProductForComplaint(complaint, products);
      if (targetProduct) {
        await db.complaint.create({
          data: {
            productId: targetProduct.id,
            text: complaint.text || '',
            category: complaint.category || 'performance',
            sentiment: complaint.sentiment || 'negative',
            frequency: complaint.frequency || 1,
          },
        });
      }
    } catch (err) {
      logError(MODULE_NAME, err, { step: 'saveComplaint' });
    }
  }

  return { complaints: safeComplaints, clusters };
}
