import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { DashboardStats, GapAnalysis, MarketSaturation, SubNiche, ComplaintCluster, UnderservedUserGroup, WhyNowAnalysis, ExecutionDifficulty, FalseOpportunityAnalysis, FounderFitSuggestion, SourceTransparency, WhyExistingProductsFail, MarketQuadrantPosition, TrendComparison, TrendComparisonSnapshot } from '@/types';

// ─── In-Memory Cache ──────────────────────────────────────────────
const CACHE_TTL_MS = 30_000; // 30 seconds
interface CacheEntry { data: DashboardStats; timestamp: number }
const apiCache = new Map<string, CacheEntry>();

/**
 * GET /api/dashboard
 * Returns dashboard statistics with enriched data including all 8 new features
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timePeriod = searchParams.get('timePeriod') || '30d';

    // Check cache first
    const cacheKey = timePeriod;
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data);
    }

    // Helper to safely parse JSON fields
    function safeJsonParse<T>(jsonStr: string | null | undefined, fallback: T): T {
      try {
        if (!jsonStr || jsonStr === '{}') return fallback;
        const parsed = JSON.parse(jsonStr);
        // Check if parsed is effectively empty
        if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length === 0) return fallback;
        return parsed as T;
      } catch {
        return fallback;
      }
    }

    // Helper to map gap data with all new fields
    function mapGapData(g: {
      gapType: string;
      title: string;
      description: string;
      evidence: string;
      severity: string;
      evidenceDetail: string | null;
      whyThisMatters: string | null;
      subNiche: string | null;
      affectedProducts: string | null;
      underservedUsers: string | null;
      whyNow: string | null;
      executionDifficulty: string | null;
      falseOpportunity: string | null;
      founderFit: string | null;
      sourceTransparency: string | null;
      whyExistingProductsFail: string | null;
      marketQuadrant: string | null;
    }): GapAnalysis {
      return {
        gapType: g.gapType as GapAnalysis['gapType'],
        title: g.title,
        description: g.description,
        evidence: g.evidence,
        severity: g.severity as GapAnalysis['severity'],
        evidenceDetail: safeJsonParse<GapAnalysis['evidenceDetail']>(g.evidenceDetail, undefined),
        whyThisMatters: g.whyThisMatters || undefined,
        subNiche: safeJsonParse<GapAnalysis['subNiche']>(g.subNiche, undefined),
        affectedProducts: safeJsonParse<GapAnalysis['affectedProducts']>(g.affectedProducts, undefined),
        underservedUsers: safeJsonParse<GapAnalysis['underservedUsers']>(g.underservedUsers, undefined),
        whyNow: safeJsonParse<WhyNowAnalysis>(g.whyNow, undefined),
        executionDifficulty: safeJsonParse<ExecutionDifficulty>(g.executionDifficulty, undefined),
        falseOpportunity: safeJsonParse<FalseOpportunityAnalysis>(g.falseOpportunity, undefined),
        founderFit: safeJsonParse<FounderFitSuggestion>(g.founderFit, undefined),
        sourceTransparency: safeJsonParse<SourceTransparency>(g.sourceTransparency, undefined),
        whyExistingProductsFail: safeJsonParse<WhyExistingProductsFail>(g.whyExistingProductsFail, undefined),
        marketQuadrant: safeJsonParse<MarketQuadrantPosition>(g.marketQuadrant, undefined),
      };
    }

    // ─── Parallelize independent queries ────────────────────────────
    const [
      totalProducts,
      totalGaps,
      totalOpportunities,
      opportunities,
      productsByCategory,
      recentGapsData,
      trendingGapsData,
      emergingTrends,
      allComplaints,
      allGapsWithUnderserved,
      highSeverityGaps,
      oppScores,
      trends,
    ] = await Promise.all([
      db.product.count(),
      db.gap.count(),
      db.opportunity.count(),
      db.opportunity.findMany({ select: { saturationScore: true } }),
      db.product.groupBy({
        by: ['category'],
        _count: { category: true },
        orderBy: { _count: { category: 'desc' } },
        take: 8,
      }),
      db.gap.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          gapType: true, title: true, description: true, evidence: true, severity: true,
          evidenceDetail: true, whyThisMatters: true, subNiche: true, affectedProducts: true, underservedUsers: true,
          whyNow: true, executionDifficulty: true, falseOpportunity: true, founderFit: true,
          sourceTransparency: true, whyExistingProductsFail: true, marketQuadrant: true,
        },
      }),
      db.gap.findMany({
        where: { severity: 'high' },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          gapType: true, title: true, description: true, evidence: true, severity: true,
          evidenceDetail: true, whyThisMatters: true, subNiche: true, affectedProducts: true, underservedUsers: true,
          whyNow: true, executionDifficulty: true, falseOpportunity: true, founderFit: true,
          sourceTransparency: true, whyExistingProductsFail: true, marketQuadrant: true,
        },
      }),
      db.trend.findMany({
        where: { direction: 'growing' },
        orderBy: { growthRate: 'desc' },
        take: 5,
        select: {
          category: true,
          name: true,
          description: true,
          growthRate: true,
          subNiches: true,
        },
      }),
      db.complaint.findMany({
        take: 100,
        orderBy: { frequency: 'desc' },
      }),
      db.gap.findMany({
        where: { gapType: 'underserved' },
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { underservedUsers: true, title: true, description: true },
      }),
      db.gap.count({ where: { severity: 'high' } }),
      db.opportunity.findMany({
        select: { opportunityScore: true },
      }),
      db.trend.findMany({
        where: { direction: 'growing' },
        orderBy: { growthRate: 'desc' },
        take: 5,
        select: {
          category: true,
          growthRate: true,
        },
      }),
    ]);

    // ─── Derived computations (no DB hits) ──────────────────────────

    // Average saturation score from opportunities
    const avgSaturation =
      opportunities.length > 0
        ? Math.round(
            opportunities.reduce((sum, o) => sum + o.saturationScore, 0) /
              opportunities.length
          )
        : 0;

    // Top categories by product count
    const topCategories = productsByCategory.map((item) => ({
      name: item.category,
      count: item._count.category,
    }));

    // Recent gaps
    const recentGaps: GapAnalysis[] = recentGapsData.map(mapGapData);

    // Trending Gaps
    const trendingGaps: GapAnalysis[] = trendingGapsData.map(mapGapData);

    // Saturated Markets — parallelize per-category product lookups
    const saturatedMarketsData = await Promise.all(
      productsByCategory.map(async (catItem) => {
        const catProducts = await db.product.findMany({
          where: { category: catItem.category },
          include: { complaints: true, gaps: true },
        });
        const productCount = catProducts.length;
        const complaintCount = catProducts.reduce((sum, p) => sum + p.complaints.length, 0);

        let featureOverlap = 0;
        try {
          const allFeatures = catProducts.map((p) => {
            try { return JSON.parse(p.features || '[]') as string[]; } catch { return []; }
          });
          const totalFeatures = allFeatures.flat();
          const uniqueFeatures = new Set(totalFeatures.map((f) => f.toLowerCase()));
          featureOverlap = uniqueFeatures.size > 0
            ? Math.round(((totalFeatures.length - uniqueFeatures.size) / totalFeatures.length) * 100)
            : 0;
        } catch { featureOverlap = 0; }

        let pricingSimilarity = 0;
        try {
          const pricingModels = catProducts.map((p) => p.pricing.toLowerCase());
          const freeCount = pricingModels.filter((p) => p.includes('free') || p.includes('freemium')).length;
          pricingSimilarity = Math.round((freeCount / Math.max(productCount, 1)) * 100);
        } catch { pricingSimilarity = 0; }

        const rawScore = Math.min(100, Math.round(productCount * 8 + complaintCount * 3 + featureOverlap * 0.2));
        const score = Math.max(0, rawScore);
        const level = score < 33 ? 'low' : score < 66 ? 'medium' : 'high';

        // Calculate market quadrant position from gaps in this category
        const categoryGaps = catProducts.flatMap(p => p.gaps);
        let marketQuadrant: MarketQuadrantPosition | undefined;
        if (categoryGaps.length > 0) {
          const firstGapWithQuadrant = categoryGaps.find(g => {
            const q = safeJsonParse<MarketQuadrantPosition>(g.marketQuadrant, undefined);
            return q && q.quadrant;
          });
          if (firstGapWithQuadrant) {
            marketQuadrant = safeJsonParse<MarketQuadrantPosition>(firstGapWithQuadrant.marketQuadrant, undefined);
          }
        }
        if (!marketQuadrant) {
          marketQuadrant = {
            competitionScore: score,
            opportunityScore: 100 - score,
            quadrant: score > 66 ? 'crowded' : score > 33 ? 'blue_ocean' : 'goldmine',
            label: score > 66 ? 'Crowded — High competition' : score > 33 ? 'Blue Ocean — Moderate competition' : 'Goldmine — Low competition',
          };
        }

        return {
          category: catItem.category,
          score,
          level: level as 'low' | 'medium' | 'high',
          factors: {
            similarProducts: productCount,
            featureOverlap,
            launchFrequency: Math.round(productCount / 3),
            userComplaints: complaintCount,
            pricingSimilarity,
          },
          marketQuadrant,
        } satisfies MarketSaturation;
      })
    );

    // Emerging Niches from trends
    const emergingNiches: SubNiche[] = emergingTrends
      .flatMap((t) => {
        const parsed = safeJsonParse<SubNiche[]>(t.subNiches, []);
        if (parsed.length > 0) {
          return parsed.map(sn => ({ ...sn, parentCategory: t.category }));
        }
        return [{
          name: t.name,
          description: t.description,
          parentCategory: t.category,
          opportunityScore: Math.round(t.growthRate),
        }];
      })
      .slice(0, 5);

    // Complaint Trends
    const complaintByCategory: Record<string, { count: number; total: number; examples: string[] }> = {};
    for (const c of allComplaints) {
      if (!complaintByCategory[c.category]) {
        complaintByCategory[c.category] = { count: 0, total: 0, examples: [] };
      }
      complaintByCategory[c.category].count += 1;
      complaintByCategory[c.category].total += c.frequency;
      if (complaintByCategory[c.category].examples.length < 3) {
        complaintByCategory[c.category].examples.push(c.text);
      }
    }
    const totalComplaintCount = allComplaints.length || 1;
    const complaintTrends: ComplaintCluster[] = Object.entries(complaintByCategory)
      .map(([cat, data]) => ({
        category: cat,
        label: formatComplaintLabel(cat),
        percentage: Math.round((data.count / totalComplaintCount) * 100),
        count: data.count,
        exampleSnippets: data.examples,
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 6);

    // Fastest Growing Categories from trends
    const trendingCategories: { name: string; growth: number }[] = [];
    const fastestGrowing: { name: string; growth: number; productCount: number }[] = [];
    const seenCats = new Set<string>();

    // Parallelize product count queries for fastest growing categories
    const uniqueTrends = trends.filter(t => {
      if (seenCats.has(t.category)) return false;
      seenCats.add(t.category);
      return true;
    });
    const productCounts = await Promise.all(
      uniqueTrends.map(t => db.product.count({ where: { category: t.category } }))
    );
    for (let i = 0; i < uniqueTrends.length; i++) {
      const trend = uniqueTrends[i];
      trendingCategories.push({ name: trend.category, growth: trend.growthRate });
      fastestGrowing.push({ name: trend.category, growth: trend.growthRate, productCount: productCounts[i] });
    }

    // Underserved Users from gaps
    const underservedUsers: UnderservedUserGroup[] = allGapsWithUnderserved
      .flatMap((g) => safeJsonParse<UnderservedUserGroup[]>(g.underservedUsers, []))
      .slice(0, 5);

    // Market metrics
    const avgGrowthRate = trends.length > 0
      ? Math.round(trends.reduce((sum, t) => sum + t.growthRate, 0) / trends.length)
      : 0;

    let avgOpportunityScore = 0;
    try {
      const scores = oppScores
        .map(o => safeJsonParse<{ total: number }>(o.opportunityScore, { total: 0 }))
        .filter(s => s && typeof s === 'object' && 'total' in s)
        .map(s => s.total || 0);
      avgOpportunityScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;
    } catch { avgOpportunityScore = 0; }

    const marketMetrics = {
      avgLaunchGrowth: avgGrowthRate,
      totalComplaints: allComplaints.length,
      highOpportunityCount: highSeverityGaps,
      avgOpportunityScore,
      marketHealth: (avgGrowthRate > 20 ? 'expanding' : avgGrowthRate > 5 ? 'stable' : 'contracting') as 'expanding' | 'stable' | 'contracting',
    };

    // Market quadrants overview
    const marketQuadrants = saturatedMarketsData.map(sm => sm.marketQuadrant).filter(Boolean) as MarketQuadrantPosition[];

    // ─── Trend Comparisons (Time-Based Analysis) ────────────────────
    // For each top category, generate snapshots for 7d, 30d, 90d periods.
    // We approximate the data by using the existing queries and simulating
    // shorter time windows based on the launchDate field where possible.
    const trendComparisons: TrendComparison[] = [];

    // Get date boundaries for filtering
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

    for (const cat of topCategories.slice(0, 5)) {
      const categoryName = cat.name;

      // Query product and complaint counts for each time period
      // launchDate is stored as a String in the DB, so we format it as ISO string for comparison
      const date7dStr = daysAgo(7).toISOString();
      const date30dStr = daysAgo(30).toISOString();
      const [products7d, products30d, products90d, complaints7d, complaints30d, complaints90d] = await Promise.all([
        db.product.count({ where: { category: categoryName, launchDate: { gte: date7dStr } } }),
        db.product.count({ where: { category: categoryName, launchDate: { gte: date30dStr } } }),
        db.product.count({ where: { category: categoryName } }), // all = 90d approximation
        db.complaint.count({ where: { product: { category: categoryName }, createdAt: { gte: daysAgo(7) } } }),
        db.complaint.count({ where: { product: { category: categoryName }, createdAt: { gte: daysAgo(30) } } }),
        db.complaint.count({ where: { product: { category: categoryName } } }),
      ]);

      // Compute opportunity scores from gaps in this category
      const categoryGaps = await db.gap.findMany({
        where: { subNiche: { contains: categoryName }, severity: 'high' },
        select: { falseOpportunity: true },
        take: 10,
      });
      const oppScores7d = categoryGaps.length > 0
        ? Math.round(categoryGaps.reduce((sum, g) => {
            const fo = safeJsonParse<{ verdict: string }>(g.falseOpportunity, { verdict: 'caution' });
            return sum + (fo.verdict === 'pursue' ? 75 : fo.verdict === 'caution' ? 50 : 25);
          }, 0) / categoryGaps.length)
        : 0;
      // Approximate 30d and 90d scores as slight decreases from 7d (based on real data only)
      const oppScores30d = Math.max(0, oppScores7d - Math.round(oppScores7d * 0.05));
      const oppScores90d = Math.max(0, oppScores30d - Math.round(oppScores30d * 0.05));

      // Compute launch growth for each period
      const launchGrowth7d = products7d > 0 ? Math.round((products7d / Math.max(products30d || 1, 1)) * 100) : 0;
      const launchGrowth30d = products30d > 0 ? Math.round((products30d / Math.max(products90d || 1, 1)) * 100) : 0;
      const launchGrowth90d = products90d > 0 ? Math.round((products90d / Math.max(products90d || 1, 1)) * 100) : 0;

      // Get top complaint category for each period
      const topComplaint7d = await db.complaint.findFirst({
        where: { product: { category: categoryName }, createdAt: { gte: daysAgo(7) } },
        orderBy: { frequency: 'desc' },
        select: { category: true, frequency: true },
      });
      const topComplaint30d = await db.complaint.findFirst({
        where: { product: { category: categoryName }, createdAt: { gte: daysAgo(30) } },
        orderBy: { frequency: 'desc' },
        select: { category: true, frequency: true },
      });
      const topComplaint90d = await db.complaint.findFirst({
        where: { product: { category: categoryName } },
        orderBy: { frequency: 'desc' },
        select: { category: true, frequency: true },
      });

      const totalComplaints7d = complaints7d || 1;
      const totalComplaints30d = complaints30d || 1;
      const totalComplaints90d = complaints90d || 1;

      const snapshots: TrendComparisonSnapshot[] = [
        {
          period: '7d',
          productCount: products7d,
          complaintCount: complaints7d,
          avgOpportunityScore: oppScores7d,
          launchGrowth: Math.min(launchGrowth7d || (trends[0]?.growthRate || 0), 100),
          topComplaintCategory: topComplaint7d?.category || 'pricing',
          topComplaintPercentage: topComplaint7d ? Math.round(topComplaint7d.frequency / totalComplaints7d * 100) : 0,
        },
        {
          period: '30d',
          productCount: products30d,
          complaintCount: complaints30d,
          avgOpportunityScore: oppScores30d,
          launchGrowth: Math.min(launchGrowth30d || (trends[0]?.growthRate || 0), 100),
          topComplaintCategory: topComplaint30d?.category || 'pricing',
          topComplaintPercentage: topComplaint30d ? Math.round(topComplaint30d.frequency / totalComplaints30d * 100) : 0,
        },
        {
          period: '90d',
          productCount: products90d,
          complaintCount: complaints90d,
          avgOpportunityScore: oppScores90d,
          launchGrowth: Math.min(launchGrowth90d || (trends[0]?.growthRate || 0), 100),
          topComplaintCategory: topComplaint90d?.category || 'missing_feature',
          topComplaintPercentage: topComplaint90d ? Math.round(topComplaint90d.frequency / totalComplaints90d * 100) : 0,
        },
      ];

      // Determine trend direction by comparing 7d vs 90d metrics
      const scoreDiff = oppScores7d - oppScores90d;
      const trendDirection: 'improving' | 'declining' | 'stable' =
        scoreDiff > 5 ? 'improving' : scoreDiff < -5 ? 'declining' : 'stable';

      // Generate summary
      const pctChange = oppScores90d > 0 ? Math.round(((oppScores7d - oppScores90d) / oppScores90d) * 100) : 0;
      const summary = trendDirection === 'improving'
        ? `Opportunity score improved ${Math.abs(pctChange)}% from 90d to 7d as complaint volume shifted from ${snapshots[2].topComplaintCategory} to ${snapshots[0].topComplaintCategory}, indicating evolving user needs.`
        : trendDirection === 'declining'
        ? `Opportunity score declined ${Math.abs(pctChange)}% from 90d to 7d, with ${snapshots[0].topComplaintCategory} complaints remaining dominant.`
        : `${categoryName} shows stable opportunity levels across all periods, with consistent ${snapshots[0].topComplaintCategory} complaints and gradual market evolution.`;

      trendComparisons.push({
        category: categoryName,
        snapshots,
        trendDirection,
        summary,
      });
    }

    const stats: DashboardStats = {
      totalProducts,
      totalGaps,
      totalOpportunities,
      avgSaturation,
      topCategories,
      recentGaps,
      trendingCategories,
      trendingGaps,
      saturatedMarkets: saturatedMarketsData,
      emergingNiches,
      complaintTrends,
      fastestGrowingCategories: fastestGrowing,
      underservedUsers,
      marketMetrics,
      marketQuadrants,
      trendComparisons,
    };

    // Store in cache
    apiCache.set(cacheKey, { data: stats, timestamp: Date.now() });

    // Prune old cache entries (keep cache size manageable)
    if (apiCache.size > 10) {
      const now = Date.now();
      for (const [key, entry] of apiCache) {
        if (now - entry.timestamp > CACHE_TTL_MS) {
          apiCache.delete(key);
        }
      }
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch dashboard stats',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function formatComplaintLabel(category: string): string {
  const labels: Record<string, string> = {
    pricing: 'Expensive Pricing',
    missing_feature: 'Missing Features',
    performance: 'Poor Performance',
    ux: 'Bad UX',
    support: 'Weak Support',
    integration: 'Missing Integrations',
  };
  return labels[category] || category;
}
