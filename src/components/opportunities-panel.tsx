'use client'

import { useState, useEffect, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb,
  Loader2,
  Bookmark,
  BookmarkCheck,
  Trash2,
  Star,
  AlertCircle,
  MessageSquare,
  Check,
  X as XIcon,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  UserCircle,
  BarChart3,
  Link2,
  ShieldCheck,
  CircleDot,
  Database,
  DollarSign,
  Rocket,
  Target,
  Quote,
  ArrowUpRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useAppStore } from '@/lib/store'
import {
  CATEGORIES,
  SEARCH_SUGGESTIONS,
  type Category,
  type OpportunitySuggestion,
  type OpportunityScoreBreakdown,
  type TimePeriod,
  type ProductReference,
  type UnderservedUserGroup,
  type WhyNowAnalysis,
  type ExecutionDifficulty,
  type FalseOpportunityAnalysis,
  type FounderFitSuggestion,
  type SourceTransparency,
  type WhyExistingProductsFail,
  type MarketQuadrantPosition,
} from '@/types'
import {
  WhyNowBlock,
  ExecutionDifficultyBlock,
  FalseOpportunityBlock,
  FounderFitBlock,
  SourceTransparencyBlock,
  WhyExistingProductsFailBlock,
  MarketQuadrantBlock,
} from '@/components/feature-blocks'

// ──────────────────────────────────────────────
// Color helpers
// ──────────────────────────────────────────────

const SATURATION_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
}

function getScoreBgColor(total: number) {
  if (total >= 75) return 'bg-green-600 text-white'
  if (total >= 50) return 'bg-amber-500 text-white'
  return 'bg-red-500 text-white'
}

function getScoreTextColor(total: number) {
  if (total >= 75) return 'text-green-600 dark:text-green-400'
  if (total >= 50) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function getSegmentColor(value: number, max: number) {
  const pct = (value / max) * 100
  if (pct >= 65) return 'bg-green-500'
  if (pct >= 35) return 'bg-amber-500'
  return 'bg-red-400'
}

function getSegmentBorderColor(value: number, max: number) {
  const pct = (value / max) * 100
  if (pct >= 65) return 'border-green-500'
  if (pct >= 35) return 'border-amber-500'
  return 'border-red-400'
}

function getScoreRingColor(total: number) {
  if (total >= 75) return 'ring-green-500/30'
  if (total >= 50) return 'ring-amber-500/30'
  return 'ring-red-500/30'
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

/** Large opportunity score gauge — always visible in card header */
function ScoreGauge({ score }: { score: OpportunityScoreBreakdown }) {
  return (
    <div className={`flex items-center justify-center rounded-lg ${getScoreBgColor(score.total)} ring-4 ${getScoreRingColor(score.total)} min-w-[3rem] h-10 px-2`}>
      <span className="text-lg font-black tabular-nums leading-none">{score.total}</span>
    </div>
  )
}

/** Mini segmented bar showing 5 sub-scores — always visible */
function MiniScoreBar({ score }: { score: OpportunityScoreBreakdown }) {
  const segments = [
    { label: 'Complaint Frequency', value: score.complaintFrequency, max: 20, color: getSegmentColor(score.complaintFrequency, 20) },
    { label: 'Competition Density', value: score.competitionDensity, max: 20, color: getSegmentColor(score.competitionDensity, 20) },
    { label: 'Pricing Dissatisfaction', value: score.pricingDissatisfaction, max: 20, color: getSegmentColor(score.pricingDissatisfaction, 20) },
    { label: 'Launch Growth', value: score.launchGrowth, max: 20, color: getSegmentColor(score.launchGrowth, 20) },
    { label: 'Underserved Audience', value: score.underservedAudience, max: 20, color: getSegmentColor(score.underservedAudience, 20) },
  ]

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 flex h-2.5 rounded-full overflow-hidden bg-muted/50 gap-[2px]">
        {segments.map((seg) => (
          <Tooltip key={seg.label}>
            <TooltipTrigger asChild>
              <div
                className={`h-full rounded-sm ${seg.color} transition-all cursor-default`}
                style={{ width: `${(seg.value / score.total) * 100}%`, minWidth: seg.value > 0 ? '6px' : '0' }}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <span className="font-medium">{seg.label}</span>: {seg.value}/{seg.max}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  )
}

/** Full score breakdown with labeled bars — in expandable section */
function FullScoreDisplay({ score }: { score: OpportunityScoreBreakdown }) {
  const items = [
    { label: 'Complaint Frequency', value: score.complaintFrequency, max: 20 },
    { label: 'Competition Density', value: score.competitionDensity, max: 20 },
    { label: 'Pricing Dissatisfaction', value: score.pricingDissatisfaction, max: 20 },
    { label: 'Launch Growth', value: score.launchGrowth, max: 20 },
    { label: 'Underserved Audience', value: score.underservedAudience, max: 20 },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Opportunity Score Breakdown</span>
        <span className={`text-xl font-black tabular-nums ${getScoreTextColor(score.total)}`}>{score.total}<span className="text-sm font-medium text-muted-foreground">/100</span></span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-36 text-xs text-muted-foreground shrink-0 truncate">{item.label}</span>
            <div className="flex-1 bg-muted/50 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${getSegmentColor(item.value, item.max)} transition-all`}
                style={{ width: `${(item.value / item.max) * 100}%` }}
              />
            </div>
            <span className={`text-xs font-bold tabular-nums w-6 text-right ${getScoreTextColor(item.value * 5)}`}>{item.value}</span>
          </div>
        ))}
      </div>
      {score.explanation && (
        <div className="rounded-md border border-orange-200 dark:border-orange-800/40 bg-orange-50/50 dark:bg-orange-950/20 p-2.5 mt-1">
          <p className="text-xs text-orange-700 dark:text-orange-400 leading-relaxed">{score.explanation}</p>
        </div>
      )}
    </div>
  )
}

/** Evidence metric pill with icon */
function EvidencePill({ icon: Icon, value, label, accent }: { icon: React.ElementType; value: string | number; label: string; accent?: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1 text-xs transition-colors hover:bg-muted/60 ${accent ?? ''}`}>
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="font-bold tabular-nums">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}

/** Colored opportunity score dot */
function ScoreDot({ score }: { score: number }) {
  const color = score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${color} shrink-0 ring-1 ring-offset-1 ring-offset-background ${color.replace('bg-', 'ring-')}`} />
      </TooltipTrigger>
      <TooltipContent>{score}/100</TooltipContent>
    </Tooltip>
  )
}

