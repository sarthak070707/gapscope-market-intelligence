'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  Loader2,
  AlertTriangle,
  Zap,
  DollarSign,
  Users,
  Layers,
  Shield,
  Check,
  X as XIcon,
  ChevronDown,
  ChevronUp,
  BarChart3,
  CircleDot,
  Link2,
  Clock,
  Gauge,
  UserCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppStore, getEffectiveCategory } from '@/lib/store'
import { SaturationMeter } from '@/components/ui/saturation-meter'
import { WhyNowBlock, ExecutionDifficultyBlock, FalseOpportunityBlock, FounderFitBlock, SourceTransparencyBlock, WhyExistingProductsFailBlock, MarketQuadrantBlock, EnhancedEvidenceBlock, WhyOpportunityExistsBlock, UnderservedAudienceBlock, FeasibilitySummaryBlock } from '@/components/feature-blocks'
import { CATEGORIES, type Category, type GapType, type GapAnalysis, type MarketSaturation, type ComplaintCluster, type TimePeriod, type ComplaintCategory, type WhyNowAnalysis, type ExecutionDifficulty, type FalseOpportunityAnalysis, type FounderFitSuggestion, type SourceTransparency, type WhyExistingProductsFail, type MarketQuadrantPosition } from '@/types'
import { ModuleErrorState } from '@/components/module-error-state'
import { classifyError, type ModuleError } from '@/lib/error-handler'

// ─── Gap Type Visual Config ────────────────────────────────────────────────
const GAP_TYPE_CONFIG: Record<GapType, { label: string; icon: React.ElementType; color: string; darkColor: string }> = {
  missing_feature: {
    label: 'Missing Feature',
    icon: Zap,
    color: 'bg-amber-100 text-amber-700',
    darkColor: 'dark:bg-amber-950/40 dark:text-amber-400',
  },
  weak_ux: {
    label: 'Weak UX',
    icon: Users,
    color: 'bg-purple-100 text-purple-700',
    darkColor: 'dark:bg-purple-950/40 dark:text-purple-400',
  },
  expensive: {
    label: 'Expensive',
    icon: DollarSign,
    color: 'bg-red-100 text-red-700',
    darkColor: 'dark:bg-red-950/40 dark:text-red-400',
  },
  underserved: {
    label: 'Underserved',
    icon: Target,
    color: 'bg-green-100 text-green-700',
    darkColor: 'dark:bg-green-950/40 dark:text-green-400',
  },
  overcrowded: {
    label: 'Overcrowded',
    icon: Layers,
    color: 'bg-sky-100 text-sky-700',
    darkColor: 'dark:bg-sky-950/40 dark:text-sky-400',
  },
}

const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/40',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/40',
  low: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border-green-200 dark:border-green-900/40',
}

// ─── Complaint Cluster Bar Colors ──────────────────────────────────────────
const CLUSTER_BAR_COLORS: Record<string, { bar: string; bg: string; text: string }> = {
  pricing: {
    bar: 'bg-red-500 dark:bg-red-400',
    bg: 'bg-red-50 dark:bg-red-950/20',
    text: 'text-red-700 dark:text-red-400',
  },
  missing_feature: {
    bar: 'bg-amber-500 dark:bg-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    text: 'text-amber-700 dark:text-amber-400',
  },
  performance: {
    bar: 'bg-red-500 dark:bg-red-400',
    bg: 'bg-red-50 dark:bg-red-950/20',
    text: 'text-red-700 dark:text-red-400',
  },
  ux: {
    bar: 'bg-purple-500 dark:bg-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-950/20',
    text: 'text-purple-700 dark:text-purple-400',
  },
  support: {
    bar: 'bg-orange-500 dark:bg-orange-400',
    bg: 'bg-orange-50 dark:bg-orange-950/20',
    text: 'text-orange-700 dark:text-orange-400',
  },
  integration: {
    bar: 'bg-sky-500 dark:bg-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/20',
    text: 'text-sky-700 dark:text-sky-400',
  },
}

