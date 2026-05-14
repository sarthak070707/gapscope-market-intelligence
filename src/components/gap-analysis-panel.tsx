'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
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
import { useAppStore } from '@/lib/store'
import { CATEGORIES, type Category, type GapType, type GapAnalysis, type MarketSaturation } from '@/types'

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

function SaturationIndicator({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 75) return 'bg-red-500'
    if (score >= 50) return 'bg-amber-500'
    if (score >= 25) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getLabel = () => {
    if (score >= 75) return 'High'
    if (score >= 50) return 'Medium'
    if (score >= 25) return 'Moderate'
    return 'Low'
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Saturation</span>
        <span className="font-medium">{score}% — {getLabel()}</span>
      </div>
      <Progress value={score} className="h-2" />
    </div>
  )
}

export function GapAnalysisPanel() {
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [gapTypeFilter, setGapTypeFilter] = useState<GapType | 'all'>('all')

  const analysisResults = useAppStore((s) => s.analysisResults)
  const setAnalysisResults = useAppStore((s) => s.setAnalysisResults)
  const saturationResults = useAppStore((s) => s.saturationResults)
  const setSaturationResults = useAppStore((s) => s.setSaturationResults)

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, analysisType: 'full' }),
      })
      if (!res.ok) throw new Error('Analysis failed')
      return res.json() as Promise<{ gaps: GapAnalysis[]; saturation: MarketSaturation[] }>
    },
    onSuccess: (data) => {
      setAnalysisResults(data.gaps)
      setSaturationResults(data.saturation)
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
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
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

              <Button
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4" />
                    Analyze Gaps
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

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
              {filteredGaps.map((gap, i) => {
                const config = GAP_TYPE_CONFIG[gap.gapType]
                const Icon = config.icon
                return (
                  <motion.div
                    key={gap.title + i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                  >
                    <Card className="h-full hover:shadow-md transition-shadow">
                      <CardContent className="p-4 sm:p-6 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`${config.color} ${config.darkColor} gap-1`}>
                            <Icon className="h-3 w-3" />
                            {config.label}
                          </Badge>
                          <Badge variant="outline" className={SEVERITY_COLORS[gap.severity]}>
                            {gap.severity} severity
                          </Badge>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm leading-tight">{gap.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                            {gap.description}
                          </p>
                        </div>
                        <Separator />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Evidence</p>
                          <p className="text-xs leading-relaxed line-clamp-3">{gap.evidence}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Market Saturation */}
      {saturationResults.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Market Saturation Scores</CardTitle>
              <CardDescription>Category-level saturation analysis</CardDescription>
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
                      <SaturationIndicator score={sat.score} />
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium text-foreground">{sat.factors.similarProducts}</span> similar
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{sat.factors.featureOverlap}%</span> overlap
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{sat.factors.launchFrequency}</span> launches/mo
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{sat.factors.userComplaints}</span> complaints
                        </div>
                        <div>
                          <span className="font-medium text-foreground">{sat.factors.pricingSimilarity}%</span> pricing sim.
                        </div>
                      </div>
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
