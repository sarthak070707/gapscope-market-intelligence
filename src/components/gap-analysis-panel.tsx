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
  Info,
  Check,
  X as XIcon,
  TrendingUp,
  Quote,
  ChevronDown,
  ChevronUp,
  UserCircle,
  Package,
  MessageCircle,
  Rocket,
  BarChart3,
  CircleDot,
  ArrowUpRight,
  Link2,
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
import { useAppStore } from '@/lib/store'
import { SaturationMeter } from '@/components/ui/saturation-meter'
import { CATEGORIES, type Category, type GapType, type GapAnalysis, type MarketSaturation, type ComplaintCluster, type TimePeriod, type ComplaintCategory } from '@/types'

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

// ─── Structured Evidence Block ─────────────────────────────────────────────
function EvidenceBlock({ evidence }: { evidence: NonNullable<GapAnalysis['evidenceDetail']> }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <BarChart3 className="h-3.5 w-3.5" />
        Evidence
      </p>

      <div className="space-y-1.5">
        {evidence.similarProducts > 0 && (
          <div className="flex items-start gap-2 text-xs">
            <Package className="h-3.5 w-3.5 shrink-0 mt-0.5 text-orange-500" />
            <span>
              <span className="font-bold text-foreground">{evidence.similarProducts}</span>{' '}
              similar products launched in the last 90 days
            </span>
          </div>
        )}
        {evidence.repeatedComplaints > 0 && (
          <div className="flex items-start gap-2 text-xs">
            <MessageCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500" />
            <span>
              <span className="font-bold text-foreground">{evidence.repeatedComplaints}</span>{' '}
              complaints about this gap
            </span>
          </div>
        )}
        {evidence.pricingOverlap > 0 && (
          <div className="flex items-start gap-2 text-xs">
            <DollarSign className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-500" />
            <span>
              <span className="font-bold text-foreground">{evidence.pricingOverlap}%</span>{' '}
              pricing overlap across competitors
            </span>
          </div>
        )}
        {evidence.launchFrequency > 0 && (
          <div className="flex items-start gap-2 text-xs">
            <Rocket className="h-3.5 w-3.5 shrink-0 mt-0.5 text-sky-500" />
            <span>
              <span className="font-bold text-foreground">{evidence.launchFrequency}</span>{' '}
              launches/month in this space
            </span>
          </div>
        )}
        {evidence.launchGrowth && evidence.launchGrowth > 0 && (
          <div className="flex items-start gap-2 text-xs">
            <TrendingUp className="h-3.5 w-3.5 shrink-0 mt-0.5 text-green-500" />
            <span>
              <span className="font-bold text-green-600 dark:text-green-400">+{evidence.launchGrowth}%</span>{' '}
              launch growth
            </span>
          </div>
        )}
      </div>

      {/* User feedback snippets as blockquotes */}
      {evidence.commentSnippets && evidence.commentSnippets.length > 0 && (
        <div className="mt-2 space-y-1.5 pt-2 border-t border-border/40">
          {evidence.commentSnippets.slice(0, 3).map((snippet, j) => (
            <blockquote
              key={j}
              className="text-xs text-muted-foreground italic pl-3 border-l-[3px] border-orange-400/60 dark:border-orange-500/50 leading-relaxed"
            >
              &ldquo;{snippet}&rdquo;
            </blockquote>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Why This Matters Callout ───────────────────────────────────────────────
function WhyThisMatters({ text }: { text: string }) {
  return (
    <div className="rounded-lg border-2 border-orange-300 dark:border-orange-800/60 bg-orange-50/60 dark:bg-orange-950/20 p-3">
      <div className="flex items-start gap-2">
        <Shield className="h-4 w-4 shrink-0 mt-0.5 text-orange-600 dark:text-orange-400" />
        <div>
          <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-0.5">Why This Matters</p>
          <p className="text-xs text-foreground leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-Niche Badge ────────────────────────────────────────────────────────
function SubNicheBadge({ name, opportunityScore, description }: { name: string; opportunityScore: number; description?: string }) {
  return (
    <div className="rounded-lg border bg-green-50/80 dark:bg-green-950/20 border-green-200 dark:border-green-900/40 p-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <CircleDot className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
          <span className="text-xs font-semibold text-green-700 dark:text-green-400">Sub-Niche</span>
        </div>
        <Badge className="bg-green-600 text-white dark:bg-green-700 dark:text-white text-xs font-semibold hover:bg-green-700">
          {name}
        </Badge>
        {opportunityScore > 0 && (
          <Badge variant="outline" className="text-xs border-green-300 dark:border-green-800 text-green-700 dark:text-green-400">
            {opportunityScore}/100 opportunity
          </Badge>
        )}
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1.5">{description}</p>
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
        <CardContent className="p-4 sm:p-5 space-y-3">
          {/* ─── Top: Gap Type Badge + Severity Badge ──────────── */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`${config.color} ${config.darkColor} gap-1`}>
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
            <Badge variant="outline" className={SEVERITY_COLORS[gap.severity]}>
              {gap.severity} severity
            </Badge>
          </div>

          {/* ─── Title ─────────────────────────────────────────── */}
          <h4 className="font-semibold text-sm leading-tight">{gap.title}</h4>

          {/* ─── Description ───────────────────────────────────── */}
          <p className="text-xs text-muted-foreground leading-relaxed">{gap.description}</p>

          {/* ─── Evidence Block (always visible) ───────────────── */}
          {gap.evidenceDetail && <EvidenceBlock evidence={gap.evidenceDetail} />}

          {/* ─── Why This Matters (always visible) ─────────────── */}
          {gap.whyThisMatters && <WhyThisMatters text={gap.whyThisMatters} />}

          {/* ─── Affected Products Row (always visible) ────────── */}
          {gap.affectedProducts && gap.affectedProducts.length > 0 && (
            <AffectedProductsRow products={gap.affectedProducts} />
          )}

          {/* ─── Sub-Niche Badge (always visible) ──────────────── */}
          {gap.subNiche && gap.subNiche.name && (
            <SubNicheBadge
              name={gap.subNiche.name}
              opportunityScore={gap.subNiche.opportunityScore}
              description={gap.subNiche.description}
            />
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
                className="space-y-3 overflow-hidden"
              >
                <Separator />

                {/* ─── Underserved Users ────────────────────────── */}
                {gap.underservedUsers && gap.underservedUsers.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <UserCircle className="h-3.5 w-3.5" />
                      Underserved Users
                    </p>
                    <div className="space-y-1.5">
                      {gap.underservedUsers.map((user, j) => (
                        <div key={j} className="rounded-md border border-purple-200 dark:border-purple-900/40 bg-purple-50/30 dark:bg-purple-950/10 p-2.5 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-purple-700 dark:text-purple-400">{user.userGroup}</span>
                            {user.opportunityScore > 0 && (
                              <Badge variant="outline" className="text-xs h-5 bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
                                {user.opportunityScore}/100
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground">{user.description}</p>
                          {user.evidence && (
                            <blockquote className="text-muted-foreground italic pl-2 border-l-2 border-purple-300 dark:border-purple-700">
                              &ldquo;{user.evidence}&rdquo;
                            </blockquote>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
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
            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400">
              {totalComplaints} total complaints
            </Badge>
          </div>
          <CardDescription>Grouped user complaints by category with frequency analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {clusters.map((cluster, i) => {
              const colors = getClusterColor(cluster.category)
              return (
                <motion.div
                  key={cluster.category + i}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.3 }}
                  className="space-y-2"
                >
                  {/* Cluster header: large percentage, label, count */}
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-bold tabular-nums ${colors.text}`}>
                      {cluster.percentage}%
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{cluster.label}</p>
                      <p className="text-xs text-muted-foreground">{cluster.count} complaints</p>
                    </div>
                  </div>

                  {/* Horizontal bar */}
                  <div className="h-3 w-full rounded-full bg-muted/50 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${colors.bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${cluster.percentage}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: i * 0.06 }}
                    />
                  </div>

                  {/* Example snippets as blockquotes */}
                  {cluster.exampleSnippets.length > 0 && (
                    <div className="space-y-1 pt-1">
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
                <div className="space-y-1.5 pt-2">
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
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [gapTypeFilter, setGapTypeFilter] = useState<GapType | 'all'>('all')

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
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, analysisType: 'full', timePeriod }),
      })
      if (!res.ok) throw new Error('Analysis failed')
      return res.json() as Promise<{ gaps: GapAnalysis[]; saturation: MarketSaturation[]; complaints: unknown[]; complaintClusters: ComplaintCluster[] }>
    },
    onSuccess: (data) => {
      setAnalysisResults(data.gaps)
      setSaturationResults(data.saturation)
      setComplaintClusters(data.complaintClusters || [])
      toast.success(`Analysis complete! Found ${data.gaps.length} gaps.`)
    },
    onError: () => {
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

      {/* ─── Complaint Clustering (before gap cards) ──────────── */}
      {complaintClusters.length > 0 && (
        <ComplaintClusteringSection clusters={complaintClusters} />
      )}

      {/* ─── Gap Cards ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Detected Gaps
            {filteredGaps.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                {filteredGaps.length}
              </Badge>
            )}
          </h3>
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