function getClusterColor(category: string) {
  return CLUSTER_BAR_COLORS[category] || {
    bar: 'bg-gray-500 dark:bg-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-950/20',
    text: 'text-gray-700 dark:text-gray-400',
  }
}

// ─── Mini Metric Dot ───────────────────────────────────────────────────────
function MetricDot({ value, max = 100, label }: { value: number; max?: number; label: string }) {
  const ratio = Math.min(value / max, 1)
  const color = ratio >= 0.7 ? 'bg-red-500' : ratio >= 0.4 ? 'bg-amber-500' : 'bg-green-500'
  return (
    <div className="flex items-center gap-1.5" title={`${label}: ${value}`}>
      <div className="flex gap-0.5">
        {[0.2, 0.4, 0.6, 0.8, 1.0].map((threshold) => (
          <div
            key={threshold}
            className={`h-2 w-1.5 rounded-sm transition-colors ${ratio >= threshold ? color : 'bg-muted'}`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{value}</span>
    </div>
  )
}

// ─── Compact Execution Difficulty Badge (for card header) ───────────────────
function ExecutionDifficultyBadge({ level }: { level: string }) {
  const config: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    low: { label: 'Easy', color: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border-green-200 dark:border-green-900/40', icon: Gauge },
    'low-medium': { label: 'Easy', color: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 border-green-200 dark:border-green-900/40', icon: Gauge },
    medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/40', icon: Gauge },
    'medium-high': { label: 'Medium', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/40', icon: Gauge },
    high: { label: 'Hard', color: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/40', icon: Gauge },
  }
  const c = config[level] || config.medium
  const Icon = c.icon
  return (
    <Badge variant="outline" className={`${c.color} gap-1 text-[10px] h-5 px-1.5`}>
      <Icon className="h-2.5 w-2.5" />
      {c.label}
    </Badge>
  )
}

// ─── Sub-Niche Badge ────────────────────────────────────────────────────────
function SubNicheBadge({ name, opportunityScore, description }: { name: string; opportunityScore: number; description?: string }) {
  return (
    <div className="rounded-lg border bg-green-50/80 dark:bg-green-950/20 border-green-200 dark:border-green-900/40 p-2.5 overflow-hidden">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 shrink-0">
          <CircleDot className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          <span className="text-xs font-semibold text-green-700 dark:text-green-400">Sub-Niche</span>
        </div>
        <Badge className="bg-green-600 text-white dark:bg-green-700 dark:text-white text-xs font-semibold hover:bg-green-700 shrink-0 whitespace-nowrap">
          {name}
        </Badge>
        {opportunityScore > 0 && (
          <Badge variant="outline" className="text-xs border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 shrink-0 whitespace-nowrap">
            {opportunityScore}/100 opportunity
          </Badge>
        )}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{description}</p>
      )}
    </div>
  )
}

// ─── Affected Products Row ──────────────────────────────────────────────────
function AffectedProductsRow({ products }: { products: NonNullable<GapAnalysis['affectedProducts']> }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Link2 className="h-3.5 w-3.5" />
        Affected Products
      </p>
      <div className="flex flex-wrap gap-2">
        {products.map((product, j) => (
          <div
            key={j}
            className="rounded-lg border bg-card p-2 text-xs flex items-center gap-2 flex-wrap min-w-[180px]"
          >
            <span className="font-semibold text-foreground">{product.name}</span>
            <Badge variant="outline" className="h-5 text-[10px] px-1.5">{product.pricing}</Badge>
            {product.strengths.length > 0 && (
              <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
                <Check className="h-3 w-3 shrink-0" />
                <span className="line-clamp-1 max-w-[100px]">{product.strengths[0]}</span>
              </span>
            )}
            {product.weaknesses.length > 0 && (
              <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400">
                <XIcon className="h-3 w-3 shrink-0" />
                <span className="line-clamp-1 max-w-[100px]">{product.weaknesses[0]}</span>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Gap Card ───────────────────────────────────────────────────────────────
function GapCard({ gap, delay = 0 }: { gap: GapAnalysis; delay?: number }) {
  const [expanded, setExpanded] = useState(false)
  const config = GAP_TYPE_CONFIG[gap.gapType]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* ─── Top: Gap Type Badge + Severity Badge + Difficulty Badge ─ */}
          <div className="space-y-1.5">
            {/* ─── Row 1: Type + Severity + Difficulty ── */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`${config.color} ${config.darkColor} gap-1 text-[10px] h-5 px-1.5 shrink-0 whitespace-nowrap`}>
                <Icon className="h-3 w-3" />
                {config.label}
              </Badge>
              <Badge variant="outline" className={`text-[10px] h-5 px-1.5 shrink-0 whitespace-nowrap ${SEVERITY_COLORS[gap.severity]}`}>
                {gap.severity}
              </Badge>
              {/* ─── Execution Difficulty Badge (always visible) ── */}
              {gap.executionDifficulty?.level && (
                <ExecutionDifficultyBadge level={gap.executionDifficulty.level} />
              )}
            </div>
            {/* ─── Row 2: Verdict + Quadrant Badges ── */}
            {(gap.marketQuadrant?.quadrant === 'goldmine' || gap.marketQuadrant?.quadrant === 'dead_zone' || gap.falseOpportunity?.verdict === 'avoid' || gap.falseOpportunity?.verdict === 'caution') && (
              <div className="flex items-center gap-2 flex-wrap">
                {gap.marketQuadrant?.quadrant === 'goldmine' && (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 text-[10px] h-5 px-1.5 gap-1 shrink-0 whitespace-nowrap">
                    🔥 Goldmine
                  </Badge>
                )}
                {gap.marketQuadrant?.quadrant === 'dead_zone' && (
                  <Badge className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 text-[10px] h-5 px-1.5 gap-1 shrink-0 whitespace-nowrap">
                    💀 Dead Zone
                  </Badge>
                )}
                {gap.falseOpportunity?.verdict === 'avoid' && (
                  <Badge className="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 text-[10px] h-5 px-1.5 gap-1 shrink-0 whitespace-nowrap">
                    ⚠ Avoid
                  </Badge>
                )}
                {gap.falseOpportunity?.verdict === 'caution' && (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] h-5 px-1.5 gap-1 shrink-0 whitespace-nowrap">
                    ⚡ Caution
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* ─── Title ─────────────────────────────────────────── */}
          <h4 className="font-semibold text-sm leading-tight">{gap.title}</h4>

          {/* ─── Description ───────────────────────────────────── */}
          <p className="text-xs text-muted-foreground leading-relaxed">{gap.description}</p>

          {/* ─── Feasibility Summary (always visible, compact) ── */}
          <div className="mt-1">
          <FeasibilitySummaryBlock
            executionDifficulty={gap.executionDifficulty}
            opportunityScore={gap.marketQuadrant ? { total: gap.marketQuadrant.opportunityScore } : undefined}
            falseOpportunity={gap.falseOpportunity}
          />
          </div>

          {/* ─── Compact Evidence Summary (always visible) ─────── */}
          {gap.evidenceDetail && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5 shrink-0 text-orange-500" />
              <span className="truncate">
                {gap.evidenceDetail.similarProducts > 0 && (
                  <><span className="font-semibold text-foreground">{gap.evidenceDetail.similarProducts}</span> similar products</>
                )}
                {gap.evidenceDetail.similarProducts > 0 && gap.evidenceDetail.repeatedComplaints > 0 && ' · '}
                {gap.evidenceDetail.repeatedComplaints > 0 && (
                  <><span className="font-semibold text-foreground">{gap.evidenceDetail.repeatedComplaints}</span> complaints</>
                )}
                {(gap.evidenceDetail.similarProducts > 0 || gap.evidenceDetail.repeatedComplaints > 0) && gap.evidenceDetail.pricingOverlap > 0 && ' · '}
                {gap.evidenceDetail.pricingOverlap > 0 && (
                  <><span className="font-semibold text-foreground">{gap.evidenceDetail.pricingOverlap}%</span> pricing overlap</>
                )}
              </span>
            </div>
          )}

          {/* ─── Sub-Niche + Underserved Badges (combined row) ── */}
          {(gap.subNiche?.name || (gap.underservedUsers && gap.underservedUsers.length > 0)) && (
            <div className="flex flex-wrap items-center gap-2">
              {gap.subNiche?.name && (
                <Badge className="bg-green-600 text-white dark:bg-green-700 dark:text-white text-[10px] font-semibold hover:bg-green-700 gap-1 shrink-0 whitespace-nowrap">
                  <CircleDot className="h-3 w-3" />
                  {gap.subNiche.name}
                  {gap.subNiche.opportunityScore > 0 && (
                    <span className="ml-0.5 opacity-80">{gap.subNiche.opportunityScore}</span>
                  )}
                </Badge>
              )}
              {gap.underservedUsers && gap.underservedUsers.length > 0 && (
                <>
                  <UserCircle className="h-3 w-3 shrink-0 text-purple-500" />
                  {gap.underservedUsers.map((user, j) => (
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
                </>
              )}
            </div>
          )}

          {/* ─── Expand Button ─────────────────────────────────── */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-7 text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            {expanded ? 'Show Less' : 'Show More Details'}
          </Button>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-3 overflow-y-auto custom-scrollbar max-h-[800px]"
              >
                <Separator />

                {/* ─── Why This Opportunity Exists (detailed) ──── */}
                {gap.whyThisMatters && (
                  <WhyOpportunityExistsBlock text={gap.whyThisMatters} />
                )}

                {/* ─── Evidence Block (detailed) ─────────────────── */}
                {gap.evidenceDetail && (
                  <EnhancedEvidenceBlock
                    evidence={gap.evidenceDetail}
                    affectedProductNames={gap.affectedProducts?.map(p => p.name)}
                  />
                )}

                {/* ─── Underserved Audience (detailed) ────────────── */}
                {gap.underservedUsers && gap.underservedUsers.length > 0 && (
                  <UnderservedAudienceBlock users={gap.underservedUsers} />
                )}

                {/* ─── Full Product Details ─────────────────────── */}
                {gap.affectedProducts && gap.affectedProducts.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Full Product Breakdown</p>
                    <div className="space-y-2">
                      {gap.affectedProducts.map((product, j) => (
                        <div key={j} className="rounded-md border p-2.5 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{product.name}</span>
                            <Badge variant="outline" className="text-xs h-5">{product.pricing}</Badge>
                          </div>
                          {product.strengths.length > 0 && (
                            <div>
                              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Strengths</p>
                              {product.strengths.map((s, k) => (
                                <span key={k} className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                  <Check className="h-3 w-3 shrink-0" />
                                  <span>{s}</span>
                                </span>
                              ))}
                            </div>
                          )}
                          {product.weaknesses.length > 0 && (
                            <div>
                              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Weaknesses</p>
                              {product.weaknesses.map((w, k) => (
                                <span key={k} className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                  <XIcon className="h-3 w-3 shrink-0" />
                                  <span>{w}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── Supporting Evidence Text ─────────────────── */}
                {gap.evidence && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Supporting Evidence</p>
                    <p className="text-xs leading-relaxed">{gap.evidence}</p>
                  </div>
                )}

                {/* ─── Feature Blocks ──────────────────────────── */}
                {gap.whyNow && (
                  <WhyNowBlock whyNow={gap.whyNow} />
                )}
                {gap.falseOpportunity && gap.falseOpportunity.verdict && (
                  <FalseOpportunityBlock falseOpp={gap.falseOpportunity} />
                )}
                {gap.marketQuadrant && gap.marketQuadrant.quadrant && (
                  <MarketQuadrantBlock quadrant={gap.marketQuadrant} />
                )}
                {gap.whyExistingProductsFail && gap.whyExistingProductsFail.rootCause && (
                  <WhyExistingProductsFailBlock whyFail={gap.whyExistingProductsFail} />
                )}
                {gap.executionDifficulty && gap.executionDifficulty.level && (
                  <ExecutionDifficultyBlock difficulty={gap.executionDifficulty} />
                )}
                {gap.founderFit && gap.founderFit.bestFit && (
                  <FounderFitBlock founderFit={gap.founderFit} />
                )}
                {gap.sourceTransparency && gap.sourceTransparency.sourcePlatforms && (
                  <SourceTransparencyBlock source={gap.sourceTransparency} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Complaint Clustering Section ───────────────────────────────────────────
function ComplaintClusteringSection({ clusters }: { clusters: ComplaintCluster[] }) {
  const totalComplaints = clusters.reduce((sum, c) => sum + c.count, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Top Complaints
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 gap-1">
                <AlertTriangle className="h-3 w-3" />
                {totalComplaints} total complaints
              </Badge>
            </div>
          </div>
          <CardDescription>Grouped user complaints by category with frequency analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clusters.map((cluster, i) => {
              const colors = getClusterColor(cluster.category)
              const isHighSeverity = cluster.percentage >= 30
              const isMediumSeverity = cluster.percentage >= 15 && cluster.percentage < 30
              return (
                <motion.div
                  key={cluster.category + i}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  className={`rounded-lg border p-3 space-y-2.5 overflow-hidden ${colors.bg} ${isHighSeverity ? 'border-red-200 dark:border-red-900/40' : isMediumSeverity ? 'border-amber-200 dark:border-amber-900/40' : 'border-border/40'}`}
                >
                  {/* Cluster header: percentage badge, label, count */}
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center rounded-md px-2 py-1 min-w-[56px] shrink-0 ${colors.bg} border ${isHighSeverity ? 'border-red-300 dark:border-red-800/60' : isMediumSeverity ? 'border-amber-300 dark:border-amber-800/60' : 'border-border/60'}`}>
                      <span className={`text-lg font-bold tabular-nums ${colors.text}`}>
                        {cluster.percentage}%
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{cluster.label}</p>
                        {isHighSeverity && (
                          <Badge className="text-[9px] h-4 px-1 bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">HIGH</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{cluster.count} complaints</p>
                    </div>
                  </div>

                  {/* Enhanced horizontal bar with gradient and threshold markers */}
                  <div className="relative h-4 w-full rounded-full bg-muted/30 overflow-hidden border border-border/20 shrink-0">
                    <motion.div
                      className={`h-full rounded-full ${colors.bar} opacity-90`}
                      initial={{ width: 0 }}
                      animate={{ width: `${cluster.percentage}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.06 }}
                    />
                    {/* Percentage label inside bar */}
                    {cluster.percentage > 20 && (
                      <span className="absolute inset-0 flex items-center justify-end pr-2 text-[9px] font-bold text-white/90">
                        {cluster.count}
                      </span>
                    )}
                    {/* Threshold markers */}
                    <div className="absolute top-0 left-[15%] h-full w-px bg-amber-400/40" />
                    <div className="absolute top-0 left-[30%] h-full w-px bg-red-400/40" />
                  </div>

                  {/* Example snippets as blockquotes */}
                  {cluster.exampleSnippets.length > 0 && (
                    <div className="space-y-1 pt-0.5">
                      {cluster.exampleSnippets.slice(0, 3).map((snippet, j) => (
                        <blockquote
                          key={j}
                          className="text-xs text-muted-foreground italic pl-3 border-l-[3px] border-orange-400/50 dark:border-orange-500/40 leading-relaxed"
                        >
                          &ldquo;{snippet}&rdquo;
                        </blockquote>
                      ))}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-3 border-t flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="h-2 w-4 rounded-sm bg-red-400/40" /> High severity (≥30%)
            </span>
            <span className="flex items-center gap-1">
              <div className="h-2 w-4 rounded-sm bg-amber-400/40" /> Medium (15-30%)
            </span>
            <span className="flex items-center gap-1">
              <div className="h-2 w-4 rounded-sm bg-muted/50" /> Low (&lt;15%)
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Saturation Entry ───────────────────────────────────────────────────────
function SaturationEntry({ sat, delay = 0 }: { sat: MarketSaturation; delay?: number }) {
  const [satExpanded, setSatExpanded] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="rounded-lg border p-4 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{sat.category}</h4>
        <Badge
          variant="outline"
          className={
            sat.level === 'high'
              ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
              : sat.level === 'medium'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                : 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
          }
        >
          {sat.level} saturation
        </Badge>
      </div>

      {/* Visual Saturation Meter */}
      <SaturationMeter score={sat.score} size="sm" />

      {/* Visual Market Metrics with mini indicator bars */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Launch Frequency</p>
          <MetricDot value={sat.factors.launchFrequency} max={20} label="Launches/month" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Complaint Frequency</p>
          <MetricDot value={sat.factors.userComplaints} max={50} label="User complaints" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Opportunity Score</p>
          <MetricDot value={100 - sat.score} max={100} label="Opportunity (inverse of saturation)" />
        </div>
      </div>

      {/* Factor details */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-muted-foreground">
        <div><span className="font-medium text-foreground">{sat.factors.similarProducts}</span> similar</div>
        <div><span className="font-medium text-foreground">{sat.factors.featureOverlap}%</span> overlap</div>
        <div><span className="font-medium text-foreground">{sat.factors.launchFrequency}</span> launches/mo</div>
        <div><span className="font-medium text-foreground">{sat.factors.userComplaints}</span> complaints</div>
        <div><span className="font-medium text-foreground">{sat.factors.pricingSimilarity}%</span> pricing sim.</div>
      </div>

      {/* Sub-Niches in saturation */}
      {sat.subNiches && sat.subNiches.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Sub-Niches</p>
          <div className="flex flex-wrap gap-1.5">
            {sat.subNiches.map((sn, j) => (
              <Badge key={j} className="text-xs bg-green-600 text-white dark:bg-green-700 dark:text-white hover:bg-green-700">
                {sn.name}
                <span className="ml-1 opacity-80">({sn.opportunityScore}/100)</span>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Competitor Breakdown (expandable) */}
      {sat.topCompetitors && sat.topCompetitors.length > 0 && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-7 text-muted-foreground"
            onClick={() => setSatExpanded(!satExpanded)}
          >
            {satExpanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            {satExpanded ? 'Hide Competitors' : `Show ${sat.topCompetitors.length} Competitors`}
          </Button>
          <AnimatePresence>
            {satExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1 pt-2">
                  {sat.topCompetitors.map((comp, j) => (
                    <div key={j} className="rounded-md border bg-muted/20 p-2.5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{comp.name}</span>
                        <Badge variant="outline" className="text-[10px] h-5">{comp.pricing}</Badge>
                      </div>
                      <div className="flex gap-3">
                        {comp.strengths.length > 0 && (
                          <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400 line-clamp-1">
                            <Check className="h-3 w-3 shrink-0" />
                            {comp.strengths[0]}
                          </span>
                        )}
                        {comp.weaknesses.length > 0 && (
                          <span className="flex items-center gap-0.5 text-red-600 dark:text-red-400 line-clamp-1">
                            <XIcon className="h-3 w-3 shrink-0" />
                            {comp.weaknesses[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}

// ─── Main Panel ─────────────────────────────────────────────────────────────
export function GapAnalysisPanel() {
  const [gapTypeFilter, setGapTypeFilter] = useState<GapType | 'all'>('all')
  const [analysisError, setAnalysisError] = useState<ModuleError | null>(null)
  const [errorSetByMutation, setErrorSetByMutation] = useState(false)

  const selectedCategory = useAppStore((s) => s.selectedCategory)
  const setSelectedCategory = useAppStore((s) => s.setSelectedCategory)
  const analysisResults = useAppStore((s) => s.analysisResults)
  const setAnalysisResults = useAppStore((s) => s.setAnalysisResults)
  const saturationResults = useAppStore((s) => s.saturationResults)
  const setSaturationResults = useAppStore((s) => s.setSaturationResults)
  const complaintClusters = useAppStore((s) => s.complaintClusters)
  const setComplaintClusters = useAppStore((s) => s.setComplaintClusters)
  const timePeriod = useAppStore((s) => s.timePeriod)
  const setTimePeriod = useAppStore((s) => s.setTimePeriod)

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      setAnalysisError(null)
      setErrorSetByMutation(false)
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selectedCategory, analysisType: 'full', timePeriod }),
      })
      if (!res.ok) {
        let moduleError: ModuleError
        try {
          const errorBody = await res.json()
          if (errorBody.moduleError && typeof errorBody.moduleError === 'object') {
            moduleError = errorBody.moduleError as ModuleError
            moduleError.statusCode = res.status
            if (!moduleError.requestCategory) moduleError.requestCategory = selectedCategory
            if (!moduleError.requestPayload) moduleError.requestPayload = `category=${selectedCategory}, analysisType=full, timePeriod=${timePeriod}`
            if (!moduleError.backendMessage && errorBody.error) moduleError.backendMessage = errorBody.error
          } else {
            moduleError = classifyError(new Error(errorBody.error || `HTTP ${res.status}`), 'Gap Analysis', '/api/analyze', {
              category: selectedCategory,
              payload: `category=${selectedCategory}, analysisType=full, timePeriod=${timePeriod}`,
              backendMessage: errorBody.error,
            })
            moduleError.statusCode = res.status
            if (!moduleError.requestCategory) moduleError.requestCategory = selectedCategory
            if (!moduleError.requestPayload) moduleError.requestPayload = `category=${selectedCategory}, analysisType=full, timePeriod=${timePeriod}`
          }
        } catch {
          moduleError = classifyError(new Error(`HTTP ${res.status}`), 'Gap Analysis', '/api/analyze', {
            category: selectedCategory,
            payload: `category=${selectedCategory}, analysisType=full, timePeriod=${timePeriod}`,
          })
          moduleError.statusCode = res.status
        }
        setAnalysisError(moduleError)
        setErrorSetByMutation(true)
        throw new Error(moduleError.message)
      }
      return res.json() as Promise<{
        gaps: GapAnalysis[];
        saturation: MarketSaturation[];
        complaints: unknown[];
        complaintClusters: ComplaintCluster[];
        partialErrors?: Record<string, unknown>;
      }>
    },
    onSuccess: (data) => {
      setAnalysisResults(data.gaps || [])
      setSaturationResults(data.saturation || [])
      setComplaintClusters(data.complaintClusters || [])

      // If there are partial errors, show a warning toast with details
      if (data.partialErrors && Object.keys(data.partialErrors).length > 0) {
        const failedStages = Object.keys(data.partialErrors)
        const totalGaps = (data.gaps || []).length
        const totalSaturation = (data.saturation || []).length

        // If we have SOME data came back, show partial success
        if (totalGaps > 0 || totalSaturation > 0) {
          toast.warning(`Analysis partially complete. ${failedStages.join(', ')} had errors. Found ${totalGaps} gaps.`)
        } else {
          // All sub-analyses failed but we got a 200 — convert to error state
          const firstError = Object.values(data.partialErrors)[0] as Record<string, unknown> | undefined
          const errorModule: ModuleError = firstError && typeof firstError === 'object' && 'category' in firstError
            ? firstError as unknown as ModuleError
            : {
                module: 'Gap Analysis',
                category: 'api' as const,
                message: 'All analysis stages failed',
                detail: `Failed stages: ${failedStages.join(', ')}`,
                possibleReason: 'This is likely due to rate limiting. Wait 60 seconds and try again.',
                retryable: true,
                timestamp: new Date().toISOString(),
                endpoint: '/api/analyze',
                requestCategory: selectedCategory,
              }
          setAnalysisError(errorModule)
          toast.error('All analysis stages failed. Please try again.')
        }
      } else {
        toast.success(`Analysis complete! Found ${(data.gaps || []).length} gaps.`)
      }
    },
    onError: (err) => {
      if (!errorSetByMutation) {
        setAnalysisError(classifyError(err, 'Gap Analysis', '/api/analyze', {
          category: selectedCategory,
          payload: `category=${selectedCategory}, analysisType=full, timePeriod=${timePeriod}`,
        }))
      }
      toast.error('Analysis failed. Please try again.')
    },
  })

  const filteredGaps = analysisResults.filter((gap) =>
    gapTypeFilter === 'all' ? true : gap.gapType === gapTypeFilter
  )

  return (
    <div className="space-y-6">
      {/* ─── Controls ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-600" />
              Gap Analysis
            </CardTitle>
            <CardDescription>
              Detect market gaps by analyzing product features, pricing, and user feedback
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
                <label className="text-sm font-medium">Gap Type</label>
                <Select
                  value={gapTypeFilter}
                  onValueChange={(v) => setGapTypeFilter(v as GapType | 'all')}
                >
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="missing_feature">Missing Feature</SelectItem>
                    <SelectItem value="weak_ux">Weak UX</SelectItem>
                    <SelectItem value="expensive">Expensive</SelectItem>
                    <SelectItem value="underserved">Underserved</SelectItem>
                    <SelectItem value="overcrowded">Overcrowded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 w-full sm:w-auto">
                <label className="text-sm font-medium">Time Period</label>
                <Tabs value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
                  <TabsList className="h-9">
                    <TabsTrigger value="7d" className="text-xs px-2.5">7 days</TabsTrigger>
                    <TabsTrigger value="30d" className="text-xs px-2.5">30 days</TabsTrigger>
                    <TabsTrigger value="90d" className="text-xs px-2.5">90 days</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <Button
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
              >
                {analyzeMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Analyzing...</>
                ) : (
                  <><Target className="h-4 w-4" />Analyze Gaps</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Error State */}
      {analysisError && !analyzeMutation.isPending && (
        <ModuleErrorState
          error={analysisError}
          onRetry={() => analyzeMutation.mutate()}
          isRetrying={analyzeMutation.isPending}
        />
      )}

      {/* ─── Complaint Clustering (before gap cards) ──────────── */}
      {complaintClusters.length > 0 && (
        <ComplaintClusteringSection clusters={complaintClusters} />
      )}

      {/* ─── Gap Cards ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-lg font-semibold">
            Detected Gaps
            {filteredGaps.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                {filteredGaps.length}
              </Badge>
            )}
          </h3>
          {/* ─── Time Context Indicator ─────────────────────────── */}
          {analysisResults.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Analyzed: Last {timePeriod === '7d' ? '7 days' : timePeriod === '30d' ? '30 days' : '90 days'}</span>
            </div>
          )}
        </div>

        {/* Loading skeletons */}
        {analyzeMutation.isPending && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 sm:p-6 space-y-3">
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-20 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state - no analysis run */}
        {!analyzeMutation.isPending && filteredGaps.length === 0 && analysisResults.length === 0 && (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Target className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">No analysis results yet. Click &quot;Analyze Gaps&quot; to start.</p>
            </div>
          </Card>
        )}

        {/* Empty state - filter matched nothing */}
        {!analyzeMutation.isPending && filteredGaps.length === 0 && analysisResults.length > 0 && (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Shield className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">No gaps match the selected filter. Try a different gap type.</p>
            </div>
          </Card>
        )}

        {/* Gap cards grid */}
        <AnimatePresence>
          {!analyzeMutation.isPending && filteredGaps.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGaps.map((gap, i) => (
                <GapCard key={gap.title + i} gap={gap} delay={i * 0.05} />
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Market Saturation ────────────────────────────────── */}
      {saturationResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-600" />
                Market Saturation Scores
              </CardTitle>
              <CardDescription>Category-level saturation analysis with competitor breakdown and opportunity indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                <div className="space-y-4">
                  {saturationResults.map((sat, i) => (
                    <SaturationEntry key={sat.category} sat={sat} delay={i * 0.05} />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}
