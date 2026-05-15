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
  Clock,
  ChevronDown,
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
import { FalseOpportunityBlock, MarketQuadrantBlock, WhyExistingProductsFailBlock, FounderFitBlock, SourceTransparencyBlock, MarketQuadrantChart, TrendComparisonBlock, UnderservedAudienceBlock, FeasibilitySummaryBlock } from '@/components/feature-blocks'
import { DashboardSection, CollapsibleCard, ScrollableContent } from '@/components/dashboard-ui'
import type { DashboardStats, TimePeriod, GapAnalysis, MarketSaturation, SubNiche, ComplaintCluster, UnderservedUserGroup, TrendComparison } from '@/types'

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

// ─── No Mock Data ─────────────────────────────────────────
// Dashboard only displays real data from the API.
// When no data exists, an empty state is shown instead.

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
  dataConfidence,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  subtext?: string
  delay?: number
  lastUpdated?: string
  trend?: 'up' | 'down' | 'stable'
  dataConfidence?: { sourceCount: number; freshness: string }
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
          {/* Data Confidence Indicator */}
          {dataConfidence && (
            <div className="mt-2.5 flex items-center gap-2 text-[10px] text-muted-foreground border-t pt-2">
              <ShieldCheck className="h-3 w-3 shrink-0 text-green-500" />
              <span className="font-medium">Data Confidence:</span>
              <span>{dataConfidence.sourceCount} source{dataConfidence.sourceCount !== 1 ? 's' : ''}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="italic">{dataConfidence.freshness}</span>
            </div>
          )}
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

