import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateStructuredResponse } from '@/lib/zai';
import type { GapAnalysis, MarketSaturation, ComplaintAnalysis, ComplaintCluster, EvidenceDetail, SubNiche, ProductReference, UnderservedUserGroup } from '@/types';

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
      features: safeJsonParse(p.features, []),
      pricing: p.pricing,
      upvotes: p.upvotes,
      reviewScore: p.reviewScore,
      comments: safeJsonParse(p.comments, []),
      category: p.category,
    }));

    const productsContext = JSON.stringify(productSummaries, null, 2);

    // Run gaps analysis
    if (analysisType === 'gaps' || analysisType === 'full') {
      result.gaps = await analyzeGaps(productsContext, effectiveProducts, timePeriod);
    }

    // Run saturation analysis
    if (analysisType === 'saturation' || analysisType === 'full') {
      result.saturation = await analyzeSaturation(productsContext, category, effectiveProducts);
    }

    // Run complaints analysis
    if (analysisType === 'complaints' || analysisType === 'full') {
      const complaintResult = await analyzeComplaints(productsContext, effectiveProducts);
      result.complaints = complaintResult.complaints;
      result.complaintClusters = complaintResult.clusters;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analyze error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze products',
        details: error instanceof Error ? error.message : 'Unknown error',
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
  const gaps = await generateStructuredResponse<GapAnalysis[]>(
    `You are a product market analyst specializing in identifying gaps in product markets. 
Analyze the given products and identify market gaps. Focus on these gap types:
- missing_feature: Features that users commonly need but are absent across products
- weak_ux: Products with poor user experience or usability issues
- expensive: Products that are overpriced relative to their value
- underserved: User segments or use cases that are not well served
- overcrowded: Areas with too many similar products competing for the same users

CRITICAL: For each gap, you MUST provide:
- gapType: One of the gap types above
- title: A concise title for the gap
- description: Detailed description of the gap and its implications
- evidence: Specific evidence from the product data that supports this gap
- severity: "low", "medium", or "high" based on market impact

- evidenceDetail: Object with:
  - similarProducts: number of similar products in the data
  - repeatedComplaints: count of complaints supporting this gap
  - launchFrequency: how many products launched recently in this space (number)
  - commentSnippets: array of 2-3 actual comment snippets that support this gap
  - pricingOverlap: percentage (0-100) of products with similar pricing

- whyThisMatters: A business-oriented explanation of why this gap matters. Example: "Freelancers avoid premium AI writing tools because subscription costs exceed the value generated for low-volume users."

- subNiche: Object with:
  - name: Specific sub-niche name (e.g., "ATS resume tools for engineering students" not just "resume tools")
  - description: What this sub-niche encompasses
  - parentCategory: The broader category this falls under
  - opportunityScore: 0-100 score for this sub-niche

- affectedProducts: Array of 2-3 real product objects with:
  - name: Product name from the data
  - pricing: Their pricing model
  - strengths: 1-2 key strengths
  - weaknesses: 1-2 key weaknesses related to this gap

- underservedUsers: Array of 1-2 underserved user groups with:
  - userGroup: Name of the underserved group (e.g., "junior developers", "elderly users", "rural users")
  - description: Why this group is underserved
  - evidence: Specific evidence from the data
  - opportunityScore: 0-100 score

Identify 3-8 meaningful gaps. Base your analysis ONLY on the product data provided. Be specific, not generic.`,
    `Analyze these products for market gaps (time period: ${timePeriod}):\n\n${productsContext}`,
    `Return a JSON array of objects with fields: gapType (string), title (string), description (string), evidence (string), severity (string: "low"|"medium"|"high"), evidenceDetail (object: { similarProducts: number, repeatedComplaints: number, launchFrequency: number, commentSnippets: string[], pricingOverlap: number }), whyThisMatters (string), subNiche (object: { name: string, description: string, parentCategory: string, opportunityScore: number }), affectedProducts (array of { name: string, pricing: string, strengths: string[], weaknesses: string[] }), underservedUsers (array of { userGroup: string, description: string, evidence: string, opportunityScore: number })`
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
          },
        });
      }
    } catch (err) {
      console.error('Failed to save gap:', err);
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

    // PRIORITY 3: Generate competitor breakdown using LLM
    let topCompetitors: ProductReference[] = [];
    try {
      topCompetitors = await generateStructuredResponse<ProductReference[]>(
        `You are a competitive analyst. Based on the product data, identify the top 3 competitors in the "${cat}" category.
For each competitor, provide:
- name: Product name
- pricing: Their pricing model
- strengths: Array of 1-2 key competitive strengths
- weaknesses: Array of 1-2 key weaknesses

Be specific and base your analysis on the product data provided.`,
        `Products in category "${cat}":\n${JSON.stringify(catProducts.map(p => ({ name: p.name, pricing: p.pricing, tagline: p.tagline, upvotes: p.upvotes, reviewScore: p.reviewScore })), null, 2)}`,
        `Return a JSON array of objects with fields: name (string), pricing (string), strengths (string[]), weaknesses (string[])`
      );
      if (!Array.isArray(topCompetitors)) topCompetitors = [];
    } catch {
      topCompetitors = [];
    }

    // PRIORITY 7: Generate sub-niches using LLM
    let subNiches: SubNiche[] = [];
    try {
      subNiches = await generateStructuredResponse<SubNiche[]>(
        `You are a market niche analyst. Based on the product data, identify 2-3 specific sub-niches within the "${cat}" category.
IMPORTANT: Be SPECIFIC. Not "AI coding tools" but "AI debugging assistants for junior developers".
For each sub-niche:
- name: Specific sub-niche name
- description: What this sub-niche encompasses
- parentCategory: "${cat}"
- opportunityScore: 0-100 score (higher = better opportunity)`,
        `Products in category "${cat}":\n${JSON.stringify(catProducts.map(p => ({ name: p.name, pricing: p.pricing, tagline: p.tagline, description: p.description.substring(0, 200) })), null, 2)}`,
        `Return a JSON array of objects with fields: name (string), description (string), parentCategory (string), opportunityScore (number)`
      );
      if (!Array.isArray(subNiches)) subNiches = [];
    } catch {
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
  products: { id: string; name: string; comments: string }[]
): Promise<{ complaints: ComplaintAnalysis[]; clusters: ComplaintCluster[] }> {
  const complaints = await generateStructuredResponse<ComplaintAnalysis[]>(
    `You are a product review analyst. Analyze the product data below and extract common complaints.
For each complaint, provide:
- text: The complaint description
- category: One of "pricing", "missing_feature", "performance", "ux", "support", "integration"
- sentiment: One of "negative", "neutral", "mixed"
- frequency: How commonly this complaint appears (1-10 scale)

Focus on recurring themes and patterns. Extract 3-10 distinct complaints.
Base your analysis on the actual product comments and reviews data provided.`,
    `Analyze these products for common complaints:\n\n${productsContext}`,
    `Return a JSON array of objects with fields: text (string), category (string), sentiment (string), frequency (number)`
  );

  const safeComplaints = Array.isArray(complaints) ? complaints : [];

  // PRIORITY 2: Generate complaint clusters
  let clusters: ComplaintCluster[] = [];
  try {
    clusters = await generateStructuredResponse<ComplaintCluster[]>(
      `You are a data analyst. Group the following complaints into clusters by theme.
For each cluster, provide:
- category: The complaint category (e.g., "pricing", "missing_feature", "performance", "ux", "support", "integration")
- label: A short human-readable label (e.g., "Expensive pricing")
- percentage: What percentage of total complaints this cluster represents (must add up to ~100%)
- count: Number of complaints in this cluster
- exampleSnippets: 1-2 example snippets from the complaints

Group into 3-6 clusters. Percentages must approximately total 100%.`,
      `Complaints to cluster:\n${safeComplaints.map(c => `[${c.category}] ${c.text} (frequency: ${c.frequency})`).join('\n')}`,
      `Return a JSON array of objects with fields: category (string), label (string), percentage (number), count (number), exampleSnippets (string[])`
    );
    if (!Array.isArray(clusters)) clusters = [];
  } catch {
    clusters = [];
  }

  // Save complaints to the database
  for (const complaint of safeComplaints) {
    try {
      const targetProduct = products[0];
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
      console.error('Failed to save complaint:', err);
    }
  }

  return { complaints: safeComplaints, clusters };
}

function safeJsonParse(jsonStr: string, fallback: unknown): unknown {
  try {
    return JSON.parse(jsonStr || '[]');
  } catch {
    return fallback;
  }
}
