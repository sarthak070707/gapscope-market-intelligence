'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, ExternalLink, ChevronUp, ChevronDown, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAppStore, getEffectiveCategory } from '@/lib/store'
import { CATEGORIES, SEARCH_SUGGESTIONS, type Category, type ScannedProduct } from '@/types'
import { ModuleErrorState } from '@/components/module-error-state'
import { classifyError, type ModuleError } from '@/lib/error-handler'

export function ScannerPanel() {
  const selectedCategory = useAppStore((s) => s.selectedCategory)
  const setSelectedCategory = useAppStore((s) => s.setSelectedCategory)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [sortField, setSortField] = useState<'upvotes' | 'launchDate' | 'reviewScore'>('upvotes')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [searchInput, setSearchInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [scanError, setScanError] = useState<ModuleError | null>(null)

  const scanResults = useAppStore((s) => s.scanResults)
  const setScanResults = useAppStore((s) => s.setScanResults)

  // Use a ref to track if scanError was already set in the mutationFn,
  // because React state updates are async and the closure may see stale null
  const [scanErrorSetByMutation, setScanErrorSetByMutation] = useState(false)

  const scanMutation = useMutation({
    mutationFn: async () => {
      setScanError(null)
      setScanErrorSetByMutation(false)
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selectedCategory, period }),
      })
      if (!res.ok) {
        let moduleError: ModuleError
        try {
          const errorBody = await res.json()
          // If the backend returned a structured moduleError, use it directly
          // to avoid double-classification (the error message already has [CATEGORY] prefix)
          if (errorBody.moduleError && typeof errorBody.moduleError === 'object') {
            moduleError = errorBody.moduleError as ModuleError
            moduleError.statusCode = res.status
            // Enrich with frontend request context if missing
            if (!moduleError.requestCategory) moduleError.requestCategory = selectedCategory
            if (!moduleError.requestPayload) moduleError.requestPayload = `category=${selectedCategory}, period=${period}`
            if (!moduleError.backendMessage && errorBody.error) moduleError.backendMessage = errorBody.error
          } else {
            // Backend returned a plain error - classify it
            moduleError = classifyError(new Error(errorBody.error || `HTTP ${res.status}`), 'Product Hunt Scanner', '/api/scan', {
              category: selectedCategory,
              payload: `category=${selectedCategory}, period=${period}`,
              backendMessage: errorBody.error,
            })
            moduleError.statusCode = res.status
            if (!moduleError.requestCategory) moduleError.requestCategory = selectedCategory
            if (!moduleError.requestPayload) moduleError.requestPayload = `category=${selectedCategory}, period=${period}`
            if (!moduleError.backendMessage && errorBody.error) moduleError.backendMessage = errorBody.error
          }
        } catch {
          // JSON parse failed (gateway returned HTML or non-JSON error)
          moduleError = classifyError(new Error(`HTTP ${res.status}`), 'Product Hunt Scanner', '/api/scan', {
            category: selectedCategory,
            payload: `category=${selectedCategory}, period=${period}`,
          })
          moduleError.statusCode = res.status
          if (!moduleError.requestCategory) moduleError.requestCategory = selectedCategory
          if (!moduleError.requestPayload) moduleError.requestPayload = `category=${selectedCategory}, period=${period}`
        }
        setScanError(moduleError)
        setScanErrorSetByMutation(true)
        throw new Error(moduleError.message)
      }
      return res.json() as Promise<ScannedProduct[]>
    },
    onSuccess: (data) => {
      setScanResults(data)
      toast.success(`Scan complete! Found ${data.length} products.`)
    },
    onError: (err) => {
      // Only re-classify if the mutationFn didn't already set scanError
      // (prevents double-classification which causes [API_ERROR] [API_ERROR] ... prefix)
      if (!scanErrorSetByMutation) {
        setScanError(classifyError(err, 'Product Hunt Scanner', '/api/scan', {
          category: selectedCategory,
          payload: `category=${selectedCategory}, period=${period}`,
        }))
      }
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

  // PRIORITY 9: Handle search suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setSearchInput(suggestion)
    setShowSuggestions(false)
    // Try to match suggestion to a category
    const matchedCategory = CATEGORIES.find(cat => 
      suggestion.toLowerCase().includes(cat.toLowerCase()) ||
      cat.toLowerCase().includes(suggestion.toLowerCase().split(' ')[0])
    )
    if (matchedCategory) {
      setSelectedCategory(matchedCategory)
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

              {/* PRIORITY 9: Search with suggestions */}
              <div className="space-y-2 w-full sm:w-auto relative">
                <label className="text-sm font-medium">Quick Search</label>
                <Input
                  placeholder="Search products..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="w-full sm:w-52"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchInput.trim()) {
                      scanMutation.mutate()
                    }
                  }}
                />
                {/* Search Suggestions Dropdown */}
                {showSuggestions && !searchInput && (
                  <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border bg-popover p-2 shadow-lg max-h-64 overflow-y-auto custom-scrollbar">
                    <p className="text-xs text-muted-foreground mb-1.5 px-1">Try searching for:</p>
                    <div className="space-y-0.5">
                      {SEARCH_SUGGESTIONS.map((suggestion) => (
                        <button
                          key={suggestion}
                          className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted/50 transition-colors flex items-center gap-2"
                          onMouseDown={() => handleSuggestionClick(suggestion)}
                        >
                          <Search className="h-3 w-3 text-muted-foreground" />
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending}
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
              >
                {scanMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Scanning...</>
                ) : (
                  <><Search className="h-4 w-4" />Scan Product Hunt</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Error State */}
      {scanError && !scanMutation.isPending && (
        <ModuleErrorState
          error={scanError}
          onRetry={() => scanMutation.mutate()}
          isRetrying={scanMutation.isPending}
        />
      )}

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
                {/* PRIORITY 9: Show search suggestions in empty state */}
                <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-lg">
                  {SEARCH_SUGGESTIONS.slice(0, 5).map((suggestion) => (
                    <button
                      key={suggestion}
                      className="text-xs px-3 py-1.5 rounded-full border hover:bg-muted/50 transition-colors"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
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
                            <Badge variant="outline" className="text-xs">{product.category}</Badge>
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
                                <ExternalLink className="h-3 w-3" />View
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
