import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { DashboardStats } from '@/types';

/**
 * GET /api/dashboard
 * Returns dashboard statistics
 */
export async function GET() {
  try {
    // Total products count
    const totalProducts = await db.product.count();

    // Total gaps count
    const totalGaps = await db.gap.count();

    // Total opportunities count
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
      take: 5,
    });
    const topCategories = productsByCategory.map((item) => ({
      name: item.category,
      count: item._count.category,
    }));

    // Recent gaps (last 10)
    const recentGapsData = await db.gap.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        gapType: true,
        title: true,
        description: true,
        evidence: true,
        severity: true,
      },
    });
    const recentGaps = recentGapsData.map((g) => ({
      gapType: g.gapType as 'missing_feature' | 'weak_ux' | 'expensive' | 'underserved' | 'overcrowded',
      title: g.title,
      description: g.description,
      evidence: g.evidence,
      severity: g.severity as 'low' | 'medium' | 'high',
    }));

    // Trending categories from the Trend table
    const trends = await db.trend.findMany({
      where: { direction: 'growing' },
      orderBy: { growthRate: 'desc' },
      take: 5,
      select: {
        category: true,
        growthRate: true,
      },
    });

    // Aggregate trending categories (may have multiple trends per category)
    const trendingMap = new Map<string, number>();
    for (const trend of trends) {
      const currentMax = trendingMap.get(trend.category) || 0;
      trendingMap.set(trend.category, Math.max(currentMax, trend.growthRate));
    }
    const trendingCategories = Array.from(trendingMap.entries())
      .map(([name, growth]) => ({ name, growth }))
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 5);

    const stats: DashboardStats = {
      totalProducts,
      totalGaps,
      totalOpportunities,
      avgSaturation,
      topCategories,
      recentGaps,
      trendingCategories,
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
