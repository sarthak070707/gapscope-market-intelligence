'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { CATEGORIES, type Category, type ScannedProduct } from '@/types'

export function ScannerPanel() {
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [sortField, setSortField] = useState<'upvotes' | 'launchDate' | 'reviewScore'>('upvotes')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const scanResults = useAppStore((s) => s.scanResults)
  const setScanResults = useAppStore((s) => s.setScanResults)

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, period }),
      })
      if (!res.ok) throw new Error('Scan failed')
      return res.json() as Promise<ScannedProduct[]>
    },
    onSuccess: (data) => {
      setScanResults(data)
      toast.success(`Scan complete! Found ${data.length} products.`)
    },
    onError: () => {
      toast.error('Scan failed. Please try again.')
    },
  })

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('desc')
    }
  }

  const renderSortIcon = (field: typeof sortField) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? (
      <ChevronUp className="h-3 w-3 ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 ml-1" />
    )
  }

  const sortedResults = [...scanResults].sort((a, b) => {
    const mod = sortDir === 'asc' ? 1 : -1
    if (sortField === 'upvotes') return (a.upvotes - b.upvotes) * mod
    if (sortField === 'reviewScore') return (a.reviewScore - b.reviewScore) * mod
    return (new Date(a.launchDate).getTime() - new Date(b.launchDate).getTime()) * mod
  })

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
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
            <CardTitle>Product Hunt Scanner</CardTitle>
            <CardDescription>
              Scan Product Hunt for products in a specific category and time period
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
                <label className="text-sm font-medium">Period</label>
                <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending}
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
              >
                {scanMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Scan Product Hunt
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Scan Results</CardTitle>
                <CardDescription>
                  {scanResults.length > 0
                    ? `${scanResults.length} products found`
                    : 'Run a scan to see results'}
                </CardDescription>
              </div>
              {scanResults.length > 0 && (
                <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                  {scanResults.length} products
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {scanMutation.isPending && (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            )}

            {!scanMutation.isPending && scanResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-sm">No scan results yet. Configure and run a scan above.</p>
              </div>
            )}

            <AnimatePresence>
              {!scanMutation.isPending && scanResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Tagline</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:text-foreground"
                          onClick={() => handleSort('upvotes')}
                        >
                          <span className="inline-flex items-center">
                            Upvotes
                            {renderSortIcon('upvotes')}
                          </span>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:text-foreground hidden sm:table-cell"
                          onClick={() => handleSort('reviewScore')}
                        >
                          <span className="inline-flex items-center">
                            Score
                            {renderSortIcon('reviewScore')}
                          </span>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer select-none hover:text-foreground hidden lg:table-cell"
                          onClick={() => handleSort('launchDate')}
                        >
                          <span className="inline-flex items-center">
                            Launch Date
                            {renderSortIcon('launchDate')}
                          </span>
                        </TableHead>
                        <TableHead className="hidden xl:table-cell">Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedResults.map((product, i) => (
                        <motion.tr
                          key={product.name + i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="hover:bg-muted/50 border-b transition-colors"
                        >
                          <TableCell className="font-medium max-w-[160px] truncate">
                            {product.name}
                          </TableCell>
                          <TableCell className="hidden md:table-cell max-w-[240px] truncate text-muted-foreground">
                            {product.tagline}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {product.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-orange-600 dark:text-orange-400">
                            {product.upvotes.toLocaleString()}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {product.reviewScore}/10
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {formatDate(product.launchDate)}
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {product.url && (
                              <a
                                href={product.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-orange-600 dark:text-orange-400 hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View
                              </a>
                            )}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
