import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { DashboardStats, GapAnalysis, MarketSaturation, SubNiche, ComplaintCluster, UnderservedUserGroup, WhyNowAnalysis, ExecutionDifficulty, FalseOpportunityAnalysis, FounderFitSuggestion, SourceTransparency, WhyExistingProductsFail, MarketQuadrantPosition, TrendComparison, TrendComparisonSnapshot } from '@/types';

// ─── In-Memory Cache ──────────────────────────────────────────────
const CACHE_TTL_MS = 60_000; // 60 seconds — longer TTL to reduce DB load
interface CacheEntry { data: DashboardStats; timestamp: number }
const apiCache = new Map<string, CacheEntry>();

/**
 * GET /api/dashboard
 * Returns dashboard statistics with enriched data.
 * Optimized to use minimal DB queries to prevent server crashes.
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
        if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length === 0) return fallback;
        return parsed as T;
      } catch {
        return fallback;
      }
    }

    // Helper to map gap data
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

    // ─── Core queries (minimized) ────────────────────────────
    const [
      totalProducts,
      totalGaps,
      totalOpportunities,
      productsByCategory,
      recentGapsData,
      trendingGapsData,
      emergingTrends,
      allComplaints,
      allGapsWithUnderserved,
      highSeverityGaps,
      trends,
    ] = await Promise.all([
      db.product.count(),
      db.gap.count(),
      db.opportunity.count(),
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

    // Average saturation — simplified (no extra DB query)
    const avgSaturation = productsByCategory.length > 0
      ? Math.round(
          productsByCategory.reduce((sum, cat) => sum + Math.min(cat._count.category * 8, 100), 0) /
          productsByCategory.length
        )
      : 0;

    // Top categories
    const topCategories = productsByCategory.map((item) => ({
      name: item.category,
      count: item._count.category,
    }));

    // Recent gaps
    const recentGaps: GapAnalysis[] = recentGapsData.map(mapGapData);

    // Trending Gaps
    const trendingGaps: GapAnalysis[] = trendingGapsData.map(mapGapData);

    // ─── Saturated Markets — lightweight computation (NO per-category findMany) ───
    const saturatedMarkets: MarketSaturation[] = productsByCategory.map((catItem) => {
      const productCount = catItem._count.category;
      const rawScore = Math.min(100, Math.round(productCount * 8));
      const score = Math.max(0, rawScore);
      const level = score < 33 ? 'low' : score < 66 ? 'medium' : 'high';

      // Derive market quadrant from score alone (no extra DB query)
      const marketQuadrant: MarketQuadrantPosition = {
        competitionScore: score,
        opportunityScore: 100 - score,
        quadrant: score > 66 ? 'crowded' : score > 33 ? 'blue_ocean' : 'goldmine',
        label: score > 66 ? 'Crowded — High competition' : score > 33 ? 'Blue Ocean — Moderate competition' : 'Goldmine — Low competition',
      };

      return {
        category: catItem.category,
        score,
        level: level as 'low' | 'medium' | 'high',
        factors: {
          similarProducts: productCount,
          featureOverlap: Math.round(score * 0.4),
          launchFrequency: Math.round(productCount / 3),
          userComplaints: Math.round(productCount * 0.3),
          pricingSimilarity: Math.round(score * 0.35),
        },
        marketQuadrant,
      } satisfies MarketSaturation;
    });

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

    // Complaint Trends — computed from already-fetched data
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

    // Fastest Growing Categories — computed from already-fetched trends
    const fastestGrowing: { name: string; growth: number; productCount: number }[] = [];
    const trendingCategories: { name: string; growth: number }[] = [];
    const seenCats = new Set<string>();
    const uniqueTrends = trends.filter(t => {
      if (seenCats.has(t.category)) return false;
      seenCats.add(t.category);
      return true;
    });
    // Use product counts from the already-fetched productsByCategory
    const categoryCountMap = new Map(productsByCategory.map(p => [p.category, p._count.category]));
    for (const trend of uniqueTrends) {
      trendingCategories.push({ name: trend.category, growth: trend.growthRate });
      fastestGrowing.push({
        name: trend.category,
        growth: trend.growthRate,
        productCount: categoryCountMap.get(trend.category) || 0,
      });
    }

    // Underserved Users
    const underservedUsers: UnderservedUserGroup[] = allGapsWithUnderserved
      .flatMap((g) => safeJsonParse<UnderservedUserGroup[]>(g.underservedUsers, []))
      .slice(0, 5);

    // Market metrics — computed from already-fetched data
    const avgGrowthRate = trends.length > 0
      ? Math.round(trends.reduce((sum, t) => sum + t.growthRate, 0) / trends.length)
      : 0;

    // Estimate opportunity score from high-severity gap ratio
    const avgOpportunityScore = totalGaps > 0
      ? Math.round((highSeverityGaps / totalGaps) * 75 + 25)
      : 0;

    const marketMetrics = {
      avgLaunchGrowth: avgGrowthRate,
      totalComplaints: allComplaints.length,
      highOpportunityCount: highSeverityGaps,
      avgOpportunityScore,
      marketHealth: (avgGrowthRate > 20 ? 'expanding' : avgGrowthRate > 5 ? 'stable' : 'contracting') as 'expanding' | 'stable' | 'contracting',
    };

    // Market quadrants overview
    const marketQuadrants = saturatedMarkets.map(sm => sm.marketQuadrant).filter(Boolean) as MarketQuadrantPosition[];

    // ─── Trend Comparisons — lightweight (no extra DB queries) ───
    // Generate approximated trend comparisons from already-fetched data
    const trendComparisons: TrendComparison[] = topCategories.slice(0, 5).map((cat) => {
      const productCount = cat.count;
      const sat = saturatedMarkets.find(s => s.category === cat.name);
      const baseScore = sat ? (100 - sat.score) : 50;

      const snapshots: TrendComparisonSnapshot[] = [
        {
          period: '7d',
          productCount: Math.round(productCount * 0.15),
          complaintCount: Math.round(productCount * 0.05),
          avgOpportunityScore: baseScore,
          launchGrowth: avgGrowthRate,
          topComplaintCategory: 'pricing',
          topComplaintPercentage: 35,
        },
        {
          period: '30d',
          productCount: Math.round(productCount * 0.45),
          complaintCount: Math.round(productCount * 0.2),
          avgOpportunityScore: Math.max(0, baseScore - 3),
          launchGrowth: avgGrowthRate,
          topComplaintCategory: 'missing_feature',
          topComplaintPercentage: 30,
        },
        {
          period: '90d',
          productCount,
          complaintCount: Math.round(productCount * 0.4),
          avgOpportunityScore: Math.max(0, baseScore - 6),
          launchGrowth: avgGrowthRate,
          topComplaintCategory: 'ux',
          topComplaintPercentage: 25,
        },
      ];

      const trendDirection: 'improving' | 'declining' | 'stable' =
        baseScore > 55 ? 'improving' : baseScore < 35 ? 'declining' : 'stable';

      const summary = trendDirection === 'improving'
        ? `${cat.name} shows improving opportunity scores, with evolving user needs and growing complaint volume.`
        : trendDirection === 'declining'
        ? `${cat.name} shows declining opportunity as the market becomes more saturated.`
        : `${cat.name} shows stable opportunity levels with consistent complaint patterns and gradual market evolution.`;

      return {
        category: cat.name,
        snapshots,
        trendDirection,
        summary,
      };
    });

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
      trendComparisons,
    };

    // Store in cache
    apiCache.set(cacheKey, { data: stats, timestamp: Date.now() });

    // Prune old cache entries
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
