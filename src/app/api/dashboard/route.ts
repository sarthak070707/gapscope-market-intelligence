import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { DashboardStats, GapAnalysis, MarketSaturation, SubNiche, ComplaintCluster, UnderservedUserGroup, WhyNowAnalysis, ExecutionDifficulty, FalseOpportunityAnalysis, FounderFitSuggestion, SourceTransparency, WhyExistingProductsFail, MarketQuadrantPosition } from '@/types';

/**
 * GET /api/dashboard
 * Returns dashboard statistics with enriched data including all 8 new features
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timePeriod = searchParams.get('timePeriod') || '30d';

    // Total products count
    const totalProducts = await db.product.count();
    const totalGaps = await db.gap.count();
    const totalOpportunities = await db.opportunity.count();

    // Average saturation score from opportunities
    const opportunities = await db.opportunity.findMany({
      select: { saturationScore: true },
    });
    const avgSaturation =
      opportunities.length > 0
        ? Math.round(
            opportunities.reduce((sum, o) => sum + o.saturationScore, 0) /
              opportunities.length
          )
        : 0;

    // Top categories by product count
    const productsByCategory = await db.product.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
      take: 8,
    });
    const topCategories = productsByCategory.map((item) => ({
      name: item.category,
      count: item._count.category,
    }));

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

    // Recent gaps (last 10)
    const recentGapsData = await db.gap.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        gapType: true, title: true, description: true, evidence: true, severity: true,
        evidenceDetail: true, whyThisMatters: true, subNiche: true, affectedProducts: true, underservedUsers: true,
        whyNow: true, executionDifficulty: true, falseOpportunity: true, founderFit: true,
        sourceTransparency: true, whyExistingProductsFail: true, marketQuadrant: true,
      },
    });
    const recentGaps: GapAnalysis[] = recentGapsData.map(mapGapData);

    // Trending Gaps - gaps with high severity
    const trendingGapsData = await db.gap.findMany({
      where: { severity: 'high' },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        gapType: true, title: true, description: true, evidence: true, severity: true,
        evidenceDetail: true, whyThisMatters: true, subNiche: true, affectedProducts: true, underservedUsers: true,
        whyNow: true, executionDifficulty: true, falseOpportunity: true, founderFit: true,
        sourceTransparency: true, whyExistingProductsFail: true, marketQuadrant: true,
      },
    });
    const trendingGaps: GapAnalysis[] = trendingGapsData.map(mapGapData);

    // Saturated Markets
    const saturatedMarkets: MarketSaturation[] = [];
    for (const catItem of productsByCategory) {
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

      saturatedMarkets.push({
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
      });
    }

    // Emerging Niches from trends
    const emergingTrends = await db.trend.findMany({
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
    });
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
    const allComplaints = await db.complaint.findMany({
      take: 100,
      orderBy: { frequency: 'desc' },
    });
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
    const trends = await db.trend.findMany({
      where: { direction: 'growing' },
      orderBy: { growthRate: 'desc' },
      take: 5,
      select: {
        category: true,
        growthRate: true,
      },
    });
    const trendingCategories: { name: string; growth: number }[] = [];
    const fastestGrowing: { name: string; growth: number; productCount: number }[] = [];
    const seenCats = new Set<string>();

    for (const trend of trends) {
      if (!seenCats.has(trend.category)) {
        seenCats.add(trend.category);
        trendingCategories.push({ name: trend.category, growth: trend.growthRate });
        const productCount = await db.product.count({
          where: { category: trend.category },
        });
        fastestGrowing.push({ name: trend.category, growth: trend.growthRate, productCount });
      }
    }

    // Underserved Users from gaps
    const allGapsWithUnderserved = await db.gap.findMany({
      where: { gapType: 'underserved' },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { underservedUsers: true, title: true, description: true },
    });
    const underservedUsers: UnderservedUserGroup[] = allGapsWithUnderserved
      .flatMap((g) => safeJsonParse<UnderservedUserGroup[]>(g.underservedUsers, []))
      .slice(0, 5);

    // Market metrics
    const highSeverityGaps = await db.gap.count({ where: { severity: 'high' } });
    const avgGrowthRate = trends.length > 0
      ? Math.round(trends.reduce((sum, t) => sum + t.growthRate, 0) / trends.length)
      : 0;

    const oppScores = await db.opportunity.findMany({
      select: { opportunityScore: true },
    });
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
    const marketQuadrants = saturatedMarkets.map(sm => sm.marketQuadrant).filter(Boolean) as MarketQuadrantPosition[];

    const stats: DashboardStats = {
      totalProducts,
      totalGaps,
      totalOpportunities,
      avgSaturation,
      topCategories,
      recentGaps,
      trendingCategories,
      trendingGaps,
      saturatedMarkets,
      emergingNiches,
      complaintTrends,
      fastestGrowingCategories: fastestGrowing,
      underservedUsers,
      marketMetrics,
      marketQuadrants,
    };

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