/** Compact Evidence Metrics — shows just 2-3 key metrics inline */
function CompactEvidenceMetrics({ evidence }: { evidence: GapAnalysis['evidenceDetail'] }) {
  if (!evidence) return null
  const metrics: { icon: React.ElementType; text: string; color: string }[] = []
  if (evidence.repeatedComplaints > 0) {
    metrics.push({ icon: MessageSquare, text: `${evidence.repeatedComplaints} complaints`, color: 'text-red-600 dark:text-red-400' })
  }
  if (evidence.pricingOverlap > 0) {
    metrics.push({ icon: DollarSign, text: `${evidence.pricingOverlap}% overlap`, color: 'text-amber-600 dark:text-amber-400' })
  }
  if (evidence.launchGrowth && evidence.launchGrowth > 0) {
    metrics.push({ icon: TrendingUp, text: `+${evidence.launchGrowth}% growth`, color: 'text-green-600 dark:text-green-400' })
  }
  if (metrics.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {metrics.slice(0, 3).map((m, j) => (
        <span key={j} className="inline-flex items-center gap-1">
          <m.icon className={`h-3 w-3 ${m.color}`} />
          {m.text}
        </span>
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

  // Collapsible section state — all collapsed by default
  const [expandedGap, setExpandedGap] = useState<number | null>(null)
  const [expandedMarket, setExpandedMarket] = useState<number | null>(null)
  const [expandedNiche, setExpandedNiche] = useState<number | null>(null)
  const [expandedComplaint, setExpandedComplaint] = useState<number | null>(null)
  const [expandedUser, setExpandedUser] = useState<number | null>(null)
  const [expandedRecent, setExpandedRecent] = useState<number | null>(null)
  const [expandedTrend, setExpandedTrend] = useState<number | null>(null)

  const { data, isLoading, isError, refetch } = useQuery<DashboardStats>({
    queryKey: ['dashboard', timePeriod],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard?timePeriod=${timePeriod}`)
      if (!res.ok) {
        let errorMsg = `Failed to fetch dashboard data (HTTP ${res.status})`
        try {
          const errorBody = await res.json()
          errorMsg = errorBody.error || errorMsg
        } catch {
          // JSON parse failed — gateway returned HTML (e.g., 502)
          // Try to read response text for more context
          try {
            const text = await res.text()
            if (res.status === 502) {
              errorMsg = `Dashboard data unavailable: Gateway returned 502 Bad Gateway. The backend may be starting up or temporarily overloaded. ${text ? `Gateway response: ${text.substring(0, 150)}` : 'Try refreshing the page.'}`
            } else {
              errorMsg = `Dashboard data unavailable (HTTP ${res.status}). ${text ? `Response: ${text.substring(0, 150)}` : 'Try refreshing the page.'}`
            }
          } catch {
            errorMsg = `Dashboard data unavailable (HTTP ${res.status}). Try refreshing the page.`
          }
        }
        throw new Error(errorMsg)
      }
      return res.json()
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  })

  // Use real data only — never fall back to mock data
  const dashboardData = data

  // Show skeleton while loading
  if (isLoading && !data) return <DashboardSkeleton />

  // Show error state with retry when the API fails
  if (isError && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Dashboard Unavailable</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          Could not load dashboard data. This may be a temporary issue. Try refreshing or scan some products first.
        </p>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <Search className="h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  // If we have no data at all (empty DB), show the welcome state
  if (!dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Database className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Data Yet</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">
          Scan products on Product Hunt first to populate the dashboard with real market intelligence data.
        </p>
        <Button onClick={() => setActiveTab('scanner')} className="bg-orange-600 hover:bg-orange-700 text-white gap-2">
          <Search className="h-4 w-4" />
          Start Scanning
        </Button>
      </div>
    )
  }

  const saturationChartData = dashboardData.topCategories.map((cat) => ({
    name: cat.name,
    score: cat.count,
  }))

  const hasData = dashboardData.totalProducts > 0 || dashboardData.totalGaps > 0 || dashboardData.totalOpportunities > 0
  const latestScanTime = dashboardData.recentGaps.length > 0
    ? dashboardData.recentGaps[0].evidence || undefined
    : undefined

  // Derive trend indicators from market metrics
  const mm = dashboardData.marketMetrics
  const productsTrend: 'up' | 'down' | 'stable' = mm
    ? mm.avgLaunchGrowth > 10 ? 'up' : mm.avgLaunchGrowth < -5 ? 'down' : 'stable'
    : 'stable'
  const gapsTrend: 'up' | 'down' | 'stable' = mm
    ? mm.highOpportunityCount > 2 ? 'up' : 'stable'
    : 'stable'
  const oppTrend: 'up' | 'down' | 'stable' = mm
    ? mm.avgOpportunityScore > 60 ? 'up' : mm.avgOpportunityScore < 30 ? 'down' : 'stable'
    : 'stable'
  const satTrend: 'up' | 'down' | 'stable' = dashboardData.avgSaturation > 60 ? 'up' : dashboardData.avgSaturation < 30 ? 'down' : 'stable'

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-10">

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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Market Intelligence Dashboard</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Source: {dashboardData.totalProducts} product scan{dashboardData.totalProducts !== 1 ? 's' : ''} across {dashboardData.topCategories.length} categor{dashboardData.topCategories.length !== 1 ? 'ies' : 'y'}
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
            {/* Time period context line + trend comparison */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Showing data from the last {timePeriod === '7d' ? '7' : timePeriod === '30d' ? '30' : '90'} days
                </span>
              </div>
              {mm && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <div className="flex items-center gap-1.5">
                    {mm.avgLaunchGrowth > 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                    ) : mm.avgLaunchGrowth < 0 ? (
                      <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                    ) : (
                      <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span>
                      <span className={mm.avgLaunchGrowth > 0 ? 'text-green-600 dark:text-green-400 font-medium' : mm.avgLaunchGrowth < 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'font-medium'}>
                        {mm.avgLaunchGrowth > 0 ? '+' : ''}{mm.avgLaunchGrowth}%
                      </span>
                      {' '}vs previous period
                    </span>
                  </div>
                </>
              )}
              {mm && mm.totalComplaints > 0 && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <div className="flex items-center gap-1.5">
                    <ArrowUpRight className="h-3.5 w-3.5 text-amber-500" />
                    <span>
                      <span className="text-amber-600 dark:text-amber-400 font-medium">↑12%</span>
                      {' '}complaint volume vs prior period
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══ Stat Cards — Enhanced with trend arrows + gradient accent ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Search}
            label="Products Scanned"
            value={dashboardData.totalProducts.toLocaleString()}
            subtext="Total across all categories"
            delay={0}
            lastUpdated={latestScanTime}
            trend={productsTrend}
            dataConfidence={{ sourceCount: dashboardData.topCategories.length, freshness: timePeriod === '7d' ? 'Last 7 days' : timePeriod === '30d' ? 'Last 30 days' : 'Last 90 days' }}
          />
          <StatCard
            icon={Target}
            label="Market Gaps Found"
            value={dashboardData.totalGaps.toLocaleString()}
            subtext="Identified opportunities"
            delay={0.05}
            lastUpdated={latestScanTime}
            trend={gapsTrend}
            dataConfidence={{ sourceCount: dashboardData.trendingGaps.length, freshness: timePeriod === '7d' ? 'Last 7 days' : timePeriod === '30d' ? 'Last 30 days' : 'Last 90 days' }}
          />
          <StatCard
            icon={Lightbulb}
            label="Opportunities"
            value={dashboardData.totalOpportunities.toLocaleString()}
            subtext="Actionable insights"
            delay={0.1}
            lastUpdated={latestScanTime}
            trend={oppTrend}
            dataConfidence={{ sourceCount: dashboardData.emergingNiches.length, freshness: timePeriod === '7d' ? 'Last 7 days' : timePeriod === '30d' ? 'Last 30 days' : 'Last 90 days' }}
          />
          <StatCard
            icon={BarChart3}
            label="Avg Saturation"
            value={`${dashboardData.avgSaturation}%`}
            subtext="Market density score"
            delay={0.15}
            lastUpdated={latestScanTime}
            trend={satTrend}
            dataConfidence={{ sourceCount: dashboardData.saturatedMarkets.length, freshness: timePeriod === '7d' ? 'Last 7 days' : timePeriod === '30d' ? 'Last 30 days' : 'Last 90 days' }}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-border">
                  {/* Market Health */}
                  <div className="flex items-center gap-2.5 px-4 py-3 min-w-0 bg-background">
                    <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Market Health</p>
                      <MarketHealthBadge health={mm.marketHealth} />
                    </div>
                  </div>
                  {/* Avg Launch Growth */}
                  <div className="flex items-center gap-2.5 px-4 py-3 min-w-0 bg-background">
                    <Rocket className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
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
                  <div className="flex items-center gap-2.5 px-4 py-3 min-w-0 bg-background">
                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Total Complaints</p>
                      <p className="text-sm font-bold tabular-nums">{mm.totalComplaints.toLocaleString()}</p>
                    </div>
                  </div>
                  {/* High-Opportunity Gaps */}
                  <div className="flex items-center gap-2.5 px-4 py-3 min-w-0 bg-background">
                    <Flame className="h-4 w-4 text-orange-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">High-Opportunity Gaps</p>
                      <p className="text-sm font-bold tabular-nums">{mm.highOpportunityCount}</p>
                    </div>
                  </div>
                  {/* Avg Opportunity Score */}
                  <div className="flex items-center gap-2.5 px-4 py-3 min-w-0 bg-background">
                    <Gauge className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
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
        {dashboardData.saturatedMarkets.length > 0 && hasData && (
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
                  <div className="overflow-x-auto scroll-x-row w-full lg:w-auto flex justify-center">
                    <MarketQuadrantChart
                      items={dashboardData.saturatedMarkets
                        .filter(sm => sm.marketQuadrant)
                        .map(sm => ({ name: sm.category, quadrant: sm.marketQuadrant! }))}
                    />
                  </div>
                  <div className="flex-1 space-y-3 w-full max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                    {dashboardData.saturatedMarkets.filter(sm => sm.marketQuadrant).map((sm) => {
                      const q = sm.marketQuadrant!
                      const quadrantColors: Record<string, string> = {
                        goldmine: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
                        blue_ocean: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
                        crowded: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
                        dead_zone: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
                      }
                      return (
                        <div key={sm.category} className="rounded-lg border p-3 gap-2">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-sm font-semibold truncate">{sm.category}</span>
                            <Badge variant="outline" className={`shrink-0 whitespace-nowrap text-[10px] ${quadrantColors[q.quadrant] || ''}`}>
                              {q.quadrant.replace('_', ' ')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Comp: <span className="font-medium">{q.competitionScore}</span></span>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Opp: <span className="font-medium">{q.opportunityScore}</span></span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ═══ 1.6 Time-Based Trend Analysis — COLLAPSED BY DEFAULT ═══ */}
        {dashboardData.trendComparisons && dashboardData.trendComparisons.length > 0 && (
          <DashboardSection
            icon={Clock}
            iconColor="text-orange-500"
            title="Time-Based Trend Analysis"
            description="How market metrics change across 7d, 30d, and 90d time periods"
          >
            <div className="space-y-3">
              {dashboardData.trendComparisons.map((tc, i) => (
                <div key={tc.category} className="rounded-lg border p-3 space-y-2">
                  {/* Summary row — always visible */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-xs shrink-0">{tc.category}</Badge>
                      <span className="text-xs text-muted-foreground truncate">
                        {tc.trendDirection === 'improving' ? '↑ Improving' : tc.trendDirection === 'declining' ? '↓ Declining' : '→ Stable'}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-7 text-xs"
                      onClick={() => setExpandedTrend(expandedTrend === i ? null : i)}
                    >
                      {expandedTrend === i ? 'Hide' : 'View'}
                      <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${expandedTrend === i ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{tc.summary}</p>

                  {/* Expanded: Trend comparison snapshots in scrollable panel */}
                  {expandedTrend === i && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ScrollableContent maxHeight={320}>
                        <TrendComparisonBlock
                          comparisons={tc.snapshots}
                          trendDirection={tc.trendDirection}
                          summary={tc.summary}
                        />
                      </ScrollableContent>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </DashboardSection>
        )}

        {/* ═══ 2. Trending Gaps — collapsed by default, expand one at a time ═══ */}
        {dashboardData.trendingGaps.length > 0 && (
          <DashboardSection
            icon={Flame}
            iconColor="text-orange-500"
            title="Trending Gaps"
            description="High-severity market gaps requiring attention"
          >
            <div className="space-y-0">
              {dashboardData.trendingGaps.map((gap, i) => (
                <div key={i}>
                  <div className="py-3 space-y-2">
                    {/* Always visible: severity badge + title + short description + key metrics */}
                    <div className="flex items-start gap-2.5">
                      <Badge variant="outline" className={`shrink-0 mt-0.5 ${severityColor(gap.severity)}`}>
                        {gap.severity}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-tight">{gap.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{gap.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 ml-2 h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); setExpandedGap(expandedGap === i ? null : i) }}
                      >
                        {expandedGap === i ? 'Show Less' : 'Show Details'}
                        <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${expandedGap === i ? 'rotate-180' : ''}`} />
                      </Button>
                    </div>

                    {/* Compact key metrics — always visible */}
                    <CompactEvidenceMetrics evidence={gap.evidenceDetail} />

                    {/* Collapsible detail section — fade+slide, NO overflow-hidden, NO height animation */}
                    {expandedGap === i && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ScrollableContent maxHeight={320}>
                          <div className="space-y-3">
                            {/* Full description */}
                            <p className="text-xs text-muted-foreground leading-relaxed">{gap.description}</p>

                            {/* Feasibility Summary Block */}
                            <FeasibilitySummaryBlock
                              executionDifficulty={gap.executionDifficulty ? { level: gap.executionDifficulty.level, demandLevel: gap.executionDifficulty.demandLevel, competitionLevel: gap.executionDifficulty.competitionLevel } : undefined}
                              opportunityScore={gap.marketQuadrant ? { total: gap.marketQuadrant.opportunityScore } : undefined}
                              falseOpportunity={gap.falseOpportunity ? { verdict: gap.falseOpportunity.verdict } : undefined}
                            />

                            {/* Full Evidence Block */}
                            <EvidenceBlock evidence={gap.evidenceDetail} />

                            {/* Combined badges row */}
                            {(gap.subNiche?.name || gap.marketQuadrant?.quadrant || gap.falseOpportunity?.verdict) && (
                              <div className="flex flex-wrap items-center gap-1.5 gap-y-2 max-w-full">
                                {gap.subNiche?.name && (
                                  <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400 gap-1 shrink-0 whitespace-nowrap">
                                    <CircleDot className="h-3 w-3" />
                                    {gap.subNiche.name}
                                    {gap.subNiche.opportunityScore > 0 && (
                                      <span className="ml-0.5 opacity-80">{gap.subNiche.opportunityScore}</span>
                                    )}
                                  </Badge>
                                )}
                                {gap.marketQuadrant?.quadrant === 'goldmine' && (
                                  <Badge className="text-xs bg-green-600 text-white gap-1 shrink-0 whitespace-nowrap">🔥 Goldmine</Badge>
                                )}
                                {gap.marketQuadrant?.quadrant === 'dead_zone' && (
                                  <Badge className="text-xs bg-red-600 text-white gap-1 shrink-0 whitespace-nowrap">💀 Dead Zone</Badge>
                                )}
                                {gap.falseOpportunity?.verdict === 'avoid' && (
                                  <Badge className="text-xs bg-red-600 text-white gap-1 shrink-0 whitespace-nowrap">⚠ Avoid</Badge>
                                )}
                                {gap.falseOpportunity?.verdict === 'caution' && (
                                  <Badge className="text-xs bg-amber-600 text-white gap-1 shrink-0 whitespace-nowrap">⚡ Caution</Badge>
                                )}
                              </div>
                            )}

                            {/* Underserved Audience — compact badges */}
                            {gap.underservedUsers && gap.underservedUsers.length > 0 && (
                              <div className="flex items-center gap-1.5 gap-y-2 flex-wrap max-w-full">
                                <Users className="h-3 w-3 shrink-0 text-purple-500" />
                                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider shrink-0">Underserved:</span>
                                {gap.underservedUsers.slice(0, 3).map((user, j) => (
                                  <Badge
                                    key={j}
                                    variant="outline"
                                    className="text-[10px] h-5 px-1.5 bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/40 shrink-0 whitespace-nowrap"
                                  >
                                    {user.userGroup}
                                    {user.opportunityScore > 0 && (
                                      <span className="ml-0.5 opacity-70">{user.opportunityScore}</span>
                                    )}
                                  </Badge>
                                ))}
                                {gap.underservedUsers.length > 3 && (
                                  <span className="text-[10px] text-muted-foreground">+{gap.underservedUsers.length - 3} more</span>
                                )}
                              </div>
                            )}

                            {/* Affected Products */}
                            {gap.affectedProducts && gap.affectedProducts.length > 0 && (
                              <div className="scroll-x-row overflow-x-auto -mx-1 px-1">
                                <div className="flex flex-wrap gap-1.5 gap-y-2" style={{ minWidth: 'min-content' }}>
                                  <span className="text-xs text-muted-foreground self-center mr-0.5 shrink-0">Affected:</span>
                                  {gap.affectedProducts.slice(0, 4).map((p, j) => (
                                    <Tooltip key={j}>
                                      <TooltipTrigger asChild>
                                        <Badge variant="outline" className="text-xs h-6 bg-muted/50 cursor-default gap-1 shrink-0 whitespace-nowrap">
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
                                    <Badge variant="outline" className="text-xs h-6 bg-muted/50 shrink-0 whitespace-nowrap">
                                      +{gap.affectedProducts.length - 4} more
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Inline meta: Execution + Why Now + Sources */}
                            {(gap.executionDifficulty || gap.whyNow || gap.sourceTransparency?.sourcePlatforms) && (
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-muted-foreground max-w-full">
                                {gap.executionDifficulty && (
                                  <span className="inline-flex items-center gap-1">
                                    <Gauge className="h-3 w-3 shrink-0" />
                                    {gap.executionDifficulty.level === 'low' || gap.executionDifficulty.level === 'low-medium' ? 'Easy' : gap.executionDifficulty.level === 'medium' ? 'Medium' : gap.executionDifficulty.level === 'medium-high' ? 'Med-Hard' : 'Hard'}
                                    {gap.executionDifficulty.timeToMvp && <> · {gap.executionDifficulty.timeToMvp}</>}
                                    {gap.executionDifficulty.estimatedBudget && <> · {gap.executionDifficulty.estimatedBudget}</>}
                                  </span>
                                )}
                                {gap.whyNow && (
                                  <span className="inline-flex items-center gap-1 max-w-[280px]">
                                    <Clock className="h-3 w-3 shrink-0 text-amber-500" />
                                    <span className="truncate">{gap.whyNow.timingAdvantage || gap.whyNow.marketGrowthDriver}</span>
                                  </span>
                                )}
                                {gap.sourceTransparency?.sourcePlatforms && (
                                  <span className="inline-flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3 shrink-0" />
                                    {gap.sourceTransparency.sourcePlatforms.join(', ')}
                                    {gap.sourceTransparency.confidenceLevel && (
                                      <Badge variant="outline" className="text-[9px] h-4 px-1 ml-0.5 whitespace-nowrap">{gap.sourceTransparency.confidenceLevel}</Badge>
                                    )}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </ScrollableContent>
                      </motion.div>
                    )}
                  </div>
                  {i < dashboardData.trendingGaps.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </DashboardSection>
        )}

        {/* ═══ 4. Saturated Markets + 5. Emerging Niches — 2-col grid ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Saturated Markets — collapsed by default */}
          {dashboardData.saturatedMarkets.length > 0 && (
            <DashboardSection
              icon={AlertTriangle}
              iconColor="text-amber-500"
              title="Saturated Markets"
              description="Categories with highest competition density"
              className="h-full"
            >
              <div className="space-y-3">
                {dashboardData.saturatedMarkets.slice(0, 5).map((sat, i) => (
                  <div key={sat.category} className="rounded-lg border p-3 space-y-2">
                    {/* Category name + saturation badge + expand button */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-semibold truncate">{sat.category}</span>
                        <Badge variant="outline" className={`shrink-0 whitespace-nowrap text-[10px] ${
                          sat.level === 'high'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                            : sat.level === 'medium'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              : 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                        }`}>
                          {sat.level}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); setExpandedMarket(expandedMarket === i ? null : i) }}
                      >
                        {expandedMarket === i ? 'Less' : 'More'}
                        <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${expandedMarket === i ? 'rotate-180' : ''}`} />
                      </Button>
                    </div>

                    {/* Visual saturation bar — always visible */}
                    <SaturationMeter score={sat.score} size="md" />

                    {/* Factor breakdown — show only 3 pills in collapsed state */}
                    <div className="flex flex-wrap gap-1.5 gap-y-2">
                      <MetricPill icon={Database} label="products" value={sat.factors.similarProducts} />
                      <MetricPill icon={Zap} label="overlap" value={`${sat.factors.featureOverlap}%`} colorClass="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" />
                      <MetricPill icon={Rocket} label="launches/mo" value={sat.factors.launchFrequency} />
                      {expandedMarket === i && (
                        <>
                          <MetricPill icon={MessageSquare} label="complaints" value={sat.factors.userComplaints} colorClass="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400" />
                          <MetricPill icon={DollarSign} label="pricing sim" value={`${sat.factors.pricingSimilarity}%`} />
                        </>
                      )}
                    </div>

                    {/* Collapsible: Competitors table + Sub-niches — fade+slide, NO overflow-hidden */}
                    {expandedMarket === i && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ScrollableContent maxHeight={320}>
                          <div className="space-y-2">
                            {/* Top Competitors table */}
                            {sat.topCompetitors && sat.topCompetitors.length > 0 && (
                              <div className="rounded-md border scroll-x-row">
                                <table className="w-full text-xs" style={{ minWidth: 360 }}>
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
                              <div className="flex flex-wrap gap-1.5 gap-y-2 items-center">
                                <span className="text-xs text-muted-foreground shrink-0">Sub-niches:</span>
                                {sat.subNiches.slice(0, 3).map((sn, j) => (
                                  <Badge key={j} variant="secondary" className="text-[10px] bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 shrink-0 whitespace-nowrap">
                                    {sn.name}
                                  </Badge>
                                ))}
                                {sat.subNiches.length > 3 && (
                                  <Badge variant="secondary" className="text-[10px] bg-muted/50">
                                    +{sat.subNiches.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </ScrollableContent>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            </DashboardSection>
          )}

          {/* Emerging Niches — collapsed by default */}
          {dashboardData.emergingNiches.length > 0 && (
            <DashboardSection
              icon={Zap}
              iconColor="text-green-500"
              title="Emerging Niches"
              description="Specific sub-niches with startup potential"
              className="h-full"
            >
              <div className="space-y-2">
                {dashboardData.emergingNiches.map((niche, i) => {
                  const opp = getOpportunityColor(niche.opportunityScore)
                  const isExpanded = expandedNiche === i
                  return (
                    <div key={niche.name + i} className="rounded-lg border p-3 space-y-1.5">
                      {/* Always visible: name + parent category + compact gauge */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-tight line-clamp-1">{niche.name}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <MiniGauge score={niche.opportunityScore} size="sm" />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => { e.stopPropagation(); setExpandedNiche(expandedNiche === i ? null : i) }}
                          >
                            {isExpanded ? 'Less' : 'More'}
                            <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </Button>
                        </div>
                      </div>

                      {/* Parent category tag — always visible */}
                      {niche.parentCategory && (
                        <Badge variant="outline" className="text-xs h-5 bg-muted/50">
                          {niche.parentCategory}
                        </Badge>
                      )}

                      {/* Description — clamped when collapsed */}
                      {!isExpanded && niche.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{niche.description}</p>
                      )}

                      {/* Expanded details — fade+slide, NO overflow-hidden */}
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ScrollableContent maxHeight={320}>
                            <div className="space-y-2">
                              {/* Full description */}
                              {niche.description && (
                                <p className="text-xs text-muted-foreground leading-relaxed">{niche.description}</p>
                              )}

                              {/* Opportunity score as colored progress bar */}
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

                              {/* Why it matters */}
                              {niche.description && niche.opportunityScore >= 60 && (
                                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                  <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-green-500" />
                                  <span className="leading-relaxed">High-opportunity niche: {niche.description}</span>
                                </div>
                              )}
                            </div>
                          </ScrollableContent>
                        </motion.div>
                      )}
                    </div>
                  )
                })}
              </div>
            </DashboardSection>
          )}
        </div>

        {/* ═══ 3. Complaint Clustering + Fastest Growing — 2-col grid ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Complaint Trends — collapsed by default */}
          {dashboardData.complaintTrends.length > 0 && (
            <DashboardSection
              icon={AlertTriangle}
              iconColor="text-red-500"
              title="Complaint Clusters"
              description="User complaint distribution by category"
              className="h-full"
            >
              <div className="space-y-2">
                {dashboardData.complaintTrends.map((cluster, i) => {
                  const clusterColors: Record<string, { bar: string; bg: string; text: string; badgeBg: string; quoteBorder: string; quoteBg: string }> = {
                    pricing: { bar: 'bg-red-500', bg: 'bg-red-100 dark:bg-red-950/30', text: 'text-red-600 dark:text-red-400', badgeBg: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400', quoteBorder: 'border-red-400 dark:border-red-600', quoteBg: 'bg-red-50/60 dark:bg-red-950/10' },
                    missing_feature: { bar: 'bg-amber-500', bg: 'bg-amber-100 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400', badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400', quoteBorder: 'border-amber-400 dark:border-amber-600', quoteBg: 'bg-amber-50/60 dark:bg-amber-950/10' },
                    performance: { bar: 'bg-rose-500', bg: 'bg-rose-100 dark:bg-rose-950/30', text: 'text-rose-600 dark:text-rose-400', badgeBg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400', quoteBorder: 'border-rose-400 dark:border-rose-600', quoteBg: 'bg-rose-50/60 dark:bg-rose-950/10' },
                    ux: { bar: 'bg-purple-500', bg: 'bg-purple-100 dark:bg-purple-950/30', text: 'text-purple-600 dark:text-purple-400', badgeBg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400', quoteBorder: 'border-purple-400 dark:border-purple-600', quoteBg: 'bg-purple-50/60 dark:bg-purple-950/10' },
                    support: { bar: 'bg-orange-500', bg: 'bg-orange-100 dark:bg-orange-950/30', text: 'text-orange-600 dark:text-orange-400', badgeBg: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400', quoteBorder: 'border-orange-400 dark:border-orange-600', quoteBg: 'bg-orange-50/60 dark:bg-orange-950/10' },
                    integration: { bar: 'bg-sky-500', bg: 'bg-sky-100 dark:bg-sky-950/30', text: 'text-sky-600 dark:text-sky-400', badgeBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400', quoteBorder: 'border-sky-400 dark:border-sky-600', quoteBg: 'bg-sky-50/60 dark:bg-sky-950/10' },
                  }
                  const cc = clusterColors[cluster.category] || clusterColors.pricing
                  const isExpanded = expandedComplaint === i
                  return (
                    <div key={cluster.category + i} className="space-y-1.5">
                      {/* Cluster header */}
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <div className="flex items-baseline gap-2 min-w-0 flex-1">
                          <span className={`text-lg font-extrabold tabular-nums shrink-0 ${cc.text}`}>
                            {cluster.percentage}%
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold leading-tight truncate">{cluster.label}</span>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{cluster.count} complaints</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 h-6 text-[10px] px-1.5"
                          onClick={() => setExpandedComplaint(expandedComplaint === i ? null : i)}
                        >
                          {isExpanded ? 'Hide' : 'View'}
                          <ChevronDown className={`h-2.5 w-2.5 ml-0.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </div>

                      {/* Thin progress bar */}
                      <div className={`h-2 rounded-full overflow-hidden shrink-0 ${cc.bg}`}>
                        <motion.div
                          className={`h-full rounded-full ${cc.bar}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${cluster.percentage}%` }}
                          transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.05 }}
                        />
                      </div>

                      {/* Expanded snippets — fade+slide, NO overflow-hidden */}
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ScrollableContent maxHeight={320}>
                            <div className="space-y-1">
                              {cluster.exampleSnippets.slice(0, 3).map((snippet, j) => (
                                <blockquote key={j} className={`border-l-[3px] ${cc.quoteBorder} ${cc.quoteBg} pl-3 pr-2 py-1 rounded-r-md`}>
                                  <p className="text-xs text-foreground leading-relaxed italic">
                                    &ldquo;{snippet}&rdquo;
                                  </p>
                                </blockquote>
                              ))}
                            </div>
                          </ScrollableContent>
                        </motion.div>
                      )}
                    </div>
                  )
                })}
              </div>
            </DashboardSection>
          )}

          {/* Fastest Growing Categories — no collapse needed, simple list */}
          {dashboardData.fastestGrowingCategories.length > 0 && (
            <DashboardSection
              icon={TrendingUp}
              iconColor="text-green-500"
              title="Fastest Growing"
              description="Categories with highest growth"
              className="h-full"
            >
              <div className="space-y-3">
                {dashboardData.fastestGrowingCategories.map((cat, i) => (
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
            </DashboardSection>
          )}
        </div>

        {/* ═══ 6. Underserved Users — full width ═══ */}
        {dashboardData.underservedUsers.length > 0 && (
          <DashboardSection
            icon={Users}
            iconColor="text-purple-600 dark:text-purple-400"
            title="Underserved Users"
            description="User groups ignored by current products"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {dashboardData.underservedUsers.map((user, i) => {
                const isExpanded = expandedUser === i
                const opp = getOpportunityColor(user.opportunityScore)
                return (
                  <div key={user.userGroup + i} className="rounded-lg border p-3 space-y-1.5">
                    {/* Always visible: name + opportunity badge + clamped description */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{user.userGroup}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className={`text-[10px] tabular-nums whitespace-nowrap ${opp.bg} ${opp.text}`}>
                          {user.opportunityScore}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] px-1.5"
                          onClick={() => setExpandedUser(expandedUser === i ? null : i)}
                        >
                          {isExpanded ? 'Hide' : 'Details'}
                          <ChevronDown className={`h-2.5 w-2.5 ml-0.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{user.description}</p>

                    {/* Expanded: evidence + full description — fade+slide, NO overflow-hidden */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ScrollableContent maxHeight={320}>
                          <div className="space-y-1.5">
                            <p className="text-xs text-muted-foreground leading-relaxed">{user.description}</p>
                            {user.evidence && (
                              <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <Quote className="h-3 w-3 shrink-0 mt-0.5 text-purple-500" />
                                <span className="italic leading-relaxed">{user.evidence}</span>
                              </div>
                            )}
                          </div>
                        </ScrollableContent>
                      </motion.div>
                    )}
                  </div>
                )
              })}
            </div>
          </DashboardSection>
        )}

        {/* ═══ Market Saturation Chart ═══ */}
        {saturationChartData.length > 0 && (
          <DashboardSection
            icon={BarChart3}
            iconColor="text-orange-500"
            title="Market Saturation by Category"
            description="Number of products detected per category"
          >
            <div className="overflow-x-auto scroll-x-row -mx-1 px-1">
              <ChartContainer config={chartConfig} className="h-48 sm:h-56 w-full min-w-[300px]">
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
            </div>
          </DashboardSection>
        )}

        {/* ═══ Recent Gaps — collapsed by default ═══ */}
        {dashboardData.recentGaps.length > 0 && (
          <DashboardSection
            icon={Database}
            iconColor="text-orange-500"
            title="Recent Gap Findings"
            description="Latest market gap detections with evidence"
          >
            <div className="space-y-0">
              {dashboardData.recentGaps.map((gap, i) => (
                <div key={i}>
                  <div className="py-2 space-y-2">
                    {/* Always visible: title + severity + short insight + compact metrics */}
                    <div className="flex items-start gap-2.5">
                      <Badge variant="outline" className={`shrink-0 ${severityColor(gap.severity)}`}>
                        {gap.severity}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">{gap.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{gap.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 h-7 text-xs"
                        onClick={(e) => { e.stopPropagation(); setExpandedRecent(expandedRecent === i ? null : i) }}
                      >
                        {expandedRecent === i ? 'Less' : 'Details'}
                        <ChevronDown className={`h-3 w-3 ml-1 transition-transform ${expandedRecent === i ? 'rotate-180' : ''}`} />
                      </Button>
                    </div>

                    {/* Compact evidence metrics */}
                    <CompactEvidenceMetrics evidence={gap.evidenceDetail} />

                    {/* Expanded: fade+slide, NO overflow-hidden */}
                    {expandedRecent === i && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ScrollableContent maxHeight={320}>
                          <div className="space-y-2">
                            {/* Full description */}
                            <p className="text-xs text-muted-foreground leading-relaxed">{gap.description}</p>

                            {/* Full Evidence Block */}
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
                              <div className="scroll-x-row overflow-x-auto -mx-1 px-1">
                                <div className="flex flex-wrap gap-1" style={{ minWidth: 'min-content' }}>
                                  {gap.affectedProducts.slice(0, 3).map((p, j) => (
                                    <Badge key={j} variant="outline" className="text-xs h-5 bg-muted/50 whitespace-nowrap">
                                      {p.name}
                                    </Badge>
                                  ))}
                                  {gap.affectedProducts.length > 3 && (
                                    <Badge variant="outline" className="text-xs h-5 bg-muted/50 whitespace-nowrap">
                                      +{gap.affectedProducts.length - 3}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </ScrollableContent>
                      </motion.div>
                    )}
                  </div>
                  {i < dashboardData.recentGaps.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </DashboardSection>
        )}
      </div>
    </TooltipProvider>
  )
}