/** Compact product reference — always visible */
function CompactProductRef({ product }: { product: ProductReference }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border bg-background/80 px-2 py-1 text-xs">
      <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="font-semibold truncate max-w-[100px]">{product.name}</span>
      <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0 font-semibold">{product.pricing}</Badge>
      {product.strengths.length > 0 && (
        <span className="text-green-600 dark:text-green-400 flex items-center gap-0.5 shrink-0" title={product.strengths[0]}>
          <Check className="h-3 w-3" />
        </span>
      )}
      {product.weaknesses.length > 0 && (
        <span className="text-red-600 dark:text-red-400 flex items-center gap-0.5 shrink-0" title={product.weaknesses[0]}>
          <XIcon className="h-3 w-3" />
        </span>
      )}
    </div>
  )
}

/** Compact underserved user row — always visible */
function CompactUserRow({ user }: { user: UnderservedUserGroup }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-purple-200/60 dark:border-purple-800/30 bg-purple-50/20 dark:bg-purple-950/10 px-2.5 py-1">
      <UserCircle className="h-3.5 w-3.5 text-purple-500 shrink-0" />
      <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 truncate">{user.userGroup}</span>
      {user.opportunityScore > 0 && <ScoreDot score={user.opportunityScore} />}
      {user.evidence && (
        <span className="text-[10px] text-muted-foreground truncate flex-1">{user.evidence}</span>
      )}
    </div>
  )
}

