import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateStructuredResponse } from '@/lib/zai';
import { safeJsonParse } from '@/lib/json';
import { retryWithBackoff, withTimeout, logError, classifyError } from '@/lib/error-handler';
import type { GapAnalysis, MarketSaturation, ComplaintAnalysis, ComplaintCluster, EvidenceDetail, SubNiche, ProductReference, UnderservedUserGroup, WhyNowAnalysis, ExecutionDifficulty, FalseOpportunityAnalysis, FounderFitSuggestion, SourceTransparency, WhyExistingProductsFail, MarketQuadrantPosition } from '@/types';

const LLM_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 2;
const INTER_CALL_DELAY_MS = 2000; // 2s pause between LLM calls to avoid rate limits

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, analysisType = 'full', timePeriod = '30d' } = body;

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    // Fetch products from DB for the given category, with time filtering
    const whereClause: Record<string, unknown> = category === 'all' ? {} : { category };
    
    // Apply time filter based on launchDate
    if (timePeriod && timePeriod !== '90d') {
      const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
      const days = daysMap[timePeriod] || 30;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      whereClause.launchDate = { gte: cutoff.toISOString().split('T')[0] };
    }

    const products = await db.product.findMany({
      where: whereClause,
      include: { gaps: true, complaints: true },
    });

    // If no products with time filter, fall back to all products in category
    const effectiveProducts = products.length > 0 ? products : await db.product.findMany({
      where: category === 'all' ? {} : { category },
      include: { gaps: true, complaints: true },
    });

    if (effectiveProducts.length === 0) {
      return NextResponse.json(
        { error: 'No products found for this category. Run a scan first.' },
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

    // Prepare product summaries for LLM analysis
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
      try {
        result.gaps = await analyzeGaps(productsContext, effectiveProducts, timePeriod);
      } catch (error) {
        logError('Gap Analysis', error, { endpoint: '/api/analyze', step: 'analyzeGaps', category });
        const moduleError = classifyError(error, 'Gap Analysis', '/api/analyze');
        partialErrors.gaps = moduleError;
      }
      // Delay between LLM calls to avoid rate limits
      await new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));
    }

    // Run saturation analysis (individual try/catch) — with delay to avoid rate limits
    if (analysisType === 'saturation' || analysisType === 'full') {
      try {
        result.saturation = await analyzeSaturation(productsContext, category, effectiveProducts);
      } catch (error) {
        logError('Gap Analysis', error, { endpoint: '/api/analyze', step: 'analyzeSaturation', category });
        const moduleError = classifyError(error, 'Gap Analysis', '/api/analyze');
        partialErrors.saturation = moduleError;
      }
      // Delay between LLM calls to avoid rate limits
      await new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));
    }

    // Run complaints analysis (individual try/catch)
    if (analysisType === 'complaints' || analysisType === 'full') {
      try {
        const complaintResult = await analyzeComplaints(productsContext, effectiveProducts);
        result.complaints = complaintResult.complaints;
        result.complaintClusters = complaintResult.clusters;
      } catch (error) {
        logError('Gap Analysis', error, { endpoint: '/api/analyze', step: 'analyzeComplaints', category });
        const moduleError = classifyError(error, 'Gap Analysis', '/api/analyze');
        partialErrors.complaints = moduleError;
      }
    }

    // Attach partial errors if any
    if (Object.keys(partialErrors).length > 0) {
      result.partialErrors = partialErrors;
    }

    return NextResponse.json(result);
  } catch (error) {
    logError('Gap Analysis', error, { endpoint: '/api/analyze' });
    const moduleError = classifyError(error, 'Gap Analysis', '/api/analyze');
    return NextResponse.json(
      {
        error: moduleError.message,
        moduleError,
      },
      { status: 500 }
    );
  }
}

