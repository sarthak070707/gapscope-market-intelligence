'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
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
import { useAppStore } from '@/lib/store'
import { CATEGORIES, type Category, type TrendData, type CompetitorComparison, type UnderservedUserGroup } from '@/types'

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

function DirectionIcon({ direction }: { direction: string }) {
  switch (direction) {
    case 'growing':
      return <ArrowUpRight className="h-4 w-4 text-green-500" />
    case 'declining':
      return <ArrowDownRight className="h-4 w-4 text-red-500" />
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />
  }
}

// Expandable trend card with sub-niches and underserved users
function TrendCard({ trend, delay = 0 }: { trend: TrendData; delay?: number }) {
  const [expanded, setExpanded] = useState(false)
  const sparklineColor = (direction: string) => {
    switch (direction) {
      case 'growing': return 'oklch(0.65 0.2 145)'
      case 'declining': return 'oklch(0.6 0.2 25)'
      default: return 'oklch(0.6 0.05 0)'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay, duration: 0.3 }}
    >
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardContent className="p-4 sm:p-5 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <Badge variant="outline" className="text-xs mb-2">{trend.category}</Badge>
              <h4 className="font-semibold text-sm leading-tight">{trend.name}</h4>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <DirectionIcon direction={trend.direction} />
              <span
                className={`text-sm font-bold ${
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
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{trend.description}</p>
          <div className="h-12">
            <SparklineChart
              data={trend.dataPoints}
              color={sparklineColor(trend.direction)}
            />
          </div>
          <p className="text-xs text-muted-foreground">{trend.period}</p>

          {/* PRIORITY 7: Sub-Niches from trend */}
          {trend.subNiches && trend.subNiches.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {trend.subNiches.map((sn, j) => (
                <Badge key={j} variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                  <Target className="h-3 w-3 mr-0.5" />
                  {sn.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Expand for underserved users */}
          {(trend.underservedUsers && trend.underservedUsers.length > 0) && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs h-7 text-muted-foreground"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                {expanded ? 'Hide' : 'Show'} Underserved Users
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
                    <div className="space-y-1.5">
                      {trend.underservedUsers.map((user, j) => (
                        <div key={j} className="rounded-md border border-purple-200 dark:border-purple-900/40 p-2 text-xs space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {user.userGroup}
                            </span>
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

export function TrendsComparePanel() {
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [productInput, setProductInput] = useState('')
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])

  const trendResults = useAppStore((s) => s.trendResults)
  const setTrendResults = useAppStore((s) => s.setTrendResults)
  const comparisonResults = useAppStore((s) => s.comparisonResults)
  const setComparisonResults = useAppStore((s) => s.setComparisonResults)

  const trendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'detect', category }),
      })
      if (!res.ok) throw new Error('Trend detection failed')
      return res.json() as Promise<TrendData[]>
    },
    onSuccess: (data) => {
      setTrendResults(data)
      toast.success(`Detected ${data.length} trends!`)
    },
    onError: () => {
      toast.error('Trend detection failed. Please try again.')
    },
  })

  const compareMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'compare', productIds: selectedProducts, category }),
      })
      if (!res.ok) throw new Error('Comparison failed')
      return res.json() as Promise<CompetitorComparison>
    },
    onSuccess: (data) => {
      setComparisonResults(data)
      toast.success('Comparison complete!')
    },
    onError: () => {
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
              <TrendCard key={trend.name + i} trend={trend} delay={i * 0.05} />
            ))}
          </div>
        )}
      </AnimatePresence>

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
              Compare up to 5 products side by side with AI-powered analysis
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
                <CardTitle>Comparison Results</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="overflow-x-auto">
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

                {/* AI Summary */}
                {comparisonResults.summary && (
                  <div className="mt-6 rounded-lg border bg-muted/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-md bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center">
                        <GitCompare className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="text-sm font-semibold">AI Analysis Summary</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {comparisonResults.summary}
                    </p>
                  </div>
                )}

                {/* PRIORITY 12: Underserved Users from comparison */}
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
                            <div>
                              <p className="text-sm font-semibold text-purple-700 dark:text-purple-400">{user.userGroup}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{user.description}</p>
                            </div>
                            {user.opportunityScore > 0 && (
                              <Badge variant="outline" className="bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 shrink-0">
                                {user.opportunityScore}/100
                              </Badge>
                            )}
                          </div>
                          {user.evidence && (
                            <p className="text-xs text-orange-600 dark:text-orange-400 italic line-clamp-2">
                              {user.evidence}
                            </p>
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