/** Full product comparison table — in expandable section */
function FullProductTable({ products }: { products: ProductReference[] }) {
  return (
    <div className="space-y-1.5">
      {products.map((product, j) => (
        <div key={j} className="rounded-lg border p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-bold text-sm">{product.name}</span>
            </div>
            <Badge variant="outline" className="text-xs h-5 px-2 font-semibold">{product.pricing}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {product.strengths.length > 0 && (
              <div className="space-y-0.5">
                {product.strengths.map((s, k) => (
                  <span key={k} className="flex items-start gap-1 text-green-600 dark:text-green-400">
                    <Check className="h-3 w-3 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{s}</span>
                  </span>
                ))}
              </div>
            )}
            {product.weaknesses.length > 0 && (
              <div className="space-y-0.5">
                {product.weaknesses.map((w, k) => (
                  <span key={k} className="flex items-start gap-1 text-red-600 dark:text-red-400">
                    <XIcon className="h-3 w-3 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{w}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Full underserved user details — in expandable section */
function FullUserDetail({ user }: { user: UnderservedUserGroup }) {
  return (
    <div className="rounded-lg border border-purple-200 dark:border-purple-800/40 p-3 text-xs space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCircle className="h-4 w-4 text-purple-500" />
          <span className="font-bold text-sm text-purple-700 dark:text-purple-400">{user.userGroup}</span>
        </div>
        {user.opportunityScore > 0 && (
          <Badge variant="outline" className="text-xs h-5 bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 font-semibold">
            {user.opportunityScore}/100
          </Badge>
        )}
      </div>
      <p className="text-muted-foreground leading-relaxed">{user.description}</p>
      {user.evidence && (
        <div className="flex items-start gap-1.5 text-orange-700 dark:text-orange-400 italic">
          <Quote className="h-3 w-3 shrink-0 mt-0.5" />
          <span>{user.evidence}</span>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────
// Opportunity Card
// ──────────────────────────────────────────────

function OpportunityCard({
  opp,
  isSaved,
  onSave,
  onUnsave,
  onDelete,
  delay = 0,
}: {
  opp: OpportunitySuggestion
  isSaved: boolean
  onSave: () => void
  onUnsave: () => void
  onDelete?: () => void
  delay?: number
}) {
  const [expanded, setExpanded] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSaveClick = async () => {
    setSaving(true)
    try {
      if (isSaved) {
        onUnsave()
      } else {
        onSave()
      }
    } finally {
      setSaving(false)
    }
  }

  const hasScore = opp.opportunityScore && opp.opportunityScore.total > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      layout
    >
      <Card className="h-full hover:shadow-lg transition-all duration-200 border-border/80 group">
        <CardContent className="p-4 sm:p-5 space-y-3.5">
          {/* ── Row 1: Score gauge + Saturation badge + Save button ── */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {hasScore ? (
                <ScoreGauge score={opp.opportunityScore!} />
              ) : (
                <QualityBadge score={opp.qualityScore} />
              )}
              <Badge variant="outline" className={SATURATION_COLORS[opp.saturation]}>
                {opp.saturation} saturation
              </Badge>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleSaveClick}
                disabled={saving}
                title={isSaved ? 'Unsave opportunity' : 'Save opportunity'}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isSaved ? (
                  <BookmarkCheck className="h-4 w-4 text-orange-500" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={onDelete}
                  title="Remove from saved"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* ── Row 2: Mini segmented score bar ── */}
          {hasScore && (
            <MiniScoreBar score={opp.opportunityScore!} />
          )}

          {/* ── Row 3: Title & Description ── */}
          <div>
            <h4 className="font-bold text-sm leading-snug">{opp.title}</h4>
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3 leading-relaxed">{opp.description}</p>
          </div>

          {/* ── Row 4: Evidence Layer — always visible ── */}
          {opp.evidenceDetail && (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-2.5 space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Evidence</p>
              <div className="flex flex-wrap gap-1.5">
                {opp.evidenceDetail.similarProducts > 0 && (
                  <EvidencePill icon={Database} value={opp.evidenceDetail.similarProducts} label="similar products" />
                )}
                {opp.evidenceDetail.repeatedComplaints > 0 && (
                  <EvidencePill icon={MessageSquare} value={opp.evidenceDetail.repeatedComplaints} label="complaints" />
                )}
                {opp.evidenceDetail.pricingOverlap > 0 && (
                  <EvidencePill icon={DollarSign} value={`${opp.evidenceDetail.pricingOverlap}%`} label="pricing overlap" />
                )}
                {opp.evidenceDetail.launchFrequency > 0 && (
                  <EvidencePill icon={Rocket} value={opp.evidenceDetail.launchFrequency} label="recent launches" />
                )}
                {opp.evidenceDetail.launchGrowth && opp.evidenceDetail.launchGrowth > 0 && (
                  <EvidencePill
                    icon={TrendingUp}
                    value={`+${opp.evidenceDetail.launchGrowth}%`}
                    label="growth"
                    accent="text-green-600 dark:text-green-400 border-green-200 dark:border-green-800/40 bg-green-50/30 dark:bg-green-950/10"
                  />
                )}
              </div>
              {opp.affectedProducts && opp.affectedProducts.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Affected: {opp.affectedProducts.map((p) => p.name).join(', ')}
                </p>
              )}
            </div>
          )}

          {/* ── Row 5: "Why This Matters" — always visible ── */}
          {opp.whyThisMatters && (
            <div className="rounded-lg border-2 border-orange-300 dark:border-orange-700/50 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <ShieldCheck className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                <p className="text-xs font-bold text-orange-700 dark:text-orange-400">Why This Matters</p>
              </div>
              <p className="text-xs text-foreground leading-relaxed">{opp.whyThisMatters}</p>
            </div>
          )}

          {/* ── Row 6: Sub-Niche badge — always visible ── */}
          {opp.subNiche && opp.subNiche.name && (
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600 text-white border-0 gap-1.5 font-semibold text-xs">
                <Target className="h-3 w-3" />
                {opp.subNiche.name}
              </Badge>
              {opp.subNiche.opportunityScore > 0 && (
                <div className="flex items-center gap-1.5">
                  <ScoreDot score={opp.subNiche.opportunityScore} />
                  <span className="text-xs font-semibold text-muted-foreground tabular-nums">{opp.subNiche.opportunityScore}/100</span>
                </div>
              )}
            </div>
          )}

          {/* ── Row 6b: Verdict badge row — always visible ── */}
          {(opp.marketQuadrant?.quadrant === 'goldmine' || opp.falseOpportunity?.verdict === 'avoid' || opp.falseOpportunity?.verdict === 'caution' || opp.marketQuadrant?.quadrant === 'dead_zone') && (
            <div className="flex flex-wrap gap-1.5">
              {opp.marketQuadrant?.quadrant === 'goldmine' && (
                <Badge className="bg-green-600 text-white border-0 gap-1 font-semibold text-xs">
                  🔥 Goldmine
                </Badge>
              )}
              {opp.falseOpportunity?.verdict === 'avoid' && (
                <Badge className="bg-red-600 text-white border-0 gap-1 font-semibold text-xs">
                  ⚠ Avoid
                </Badge>
              )}
              {opp.falseOpportunity?.verdict === 'caution' && (
                <Badge className="bg-amber-500 text-white border-0 gap-1 font-semibold text-xs">
                  ⚡ Caution
                </Badge>
              )}
              {opp.marketQuadrant?.quadrant === 'dead_zone' && (
                <Badge className="bg-red-600 text-white border-0 gap-1 font-semibold text-xs">
                  💀 Dead Zone
                </Badge>
              )}
            </div>
          )}

          {/* ── Row 7: Product references — always visible ── */}
          {opp.affectedProducts && opp.affectedProducts.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Products</p>
              <div className="flex flex-wrap gap-1.5">
                {opp.affectedProducts.map((p, j) => (
                  <CompactProductRef key={j} product={p} />
                ))}
              </div>
            </div>
          )}

          {/* ── Row 8: Underserved Users — always visible ── */}
          {opp.underservedUsers && opp.underservedUsers.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Underserved Users</p>
              <div className="space-y-1">
                {opp.underservedUsers.slice(0, 3).map((user, j) => (
                  <CompactUserRow key={j} user={user} />
                ))}
                {opp.underservedUsers.length > 3 && (
                  <p className="text-[10px] text-muted-foreground pl-1">+{opp.underservedUsers.length - 3} more user groups</p>
                )}
              </div>
            </div>
          )}

          {/* ── Row 9: Expand toggle ── */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-8 text-muted-foreground hover:text-foreground group-hover:bg-muted/50"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <><ChevronUp className="h-3.5 w-3.5 mr-1" />Show Less</>
            ) : (
              <><ChevronDown className="h-3.5 w-3.5 mr-1" />Full Score Details &amp; More</>
            )}
          </Button>

          {/* ── Expandable Section ── */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="space-y-4 overflow-hidden"
              >
                <Separator />

                {/* Full Opportunity Score Breakdown */}
                {hasScore && (
                  <FullScoreDisplay score={opp.opportunityScore!} />
                )}

                {/* Full Product Comparison Table */}
                {opp.affectedProducts && opp.affectedProducts.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      Full Competitor Breakdown
                    </p>
                    <FullProductTable products={opp.affectedProducts} />
                  </div>
                )}

                {/* Full Underserved User Details */}
                {opp.underservedUsers && opp.underservedUsers.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      Full Underserved User Details
                    </p>
                    <div className="space-y-2">
                      {opp.underservedUsers.map((user, j) => (
                        <FullUserDetail key={j} user={user} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Gap Evidence List */}
                {opp.gapEvidence.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      Gap Evidence
                    </p>
                    <ul className="space-y-1">
                      {opp.gapEvidence.map((ev, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-foreground leading-relaxed">
                          <ArrowUpRight className="h-3.5 w-3.5 text-orange-500 shrink-0 mt-0.5" />
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Complaint References */}
                {opp.complaintRefs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-1.5">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      Complaint References
                    </p>
                    <ul className="space-y-1">
                      {opp.complaintRefs.map((ref, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-foreground leading-relaxed">
                          <Quote className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <span>{ref}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Feature Blocks */}
                {opp.whyNow?.marketGrowthDriver && (
                  <>
                    <Separator />
                    <WhyNowBlock whyNow={opp.whyNow} />
                  </>
                )}
                {opp.falseOpportunity?.verdict && (
                  <>
                    <Separator />
                    <FalseOpportunityBlock falseOpp={opp.falseOpportunity} />
                  </>
                )}
                {opp.marketQuadrant?.quadrant && (
                  <>
                    <Separator />
                    <MarketQuadrantBlock quadrant={opp.marketQuadrant} />
                  </>
                )}
                {opp.whyExistingProductsFail?.rootCause && (
                  <>
                    <Separator />
                    <WhyExistingProductsFailBlock whyFail={opp.whyExistingProductsFail} />
                  </>
                )}
                {opp.executionDifficulty?.level && (
                  <>
                    <Separator />
                    <ExecutionDifficultyBlock difficulty={opp.executionDifficulty} />
                  </>
                )}
                {opp.founderFit?.bestFit && (
                  <>
                    <Separator />
                    <FounderFitBlock founderFit={opp.founderFit} />
                  </>
                )}
                {opp.sourceTransparency?.sourcePlatforms && (
                  <>
                    <Separator />
                    <SourceTransparencyBlock source={opp.sourceTransparency} />
                  </>
                )}

                {/* Category tag */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{opp.category}</Badge>
                  {opp.trendSignals.length > 0 && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">{opp.trendSignals.length} trend signals</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function QualityBadge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 8) return 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
    if (score >= 6) return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
    return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
  }

  return (
    <Badge variant="outline" className={`${getColor()} gap-1 font-bold`}>
      <Star className="h-3 w-3" />
      {score.toFixed(1)}/10
    </Badge>
  )
}

// ──────────────────────────────────────────────
// Main Panel
// ──────────────────────────────────────────────

export function OpportunitiesPanel() {
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [focusArea, setFocusArea] = useState('')
  const [view, setView] = useState<'all' | 'saved'>('all')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loadingSaved, setLoadingSaved] = useState(false)

  const opportunities = useAppStore((s) => s.opportunities)
  const setOpportunities = useAppStore((s) => s.setOpportunities)
  const savedOpportunities = useAppStore((s) => s.savedOpportunities)
  const saveOpportunity = useAppStore((s) => s.saveOpportunity)
  const removeSavedOpportunity = useAppStore((s) => s.removeSavedOpportunity)
  const timePeriod = useAppStore((s) => s.timePeriod)
  const setTimePeriod = useAppStore((s) => s.setTimePeriod)

  // Fetch saved opportunities from DB on load
  const fetchSavedOpportunities = useCallback(async () => {
    setLoadingSaved(true)
    try {
      const res = await fetch('/api/opportunities?saved=true')
      if (res.ok) {
        const data = await res.json() as OpportunitySuggestion[]
        data.forEach((opp) => {
          if (!savedOpportunities.some((s) => s.title === opp.title)) {
            saveOpportunity(opp)
          }
        })
      }
    } catch {
      // Silently fail — local state still works
    } finally {
      setLoadingSaved(false)
    }
  }, [])

  useEffect(() => {
    fetchSavedOpportunities()
  }, [fetchSavedOpportunities])

  // Persist save/unsave to API
  const persistSave = async (opp: OpportunitySuggestion) => {
    if (!opp.id) return
    try {
      await fetch('/api/opportunities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: opp.id, isSaved: true }),
      })
    } catch {
      // Silently fail
    }
  }

  const persistUnsave = async (opp: OpportunitySuggestion) => {
    if (!opp.id) return
    try {
      await fetch('/api/opportunities', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: opp.id, isSaved: false }),
      })
    } catch {
      // Silently fail
    }
  }

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, focusArea: focusArea || undefined, timePeriod }),
      })
      if (!res.ok) throw new Error('Generation failed')
      return res.json() as Promise<OpportunitySuggestion[]>
    },
    onSuccess: (data) => {
      setOpportunities(data)
      toast.success(`Generated ${data.length} opportunities!`)
    },
    onError: () => {
      toast.error('Generation failed. Please try again.')
    },
  })

  const isSaved = (opp: OpportunitySuggestion) =>
    savedOpportunities.some((s) => s.title === opp.title)

  const displayedOpportunities = view === 'saved' ? savedOpportunities : opportunities

  const handleSuggestionClick = (suggestion: string) => {
    setFocusArea(suggestion)
    setShowSuggestions(false)
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-orange-500" />
              Opportunity Generator
            </CardTitle>
            <CardDescription>
              Generate evidence-backed product opportunities based on market gaps and user complaints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="space-y-2 w-full sm:w-auto">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as Category | 'all')}
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

              <div className="space-y-2 w-full sm:w-auto relative">
                <label className="text-sm font-medium">Focus Area (optional)</label>
                <Input
                  placeholder="e.g., B2B SaaS, mobile-first"
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full sm:w-56"
                />
                {showSuggestions && !focusArea && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border bg-popover p-2 shadow-lg max-h-64 overflow-y-auto">
                    <p className="text-xs text-muted-foreground mb-1.5 px-1">Try searching for:</p>
                    <div className="space-y-0.5">
                      {SEARCH_SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted/50 transition-colors"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
              >
                {generateMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Generating...</>
                ) : (
                  <><Lightbulb className="h-4 w-4" />Generate Opportunities</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* View Tabs */}
      <div className="flex items-center gap-4">
        <Tabs value={view} onValueChange={(v) => setView(v as 'all' | 'saved')}>
          <TabsList>
            <TabsTrigger value="all">
              All Generated
              {opportunities.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs h-5">{opportunities.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="saved">
              Saved
              {savedOpportunities.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs h-5 bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                  {savedOpportunities.length}
                </Badge>
              )}
              {loadingSaved && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Loading Skeletons */}
      {generateMutation.isPending && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6 space-y-3">
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-12 rounded-lg" />
                  <Skeleton className="h-5 w-20 mt-2" />
                </div>
                <Skeleton className="h-2.5 w-full rounded-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20 rounded-md" />
                  <Skeleton className="h-6 w-24 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!generateMutation.isPending && displayedOpportunities.length === 0 && (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <Lightbulb className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm font-medium">
              {view === 'saved'
                ? 'No saved opportunities yet. Generate and save opportunities to see them here.'
                : 'No opportunities generated yet. Click "Generate Opportunities" to start.'}
            </p>
            {view === 'all' && (
              <p className="text-xs mt-2 text-muted-foreground/60">
                Opportunities are scored by complaint frequency, competition density, pricing dissatisfaction, launch growth, and underserved audience size.
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Opportunity Cards Grid */}
      <AnimatePresence>
        {!generateMutation.isPending && displayedOpportunities.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedOpportunities.map((opp, i) => (
              <OpportunityCard
                key={opp.title + i}
                opp={opp}
                isSaved={isSaved(opp)}
                onSave={() => {
                  saveOpportunity(opp)
                  persistSave(opp)
                  toast.success('Opportunity saved!')
                }}
                onUnsave={() => {
                  removeSavedOpportunity(opp.title)
                  persistUnsave(opp)
                  toast.success('Opportunity unsaved.')
                }}
                onDelete={view === 'saved' ? () => {
                  removeSavedOpportunity(opp.title)
                  persistUnsave(opp)
                  toast.success('Opportunity removed.')
                } : undefined}
                delay={i * 0.05}
              />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