async function analyzeGaps(
  productsContext: string,
  products: { id: string; name: string; category: string; pricing: string; comments: string; features: string }[],
  timePeriod: string
): Promise<GapAnalysis[]> {
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
- WRONG: "AI writing tools are oversaturated"
- RIGHT: "Most recently launched AI writing tools target marketers (8 of 11 in our data), while zero focus on technical documentation workflows for engineering teams"
- WRONG: "The market is growing"
- RIGHT: "23 products launched in this category in the last 90 days, up from 14 in the prior period"
- WRONG: "Pricing is a problem"
- RIGHT: "7 of 12 products charge $29/month or more, yet 31 complaints cite this price point as too high for individual users"

Rule 2: Cite specific numbers from the data in EVERY field:
- How many products compete in this gap area (count them from the data)
- How many complaints reference this issue (count them)
- What specific prices overlap (name the prices)
- How many products launched recently vs historically
- What percentage of products have the same feature set

Rule 3: Every insight must feel PROVABLE and ACTIONABLE. Avoid motivational language.
Do NOT use phrases like "The market is growing" or "There is an opportunity" — instead state the concrete evidence that IMPLIES growth or opportunity.

Rule 4: For titles, be SPECIFIC about WHO is affected and WHAT is missing:
- WRONG: "AI writing gap"
- RIGHT: "No AI writing tool serves technical documentation for regulated industries"
- WRONG: "Pricing issues in productivity"
- RIGHT: "Freelancers priced out of project management tools that bundle features they don't need"

Rule 5: For "whyThisMatters", think like a venture capitalist explaining to a founder WHY this specific market gap exists. Focus on the BUSINESS MECHANISM — not what the gap is, but WHY it exists as a commercial opportunity. Use specific numbers, pricing data, and market structure analysis.

=== REQUIRED FIELDS FOR EACH GAP ===

- gapType: One of the gap types listed above
- title: A concise, specific title naming WHO is affected and WHAT is missing
- description: Detailed description with at least 2 specific data points from the product data
- evidence: Direct evidence from the product data, citing product names, prices, or feature lists
- severity: "low", "medium", or "high" based on market impact

- evidenceDetail: Object with:
  - similarProducts: EXACT count of similar products in the data (count them)
  - repeatedComplaints: EXACT count of complaints supporting this gap
  - launchFrequency: EXACT number of products launched recently in this space
  - commentSnippets: array of 2-3 ACTUAL comment text snippets quoted from the data
  - pricingOverlap: percentage (0-100) of products with similar pricing, calculated from the data
  - launchGrowth: percentage growth in launches compared to prior period (estimated from data)

- whyThisMatters: This field is titled "Why This Opportunity Exists" — it must contain BUSINESS REASONING, not AI summarization. Explain WHY this gap represents a real market opportunity using one of these patterns:
  Pattern A (Market Structure): "Existing products focus heavily on [SEGMENT], leaving [UNSERVED_SEGMENT] completely underserved because [BUSINESS_REASON_WITH_NUMBERS]"
  Pattern B (Pricing Gap): "Current solutions price at [AMOUNT] which exceeds [SPECIFIC_USER_SEGMENT]'s budget by [AMOUNT], creating a pricing ceiling that limits market expansion to [MARKET_SIZE]"
  Pattern C (Technology Shift): "Recent [TECHNOLOGY_CHANGE] makes [NEW_APPROACH] economically viable for [SPECIFIC_AUDIENCE], but incumbents haven't adapted because [BUSINESS_REASON]"
  NEVER write generic statements like "There is an opportunity" or "The market is growing". Instead state the SPECIFIC BUSINESS MECHANISM that creates this opportunity.

- subNiche: Object with:
  - name: HYPER-SPECIFIC sub-niche name that names the WHO, WHAT, and CONTEXT. NOT "AI coding tools" but "AI debugging assistants for junior developers who write Python". NOT "resume tools" but "ATS resume optimizers for engineering graduates entering FAANG". NOT "home workout apps" but "postpartum fitness trackers for new mothers recovering from C-sections".
  - description: What this sub-niche encompasses and why it's distinct from the parent category
  - parentCategory: The broader category this falls under
  - opportunityScore: 0-100 score justified by the data (higher = better opportunity)

- affectedProducts: Array of 2-4 real product objects from the data with:
  - name: Actual product name from the data
  - pricing: Their actual pricing model
  - strengths: 1-2 SPECIFIC strengths (not "good UX" but "one-click onboarding completed in under 60 seconds")
  - weaknesses: 1-2 SPECIFIC weaknesses related to this gap (not "limited features" but "lacks batch export, forcing users to process documents one at a time")

- underservedUsers: Array of 1-3 underserved user groups with:
  - userGroup: SPECIFIC group name (e.g., "junior Python developers at startups", "freelance technical writers", "elderly smartphone users in rural areas")
  - description: WHY this group is underserved, with specific evidence
  - evidence: Specific evidence from the data showing how this group is ignored
  - opportunityScore: 0-100 score

Identify 3-8 meaningful gaps. Base your analysis ONLY on the product data provided. Every number must come from or be derived from the data.`,
        `Analyze these products for market gaps (time period: ${timePeriod}):\n\n${productsContext}`,
        `Return a JSON array of objects with fields: gapType (string), title (string), description (string), evidence (string), severity (string: "low"|"medium"|"high"), evidenceDetail (object: { similarProducts: number, repeatedComplaints: number, launchFrequency: number, commentSnippets: string[], pricingOverlap: number, launchGrowth: number }), whyThisMatters (string), subNiche (object: { name: string, description: string, parentCategory: string, opportunityScore: number }), affectedProducts (array of { name: string, pricing: string, strengths: string[], weaknesses: string[] }), underservedUsers (array of { userGroup: string, description: string, evidence: string, opportunityScore: number }), whyNow (object: { marketGrowthDriver: string, incumbentWeakness: string, timingAdvantage: string, catalystEvents: string[] }), executionDifficulty (object: { level: string, demandLevel: string, competitionLevel: string, technicalComplexity: string, timeToMvp: string, estimatedBudget: string, keyChallenges: string[] }), falseOpportunity (object: { isFalseOpportunity: boolean, reason: string, estimatedMarketSize: string, riskFactors: string[], verdict: string }), founderFit (object: { bestFit: string[], rationale: string, requiredSkills: string[], idealTeamSize: string }), sourceTransparency (object: { sourcePlatforms: string[], totalComments: number, complaintFrequency: number, reviewSources: array of { platform: string, count: number, avgScore: number }, dataFreshness: string, confidenceLevel: string }), whyExistingProductsFail (object: { rootCause: string, userImpact: string, missedByCompetitors: string }), marketQuadrant (object: { competitionScore: number, opportunityScore: number, quadrant: string, label: string })`
      ),
      LLM_TIMEOUT_MS,
      'Gap Analysis'
    ),
    { maxRetries: MAX_RETRIES },
    'Gap Analysis'
  );

  const safeGaps = Array.isArray(gaps) ? gaps : [];

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
      logError('Gap Analysis', err, { step: 'saveGap', gapTitle: gap.title });
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
 * Falls back to products[0] only if no match is found.
 */
function findRelevantProductForComplaint(
  complaint: ComplaintAnalysis,
  products: { id: string; name: string; category: string }[]
) {
  const complaintText = (complaint.text || '').toLowerCase();

  // Score each product by how relevant it is to this complaint
  let bestProduct: { id: string; name: string; category: string } | null = null;
  let bestScore = 0;

  for (const product of products) {
    let score = 0;

    // Direct name mention is the strongest signal
    const nameLower = product.name.toLowerCase();
    if (complaintText.includes(nameLower)) {
      score += 10;
    }

    // Partial name match (individual words in product name)
    const nameWords = nameLower.split(/\s+/);
    for (const word of nameWords) {
      if (word.length >= 3 && complaintText.includes(word)) {
        score += 3;
      }
    }

    // Category keyword match (e.g., "AI Tools" → complaint mentions "AI" or "tool")
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
  products: { id: string; name: string; features: string; pricing: string; comments: string; category: string; upvotes: number; reviewScore: number; tagline: string; description: string }[]
): Promise<MarketSaturation[]> {
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

    // Feature overlap
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

    // Pricing similarity
    let pricingSimilarity = 0;
    try {
      const pricingModels = catProducts.map((p) => p.pricing);
      const freeCount = pricingModels.filter((p) => p === 'Free' || p === 'Freemium').length;
      pricingSimilarity = Math.round((freeCount / Math.max(productCount, 1)) * 100);
    } catch {
      pricingSimilarity = 0;
    }

    // User complaints count
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
      topCompetitors = await retryWithBackoff(
        () => withTimeout(
          () => generateStructuredResponse<ProductReference[]>(
            `You are a rigorous competitive analyst. Based on the product data, identify the top competitors in the "${cat}" category.

RULES:
1. You MUST list at least 3 competitors if 3+ products exist in the data. If fewer, list all of them.
2. Strengths and weaknesses must be SPECIFIC, not generic.
   - WRONG: "Good UI" → RIGHT: "Drag-and-drop onboarding that gets users to first result in under 2 minutes"
   - WRONG: "Limited features" → RIGHT: "No bulk export capability, forcing users to download files one at a time"
   - WRONG: "Competitive pricing" → RIGHT: "Free tier includes 500 API calls/month vs competitors' 100"
3. Include pricing comparison context: how does each competitor's pricing compare to the others in this category?
4. Base EVERY claim on the actual product data provided. Do not fabricate information.

For each competitor, provide:
- name: Actual product name from the data
- pricing: Their actual pricing model as listed
- strengths: Array of 2-3 SPECIFIC competitive strengths with evidence
- weaknesses: Array of 2-3 SPECIFIC weaknesses with evidence`,
            `Products in category "${cat}" (${catProducts.length} total):\n${JSON.stringify(catProducts.map(p => ({ name: p.name, pricing: p.pricing, tagline: p.tagline, upvotes: p.upvotes, reviewScore: p.reviewScore })), null, 2)}`,
            `Return a JSON array of objects with fields: name (string), pricing (string), strengths (string[]), weaknesses (string[])`
          ),
          LLM_TIMEOUT_MS,
          'Gap Analysis'
        ),
        { maxRetries: MAX_RETRIES },
        'Gap Analysis'
      );
      if (!Array.isArray(topCompetitors)) topCompetitors = [];
    } catch (err) {
      logError('Gap Analysis', err, { step: 'saturation-topCompetitors', category: cat });
      topCompetitors = [];
    }

    // Delay between LLM calls to avoid rate limits
    await new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));

    // Generate sub-niches using LLM (with timeout + retry)
    let subNiches: SubNiche[] = [];
    try {
      subNiches = await retryWithBackoff(
        () => withTimeout(
          () => generateStructuredResponse<SubNiche[]>(
            `You are a market niche analyst specializing in finding hyper-specific, underserved sub-niches.

Based on the product data, identify 2-3 SUB-NICHES within the "${cat}" category.

CRITICAL: Sub-niches must be HYPER-SPECIFIC. The more specific, the better.
- WRONG: "AI coding tools"
- RIGHT: "AI debugging assistants for junior developers who write Python"
- WRONG: "resume tools"
- RIGHT: "ATS resume optimizers for engineering graduates entering FAANG"
- WRONG: "project management"
- RIGHT: "project management for solo freelancers managing 5+ concurrent clients"
- WRONG: "fitness apps"
- RIGHT: "postpartum fitness trackers for new mothers recovering from C-sections"

For each sub-niche:
- name: A hyper-specific name that names the WHO, WHAT, and CONTEXT
- description: What this sub-niche encompasses and why existing products don't serve it well. Cite specific product gaps from the data.
- parentCategory: "${cat}"
- opportunityScore: 0-100 score. Justify with data: how many products serve this niche? How many complaints mention it?`,
            `Products in category "${cat}" (${catProducts.length} total):\n${JSON.stringify(catProducts.map(p => ({ name: p.name, pricing: p.pricing, tagline: p.tagline, description: p.description.substring(0, 200) })), null, 2)}`,
            `Return a JSON array of objects with fields: name (string), description (string), parentCategory (string), opportunityScore (number)`
          ),
          LLM_TIMEOUT_MS,
          'Gap Analysis'
        ),
        { maxRetries: MAX_RETRIES },
        'Gap Analysis'
      );
      if (!Array.isArray(subNiches)) subNiches = [];
    } catch (err) {
      logError('Gap Analysis', err, { step: 'saturation-subNiches', category: cat });
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
  products: { id: string; name: string; category: string; comments: string }[]
): Promise<{ complaints: ComplaintAnalysis[]; clusters: ComplaintCluster[] }> {
  const complaints = await retryWithBackoff(
    () => withTimeout(
      () => generateStructuredResponse<ComplaintAnalysis[]>(
        `You are a rigorous product review analyst. Analyze the product data below and extract common complaints.

RULES FOR SPECIFIC OUTPUT:
1. Each complaint text must be SPECIFIC and cite real details from the data — not a vague summary.
   - WRONG: "Users complain about pricing"
   - RIGHT: "7 out of 12 users in comments mention the $29/month tier is too expensive for freelancers who process fewer than 10 documents/month"
2. Cite specific product names, prices, or feature names in the complaint text.
3. Count accurately: if 5 comments mention slow performance, the frequency should be 5, not 10.
4. Every complaint must be grounded in the actual comments/reviews data provided.

For each complaint, provide:
- text: A specific complaint description with evidence (product names, prices, feature names)
- category: One of "pricing", "missing_feature", "performance", "ux", "support", "integration"
- sentiment: One of "negative", "neutral", "mixed"
- frequency: How many distinct users/comments express this complaint (1-10 scale)

Extract 3-10 distinct complaints. Base your analysis ONLY on the actual product comments and reviews data provided.`,
        `Analyze these products for common complaints:\n\n${productsContext}`,
        `Return a JSON array of objects with fields: text (string), category (string), sentiment (string), frequency (number)`
      ),
      LLM_TIMEOUT_MS,
      'Gap Analysis'
    ),
    { maxRetries: MAX_RETRIES },
    'Gap Analysis'
  );

  const safeComplaints = Array.isArray(complaints) ? complaints : [];

  // Delay before next LLM call to avoid rate limits
  await new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));

  // Generate complaint clusters (with timeout + retry)
  let clusters: ComplaintCluster[] = [];
  try {
    clusters = await retryWithBackoff(
      () => withTimeout(
        () => generateStructuredResponse<ComplaintCluster[]>(
          `You are a data analyst specializing in complaint clustering. Group the following complaints into clusters by theme.

RULES:
1. Each cluster's "percentage" must represent what share of total complaints fall in this cluster.
2. All cluster percentages MUST add up to approximately 100% (between 95% and 105% is acceptable).
3. Each cluster MUST include 1-2 ACTUAL QUOTED complaint text snippets — not paraphrased summaries.
   - WRONG exampleSnippet: "Users find it expensive"
   - RIGHT exampleSnippet: "7 out of 12 users mention the $29/month tier is too expensive for freelancers"
4. Count must be an integer ≥ 1, and should be consistent with the percentage and total number of complaints.
5. Group into 3-6 clusters. Each cluster should represent a DISTINCT theme.

For each cluster, provide:
- category: The complaint category (e.g., "pricing", "missing_feature", "performance", "ux", "support", "integration")
- label: A short, specific human-readable label (e.g., "Freemium pricing too limited for power users")
- percentage: What % of total complaints this cluster represents (clusters must total ~100%)
- count: Number of complaints in this cluster
- exampleSnippets: 1-2 ACTUAL QUOTED snippets from the complaint text above (copy verbatim, do not paraphrase)`,
          `Complaints to cluster (${safeComplaints.length} total):\n${safeComplaints.map(c => `[${c.category}] "${c.text}" (frequency: ${c.frequency})`).join('\n')}`,
          `Return a JSON array of objects with fields: category (string), label (string), percentage (number), count (number), exampleSnippets (string[])`
        ),
        LLM_TIMEOUT_MS,
        'Gap Analysis'
      ),
      { maxRetries: MAX_RETRIES },
      'Gap Analysis'
    );
    if (!Array.isArray(clusters)) clusters = [];
  } catch (err) {
    logError('Gap Analysis', err, { step: 'complaintClusters' });
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
      logError('Gap Analysis', err, { step: 'saveComplaint' });
    }
  }

  return { complaints: safeComplaints, clusters };
}
