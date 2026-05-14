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
  Check,
  X as XIcon,
  TrendingUp,
  Quote,
  ChevronDown,
  ChevronUp,
  UserCircle,
  BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppStore } from '@/lib/store'
import { CATEGORIES, SEARCH_SUGGESTIONS, type Category, type OpportunitySuggestion, type OpportunityScoreBreakdown, type TimePeriod } from '@/types'

const SATURATION_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
}

// PRIORITY 5: Opportunity Score with explanation
function OpportunityScoreDisplay({ score }: { score: OpportunityScoreBreakdown }) {
  const getScoreColor = (total: number) => {
    if (total >= 75) return 'text-green-600 dark:text-green-400'
    if (total >= 50) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getBarColor = (value: number, max: number) => {
    const pct = (value / max) * 100
    if (pct >= 65) return 'bg-green-500'
    if (pct >= 35) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Opportunity Score</span>
        <span className={`text-lg font-bold ${getScoreColor(score.total)}`}>{score.total}/100</span>
      </div>
      <div className="space-y-1.5">
        {[
          { label: 'Complaint Frequency', value: score.complaintFrequency, max: 20 },
          { label: 'Competition Density', value: score.competitionDensity, max: 20 },
          { label: 'Pricing Dissatisfaction', value: score.pricingDissatisfaction, max: 20 },
          { label: 'Launch Growth', value: score.launchGrowth, max: 20 },
          { label: 'Underserved Audience', value: score.underservedAudience, max: 20 },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            <span className="w-28 text-muted-foreground shrink-0">{item.label}</span>
            <div className="flex-1 bg-muted/50 rounded-full h-1.5 overflow-hidden">
              <div className={`h-full rounded-full ${getBarColor(item.value, item.max)}`} style={{ width: `${(item.value / item.max) * 100}%` }} />
            </div>
            <span className="font-medium w-6 text-right">{item.value}</span>
          </div>
        ))}
      </div>
      {score.explanation && (
        <p className="text-xs text-orange-600 dark:text-orange-400 italic mt-1">{score.explanation}</p>
      )}
    </div>
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
  const [expanded, setExpanded] = useState(false)

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
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* PRIORITY 5: Opportunity Score Badge */}
              {opp.opportunityScore && opp.opportunityScore.total > 0 ? (
                <Badge variant="outline" className="gap-1 bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400">
                  <BarChart3 className="h-3 w-3" />
                  {opp.opportunityScore.total}/100
                </Badge>
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
                onClick={onSave}
                title={isSaved ? 'Already saved' : 'Save opportunity'}
              >
                {isSaved ? <BookmarkCheck className="h-4 w-4 text-orange-500" /> : <Bookmark className="h-4 w-4" />}
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
            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{opp.description}</p>
          </div>

          {/* PRIORITY 6: Why This Matters */}
          {opp.whyThisMatters && (
            <div className="rounded-md border border-orange-200 dark:border-orange-900/40 bg-orange-50/50 dark:bg-orange-950/20 p-2.5">
              <p className="text-xs font-medium text-orange-700 dark:text-orange-400 mb-0.5">Why This Matters</p>
              <p className="text-xs text-foreground leading-relaxed">{opp.whyThisMatters}</p>
            </div>
          )}

          {/* PRIORITY 1: Evidence Layer */}
          {opp.evidenceDetail && (
            <div className="rounded-md border bg-muted/30 p-2.5 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Evidence</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {opp.evidenceDetail.similarProducts > 0 && <span><span className="font-semibold text-foreground">{opp.evidenceDetail.similarProducts}</span> similar</span>}
                {opp.evidenceDetail.repeatedComplaints > 0 && <span><span className="font-semibold text-foreground">{opp.evidenceDetail.repeatedComplaints}</span> complaints</span>}
                {opp.evidenceDetail.pricingOverlap > 0 && <span><span className="font-semibold text-foreground">{opp.evidenceDetail.pricingOverlap}%</span> pricing overlap</span>}
              </div>
            </div>
          )}

          {/* PRIORITY 7: Sub-Niche */}
          {opp.subNiche && opp.subNiche.name && (
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                <TrendingUp className="h-3 w-3 mr-0.5" />
                {opp.subNiche.name}
              </Badge>
              {opp.subNiche.opportunityScore > 0 && (
                <span className="text-xs text-muted-foreground">({opp.subNiche.opportunityScore}/100)</span>
              )}
            </div>
          )}

          {/* PRIORITY 8: Affected Products */}
          {opp.affectedProducts && opp.affectedProducts.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Products Affected</p>
              <div className="flex flex-wrap gap-1.5">
                {opp.affectedProducts.map((p, j) => (
                  <Badge key={j} variant="outline" className="text-xs">
                    {p.name} ({p.pricing})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Gap Evidence & Complaints - compact */}
          <div className="space-y-2">
            {opp.gapEvidence.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />Gap Evidence
                </p>
                <ul className="space-y-0.5">
                  {opp.gapEvidence.slice(0, 2).map((ev, j) => (
                    <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-orange-500 mt-0.5">•</span>
                      <span className="line-clamp-1">{ev}</span>
                    </li>
                  ))}
                  {opp.gapEvidence.length > 2 && (
                    <li className="text-xs text-muted-foreground">+{opp.gapEvidence.length - 2} more...</li>
                  )}
                </ul>
              </div>
            )}
            {opp.complaintRefs.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />User Complaints
                </p>
                <ul className="space-y-0.5">
                  {opp.complaintRefs.slice(0, 1).map((ref, j) => (
                    <li key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="text-orange-500 mt-0.5">•</span>
                      <span className="line-clamp-1">{ref}</span>
                    </li>
                  ))}
                  {opp.complaintRefs.length > 1 && (
                    <li className="text-xs text-muted-foreground">+{opp.complaintRefs.length - 1} more...</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Expandable section */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs h-7 text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
            {expanded ? 'Show Less' : 'Show Score Details & More'}
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
                {/* PRIORITY 5: Full Opportunity Score */}
                {opp.opportunityScore && (
                  <OpportunityScoreDisplay score={opp.opportunityScore} />
                )}

                {/* PRIORITY 12: Underserved Users */}
                {opp.underservedUsers && opp.underservedUsers.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                      <UserCircle className="h-3 w-3" />Underserved Users
                    </p>
                    <div className="space-y-1.5">
                      {opp.underservedUsers.map((user, j) => (
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

                {/* Full affected products breakdown */}
                {opp.affectedProducts && opp.affectedProducts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Competitor Details</p>
                    <div className="space-y-1.5">
                      {opp.affectedProducts.map((product, j) => (
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

                <Badge variant="outline" className="text-xs">{opp.category}</Badge>
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
    <Badge variant="outline" className={`${getColor()} gap-1`}>
      <Star className="h-3 w-3" />
      {score.toFixed(1)}/10
    </Badge>
  )
}

export function OpportunitiesPanel() {
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [focusArea, setFocusArea] = useState('')
  const [view, setView] = useState<'all' | 'saved'>('all')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const opportunities = useAppStore((s) => s.opportunities)
  const setOpportunities = useAppStore((s) => s.setOpportunities)
  const savedOpportunities = useAppStore((s) => s.savedOpportunities)
  const saveOpportunity = useAppStore((s) => s.saveOpportunity)
  const removeSavedOpportunity = useAppStore((s) => s.removeSavedOpportunity)
  const timePeriod = useAppStore((s) => s.timePeriod)
  const setTimePeriod = useAppStore((s) => s.setTimePeriod)

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

  // PRIORITY 9: Search Suggestions
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
                {/* PRIORITY 9: Search Suggestions Dropdown */}
                {showSuggestions && !focusArea && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border bg-popover p-2 shadow-lg">
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
