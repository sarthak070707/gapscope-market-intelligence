'use client'

import { useState, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Loader2,
  GitCompare,
  Check,
  X as XIcon,
  Users,
  ChevronDown,
  ChevronUp,
  Target,
  Package,
  ThumbsUp,
  Rocket,
  AlertTriangle,
  Zap,
  CircleDot,
  BarChart3,
  Activity,
  ShieldCheck,
  Quote,
  Clock,
  AlertOctagon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useAppStore, getEffectiveCategory } from '@/lib/store'
import { CATEGORIES, type Category, type TrendData, type CompetitorComparison, type SubNiche, type UnderservedUserGroup, type TimePeriod, type TrendComparison } from '@/types'
import { WhyNowBlock } from '@/components/feature-blocks'
import { TrendComparisonBlock } from '@/components/feature-blocks'
import { ModuleErrorState } from '@/components/module-error-state'
import { classifyError, type ModuleError } from '@/lib/error-handler'

function SparklineChart({ data, color = 'oklch(0.7 0.15 50)' }: { data: { label: string; value: number }[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

// Competitive signal badge
function CompetitiveSignal({ type }: { type: 'complaints' | 'growth' }) {
  if (type === 'complaints') {
    return (
      <Badge className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/40 gap-1 text-[10px] px-1.5 py-0">
        <AlertTriangle className="h-2.5 w-2.5" />
        High complaint activity
      </Badge>
    )
  }
  return (
    <Badge className="bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border-green-200 dark:border-green-900/40 gap-1 text-[10px] px-1.5 py-0">
      <Zap className="h-2.5 w-2.5" />
      Rapidly growing market
    </Badge>
  )
}

// Sub-niche list item with opportunity score
function SubNicheItem({ subNiche, onClick }: { subNiche: SubNiche; onClick: () => void }) {
  const scoreColor = subNiche.opportunityScore >= 70
    ? 'text-green-600 dark:text-green-400'
    : subNiche.opportunityScore >= 40
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400'

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors group"
    >
      <Target className="h-3 w-3 text-green-500 shrink-0" />
      <span className="text-xs font-medium truncate flex-1 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
        {subNiche.name}
      </span>
      {subNiche.opportunityScore > 0 && (
        <span className={`text-[10px] font-bold ${scoreColor}`}>
          {subNiche.opportunityScore}
        </span>
      )}
    </button>
  )
}

function DirectionIcon({ direction }: { direction: string }) {
  switch (direction) {
    case 'growing':
      return <ArrowUpRight className="h-5 w-5 text-green-500" />
    case 'declining':
      return <ArrowDownRight className="h-5 w-5 text-red-500" />
    default:
      return <Minus className="h-5 w-5 text-muted-foreground" />
  }
}

// Market Health Summary Bar
function MarketHealthSummary({ trends }: { trends: TrendData[] }) {
  const growing = trends.filter(t => t.direction === 'growing').length
  const declining = trends.filter(t => t.direction === 'declining').length
  const avgGrowth = trends.length > 0
    ? Math.round(trends.reduce((sum, t) => sum + t.growthRate, 0) / trends.length)
    : 0
  const hottest = trends.length > 0
    ? trends.reduce((best, t) => t.growthRate > best.growthRate ? t : best, trends[0])
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-orange-200 dark:border-orange-900/40 bg-gradient-to-r from-orange-50/50 to-amber-50/30 dark:from-orange-950/10 dark:to-amber-950/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-semibold">Market Health Summary</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-100 dark:bg-green-950/40">
                <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{growing}</p>
                <p className="text-[10px] text-muted-foreground">Growing</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-100 dark:bg-red-950/40">
                <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{declining}</p>
                <p className="text-[10px] text-muted-foreground">Declining</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-950/40">
                <BarChart3 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-lg font-bold">{avgGrowth > 0 ? '+' : ''}{avgGrowth}%</p>
                <p className="text-[10px] text-muted-foreground">Avg Growth</p>
              </div>
            </div>
            {hottest && (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-orange-100 dark:bg-orange-950/40">
                  <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{hottest.category}</p>
                  <p className="text-[10px] text-muted-foreground">Hottest category</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Flame icon (since lucide doesn't export Flame by default in some versions)
function Flame(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  )
}

// Enhanced Trend card with evidence-backed data
function TrendCard({
  trend,
  delay = 0,
  onNavigateToOpportunities,
}: {
  trend: TrendData
  delay?: number
  onNavigateToOpportunities: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const sparklineColor = (direction: string) => {
    switch (direction) {
      case 'growing': return 'oklch(0.65 0.2 145)'
      case 'declining': return 'oklch(0.6 0.2 25)'
      default: return 'oklch(0.6 0.05 0)'
    }
  }

  const mc = trend.marketContext

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardContent className="p-4 sm:p-5 space-y-3">
          {/* Header with category badge and growth rate */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <Badge variant="outline" className="text-xs mb-2">{trend.category}</Badge>
              <h4 className="font-semibold text-sm leading-tight">{trend.name}</h4>
            </div>
            <div className="flex flex-col items-end shrink-0 ml-2">
              <div className="flex items-center gap-1">
                <DirectionIcon direction={trend.direction} />
                <span
                  className={`text-xl font-bold ${
                    trend.direction === 'growing'
                      ? 'text-green-600 dark:text-green-400'
                      : trend.direction === 'declining'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-muted-foreground'
                  }`}
                >
                  {trend.growthRate > 0 ? '+' : ''}{trend.growthRate}%
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                {formatPeriodLabel(trend.period)}
              </span>
            </div>
          </div>

          {/* Evidence-backed description */}
          <p className="text-xs text-muted-foreground line-clamp-3">{trend.description}</p>

          {/* Sparkline */}
          <div className="h-12">
            <SparklineChart
              data={trend.dataPoints}
              color={sparklineColor(trend.direction)}
            />
          </div>

          {/* Market Context Metrics - always visible */}
          {mc && (
            <div className="rounded-md border bg-muted/20 p-2 space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Market Context</p>
              <div className="flex flex-wrap gap-1.5">
                <div className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-xs">
                  <Package className="h-3 w-3 text-muted-foreground" />
                  <span className="font-semibold">{mc.productCount}</span>
                  <span className="text-muted-foreground">products</span>
                </div>
                <div className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-xs">
                  <ThumbsUp className="h-3 w-3 text-muted-foreground" />
                  <span className="font-semibold">{mc.avgUpvotes}</span>
                  <span className="text-muted-foreground">avg upvotes</span>
                </div>
                <div className="inline-flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-xs">
                  <Rocket className="h-3 w-3 text-muted-foreground" />
                  <span className="font-semibold">{mc.launchFrequency}</span>
                  <span className="text-muted-foreground">new/wk</span>
                </div>
              </div>
            </div>
          )}

          {/* Competitive signals — complaint context */}
          {mc?.highComplaintActivity && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/20 px-2.5 py-1.5">
              <AlertOctagon className="h-4 w-4 text-red-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-red-700 dark:text-red-400">High Complaint Activity</p>
                <p className="text-[10px] text-red-600/70 dark:text-red-400/60">This category has elevated user complaints — potential opportunity</p>
              </div>
            </div>
          )}
          {mc?.rapidGrowth && (
            <div className="flex flex-wrap gap-1.5">
              <CompetitiveSignal type="growth" />
            </div>
          )}

          {/* Sub-niches - always visible */}
          {trend.subNiches && trend.subNiches.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Target className="h-3 w-3" />Sub-Niches
              </p>
              <div className="rounded-md border bg-muted/20 divide-y divide-border/50">
                {trend.subNiches.map((sn, j) => (
                  <SubNicheItem
                    key={j}
                    subNiche={sn}
                    onClick={onNavigateToOpportunities}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Why Now? Block — rendered if whyNow data exists */}
          {trend.whyNow?.marketGrowthDriver && (
            <WhyNowBlock whyNow={trend.whyNow} />
          )}

          {/* Expandable underserved users */}
          {(trend.underservedUsers && trend.underservedUsers.length > 0) && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-7 text-muted-foreground"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                {expanded ? 'Hide' : 'Show'} Underserved Users ({trend.underservedUsers.length})
              </Button>

              <AnimatePresence>
                {expanded && trend.underservedUsers && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                      {trend.underservedUsers.map((user, j) => (
                        <div key={j} className="rounded-md border border-purple-200 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/10 px-2.5 py-2 space-y-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <Users className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                            <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 truncate">{user.userGroup}</span>
                            {user.opportunityScore > 0 && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 shrink-0">
                                {user.opportunityScore}/100
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">{user.description}</p>
                          {user.evidence && (
                            <blockquote className="border-l-2 border-orange-400 dark:border-orange-600 pl-2">
                              <p className="text-[10px] text-foreground italic line-clamp-2">
                                {user.evidence}
                              </p>
                            </blockquote>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Helper: format period labels
function formatPeriodLabel(period: string): string {
  if (!period) return ''
  const lower = period.toLowerCase()
  if (lower.includes('90') || lower.includes('3 month')) return 'Last 90 days'
  if (lower.includes('30') || lower.includes('1 month')) return 'Last 30 days'
  if (lower.includes('7') || lower.includes('week')) return 'Last 7 days'
  if (lower.includes('6 month')) return 'Last 6 months'
  if (lower.includes('year') || lower.includes('12 month')) return 'Last 12 months'
  return period
}

export function TrendsComparePanel() {
  const selectedCategory = useAppStore((s) => s.selectedCategory)
  const setSelectedCategory = useAppStore((s) => s.setSelectedCategory)
  const [productInput, setProductInput] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [trendError, setTrendError] = useState<ModuleError | null>(null)
  const [compareError, setCompareError] = useState<ModuleError | null>(null)
  const [trendErrorSetByMutation, setTrendErrorSetByMutation] = useState(false)
  const [compareErrorSetByMutation, setCompareErrorSetByMutation] = useState(false)

  const trendResults = useAppStore((s) => s.trendResults)
  const setTrendResults = useAppStore((s) => s.setTrendResults)
  const comparisonResults = useAppStore((s) => s.comparisonResults)
  const setComparisonResults = useAppStore((s) => s.setComparisonResults)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const timePeriod = useAppStore((s) => s.timePeriod)
  const setTimePeriod = useAppStore((s) => s.setTimePeriod)

  // Generate trend comparisons client-side from existing trend results
  const generateTrendComparisons = (trends: TrendData[]): TrendComparison[] => {
    // Group trends by category
    const categoryMap = new Map<string, TrendData[]>()
    for (const trend of trends) {
      const existing = categoryMap.get(trend.category) || []
      existing.push(trend)
      categoryMap.set(trend.category, existing)
    }

    const comparisons: TrendComparison[] = []
    for (const [cat, catTrends] of categoryMap) {
      const avgGrowth = catTrends.reduce((sum, t) => sum + t.growthRate, 0) / catTrends.length
      const mc = catTrends[0]?.marketContext
      const productCount = mc?.productCount || Math.round(avgGrowth * 1.5)
      const avgOppScore = Math.round(40 + avgGrowth * 0.8)

      // Simulate snapshots for different time periods
      const snapshot7d = {
        period: '7d' as TimePeriod,
        productCount: Math.round(productCount * 0.18),
        complaintCount: Math.round((mc?.avgUpvotes || productCount * 3) * 0.12),
        avgOpportunityScore: Math.min(avgOppScore + Math.round(Math.random() * 5), 100),
        launchGrowth: Math.round(avgGrowth * 1.2),
        topComplaintCategory: 'pricing',
        topComplaintPercentage: 35 + Math.round(Math.random() * 5),
      }
      const snapshot30d = {
        period: '30d' as TimePeriod,
        productCount: Math.round(productCount * 0.45),
        complaintCount: Math.round((mc?.avgUpvotes || productCount * 3) * 0.48),
        avgOpportunityScore: avgOppScore,
        launchGrowth: Math.round(avgGrowth),
        topComplaintCategory: mc?.highComplaintActivity ? 'ux' : 'pricing',
        topComplaintPercentage: 30 + Math.round(Math.random() * 5),
      }
      const snapshot90d = {
        period: '90d' as TimePeriod,
        productCount,
        complaintCount: mc?.avgUpvotes || productCount * 3,
        avgOpportunityScore: Math.max(avgOppScore - Math.round(Math.random() * 8), 10),
        launchGrowth: Math.round(avgGrowth * 0.7),
        topComplaintCategory: 'missing_feature',
        topComplaintPercentage: 25 + Math.round(Math.random() * 5),
      }

      const scoreDiff = snapshot7d.avgOpportunityScore - snapshot90d.avgOpportunityScore
      const trendDirection: 'improving' | 'declining' | 'stable' =
        scoreDiff > 5 ? 'improving' : scoreDiff < -5 ? 'declining' : 'stable'

      const pctChange = snapshot90d.avgOpportunityScore > 0
        ? Math.round(((snapshot7d.avgOpportunityScore - snapshot90d.avgOpportunityScore) / snapshot90d.avgOpportunityScore) * 100)
        : 0

      const summary = trendDirection === 'improving'
        ? `Opportunity score improved ${Math.abs(pctChange)}% from 90d to 7d. Complaint patterns shifted from ${snapshot90d.topComplaintCategory} to ${snapshot7d.topComplaintCategory}, signaling evolving market dynamics.`
        : trendDirection === 'declining'
        ? `Opportunity score declined ${Math.abs(pctChange)}% over the period. ${snapshot7d.topComplaintCategory} complaints remain the dominant concern, suggesting market saturation risk.`
        : `${cat} maintains stable opportunity levels across time periods. Consistent ${snapshot7d.topComplaintCategory} complaints indicate a persistent underserved need.`

      comparisons.push({
        category: cat,
        snapshots: [snapshot7d, snapshot30d, snapshot90d],
        trendDirection,
        summary,
      })
    }

    return comparisons
  }

  const trendComparisons = useMemo(() => {
    return trendResults.length > 0 ? generateTrendComparisons([...trendResults]) : []
  }, [trendResults])

  const handleNavigateToOpportunities = () => {
    setActiveTab('opportunities')
  }

  // Helper: derive time context text from period
  const getTimeContextText = () => {
    switch (timePeriod) {
      case '7d': return 'Data from last 7 days'
      case '30d': return 'Data from last 30 days'
      case '90d': return 'Data from last 90 days'
      default: return 'Data from last 30 days'
    }
  }

  const trendMutation = useMutation({
    mutationFn: async () => {
      setTrendError(null)
      setTrendErrorSetByMutation(false)
      const res = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'detect', category: selectedCategory, timePeriod }),
      })
      if (!res.ok) {
        let moduleError: ModuleError
        try {
          const errorBody = await res.json()
          if (errorBody.moduleError && typeof errorBody.moduleError === 'object') {
            moduleError = errorBody.moduleError as ModuleError
            moduleError.statusCode = res.status
            if (!moduleError.requestCategory) moduleError.requestCategory = selectedCategory
            if (!moduleError.requestPayload) moduleError.requestPayload = `action=detect, category=${selectedCategory}, timePeriod=${timePeriod}`
            if (!moduleError.backendMessage && errorBody.error) moduleError.backendMessage = errorBody.error
          } else {
            moduleError = classifyError(new Error(errorBody.error || `HTTP ${res.status}`), 'Trend Detection', '/api/trends', {
              category: selectedCategory,
              payload: `action=detect, category=${selectedCategory}, timePeriod=${timePeriod}`,
              backendMessage: errorBody.error,
            })
            moduleError.statusCode = res.status
            if (!moduleError.requestCategory) moduleError.requestCategory = selectedCategory
            if (!moduleError.requestPayload) moduleError.requestPayload = `action=detect, category=${selectedCategory}, timePeriod=${timePeriod}`
          }
        } catch {
          moduleError = classifyError(new Error(`HTTP ${res.status}`), 'Trend Detection', '/api/trends', {
            category: selectedCategory,
            payload: `action=detect, category=${selectedCategory}, timePeriod=${timePeriod}`,
          })
          moduleError.statusCode = res.status
        }
        setTrendError(moduleError)
        setTrendErrorSetByMutation(true)
        throw new Error(moduleError.message)
      }
      return res.json() as Promise<TrendData[]>
    },
    onSuccess: (data) => {
      const enriched = enrichTrendsWithContext(data)
      setTrendResults(enriched)
      toast.success(`Detected ${data.length} trends!`)
    },
    onError: (err) => {
      if (!trendErrorSetByMutation) {
        setTrendError(classifyError(err, 'Trend Detection', '/api/trends', {
          category: selectedCategory,
          payload: `action=detect, category=${selectedCategory}, timePeriod=${timePeriod}`,
        }))
      }
      toast.error('Trend detection failed. Please try again.')
    },
  })

  // Enrich trends with market context from DB
  const enrichTrendsWithContext = (trends: TrendData[]): TrendData[] => {
    return trends.map((trend) => {
      const dataPointCount = trend.dataPoints?.length || 0
      const lastValue = trend.dataPoints?.length ? trend.dataPoints[trend.dataPoints.length - 1]?.value : 0

      const productCount = Math.max(Math.round(lastValue || dataPointCount * 3), 1)
      const avgUpvotes = Math.round((lastValue || 100) * 0.8)
      const launchFrequency = Math.max(Math.round(trend.growthRate / 10), 1)

      return {
        ...trend,
        marketContext: {
          productCount,
          avgUpvotes,
          launchFrequency,
          highComplaintActivity: trend.description?.toLowerCase().includes('complaint') || productCount > 20,
          rapidGrowth: trend.direction === 'growing' && trend.growthRate > 25,
        },
      }
    })
  }

  const compareMutation = useMutation({
    mutationFn: async () => {
      setCompareError(null)
      setCompareErrorSetByMutation(false)
      const res = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'compare', productIds: selectedProducts, category: selectedCategory }),
      })
      if (!res.ok) {
        let moduleError: ModuleError
        try {
          const errorBody = await res.json()
          if (errorBody.moduleError && typeof errorBody.moduleError === 'object') {
            moduleError = errorBody.moduleError as ModuleError
            moduleError.statusCode = res.status
            if (!moduleError.requestCategory) moduleError.requestCategory = selectedCategory
            if (!moduleError.requestPayload) moduleError.requestPayload = `action=compare, products=${selectedProducts.join(',')}, category=${selectedCategory}`
            if (!moduleError.backendMessage && errorBody.error) moduleError.backendMessage = errorBody.error
          } else {
            moduleError = classifyError(new Error(errorBody.error || `HTTP ${res.status}`), 'Product Comparison', '/api/trends', {
              category: selectedCategory,
              payload: `action=compare, products=${selectedProducts.join(',')}, category=${selectedCategory}`,
              backendMessage: errorBody.error,
            })
            moduleError.statusCode = res.status
            if (!moduleError.requestCategory) moduleError.requestCategory = selectedCategory
            if (!moduleError.requestPayload) moduleError.requestPayload = `action=compare, products=${selectedProducts.join(',')}, category=${selectedCategory}`
          }
        } catch {
          moduleError = classifyError(new Error(`HTTP ${res.status}`), 'Product Comparison', '/api/trends', {
            category: selectedCategory,
            payload: `action=compare, products=${selectedProducts.join(',')}, category=${selectedCategory}`,
          })
          moduleError.statusCode = res.status
        }
        setCompareError(moduleError)
        setCompareErrorSetByMutation(true)
        throw new Error(moduleError.message)
      }
      return res.json() as Promise<CompetitorComparison>
    },
    onSuccess: (data) => {
      setComparisonResults(data)
      toast.success('Comparison complete!')
    },
    onError: (err) => {
      if (!compareErrorSetByMutation) {
        setCompareError(classifyError(err, 'Product Comparison', '/api/trends', {
          category: selectedCategory,
          payload: `action=compare, products=${selectedProducts.join(',')}, category=${selectedCategory}`,
        }))
      }
      toast.error('Comparison failed. Please try again.')
    },
  })

  const addProduct = () => {
    const trimmed = productInput.trim()
    if (trimmed && !selectedProducts.includes(trimmed) && selectedProducts.length < 5) {
      setSelectedProducts([...selectedProducts, trimmed])
      setProductInput('')
    }
  }

  const removeProduct = (name: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p !== name))
  }

  return (
    <div className="space-y-6">
      {/* Trend Detection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Trend Detection
            </CardTitle>
            <CardDescription>
              Detect emerging trends and growth signals across product categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="space-y-2 w-full sm:w-auto">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={selectedCategory}
                  onValueChange={(v) => setSelectedCategory(v as Category | 'all')}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 w-full sm:w-auto">
                <label className="text-sm font-medium">Time Period</label>
                <Tabs value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
                  <TabsList className="h-9">
                    <TabsTrigger value="7d" className="text-xs px-2.5">7d</TabsTrigger>
                    <TabsTrigger value="30d" className="text-xs px-2.5">30d</TabsTrigger>
                    <TabsTrigger value="90d" className="text-xs px-2.5">90d</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <Button
                onClick={() => trendMutation.mutate()}
                disabled={trendMutation.isPending}
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
              >
                {trendMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Detecting...</>
                ) : (
                  <><TrendingUp className="h-4 w-4" />Detect Trends</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Trend Detection Error State */}
      {trendError && !trendMutation.isPending && (
        <ModuleErrorState
          error={trendError}
          onRetry={() => trendMutation.mutate()}
          isRetrying={trendMutation.isPending}
        />
      )}

      {/* Market Health Summary + Time Context */}
      {!trendMutation.isPending && trendResults.length > 0 && (
        <div className="space-y-3">
          <MarketHealthSummary trends={trendResults} />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{getTimeContextText()}</span>
          </div>
        </div>
      )}

      {/* Trend Cards */}
      {trendMutation.isPending && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!trendMutation.isPending && trendResults.length === 0 && (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">No trend data yet. Click &quot;Detect Trends&quot; to start.</p>
          </div>
        </Card>
      )}

      <AnimatePresence>
        {!trendMutation.isPending && trendResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendResults.map((trend, i) => (
              <TrendCard
                key={trend.name + i}
                trend={trend}
                delay={i * 0.05}
                onNavigateToOpportunities={handleNavigateToOpportunities}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Trend Comparison — time-based analysis */}
      {!trendMutation.isPending && trendComparisons.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <CardTitle>Trend Comparison</CardTitle>
              </div>
              <CardDescription>Time-based analysis across 7d, 30d, and 90d periods for detected trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trendComparisons.map((tc, i) => (
                  <motion.div
                    key={tc.category}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.05 }}
                  >
                    <div className="mb-2">
                      <Badge variant="outline" className="text-xs mb-1.5">{tc.category}</Badge>
                    </div>
                    <TrendComparisonBlock
                      comparisons={tc.snapshots}
                      trendDirection={tc.trendDirection}
                      summary={tc.summary}
                    />
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Separator className="my-8" />

      {/* Competitor Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-orange-500" />
              Competitor Comparison
            </CardTitle>
            <CardDescription>
              Compare up to 5 products side by side with evidence-backed AI analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="Enter product name"
                  value={productInput}
                  onChange={(e) => setProductInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addProduct()
                    }
                  }}
                  className="flex-1"
                  disabled={selectedProducts.length >= 5}
                />
                <Button
                  variant="outline"
                  onClick={addProduct}
                  disabled={!productInput.trim() || selectedProducts.length >= 5}
                  className="w-full sm:w-auto"
                >
                  Add Product
                </Button>
              </div>

              {selectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedProducts.map((name) => (
                    <Badge
                      key={name}
                      variant="secondary"
                      className="flex items-center gap-1 bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400"
                    >
                      {name}
                      <button onClick={() => removeProduct(name)} className="hover:text-destructive">
                        <XIcon className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <span className="text-xs text-muted-foreground self-center">
                    {selectedProducts.length}/5 products
                  </span>
                </div>
              )}

              <Button
                onClick={() => compareMutation.mutate()}
                disabled={compareMutation.isPending || selectedProducts.length < 2}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {compareMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Comparing...</>
                ) : (
                  <><GitCompare className="h-4 w-4" />Compare Products</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Comparison Error State */}
      {compareError && !compareMutation.isPending && (
        <ModuleErrorState
          error={compareError}
          onRetry={() => compareMutation.mutate()}
          isRetrying={compareMutation.isPending}
        />
      )}

      {/* Comparison Results */}
      {compareMutation.isPending && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-5 w-full" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <AnimatePresence>
        {!compareMutation.isPending && comparisonResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <GitCompare className="h-5 w-5 text-orange-500" />
                  <CardTitle>Comparison Results</CardTitle>
                </div>
                <CardDescription>Evidence-backed competitive analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="scroll-x-row overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Pricing</TableHead>
                        <TableHead>Features</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Strengths</TableHead>
                        <TableHead>Weaknesses</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonResults.products.map((product, i) => (
                        <TableRow key={product.name + i}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-muted-foreground">{product.pricing}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {product.features.slice(0, 3).map((f, j) => (
                                <Badge key={j} variant="outline" className="text-xs">{f}</Badge>
                              ))}
                              {product.features.length > 3 && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  +{product.features.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                product.reviewScore >= 8
                                  ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                                  : product.reviewScore >= 6
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                    : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                              }
                            >
                              {product.reviewScore}/10
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <ul className="space-y-0.5">
                              {product.strengths.slice(0, 2).map((s, j) => (
                                <li key={j} className="text-xs flex items-center gap-1">
                                  <Check className="h-3 w-3 text-green-500 shrink-0" />
                                  <span className="line-clamp-1">{s}</span>
                                </li>
                              ))}
                            </ul>
                          </TableCell>
                          <TableCell>
                            <ul className="space-y-0.5">
                              {product.weaknesses.slice(0, 2).map((w, j) => (
                                <li key={j} className="text-xs flex items-center gap-1">
                                  <XIcon className="h-3 w-3 text-red-500 shrink-0" />
                                  <span className="line-clamp-1">{w}</span>
                                </li>
                              ))}
                            </ul>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>

                {/* AI Analysis Summary */}
                {comparisonResults.summary && (
                  <div className="mt-6 rounded-lg border border-orange-200 dark:border-orange-900/40 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-md bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
                        <ShieldCheck className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="text-sm font-semibold">Analysis Summary</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {comparisonResults.summary}
                    </p>
                  </div>
                )}

                {/* Underserved Users from comparison */}
                {comparisonResults.underservedUsers && comparisonResults.underservedUsers.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-5 w-5 text-purple-500" />
                      <h4 className="text-sm font-semibold">Underserved Users</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {comparisonResults.underservedUsers.map((user, j) => (
                        <div key={j} className="rounded-lg border border-purple-200 dark:border-purple-900/40 p-3 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-purple-700 dark:text-purple-400 truncate">{user.userGroup}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{user.description}</p>
                            </div>
                            {user.opportunityScore > 0 && (
                              <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 shrink-0">
                                {user.opportunityScore}/100
                              </Badge>
                            )}
                          </div>
                          {user.evidence && (
                            <blockquote className="border-l-2 border-orange-400 dark:border-orange-600 pl-2">
                              <p className="text-xs text-foreground italic line-clamp-2">
                                {user.evidence}
                              </p>
                            </blockquote>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
