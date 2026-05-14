'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from 'recharts'
import {
  Search,
  Target,
  Lightbulb,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { useAppStore } from '@/lib/store'
import type { DashboardStats } from '@/types'

const chartConfig = {
  score: {
    label: 'Saturation Score',
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
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function DashboardOverview() {
  const setSelectedCategory = useAppStore((s) => s.setSelectedCategory)
  const setActiveTab = useAppStore((s) => s.setActiveTab)

  const { data, isLoading, isError } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard')
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
                    onClick={() => {
                      setActiveTab('scanner')
                    }}
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
          icon={TrendingUp}
          label="Avg Saturation"
          value={`${data.avgSaturation}%`}
          subtext="Market density score"
          delay={0.15}
        />
      </div>

      {/* Market Saturation Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
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

      {/* Recent Gaps + Trending Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Recent Gaps</CardTitle>
              <CardDescription>Latest market gap findings</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <div className="px-6 pb-4">
                  {data.recentGaps.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No gaps found yet. Run the scanner to detect market gaps.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {data.recentGaps.map((gap, i) => (
                        <div key={i}>
                          <div className="flex items-start gap-3 py-2">
                            <Badge
                              variant="outline"
                              className={severityColor(gap.severity)}
                            >
                              {gap.severity}
                            </Badge>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-tight">{gap.title}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {gap.description}
                              </p>
                            </div>
                          </div>
                          {i < data.recentGaps.length - 1 && <Separator className="my-1" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Trending Categories</CardTitle>
              <CardDescription>Categories with highest growth signals</CardDescription>
            </CardHeader>
            <CardContent>
              {data.trendingCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No trending data available yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.trendingCategories.map((cat, i) => (
                    <motion.div
                      key={cat.name}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.05 }}
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
                        <span
                          className={`text-sm font-semibold ${
                            cat.growth > 0
                              ? 'text-green-600 dark:text-green-400'
                              : cat.growth < 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {cat.growth > 0 ? '+' : ''}
                          {cat.growth}%
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
