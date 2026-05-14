'use client'

import { useState } from 'react'
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
import { useAppStore } from '@/lib/store'
import { CATEGORIES, type Category, type OpportunitySuggestion } from '@/types'

const SATURATION_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
}

function QualityBadge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 8) return 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
    if (score >= 6) return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
    return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
  }

  return (
    <Badge variant="outline" className={`${getColor()} gap-1`}>
      <Star className="h-3 w-3" />
      {score.toFixed(1)}/10
    </Badge>
  )
}

function OpportunityCard({
  opp,
  isSaved,
  onSave,
  onDelete,
  delay = 0,
}: {
  opp: OpportunitySuggestion
  isSaved: boolean
  onSave: () => void
  onDelete?: () => void
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardContent className="p-4 sm:p-6 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <QualityBadge score={opp.qualityScore} />
              <Badge variant="outline" className={SATURATION_COLORS[opp.saturation]}>
                {opp.saturation} saturation
              </Badge>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onSave}
                title={isSaved ? 'Already saved' : 'Save opportunity'}
              >
                {isSaved ? (
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

          {/* Title & Description */}
          <div>
            <h4 className="font-semibold text-sm leading-tight">{opp.title}</h4>
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">{opp.description}</p>
          </div>

          <Separator />

          {/* Gap Evidence */}
          {opp.gapEvidence.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Gap Evidence
              </p>
              <ul className="space-y-1">
                {opp.gapEvidence.slice(0, 3).map((ev, j) => (
                  <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span className="line-clamp-1">{ev}</span>
                  </li>
                ))}
                {opp.gapEvidence.length > 3 && (
                  <li className="text-xs text-muted-foreground">
                    +{opp.gapEvidence.length - 3} more...
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Complaint References */}
          {opp.complaintRefs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                User Complaints
              </p>
              <ul className="space-y-1">
                {opp.complaintRefs.slice(0, 2).map((ref, j) => (
                  <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span className="line-clamp-1">{ref}</span>
                  </li>
                ))}
                {opp.complaintRefs.length > 2 && (
                  <li className="text-xs text-muted-foreground">
                    +{opp.complaintRefs.length - 2} more...
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Category */}
          <Badge variant="outline" className="text-xs">
            {opp.category}
          </Badge>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function OpportunitiesPanel() {
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [focusArea, setFocusArea] = useState('')
  const [view, setView] = useState<'all' | 'saved'>('all')

  const opportunities = useAppStore((s) => s.opportunities)
  const setOpportunities = useAppStore((s) => s.setOpportunities)
  const savedOpportunities = useAppStore((s) => s.savedOpportunities)
  const saveOpportunity = useAppStore((s) => s.saveOpportunity)
  const removeSavedOpportunity = useAppStore((s) => s.removeSavedOpportunity)

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, focusArea: focusArea || undefined }),
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
            <CardTitle>Opportunity Generator</CardTitle>
            <CardDescription>
              Generate AI-powered product opportunities based on market gaps and user complaints
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
                <label className="text-sm font-medium">Focus Area (optional)</label>
                <Input
                  placeholder="e.g., B2B SaaS, mobile-first"
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="w-full sm:w-56"
                />
              </div>

              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Lightbulb className="h-4 w-4" />
                    Generate Opportunities
                  </>
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
                <Badge variant="secondary" className="ml-1.5 text-xs h-5">
                  {opportunities.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="saved">
              Saved
              {savedOpportunities.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-xs h-5 bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                  {savedOpportunities.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Opportunities Grid */}
      {generateMutation.isPending && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6 space-y-3">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!generateMutation.isPending && displayedOpportunities.length === 0 && (
        <Card className="p-8">
          <div className="flex flex-col items-center justify-center text-muted-foreground">
            <Lightbulb className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm">
              {view === 'saved'
                ? 'No saved opportunities yet. Generate and save opportunities to see them here.'
                : 'No opportunities generated yet. Click "Generate Opportunities" to start.'}
            </p>
          </div>
        </Card>
      )}

      <AnimatePresence>
        {!generateMutation.isPending && displayedOpportunities.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedOpportunities.map((opp, i) => (
              <OpportunityCard
                key={opp.title + i}
                opp={opp}
                isSaved={isSaved(opp)}
                onSave={() => {
                  if (!isSaved(opp)) {
                    saveOpportunity(opp)
                    toast.success('Opportunity saved!')
                  }
                }}
                onDelete={view === 'saved' ? () => {
                  removeSavedOpportunity(opp.title)
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
