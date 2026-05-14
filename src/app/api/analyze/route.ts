import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generateStructuredResponse } from '@/lib/zai';
import type { GapAnalysis, MarketSaturation, ComplaintAnalysis } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, analysisType = 'full' } = body;

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    // Fetch products from DB for the given category
    const products = await db.product.findMany({
      where: category === 'all' ? {} : { category },
      include: { gaps: true, complaints: true },
    });

    if (products.length === 0) {
      return NextResponse.json(
        { error: 'No products found for this category. Run a scan first.' },
        { status: 404 }
      );
    }

    const result: {
      gaps: GapAnalysis[];
      saturation: MarketSaturation[];
      complaints: ComplaintAnalysis[];
    } = {
      gaps: [],
      saturation: [],
      complaints: [],
    };

    // Prepare product summaries for LLM analysis
    const productSummaries = products.map((p) => ({
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      features: p.features,
      pricing: p.pricing,
      upvotes: p.upvotes,
      reviewScore: p.reviewScore,
      comments: p.comments,
    }));

    const productsContext = JSON.stringify(productSummaries, null, 2);

    // Run gaps analysis
    if (analysisType === 'gaps' || analysisType === 'full') {
      result.gaps = await analyzeGaps(productsContext, products);
    }

    // Run saturation analysis
    if (analysisType === 'saturation' || analysisType === 'full') {
      result.saturation = await analyzeSaturation(productsContext, category, products);
    }

    // Run complaints analysis
    if (analysisType === 'complaints' || analysisType === 'full') {
      result.complaints = await analyzeComplaints(productsContext, products);
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
  products: { id: string; name: string; category: string }[]
): Promise<GapAnalysis[]> {
  const gaps = await generateStructuredResponse<GapAnalysis[]>(
    `You are a product market analyst specializing in identifying gaps in product markets. 
Analyze the given products and identify market gaps. Focus on these gap types:
- missing_feature: Features that users commonly need but are absent across products
- weak_ux: Products with poor user experience or usability issues
- expensive: Products that are overpriced relative to their value
- underserved: User segments or use cases that are not well served
- overcrowded: Areas with too many similar products competing for the same users

For each gap, provide:
- gapType: One of the gap types above
- title: A concise title for the gap
- description: Detailed description of the gap and its implications
- evidence: Specific evidence from the product data that supports this gap
- severity: "low", "medium", or "high" based on market impact

Identify 3-8 meaningful gaps. Base your analysis ONLY on the product data provided.`,
    `Analyze these products for market gaps:\n\n${productsContext}`,
    `Return a JSON array of objects with fields: gapType (string), title (string), description (string), evidence (string), severity (string: "low"|"medium"|"high")`
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
  products: { id: string; name: string; features: string; pricing: string; comments: string; category: string }[]
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
    });
  }

  return saturationResults;
}

async function analyzeComplaints(
  productsContext: string,
  products: { id: string; name: string; comments: string }[]
): Promise<ComplaintAnalysis[]> {
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

  return safeComplaints;
}
