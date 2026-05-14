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
  AlertTriangle,
  Users,
  Zap,
  DollarSign,
  Flame,
  BarChart3,
  Database,
  MessageSquare,
  Quote,
  Info,
  Activity,
  ShieldCheck,
  Rocket,
  Gauge,
  CircleDot,
  Link2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { SaturationMeter } from '@/components/ui/saturation-meter'
import { useAppStore } from '@/lib/store'
import { WhyNowBlock, FalseOpportunityBlock, MarketQuadrantBlock, WhyExistingProductsFailBlock, ExecutionDifficultyBlock, FounderFitBlock, SourceTransparencyBlock, MarketQuadrantChart } from '@/components/feature-blocks'
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

// ─── Utility Functions ─────────────────────────────────────────────

function formatLastUpdated(dateStr: string | undefined) {
  if (!dateStr) return 'Recently'
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  } catch {
    return 'Recently'
  }
}

const FEATURE_HIGHLIGHTS = [
  { icon: Database, label: 'Real Launch Data', color: 'text-orange-600 dark:text-orange-400' },
  { icon: MessageSquare, label: 'Complaint Analysis', color: 'text-amber-600 dark:text-amber-400' },
  { icon: Target, label: 'Opportunity Scoring', color: 'text-green-600 dark:text-green-400' },
]

function getComplaintBarColor(category: string) {
  const cat = category.toLowerCase()
  if (cat === 'pricing' || cat === 'performance') return 'bg-red-500'
  if (cat === 'missing_feature' || cat === 'ux' || cat === 'missing features') return 'bg-amber-500'
  if (cat === 'integration' || cat === 'support') return 'bg-sky-500'
  return 'bg-orange-500'
}

function getComplaintBgColor(category: string) {
  const cat = category.toLowerCase()
  if (cat === 'pricing' || cat === 'performance') return 'bg-red-100 dark:bg-red-950/30'
  if (cat === 'missing_feature' || cat === 'ux' || cat === 'missing features') return 'bg-amber-100 dark:bg-amber-950/30'
  if (cat === 'integration' || cat === 'support') return 'bg-sky-100 dark:bg-sky-950/30'
  return 'bg-orange-100 dark:bg-orange-950/30'
}

function getComplaintTextColor(category: string) {
  const cat = category.toLowerCase()
  if (cat === 'pricing' || cat === 'performance') return 'text-red-600 dark:text-red-400'
  if (cat === 'missing_feature' || cat === 'ux' || cat === 'missing features') return 'text-amber-600 dark:text-amber-400'
  if (cat === 'integration' || cat === 'support') return 'text-sky-600 dark:text-sky-400'
  return 'text-orange-600 dark:text-orange-400'
}

