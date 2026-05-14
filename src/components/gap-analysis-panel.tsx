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
  TrendingUp,
  Quote,
  ChevronDown,
  ChevronUp,
  UserCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
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
import { CATEGORIES, type Category, type GapType, type GapAnalysis, type MarketSaturation, type ComplaintCluster, type TimePeriod } from '@/types'

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
    color: 'bg-blue-100 text-blue-700',
    darkColor: 'dark:bg-blue-950/40 dark:text-blue-400',
  },
}

const SEVERITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
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
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label || 'Competition Level'}</span>
        <span className="font-medium">{score}% — {getLevel()}</span>
      </div>
      <div className={`h-2.5 rounded-full ${getBgColor()} overflow-hidden`}>
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

// Expandable gap card with all enriched data
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
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className={`${config.color} ${config.darkColor} gap-1`}>
              <Icon className="h-3 w-3" />
              {config.label}
            </Badge>
            <Badge variant="outline" className={SEVERITY_COLORS[gap.severity]}>
              {gap.severity} severity
            </Badge>
          </div>

          {/* Title & Description */}
          <div>
            <h4 className="font-semibold text-sm leading-tight">{gap.title}</h4>
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{gap.description}</p>
          </div>

          {/* PRIORITY 1: Evidence Layer - always visible */}
          {gap.evidenceDetail && (
            <div className="rounded-md border bg-muted/30 p-2.5 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Evidence</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-xs">
                {gap.evidenceDetail.similarProducts > 0 && (
                  <div><span className="font-semibold text-foreground">{gap.evidenceDetail.similarProducts}</span> <span className="text-muted-foreground">similar products</span></div>
                )}
                {gap.evidenceDetail.repeatedComplaints > 0 && (
                  <div><span className="font-semibold text-foreground">{gap.evidenceDetail.repeatedComplaints}</span> <span className="text-muted-foreground">repeated complaints</span></div>
                )}
                {gap.evidenceDetail.launchFrequency > 0 && (
                  <div><span className="font-semibold text-foreground">{gap.evidenceDetail.launchFrequency}</span> <span className="text-muted-foreground">launches/mo</span></div>
                )}
                {gap.evidenceDetail.pricingOverlap > 0 && (
                  <div><span className="font-semibold text-foreground">{gap.evidenceDetail.pricingOverlap}%</span> <span className="text-muted-foreground">pricing overlap</span></div>
                )}
              </div>
              {gap.evidenceDetail.commentSnippets && gap.evidenceDetail.commentSnippets.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {gap.evidenceDetail.commentSnippets.slice(0, 2).map((snippet, j) => (
                    <p key={j} className="text-xs text-muted-foreground italic flex items-start gap-1">
                      <Quote className="h-3 w-3 shrink-0 mt-0.5 text-orange-400" />
                      <span className="line-clamp-1">{snippet}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PRIORITY 6: Why This Matters - always visible */}
          {gap.whyThisMatters && (
            <div className="rounded-md border border-orange-200 dark:border-orange-900/40 bg-orange-50/50 dark:bg-orange-950/20 p-2.5">
              <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-0.5">Why This Matters</p>
              <p className="text-xs text-foreground leading-relaxed">{gap.whyThisMatters}</p>
            </div>
          )}

          {/* Expandable section */}
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

                {/* PRIORITY 7: Sub-Niche Detection */}
                {gap.subNiche && gap.subNiche.name && (
                  <div className="rounded-md border bg-green-50/50 dark:bg-green-950/20 p-2.5">
                    <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      Sub-Niche
                    </p>
                    <p className="text-sm font-semibold">{gap.subNiche.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{gap.subNiche.description}</p>
                    {gap.subNiche.opportunityScore > 0 && (
                      <Badge variant="outline" className="mt-1.5 text-xs bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400">
                        Opportunity: {gap.subNiche.opportunityScore}/100
                      </Badge>
                    )}
                  </div>
                )}

                {/* PRIORITY 8: Real Product Examples */}
                {gap.affectedProducts && gap.affectedProducts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Products Affected</p>
                    <div className="space-y-1.5">
                      {gap.affectedProducts.map((product, j) => (
                        <div key={j} className="rounded-md border p-2 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{product.name}</span>
                            <Badge variant="outline" className="text-xs h-5">{product.pricing}</Badge>
                          </div>
                          <div className="flex gap-3">
                            {product.strengths.length > 0 && (
                              <div className="flex-1">
                                {product.strengths.map((s, k) => (
                                  <span key={k} className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
                                    <Check className="h-3 w-3 shrink-0" />
                                    <span className="line-clamp-1">{s}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                            {product.weaknesses.length > 0 && (
                              <div className="flex-1">
                                {product.weaknesses.map((w, k) => (
                                  <span key={k} className="flex items-center gap-0.5 text-red-600 dark:text-red-400">
                                    <XIcon className="h-3 w-3 shrink-0" />
                                    <span className="line-clamp-1">{w}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PRIORITY 12: Underserved Users */}
                {gap.underservedUsers && gap.underservedUsers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                      <UserCircle className="h-3 w-3" />
                      Underserved Users
                    </p>
                    <div className="space-y-1.5">
                      {gap.underservedUsers.map((user, j) => (
                        <div key={j} className="rounded-md border border-purple-200 dark:border-purple-900/40 p-2 text-xs space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-purple-700 dark:text-purple-400">{user.userGroup}</span>
                            {user.opportunityScore > 0 && (
                              <Badge variant="outline" className="text-xs h-5 bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
                                {user.opportunityScore}/100
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground">{user.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Basic Evidence text */}
                {gap.evidence && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Supporting Evidence</p>
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
      return res.json() as Promise<{ gaps: GapAnalysis[]; saturation: MarketSaturation[]; complaints: any[]; complaintClusters: ComplaintCluster[] }>
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
      {/* Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Gap Analysis</CardTitle>
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

              {/* PRIORITY 11: Time Filtering */}
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

      {/* PRIORITY 2: Complaint Clustering */}
      {complaintClusters.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Top Complaints
              </CardTitle>
              <CardDescription>Grouped user complaints by category with percentages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {complaintClusters.map((cluster, i) => (
                  <div key={cluster.category + i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{cluster.label}</span>
                      <span className="text-xs text-muted-foreground">{cluster.percentage}% ({cluster.count} complaints)</span>
                    </div>
                    <Progress value={cluster.percentage} className="h-2.5" />
                    {cluster.exampleSnippets.length > 0 && (
                      <p className="text-xs text-muted-foreground italic line-clamp-1 pl-2 border-l-2 border-orange-300 dark:border-orange-700">
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

      {/* Gap Cards */}
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

        {analyzeMutation.isPending && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 sm:p-6 space-y-3">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!analyzeMutation.isPending && filteredGaps.length === 0 && analysisResults.length === 0 && (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">No analysis results yet. Click &quot;Analyze Gaps&quot; to start.</p>
            </div>
          </Card>
        )}

        {!analyzeMutation.isPending && filteredGaps.length === 0 && analysisResults.length > 0 && (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center text-muted-foreground">
              <Shield className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">No gaps match the selected filter. Try a different gap type.</p>
            </div>
          </Card>
        )}

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

      {/* Market Saturation with PRIORITY 3: Competitor Breakdown & PRIORITY 4: Saturation Meter */}
      {saturationResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Market Saturation Scores</CardTitle>
              <CardDescription>Category-level saturation analysis with competitor breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                <div className="space-y-4">
                  {saturationResults.map((sat, i) => (
                    <motion.div
                      key={sat.category}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-lg border p-4 space-y-3"
                    >
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
                      
                      {/* PRIORITY 4: Visual Saturation Meter */}
                      <SaturationMeter score={sat.score} />

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-muted-foreground">
                        <div><span className="font-medium text-foreground">{sat.factors.similarProducts}</span> similar</div>
                        <div><span className="font-medium text-foreground">{sat.factors.featureOverlap}%</span> overlap</div>
                        <div><span className="font-medium text-foreground">{sat.factors.launchFrequency}</span> launches/mo</div>
                        <div><span className="font-medium text-foreground">{sat.factors.userComplaints}</span> complaints</div>
                        <div><span className="font-medium text-foreground">{sat.factors.pricingSimilarity}%</span> pricing sim.</div>
                      </div>

                      {/* PRIORITY 3: Competitor Breakdown */}
                      {sat.topCompetitors && sat.topCompetitors.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Top Competitors</p>
                          <div className="space-y-1.5">
                            {sat.topCompetitors.slice(0, 3).map((comp, j) => (
                              <div key={j} className="flex items-center gap-2 text-xs rounded-md bg-muted/30 p-1.5">
                                <span className="font-medium">{comp.name}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-muted-foreground line-clamp-1">{comp.strengths[0] || 'N/A'}</span>
                                <span className="text-muted-foreground">,</span>
                                <span className="text-muted-foreground line-clamp-1">{comp.weaknesses[0] || 'N/A'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* PRIORITY 7: Sub-Niches in saturation */}
                      {sat.subNiches && sat.subNiches.length > 0 && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Sub-Niches</p>
                          <div className="flex flex-wrap gap-1.5">
                            {sat.subNiches.map((sn, j) => (
                              <Badge key={j} variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                                {sn.name} ({sn.opportunityScore}/100)
                              </Badge>
                            ))}
                          </div>
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
    </div>
  )
}
