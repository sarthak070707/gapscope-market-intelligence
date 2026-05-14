'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from 'recharts'
import {
  Search,
  Target,
  Lightbulb,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Clock,
  AlertTriangle,
  Users,
  Zap,
  DollarSign,
  Flame,
  BarChart3,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { useAppStore } from '@/lib/store'
import type { DashboardStats, TimePeriod, GapAnalysis, MarketSaturation, SubNiche, ComplaintCluster, UnderservedUserGroup } from '@/types'

const chartConfig = {
  score: {
    label: 'Saturation Score',
    color: 'oklch(0.7 0.15 50)',
  },
  count: {
    label: 'Products',
    color: 'oklch(0.7 0.15 50)',
  },
} satisfies ChartConfig

const BAR_COLORS = [
  'oklch(0.75 0.18 45)',
  'oklch(0.70 0.15 50)',
  'oklch(0.65 0.17 40)',
  'oklch(0.60 0.14 55)',
  'oklch(0.72 0.16 35)',
  'oklch(0.68 0.13 60)',
  'oklch(0.63 0.15 48)',
  'oklch(0.58 0.12 42)',
]

const PIE_COLORS = [
  'oklch(0.75 0.18 45)',
  'oklch(0.65 0.17 145)',
  'oklch(0.60 0.15 250)',
  'oklch(0.70 0.16 65)',
  'oklch(0.55 0.14 25)',
  'oklch(0.65 0.12 200)',
]

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  delay = 0,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  subtext?: string
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="relative overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-950/40">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{label}</p>
              <p className="text-xl sm:text-2xl font-bold truncate">{value}</p>
              {subtext && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtext}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// PRIORITY 4: Saturation Meter - visual bar
function SaturationMeter({ score, label }: { score: number; label?: string }) {
  const getColor = () => {
    if (score >= 75) return 'bg-red-500'
    if (score >= 50) return 'bg-amber-500'
    if (score >= 25) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getBgColor = () => {
    if (score >= 75) return 'bg-red-100 dark:bg-red-950/30'
    if (score >= 50) return 'bg-amber-100 dark:bg-amber-950/30'
    if (score >= 25) return 'bg-yellow-100 dark:bg-yellow-950/30'
    return 'bg-green-100 dark:bg-green-950/30'
  }

  const getLevel = () => {
    if (score >= 75) return 'High'
    if (score >= 50) return 'Medium'
    if (score >= 25) return 'Moderate'
    return 'Low'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label || 'Competition Level'}</span>
        <span className="font-semibold">{score}% — {getLevel()}</span>
      </div>
      <div className={`h-3 rounded-full ${getBgColor()} overflow-hidden`}>
        <motion.div
          className={`h-full rounded-full ${getColor()}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function DashboardOverview() {
  const setSelectedCategory = useAppStore((s) => s.setSelectedCategory)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const timePeriod = useAppStore((s) => s.timePeriod)
  const setTimePeriod = useAppStore((s) => s.setTimePeriod)

  const { data, isLoading, isError } = useQuery<DashboardStats>({
    queryKey: ['dashboard', timePeriod],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard?timePeriod=${timePeriod}`)
      if (!res.ok) throw new Error('Failed to fetch dashboard data')
      return res.json()
    },
  })

  if (isLoading) return <DashboardSkeleton />

  if (isError || !data) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">
          Unable to load dashboard data. Please try again later.
        </p>
      </Card>
    )
  }

  const saturationChartData = data.topCategories.map((cat) => ({
    name: cat.name,
    score: cat.count,
  }))

  const severityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
      case 'low':
        return 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const directionIcon = (direction: string) => {
    switch (direction) {
      case 'growing':
        return <ArrowUpRight className="h-4 w-4 text-green-500" />
      case 'declining':
        return <ArrowDownRight className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />
    }
  }

  const hasData = data.totalProducts > 0 || data.totalGaps > 0 || data.totalOpportunities > 0;

  return (
    <div className="space-y-6">
      {/* Welcome Hero - only show when no data */}
      {!hasData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="overflow-hidden border-orange-200 dark:border-orange-900/40">
            <div className="flex flex-col md:flex-row items-center">
              <div className="flex-1 p-6 sm:p-8 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-600 text-white hover:bg-orange-700">New</Badge>
                  <span className="text-xs text-muted-foreground">AI-Powered Market Research</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
                  Find Your Next <span className="text-orange-600 dark:text-orange-400">Startup Idea</span>
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base max-w-lg">
                  Scan Product Hunt for real products, detect market gaps, analyze complaints, 
                  and discover opportunities backed by actual data — not random AI ideas.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    onClick={() => setActiveTab('scanner')}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <Search className="h-4 w-4" />
                    Start Scanning
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedCategory('all')
                      setActiveTab('trends')
                    }}
                  >
                    <TrendingUp className="h-4 w-4" />
                    Detect Trends
                  </Button>
                </div>
              </div>
              <div className="w-full md:w-64 h-48 md:h-full relative flex items-center justify-center p-6 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10">
                <img
                  src="/gapfinder-hero.png"
                  alt="GapFinder"
                  className="w-32 h-32 sm:w-40 sm:h-40 object-contain rounded-xl opacity-90"
                />
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* PRIORITY 11: Time Filter */}
      {hasData && (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Market Intelligence Dashboard</h2>
          <Tabs value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
            <TabsList className="h-8">
              <TabsTrigger value="7d" className="text-xs px-2.5 h-6">7 days</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs px-2.5 h-6">30 days</TabsTrigger>
              <TabsTrigger value="90d" className="text-xs px-2.5 h-6">90 days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Search}
          label="Products Scanned"
          value={data.totalProducts.toLocaleString()}
          subtext="Total across all categories"
          delay={0}
        />
        <StatCard
          icon={Target}
          label="Market Gaps Found"
          value={data.totalGaps.toLocaleString()}
          subtext="Identified opportunities"
          delay={0.05}
        />
        <StatCard
          icon={Lightbulb}
          label="Opportunities"
          value={data.totalOpportunities.toLocaleString()}
          subtext="Actionable insights"
          delay={0.1}
        />
        <StatCard
          icon={BarChart3}
          label="Avg Saturation"
          value={`${data.avgSaturation}%`}
          subtext="Market density score"
          delay={0.15}
        />
      </div>

      {/* PRIORITY 10: Trending Gaps Section */}
      {data.trendingGaps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <CardTitle>Trending Gaps</CardTitle>
              </div>
              <CardDescription>High-severity market gaps requiring attention</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-80">
                <div className="px-6 pb-4 space-y-3">
                  {data.trendingGaps.map((gap, i) => (
                    <div key={i}>
                      <div className="flex items-start gap-3 py-2">
                        <Badge variant="outline" className={severityColor(gap.severity)}>
                          {gap.severity}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-tight">{gap.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{gap.description}</p>
                          {/* PRIORITY 6: Why This Matters */}
                          {gap.whyThisMatters && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 italic line-clamp-1">
                              Why: {gap.whyThisMatters}
                            </p>
                          )}
                          {/* PRIORITY 7: Sub-Niche */}
                          {gap.subNiche && gap.subNiche.name && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Badge variant="secondary" className="text-xs bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
                                Sub-niche: {gap.subNiche.name}
                              </Badge>
                            </div>
                          )}
                          {/* PRIORITY 8: Affected Products */}
                          {gap.affectedProducts && gap.affectedProducts.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Products: {gap.affectedProducts.map(p => p.name).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      {i < data.trendingGaps.length - 1 && <Separator className="my-1" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* PRIORITY 10: Saturated Markets + Emerging Niches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Saturated Markets with PRIORITY 4: Saturation Meter */}
        {data.saturatedMarkets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <CardTitle>Saturated Markets</CardTitle>
                </div>
                <CardDescription>Categories with highest competition</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.saturatedMarkets.slice(0, 5).map((sat, i) => (
                    <motion.div
                      key={sat.category}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.05 }}
                      className="rounded-lg border p-3 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setSelectedCategory(sat.category as any)
                        setActiveTab('analysis')
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{sat.category}</span>
                        <Badge variant="outline" className={
                          sat.level === 'high'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                            : sat.level === 'medium'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              : 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                        }>
                          {sat.level}
                        </Badge>
                      </div>
                      <SaturationMeter score={sat.score} />
                      {/* PRIORITY 3: Competitor Breakdown */}
                      {sat.topCompetitors && sat.topCompetitors.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Top: {sat.topCompetitors.slice(0, 2).map(c => `${c.name} (${c.pricing})`).join(', ')}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* PRIORITY 10: Emerging Niches */}
        {data.emergingNiches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-green-500" />
                  <CardTitle>Emerging Niches</CardTitle>
                </div>
                <CardDescription>Specific sub-niches with startup potential</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-72">
                  <div className="space-y-3">
                    {data.emergingNiches.map((niche, i) => (
                      <motion.div
                        key={niche.name + i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + i * 0.05 }}
                        className="rounded-lg border p-3 space-y-2 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedCategory(niche.parentCategory as any)
                          setActiveTab('opportunities')
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold leading-tight">{niche.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{niche.description}</p>
                          </div>
                          <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 shrink-0">
                            {niche.opportunityScore}/100
                          </Badge>
                        </div>
                        {niche.parentCategory && (
                          <Badge variant="outline" className="text-xs">{niche.parentCategory}</Badge>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* PRIORITY 10: Complaint Trends + Fastest Growing + Underserved Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Complaint Trends with PRIORITY 2: Clustering */}
        {data.complaintTrends.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <CardTitle>Complaint Trends</CardTitle>
                </div>
                <CardDescription>Top user complaint clusters</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.complaintTrends.map((cluster, i) => (
                    <div key={cluster.category + i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{cluster.label}</span>
                        <span className="text-xs text-muted-foreground">{cluster.percentage}%</span>
                      </div>
                      <Progress value={cluster.percentage} className="h-2" />
                      {cluster.exampleSnippets.length > 0 && (
                        <p className="text-xs text-muted-foreground line-clamp-1 italic">
                          &quot;{cluster.exampleSnippets[0]}&quot;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Fastest Growing Categories */}
        {data.fastestGrowing.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <CardTitle>Fastest Growing</CardTitle>
                </div>
                <CardDescription>Categories with highest growth</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.fastestGrowing.map((cat, i) => (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between rounded-lg border p-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedCategory(cat.name as any)
                        setActiveTab('trends')
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-100 dark:bg-green-950/40">
                          <ArrowUpRight className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">{cat.name}</span>
                          <p className="text-xs text-muted-foreground">{cat.productCount} products</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">+{cat.growth}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* PRIORITY 12: Underserved Users */}
        {data.underservedUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.45 }}
          >
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  <CardTitle>Underserved Users</CardTitle>
                </div>
                <CardDescription>User groups ignored by current products</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-64">
                  <div className="space-y-3">
                    {data.underservedUsers.map((user, i) => (
                      <div key={user.userGroup + i} className="rounded-lg border p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{user.userGroup}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{user.description}</p>
                          </div>
                          {user.opportunityScore > 0 && (
                            <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 shrink-0">
                              {user.opportunityScore}/100
                            </Badge>
                          )}
                        </div>
                        {user.evidence && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 italic line-clamp-1">
                            {user.evidence}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Market Saturation Chart */}
      {saturationChartData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Market Saturation by Category</CardTitle>
              <CardDescription>Number of products detected per category</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-64 sm:h-72 w-full">
                <BarChart data={saturationChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {saturationChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Recent Gaps with enriched data */}
      {data.recentGaps.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.55 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Recent Gap Findings</CardTitle>
              <CardDescription>Latest market gap detections with evidence</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <div className="px-6 pb-4">
                  <div className="space-y-3">
                    {data.recentGaps.map((gap, i) => (
                      <div key={i}>
                        <div className="flex items-start gap-3 py-2">
                          <Badge variant="outline" className={severityColor(gap.severity)}>
                            {gap.severity}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-tight">{gap.title}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{gap.description}</p>
                            {/* PRIORITY 1: Evidence Layer */}
                            {gap.evidenceDetail && (
                              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                                {gap.evidenceDetail.similarProducts > 0 && (
                                  <span>{gap.evidenceDetail.similarProducts} similar</span>
                                )}
                                {gap.evidenceDetail.repeatedComplaints > 0 && (
                                  <span>{gap.evidenceDetail.repeatedComplaints} complaints</span>
                                )}
                                {gap.evidenceDetail.pricingOverlap > 0 && (
                                  <span>{gap.evidenceDetail.pricingOverlap}% pricing overlap</span>
                                )}
                              </div>
                            )}
                            {/* PRIORITY 6: Why This Matters */}
                            {gap.whyThisMatters && (
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 italic line-clamp-1">
                                Why: {gap.whyThisMatters}
                              </p>
                            )}
                          </div>
                        </div>
                        {i < data.recentGaps.length - 1 && <Separator className="my-1" />}
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Trending Categories */}
      {data.trendingCategories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Trending Categories</CardTitle>
              <CardDescription>Categories with highest growth signals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.trendingCategories.map((cat, i) => (
                  <motion.div
                    key={cat.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.65 + i * 0.05 }}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedCategory(cat.name as any)
                      setActiveTab('trends')
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-100 dark:bg-orange-950/40">
                        <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="text-sm font-medium">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {directionIcon(cat.growth > 0 ? 'growing' : cat.growth < 0 ? 'declining' : 'stable')}
                      <span className={`text-sm font-semibold ${cat.growth > 0 ? 'text-green-600 dark:text-green-400' : cat.growth < 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                        {cat.growth > 0 ? '+' : ''}{cat.growth}%
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