function severityColor(severity: string) {
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

function getOpportunityColor(score: number) {
  if (score >= 75) return { bar: 'bg-green-500', bg: 'bg-green-100 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400' }
  if (score >= 50) return { bar: 'bg-amber-500', bg: 'bg-amber-100 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400' }
  return { bar: 'bg-red-500', bg: 'bg-red-100 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400' }
}

function getScoreDotColor(score: number) {
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

// ─── Sub-Components ────────────────────────────────────────────────

/** Enhanced Stat Card with trend indicator and subtle gradient */
function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  delay = 0,
  lastUpdated,
  trend,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  subtext?: string
  delay?: number
  lastUpdated?: string
  trend?: 'up' | 'down' | 'stable'
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="relative overflow-hidden">
        {/* Subtle top gradient accent */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 to-amber-400 dark:from-orange-600 dark:to-amber-600" />
        <CardContent className="p-4 sm:p-6 pt-5 sm:pt-7">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/20">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{label}</p>
                {trend && (
                  <span className="shrink-0">
                    {trend === 'up' && <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />}
                    {trend === 'down' && <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
                    {trend === 'stable' && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                  </span>
                )}
              </div>
              <p className="text-xl sm:text-2xl font-bold truncate">{value}</p>
              {subtext && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtext}</p>
              )}
              {lastUpdated && (
                <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
                  Updated {formatLastUpdated(lastUpdated)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

/** Market Health indicator badge with colored icon */
function MarketHealthBadge({ health }: { health: 'expanding' | 'stable' | 'contracting' }) {
  const config = {
    expanding: { icon: TrendingUp, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-950/30', label: 'Expanding' },
    stable: { icon: Minus, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/30', label: 'Stable' },
    contracting: { icon: ArrowDownRight, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-950/30', label: 'Contracting' },
  }
  const c = config[health]
  const IconComp = c.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.bg} ${c.color}`}>
      <IconComp className="h-3.5 w-3.5" />
      {c.label}
    </span>
  )
}

/** Mini metric pill for factor breakdowns */
function MetricPill({ icon: Icon, label, value, colorClass }: { icon?: React.ElementType; label: string; value: string | number; colorClass?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${colorClass || 'bg-muted/50 text-muted-foreground'}`}>
      {Icon && <Icon className="h-3 w-3" />}
      <span className="font-medium">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  )
}

/** Mini gauge for opportunity score */
function MiniGauge({ score, size = 'sm' }: { score: number; size?: 'sm' | 'md' }) {
  const { bar, bg } = getOpportunityColor(score)
  const h = size === 'sm' ? 'h-1.5' : 'h-2'
  return (
    <div className="flex items-center gap-2">
      <div className={`w-16 ${h} rounded-full overflow-hidden ${bg}`}>
        <motion.div
          className={`h-full rounded-full ${bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(score, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums">{score}</span>
    </div>
  )
}

/** Evidence Block — structured box for trending gaps */
function EvidenceBlock({ evidence }: { evidence: GapAnalysis['evidenceDetail'] }) {
  if (!evidence) return null
  const items: { icon: React.ElementType; text: string; color: string }[] = []
  if (evidence.similarProducts > 0) {
    items.push({ icon: Database, text: `${evidence.similarProducts} similar products launched in the last 90 days`, color: 'text-muted-foreground' })
  }
  if (evidence.repeatedComplaints > 0) {
    items.push({ icon: MessageSquare, text: `${evidence.repeatedComplaints} complaints about this topic`, color: 'text-red-600 dark:text-red-400' })
  }
  if (evidence.pricingOverlap > 0) {
    items.push({ icon: DollarSign, text: `${evidence.pricingOverlap}% pricing overlap`, color: 'text-amber-600 dark:text-amber-400' })
  }
  if (evidence.launchFrequency > 0) {
    items.push({ icon: Rocket, text: `${evidence.launchFrequency} launches/month`, color: 'text-muted-foreground' })
  }
  if (evidence.launchGrowth && evidence.launchGrowth > 0) {
    items.push({ icon: TrendingUp, text: `+${evidence.launchGrowth}% launch growth`, color: 'text-green-600 dark:text-green-400' })
  }
  if (items.length === 0) return null
  return (
    <div className="mt-2 rounded-md border bg-muted/30 dark:bg-muted/10 p-2 space-y-1">
      {items.map((item, j) => (
        <div key={j} className="flex items-start gap-1.5">
          <item.icon className={`h-3 w-3 shrink-0 mt-0.5 ${item.color}`} />
          <span className="text-xs leading-relaxed">{item.text}</span>
        </div>
      ))}
    </div>
  )
}

/** Loading skeleton */
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
      <Skeleton className="h-16 w-full" />
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

// ─── Main Component ────────────────────────────────────────────────

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

  const hasData = data.totalProducts > 0 || data.totalGaps > 0 || data.totalOpportunities > 0
  const latestScanTime = data.recentGaps.length > 0
    ? data.recentGaps[0].evidence || undefined
    : undefined

  // Derive trend indicators from market metrics
  const mm = data.marketMetrics
  const productsTrend: 'up' | 'down' | 'stable' = mm
    ? mm.avgLaunchGrowth > 10 ? 'up' : mm.avgLaunchGrowth < -5 ? 'down' : 'stable'
    : 'stable'
  const gapsTrend: 'up' | 'down' | 'stable' = mm
    ? mm.highOpportunityCount > 2 ? 'up' : 'stable'
    : 'stable'
  const oppTrend: 'up' | 'down' | 'stable' = mm
    ? mm.avgOpportunityScore > 60 ? 'up' : mm.avgOpportunityScore < 30 ? 'down' : 'stable'
    : 'stable'
  const satTrend: 'up' | 'down' | 'stable' = data.avgSaturation > 60 ? 'up' : data.avgSaturation < 30 ? 'down' : 'stable'

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">

        {/* ═══ Welcome Hero ═══ */}
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
                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 dark:border-orange-800 dark:text-orange-400">
                      Market Intelligence
                    </Badge>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
                    Find Market Gaps <span className="text-orange-600 dark:text-orange-400">Before Others Do</span>
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base max-w-lg">
                    Analyze real product launches, user complaints, and pricing data to identify underserved markets and actionable startup opportunities.
                  </p>
                  <div className="flex flex-wrap gap-4 pt-1">
                    {FEATURE_HIGHLIGHTS.map((feat) => (
                      <div key={feat.label} className="flex items-center gap-1.5">
                        <feat.icon className={`h-4 w-4 ${feat.color}`} />
                        <span className="text-xs font-medium text-muted-foreground">{feat.label}</span>
                      </div>
                    ))}
                  </div>
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
                    src="/gapscope-hero.png"
                    alt="GapScope"
                    className="w-32 h-32 sm:w-40 sm:h-40 object-contain rounded-xl opacity-90"
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ═══ Time Filter + Data Confidence ═══ */}
        {hasData && (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Market Intelligence Dashboard</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Source: {data.totalProducts} product scan{data.totalProducts !== 1 ? 's' : ''} across {data.topCategories.length} categor{data.topCategories.length !== 1 ? 'ies' : 'y'}
              </p>
            </div>
            <Tabs value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
              <TabsList className="h-8">
                <TabsTrigger value="7d" className="text-xs px-2.5 h-6">7 days</TabsTrigger>
                <TabsTrigger value="30d" className="text-xs px-2.5 h-6">30 days</TabsTrigger>
                <TabsTrigger value="90d" className="text-xs px-2.5 h-6">90 days</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}

        {/* ═══ Stat Cards — Enhanced with trend arrows + gradient accent ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Search}
            label="Products Scanned"
            value={data.totalProducts.toLocaleString()}
            subtext="Total across all categories"
            delay={0}
            lastUpdated={latestScanTime}
            trend={productsTrend}
          />
          <StatCard
            icon={Target}
            label="Market Gaps Found"
            value={data.totalGaps.toLocaleString()}
            subtext="Identified opportunities"
            delay={0.05}
            lastUpdated={latestScanTime}
            trend={gapsTrend}
          />
          <StatCard
            icon={Lightbulb}
            label="Opportunities"
            value={data.totalOpportunities.toLocaleString()}
            subtext="Actionable insights"
            delay={0.1}
            lastUpdated={latestScanTime}
            trend={oppTrend}
          />
          <StatCard
            icon={BarChart3}
            label="Avg Saturation"
            value={`${data.avgSaturation}%`}
            subtext="Market density score"
            delay={0.15}
            lastUpdated={latestScanTime}
            trend={satTrend}
          />
        </div>

        {/* ═══ 1. Visual Market Metrics Bar ═══ */}
        {mm && hasData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.18 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-wrap items-center divide-x divide-border">
                  {/* Market Health */}
                  <div className="flex items-center gap-2.5 px-4 py-3 min-w-0">
                    <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Market Health</p>
                      <MarketHealthBadge health={mm.marketHealth} />
                    </div>
                  </div>
                  {/* Avg Launch Growth */}
                  <div className="flex items-center gap-2.5 px-4 py-3 min-w-0">
                    <Rocket className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Launch Growth</p>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold tabular-nums">
                          {mm.avgLaunchGrowth > 0 ? '+' : ''}{mm.avgLaunchGrowth}%
                        </span>
                        {mm.avgLaunchGrowth > 0 ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                        ) : mm.avgLaunchGrowth < 0 ? (
                          <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                        ) : (
                          <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Total Complaints */}
                  <div className="flex items-center gap-2.5 px-4 py-3 min-w-0">
                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Complaints</p>
                      <p className="text-sm font-bold tabular-nums">{mm.totalComplaints.toLocaleString()}</p>
                    </div>
                  </div>
                  {/* High-Opportunity Gaps */}
                  <div className="flex items-center gap-2.5 px-4 py-3 min-w-0">
                    <Flame className="h-4 w-4 text-orange-500 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">High-Opportunity Gaps</p>
                      <p className="text-sm font-bold tabular-nums">{mm.highOpportunityCount}</p>
                    </div>
                  </div>
                  {/* Avg Opportunity Score */}
                  <div className="flex items-center gap-2.5 px-4 py-3 min-w-0">
                    <Gauge className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Opportunity Score</p>
                      <MiniGauge score={mm.avgOpportunityScore} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ═══ 1.5 Market Quadrant Visualization ═══ */}
        {data.saturatedMarkets.length > 0 && hasData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-orange-500" />
                  <CardTitle>Market Quadrant Map</CardTitle>
                </div>
                <CardDescription>Competition vs. opportunity positioning across categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  <MarketQuadrantChart
                    items={data.saturatedMarkets
                      .filter(sm => sm.marketQuadrant)
                      .map(sm => ({ name: sm.category, quadrant: sm.marketQuadrant! }))}
                  />
                  <div className="flex-1 space-y-3 w-full">
                    {data.saturatedMarkets.filter(sm => sm.marketQuadrant).map((sm, i) => {
                      const q = sm.marketQuadrant!
                      const quadrantColors: Record<string, string> = {
                        goldmine: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
                        blue_ocean: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
                        crowded: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
                        dead_zone: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
                      }
                      return (
                        <div key={sm.category} className="flex items-center justify-between rounded-lg border p-2.5">
                          <div>
                            <span className="text-sm font-semibold">{sm.category}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">Competition: <span className="font-medium">{q.competitionScore}/100</span></span>
                              <span className="text-xs text-muted-foreground">Opportunity: <span className="font-medium">{q.opportunityScore}/100</span></span>
                            </div>
                          </div>
                          <Badge variant="outline" className={quadrantColors[q.quadrant] || ''}>
                            {q.label || q.quadrant.replace('_', ' ')}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ═══ 2. Enhanced Trending Gaps with Structured Evidence Blocks ═══ */}
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
                <ScrollArea className="max-h-[420px]">
                  <div className="px-6 pb-4 space-y-4">
                    {data.trendingGaps.map((gap, i) => (
                      <div key={i}>
                        <div className="py-2 space-y-2">
                          {/* Header: severity badge + title */}
                          <div className="flex items-start gap-2.5">
                            <Badge variant="outline" className={severityColor(gap.severity)}>
                              {gap.severity}
                            </Badge>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold leading-tight">{gap.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{gap.description}</p>
                            </div>
                          </div>

                          {/* Structured Evidence Block */}
                          <EvidenceBlock evidence={gap.evidenceDetail} />

                          {/* Why This Matters — Orange callout */}
                          {gap.whyThisMatters && (
                            <div className="rounded-md border border-orange-200 dark:border-orange-900/40 bg-gradient-to-r from-orange-50 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/10 p-2.5 flex items-start gap-2">
                              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-orange-600 dark:text-orange-400" />
                              <div>
                                <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-0.5">Why This Matters</p>
                                <p className="text-xs text-foreground leading-relaxed">
                                  {gap.whyThisMatters}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Affected Products — name badges with pricing */}
                          {gap.affectedProducts && gap.affectedProducts.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              <span className="text-xs text-muted-foreground self-center mr-0.5">Affected:</span>
                              {gap.affectedProducts.slice(0, 4).map((p, j) => (
                                <Tooltip key={j}>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-xs h-6 bg-muted/50 cursor-default gap-1">
                                      <Link2 className="h-3 w-3 text-muted-foreground" />
                                      {p.name}
                                      {p.pricing && (
                                        <span className="text-orange-600 dark:text-orange-400 font-medium">{p.pricing}</span>
                                      )}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="text-xs">
                                    {p.strengths[0] && <span className="text-green-600">+ {p.strengths[0]}</span>}
                                    {p.strengths[0] && p.weaknesses[0] && <span className="mx-1">·</span>}
                                    {p.weaknesses[0] && <span className="text-red-600">- {p.weaknesses[0]}</span>}
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                              {gap.affectedProducts.length > 4 && (
                                <Badge variant="outline" className="text-xs h-6 bg-muted/50">
                                  +{gap.affectedProducts.length - 4} more
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Sub-Niche — green badge with opportunity score */}
                          {gap.subNiche && gap.subNiche.name && (
                            <div className="flex items-center gap-2">
                              <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400 gap-1">
                                <CircleDot className="h-3 w-3" />
                                {gap.subNiche.name}
                              </Badge>
                              {gap.subNiche.opportunityScore > 0 && (
                                <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                  {gap.subNiche.opportunityScore}/100
                                </span>
                              )}
                            </div>
                          )}

                          {/* NEW: Verdict + Quadrant badges */}
                          {(gap.marketQuadrant?.quadrant || gap.falseOpportunity?.verdict) && (
                            <div className="flex flex-wrap gap-1.5">
                              {gap.marketQuadrant?.quadrant === 'goldmine' && (
                                <Badge className="text-xs bg-green-600 text-white gap-1">🔥 Goldmine</Badge>
                              )}
                              {gap.marketQuadrant?.quadrant === 'dead_zone' && (
                                <Badge className="text-xs bg-red-600 text-white gap-1">💀 Dead Zone</Badge>
                              )}
                              {gap.falseOpportunity?.verdict === 'avoid' && (
                                <Badge className="text-xs bg-red-600 text-white gap-1">⚠ Avoid</Badge>
                              )}
                              {gap.falseOpportunity?.verdict === 'caution' && (
                                <Badge className="text-xs bg-amber-600 text-white gap-1">⚡ Caution</Badge>
                              )}
                            </div>
                          )}

                          {/* NEW: Why Now — compact inline version */}
                          {gap.whyNow?.marketGrowthDriver && (
                            <div className="rounded-md border border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20 p-2 space-y-1">
                              <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Why Now?</p>
                              <p className="text-xs text-foreground leading-relaxed">{gap.whyNow.marketGrowthDriver}</p>
                              {gap.whyNow.incumbentWeakness && (
                                <p className="text-xs text-muted-foreground leading-relaxed">{gap.whyNow.incumbentWeakness}</p>
                              )}
                            </div>
                          )}

                          {/* NEW: Source Transparency — compact inline */}
                          {gap.sourceTransparency?.sourcePlatforms && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <MessageSquare className="h-3 w-3" />
                              <span>Sources: {gap.sourceTransparency.sourcePlatforms.join(', ')}</span>
                              <span>·</span>
                              <span>{gap.sourceTransparency.totalComments} comments</span>
                              {gap.sourceTransparency.confidenceLevel && (
                                <>
                                  <span>·</span>
                                  <Badge variant="outline" className="text-[10px] h-4">{gap.sourceTransparency.confidenceLevel} confidence</Badge>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        {i < data.trendingGaps.length - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ═══ 4. Enhanced Saturated Markets + 5. Enhanced Emerging Niches ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Saturated Markets — with factor pills, competitors table, sub-niche badges */}
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
                  <CardDescription>Categories with highest competition density</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[480px]">
                    <div className="space-y-4">
                      {data.saturatedMarkets.slice(0, 5).map((sat, i) => (
                        <motion.div
                          key={sat.category}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.05 }}
                          className="rounded-lg border p-4 space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setSelectedCategory(sat.category as any)
                            setActiveTab('analysis')
                          }}
                        >
                          {/* Category name + saturation badge */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">{sat.category}</span>
                            <Badge variant="outline" className={
                              sat.level === 'high'
                                ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                                : sat.level === 'medium'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                  : 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                            }>
                              {sat.level} saturation
                            </Badge>
                          </div>

                          {/* Visual saturation bar */}
                          <SaturationMeter score={sat.score} size="md" />

                          {/* Factor breakdown as mini metric pills */}
                          <div className="flex flex-wrap gap-1.5">
                            <MetricPill icon={Database} label="products" value={sat.factors.similarProducts} />
                            <MetricPill icon={Zap} label="overlap" value={`${sat.factors.featureOverlap}%`} colorClass="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" />
                            <MetricPill icon={Rocket} label="launches/mo" value={sat.factors.launchFrequency} />
                            <MetricPill icon={MessageSquare} label="complaints" value={sat.factors.userComplaints} colorClass="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400" />
                            <MetricPill icon={DollarSign} label="pricing sim" value={`${sat.factors.pricingSimilarity}%`} />
                          </div>

                          {/* Top Competitors table */}
                          {sat.topCompetitors && sat.topCompetitors.length > 0 && (
                            <div className="rounded-md border overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-muted/50 border-b">
                                    <th className="text-left p-1.5 font-medium">Name</th>
                                    <th className="text-left p-1.5 font-medium">Pricing</th>
                                    <th className="text-left p-1.5 font-medium">Strength</th>
                                    <th className="text-left p-1.5 font-medium">Weakness</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sat.topCompetitors.slice(0, 3).map((comp, j) => (
                                    <tr key={j} className={j < sat.topCompetitors!.length - 1 ? 'border-b' : ''}>
                                      <td className="p-1.5 font-medium">{comp.name}</td>
                                      <td className="p-1.5 text-muted-foreground">{comp.pricing}</td>
                                      <td className="p-1.5 text-green-700 dark:text-green-400 line-clamp-1">{comp.strengths[0] || '—'}</td>
                                      <td className="p-1.5 text-red-700 dark:text-red-400 line-clamp-1">{comp.weaknesses[0] || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Sub-niches as badges */}
                          {sat.subNiches && sat.subNiches.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              <span className="text-xs text-muted-foreground self-center">Sub-niches:</span>
                              {sat.subNiches.slice(0, 3).map((sn, j) => (
                                <Badge key={j} variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                                  {sn.name}
                                </Badge>
                              ))}
                              {sat.subNiches.length > 3 && (
                                <Badge variant="secondary" className="text-xs bg-muted/50">
                                  +{sat.subNiches.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Emerging Niches — with parent category, opportunity score bar, why it matters */}
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
                  <ScrollArea className="max-h-[480px]">
                    <div className="space-y-3">
                      {data.emergingNiches.map((niche, i) => {
                        const opp = getOpportunityColor(niche.opportunityScore)
                        return (
                          <motion.div
                            key={niche.name + i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.35 + i * 0.05 }}
                            className="rounded-lg border p-4 space-y-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedCategory(niche.parentCategory as any)
                              setActiveTab('opportunities')
                            }}
                          >
                            {/* Name + description */}
                            <div>
                              <p className="text-sm font-semibold leading-tight">{niche.name}</p>
                              {niche.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{niche.description}</p>
                              )}
                            </div>

                            {/* Parent category tag */}
                            {niche.parentCategory && (
                              <Badge variant="outline" className="text-xs h-5 bg-muted/50">
                                {niche.parentCategory}
                              </Badge>
                            )}

                            {/* Opportunity score as colored progress bar with label */}
                            {niche.opportunityScore > 0 && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Opportunity Score</span>
                                  <span className={`font-semibold ${opp.text}`}>{niche.opportunityScore}/100</span>
                                </div>
                                <div className={`h-2 rounded-full overflow-hidden ${opp.bg}`}>
                                  <motion.div
                                    className={`h-full rounded-full ${opp.bar}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${niche.opportunityScore}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Why it matters — from sub-niche description if available */}
                            {niche.description && niche.opportunityScore >= 60 && (
                              <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-green-500" />
                                <span className="leading-relaxed">High-opportunity niche: {niche.description}</span>
                              </div>
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* ═══ 3. Professional Complaint Clustering + Fastest Growing + 6. Underserved Users ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Complaint Trends — professional clustering */}
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
                    <CardTitle>Complaint Clusters</CardTitle>
                  </div>
                  <CardDescription>User complaint distribution by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-5">
                      {data.complaintTrends.map((cluster, i) => (
                        <div key={cluster.category + i} className="space-y-2">
                          {/* Large percentage number + label */}
                          <div className="flex items-end justify-between gap-2">
                            <div className="flex items-baseline gap-2">
                              <span className={`text-3xl font-bold tabular-nums ${getComplaintTextColor(cluster.category)}`}>
                                {cluster.percentage}%
                              </span>
                              <span className="text-sm font-medium">{cluster.label}</span>
                            </div>
                            <Badge variant="outline" className="text-xs bg-muted/50 tabular-nums">
                              {cluster.count} complaint{cluster.count !== 1 ? 's' : ''}
                            </Badge>
                          </div>

                          {/* Colored progress bar */}
                          <div className={`h-2.5 rounded-full overflow-hidden ${getComplaintBgColor(cluster.category)}`}>
                            <motion.div
                              className={`h-full rounded-full ${getComplaintBarColor(cluster.category)}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${cluster.percentage}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                            />
                          </div>

                          {/* Quoted snippets in blockquote style */}
                          {cluster.exampleSnippets.length > 0 && (
                            <div className="space-y-1.5 mt-1">
                              {cluster.exampleSnippets.slice(0, 3).map((snippet, j) => (
                                <blockquote key={j} className="border-l-[3px] border-orange-400 dark:border-orange-600 pl-3 py-1 bg-orange-50/50 dark:bg-orange-950/10 rounded-r-md">
                                  <p className="text-xs text-muted-foreground italic leading-relaxed line-clamp-2">
                                    &ldquo;{snippet}&rdquo;
                                  </p>
                                </blockquote>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Fastest Growing Categories */}
          {data.fastestGrowingCategories.length > 0 && (
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
                    {data.fastestGrowingCategories.map((cat, i) => (
                      <div
                        key={cat.name}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedCategory(cat.name as any)
                          setActiveTab('trends')
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/20">
                            <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
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

          {/* Underserved Users — enhanced with colored dot, blockquote evidence, opportunity badge */}
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
                  <ScrollArea className="max-h-[400px]">
                    <div className="space-y-3">
                      {data.underservedUsers.map((user, i) => (
                        <div key={user.userGroup + i} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              {/* Colored dot indicator */}
                              <span className={`inline-block h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${getScoreDotColor(user.opportunityScore)}`} />
                              <div>
                                <p className="text-sm font-semibold">{user.userGroup}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{user.description}</p>
                              </div>
                            </div>
                            {/* Opportunity score badge */}
                            {user.opportunityScore > 0 && (
                              <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 shrink-0 tabular-nums">
                                {user.opportunityScore}/100
                              </Badge>
                            )}
                          </div>
                          {/* Evidence as blockquote */}
                          {user.evidence && (
                            <blockquote className="border-l-[3px] border-purple-400 dark:border-purple-600 pl-3 py-1 bg-purple-50/50 dark:bg-purple-950/10 rounded-r-md">
                              <p className="text-xs text-foreground leading-relaxed italic">
                                {user.evidence}
                              </p>
                            </blockquote>
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

        {/* ═══ Market Saturation Chart ═══ */}
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

        {/* ═══ Recent Gaps with enriched data ═══ */}
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
                          <div className="py-2 space-y-2">
                            <div className="flex items-start gap-2.5">
                              <Badge variant="outline" className={severityColor(gap.severity)}>
                                {gap.severity}
                              </Badge>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium leading-tight">{gap.title}</p>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{gap.description}</p>
                              </div>
                            </div>

                            {/* Evidence Layer */}
                            <EvidenceBlock evidence={gap.evidenceDetail} />

                            {/* Why This Matters */}
                            {gap.whyThisMatters && (
                              <div className="rounded-md border border-orange-200 dark:border-orange-900/40 bg-gradient-to-r from-orange-50 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/10 p-2 flex items-start gap-1.5">
                                <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-orange-600 dark:text-orange-400" />
                                <p className="text-xs text-foreground leading-relaxed">
                                  {gap.whyThisMatters}
                                </p>
                              </div>
                            )}

                            {/* Affected Products */}
                            {gap.affectedProducts && gap.affectedProducts.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {gap.affectedProducts.slice(0, 3).map((p, j) => (
                                  <Badge key={j} variant="outline" className="text-xs h-5 bg-muted/50">
                                    {p.name}
                                  </Badge>
                                ))}
                                {gap.affectedProducts.length > 3 && (
                                  <Badge variant="outline" className="text-xs h-5 bg-muted/50">
                                    +{gap.affectedProducts.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          {i < data.recentGaps.length - 1 && <Separator />}
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  )
}
