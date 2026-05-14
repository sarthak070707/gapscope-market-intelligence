import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { webSearch, generateStructuredResponse } from '@/lib/zai';
import type { TrendData, CompetitorComparison, SubNiche, UnderservedUserGroup } from '@/types';

/**
 * GET /api/trends
 * List all trends, with optional ?category=xxx filter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const where: Record<string, unknown> = {};
    if (category && category !== 'all') {
      where.category = category;
    }

    const trends = await db.trend.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Parse JSON string fields for frontend consumption
    const parsed = trends.map((trend) => ({
      ...trend,
      dataPoints: safeJsonParse(trend.dataPoints, []),
      subNiches: safeJsonParse(trend.subNiches, []),
      underservedUsers: safeJsonParse(trend.underservedUsers, []),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('List trends error:', error);
    return NextResponse.json(
      {
        error: 'Failed to list trends',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trends
 * Two actions:
 * - { action: 'detect', category }: Detect trending categories on Product Hunt
 * - { action: 'compare', productIds, category }: Compare specific products
 * Also supports just { category } as shorthand for detect
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, category } = body;

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    // Default action is 'detect' if not specified
    const effectiveAction = action || 'detect';

    if (effectiveAction === 'detect') {
      return await handleDetectTrends(category);
    } else if (effectiveAction === 'compare') {
      return await handleCompareProducts(body);
    } else {
      return NextResponse.json(
        { error: `Unknown action: ${effectiveAction}. Use "detect" or "compare".` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Trends POST error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process trends request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Detect trending categories on Product Hunt using web search + LLM
 */
async function handleDetectTrends(category: string) {
  // Search for trending products and categories on Product Hunt
  const searchQuery1 = `site:producthunt.com trending ${category} 2025`;
  const searchQuery2 = `product hunt ${category} trends growth 2025`;

  const [searchResult1, searchResult2] = await Promise.all([
    webSearch(searchQuery1, 10).catch(() => []),
    webSearch(searchQuery2, 10).catch(() => []),
  ]);

  const allResults = [
    ...(Array.isArray(searchResult1) ? searchResult1 : []),
    ...(Array.isArray(searchResult2) ? searchResult2 : []),
  ];

  const searchContext = allResults
    .map(
      (r: Record<string, unknown>) =>
        `Title: ${r.name || r.title || ''}\nSnippet: ${r.snippet || ''}\nURL: ${r.url || ''}`
    )
    .join('\n\n');

  if (!searchContext.trim()) {
    return NextResponse.json(
      { error: 'No search results found for trend detection' },
      { status: 404 }
    );
  }

  // Also fetch existing product data from DB for context
  const existingProducts = await db.product.findMany({
    where: category === 'all' ? {} : { category },
    take: 20,
  });

  const productContext = existingProducts
    .map((p) => `${p.name} (${p.pricing}, ${p.upvotes} upvotes, launched ${p.launchDate})`)
    .join('\n');

  // Use LLM to detect trends from search results - with sub-niches and underserved users
  const trends = await generateStructuredResponse<TrendData[]>(
    `You are a market trend analyst specializing in Product Hunt and tech product trends. 
Analyze the search results and existing product data to identify trending patterns.

For each trend, provide:
- category: "${category}"
- name: A concise name for the trend
- description: Description of the trend and what's driving it
- growthRate: Estimated growth rate as a percentage
- direction: "growing", "declining", or "stable"
- dataPoints: Array of { label: string, value: number } representing trend data points over time (3-6 points)
- period: Time period this trend covers (e.g., "3 months", "6 months")

SUB-NICHE DETECTION (be SPECIFIC, not broad):
- subNiches: Array of 2-3 sub-niches with:
  - name: Specific sub-niche name (e.g., "AI debugging assistants for junior developers" not just "AI tools")
  - description: What this sub-niche encompasses
  - parentCategory: Broader category
  - opportunityScore: 0-100 score

UNDERSERVED USERS:
- underservedUsers: Array of 1-2 underserved user groups with:
  - userGroup: Name (e.g., "junior developers", "elderly users", "rural users")
  - description: Why they're underserved
  - evidence: Specific evidence from the data
  - opportunityScore: 0-100 score

Focus on:
1. Categories with increasing product launches
2. Emerging sub-categories or feature trends
3. Shifts in pricing models
4. Growing user demand patterns
5. Technology adoption trends

Identify 2-5 significant trends.`,
    `Search results:\n${searchContext}\n\nExisting products in DB:\n${productContext || 'None'}`,
    `Return a JSON array of objects with fields: category (string), name (string), description (string), growthRate (number), direction (string: "growing"|"declining"|"stable"), dataPoints (array of {label: string, value: number}), period (string), subNiches (array of {name: string, description: string, parentCategory: string, opportunityScore: number}), underservedUsers (array of {userGroup: string, description: string, evidence: string, opportunityScore: number})`
  );

  const safeTrends = Array.isArray(trends) ? trends : [];

  // Save detected trends to the database
  const savedTrends: TrendData[] = [];
  for (const trend of safeTrends) {
    try {
      const created = await db.trend.create({
        data: {
          category: trend.category || category,
          name: trend.name || 'Unnamed Trend',
          description: trend.description || '',
          growthRate: trend.growthRate || 0,
          direction: trend.direction || 'stable',
          dataPoints: JSON.stringify(trend.dataPoints || []),
          period: trend.period || '',
          subNiches: JSON.stringify(trend.subNiches || []),
          underservedUsers: JSON.stringify(trend.underservedUsers || []),
        },
      });
      savedTrends.push({
        ...trend,
        id: created.id,
      });
    } catch (err) {
      console.error('Failed to save trend:', err);
    }
  }

  return NextResponse.json(savedTrends);
}

/**
 * Compare specific products from the database using LLM
 */
async function handleCompareProducts(body: {
  productIds?: string[];
  category: string;
}) {
  const { productIds, category } = body;

  let products;
  if (productIds && Array.isArray(productIds) && productIds.length >= 2) {
    const areIds = productIds.every((id) => id.length > 10);
    if (areIds) {
      products = await db.product.findMany({
        where: { id: { in: productIds } },
        include: { gaps: true, complaints: true },
      });
    } else {
      products = await db.product.findMany({
        where: { name: { in: productIds } },
        include: { gaps: true, complaints: true },
      });
    }
  } else {
    products = await db.product.findMany({
      where: category === 'all' ? {} : { category },
      take: 5,
      include: { gaps: true, complaints: true },
    });
  }

  if (products.length < 2) {
    return NextResponse.json(
      { error: 'Could not find enough products for comparison. Run a scan first.' },
      { status: 404 }
    );
  }

  const comparisonContext = products
    .map((p) => {
      const features = safeJsonParse(p.features, []);
      const complaints = p.complaints.map((c) => c.text).slice(0, 5);
      return `
Product: ${p.name}
Tagline: ${p.tagline}
Description: ${p.description}
Pricing: ${p.pricing}
Upvotes: ${p.upvotes}
Review Score: ${p.reviewScore}
Features: ${JSON.stringify(features)}
Known Complaints: ${complaints.join('; ') || 'None'}
Gaps: ${p.gaps.map((g) => `${g.gapType}: ${g.title}`).join('; ') || 'None'}`;
    })
    .join('\n\n---\n\n');

  // Use LLM to compare products - with underserved users
  const comparison = await generateStructuredResponse<CompetitorComparison>(
    `You are a competitive product analyst. Compare the following products in the "${category}" category.
For each product, identify:
- Key pricing information
- Core features list (3-5 features)
- Review assessment (score 0-10)
- Strengths (competitive advantages, 2-3 items)
- Weaknesses (areas where it falls short, 2-3 items)

Also identify UNDERSERVED USER GROUPS:
- underservedUsers: Array of 2-3 user groups that these products collectively fail to serve well:
  - userGroup: Name of the group
  - description: Why they're underserved by current products
  - evidence: Specific evidence from the comparison
  - opportunityScore: 0-100

Then provide an overall comparison summary highlighting:
- Which products excel in which areas
- Key differentiators
- Market positioning insights

Be specific and evidence-based in your analysis.`,
    `Compare these products:\n\n${comparisonContext}`,
    `Return a JSON object with:
- products: array of { name (string), pricing (string), features (string[]), reviewScore (number), strengths (string[]), weaknesses (string[]) }
- underservedUsers: array of { userGroup (string), description (string), evidence (string), opportunityScore (number) }
- summary (string: overall comparison summary)`
  );

  return NextResponse.json(comparison);
}

function safeJsonParse(jsonStr: string, fallback: unknown): unknown {
  try {
    return JSON.parse(jsonStr || '[]');
  } catch {
    return fallback;
  }
}
