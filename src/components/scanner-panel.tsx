'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, ExternalLink, ChevronUp, ChevronDown, Clock, ShieldAlert, Timer } from 'lucide-react'
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
import { handleFetchError } from '@/lib/fetch-error'
import { useRateLimitCooldown, formatCooldownTime } from '@/hooks/use-rate-limit-cooldown'

// ─── Stage labels for progress display ──────────────────────────────
const STAGE_LABELS: Record<string, string> = {
  INITIALIZING: 'Initializing scan...',
  WEB_SEARCH: 'Searching Product Hunt...',
  READ_PAGES: 'Reading Product Hunt pages...',
  LLM_EXTRACT: 'AI extracting product data...',
  SAVE_PRODUCTS: 'Saving products to database...',
  COMPLETED: 'Scan complete!',
}

// ─── Polling hook for job-based scan results ────────────────────────

function useScanPolling() {
  const [isPolling, setIsPolling] = useState(false)
  const [pollingStage, setPollingStage] = useState('')
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const setScanResults = useAppStore((s) => s.setScanResults)

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current)
      pollingRef.current = null
    }
    setIsPolling(false)
  }, [])

  const startPolling = useCallback((jobId: string): Promise<ScannedProduct[] | ModuleError> => {
    return new Promise((resolve) => {
      setIsPolling(true)
      setPollingStage('INITIALIZING')

      const poll = async () => {
        try {
          const res = await fetch(`/api/scan?jobId=${jobId}`)
          if (!res.ok) {
            const moduleError = await handleFetchError(res, {
              moduleName: 'Product Hunt Scanner',
              endpoint: '/api/scan',
            })
            stopPolling()
            resolve(moduleError)
            return
          }

          const data = await res.json()

          // Update stage display
          if (data.stage) {
            setPollingStage(data.stage)
          }

          if (data.status === 'completed' && data.products) {
            stopPolling()
            resolve(data.products as ScannedProduct[])
            return
          }

          if (data.status === 'failed') {
            stopPolling()
            const moduleError = data.error as ModuleError || classifyError(
              new Error(data.error?.message || 'Scan failed'),
              'Product Hunt Scanner',
              '/api/scan'
            )
            resolve(moduleError)
            return
          }

          // Still running — poll again in 3 seconds
          pollingRef.current = setTimeout(poll, 3000)
        } catch (err) {
          stopPolling()
          const moduleError = classifyError(err, 'Product Hunt Scanner', '/api/scan')
          resolve(moduleError)
        }
      }

      // Start polling after a brief delay to let the job initialize
      pollingRef.current = setTimeout(poll, 2000)
    })
  }, [stopPolling, setScanResults])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current)
      }
    }
  }, [])

  return { isPolling, pollingStage, startPolling, stopPolling }
}

export function ScannerPanel() {
  const selectedCategory = useAppStore((s) => s.selectedCategory)
  const setSelectedCategory = useAppStore((s) => s.setSelectedCategory)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [sortField, setSortField] = useState<'upvotes' | 'launchDate' | 'reviewScore'>('upvotes')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [searchInput, setSearchInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const [scanError, setScanError] = useState<ModuleError | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  const scanResults = useAppStore((s) => s.scanResults)
  const setScanResults = useAppStore((s) => s.setScanResults)

  const { isPolling, pollingStage, startPolling, stopPolling } = useScanPolling()

  // ─── Rate-limit cooldown state ───
  const effectiveCategory = selectedCategory === 'all' ? 'AI Tools' : selectedCategory
  const {
    isCooldownActive,
    remainingSeconds,
    cooldownState,
    enterCooldown,
    clearCooldown,
  } = useRateLimitCooldown(effectiveCategory, period)

  const scanMutation = useMutation({
    mutationFn: async () => {
      setScanError(null)
      setIsScanning(true)

      // ─── Block scan during cooldown ───
      if (isCooldownActive) {
        const blockedError: ModuleError = {
          module: 'Product Hunt Scanner',
          category: 'rate_limit',
          message: `[RATE_LIMIT] Scanner is in cooldown. Try again in ${remainingSeconds} seconds.`,
          detail: `Cannot start a new scan for "${effectiveCategory}" (${period}) while the rate-limit cooldown is active.`,
          possibleReason: `The search API returned HTTP 429 (Too Many Requests). The scanner entered a cooldown to prevent repeated failures. Wait ${formatCooldownTime(remainingSeconds)} before retrying.`,
          retryable: true,
          timestamp: new Date().toISOString(),
          endpoint: '/api/scan',
          statusCode: 429,
          stage: cooldownState?.stage || 'SCAN_WEB_SEARCH',
          requestCategory: effectiveCategory,
          requestPayload: `category=${effectiveCategory}, period=${period}`,
          providerMessage: cooldownState?.providerMessage || '',
          retryAfterSeconds: remainingSeconds,
        }
        setScanError(blockedError)
        setIsScanning(false)
        throw new Error(blockedError.message)
      }

      // Step 1: Start the scan job (returns immediately with jobId)
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selectedCategory, period }),
      })

      if (!res.ok) {
        // The POST itself failed — this could be a 429 (cooldown rejection) or other error
        const moduleError = await handleFetchError(res, {
          moduleName: 'Product Hunt Scanner',
          endpoint: '/api/scan',
          category: selectedCategory,
          payload: `category=${selectedCategory}, period=${period}`,
        })

        // If it's a rate-limit error with retryAfterSeconds, enter cooldown
        if (moduleError.category === 'rate_limit' && moduleError.retryAfterSeconds) {
          enterCooldown(moduleError)
        }

        setScanError(moduleError)
        throw new Error(moduleError.message)
      }

      const jobData = await res.json()

      // If the response already contains products (backward compat), return them directly
      if (Array.isArray(jobData)) {
        return jobData as ScannedProduct[]
      }

      // Step 2: Poll for results using the job ID
      if (jobData.jobId) {
        const result = await startPolling(jobData.jobId)

        // Check if the result is an error
        if ('category' in result && 'message' in result && !('name' in result)) {
          // This is a ModuleError, not a ScannedProduct[]
          const moduleError = result as ModuleError
          setScanError(moduleError)

          // If it's a rate-limit error, enter cooldown
          if (moduleError.category === 'rate_limit') {
            enterCooldown(moduleError)
          }

          throw new Error(moduleError.message)
        }

        return result as ScannedProduct[]
      }

      // Fallback — shouldn't happen
      throw new Error('Unexpected response format from scan endpoint')
    },
    onSuccess: (data) => {
      setIsScanning(false)
      setScanResults(data)
      clearCooldown() // Clear cooldown on success
      toast.success(`Scan complete! Found ${data.length} products.`)
    },
    onError: (err) => {
      setIsScanning(false)
      // Only set error if not already set in mutationFn
      if (!scanError) {
        const classifiedError = classifyError(err, 'Product Hunt Scanner', '/api/scan', {
          category: selectedCategory,
          payload: `category=${selectedCategory}, period=${period}`,
        })

        // If it's a rate-limit error, enter cooldown
        if (classifiedError.category === 'rate_limit') {
          enterCooldown(classifiedError)
        }

        setScanError(classifiedError)
      }
      toast.error('Scan failed. Please try again.')
    },
  })

  // Combined loading state
  const isLoading = scanMutation.isPending || isPolling
  const currentStage = isPolling ? pollingStage : (scanMutation.isPending ? 'STARTING' : '')

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

  const handleSuggestionClick = (suggestion: string) => {
    setSearchInput(suggestion)
    setShowSuggestions(false)
    const matchedCategory = CATEGORIES.find(cat =>
      suggestion.toLowerCase().includes(cat.toLowerCase()) ||
      cat.toLowerCase().includes(suggestion.toLowerCase().split(' ')[0])
    )
    if (matchedCategory) {
      setSelectedCategory(matchedCategory)
    }
  }

  // Stage progress bar for polling
  const stageProgress = (() => {
    const stages = ['INITIALIZING', 'WEB_SEARCH', 'READ_PAGES', 'LLM_EXTRACT', 'SAVE_PRODUCTS', 'COMPLETED']
    const idx = stages.indexOf(currentStage)
    if (idx < 0) return 0
    return Math.round(((idx + 1) / stages.length) * 100)
  })()

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

              {/* Quick Search */}
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
                    if (e.key === 'Enter' && searchInput.trim() && !isCooldownActive) {
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
                disabled={isLoading || isCooldownActive}
                className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
              >
                {isLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Scanning...</>
                ) : isCooldownActive ? (
                  <><Timer className="h-4 w-4" />Cooldown ({formatCooldownTime(remainingSeconds)})</>
                ) : (
                  <><Search className="h-4 w-4" />Scan Product Hunt</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Progress indicator with stage tracking */}
      {isLoading && currentStage && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-orange-200 dark:border-orange-900/60">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="h-5 w-5 animate-spin text-orange-600 dark:text-orange-400" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {STAGE_LABELS[currentStage] || `Processing: ${currentStage}...`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This may take 60-120 seconds. The scan runs in the background — no gateway timeout!
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <motion.div
                  className="bg-orange-500 h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${stageProgress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px] text-muted-foreground">Stage: {currentStage}</span>
                <span className="text-[10px] text-muted-foreground">{stageProgress}%</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Rate-limit cooldown banner */}
      {isCooldownActive && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-950/30">
                  <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-300">
                      Search API Rate Limit Reached
                    </h3>
                    <Badge
                      variant="outline"
                      className="bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60 text-[10px]"
                    >
                      Cooldown Active
                    </Badge>
                    {cooldownState?.escalationCount && cooldownState.escalationCount > 1 && (
                      <Badge
                        variant="outline"
                        className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60 text-[10px]"
                      >
                        Escalated (#{cooldownState.escalationCount})
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-rose-700 dark:text-rose-400">
                    Retry available in <span className="font-bold tabular-nums">{formatCooldownTime(remainingSeconds)}</span>
                  </p>
                  <div className="mt-2 w-full bg-rose-200/50 dark:bg-rose-900/30 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      className="bg-rose-500 h-full rounded-full"
                      initial={{ width: '100%' }}
                      animate={{ width: `${Math.max(0, (remainingSeconds / (cooldownState?.remainingSeconds || 120)) * 100)}%` }}
                      transition={{ duration: 1, ease: 'linear' }}
                    />
                  </div>
                  {cooldownState?.providerMessage && (
                    <p className="mt-2 text-xs text-rose-600/70 dark:text-rose-400/60">
                      Provider: {cooldownState.providerMessage}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-rose-600/70 dark:text-rose-400/60">
                    The scan button is disabled during cooldown to prevent repeated 429 failures.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Error State */}
      {scanError && !isLoading && (
        <ModuleErrorState
          error={scanError}
          onRetry={() => scanMutation.mutate()}
          isRetrying={isLoading}
          isRateLimitCooldown={isCooldownActive && scanError.category === 'rate_limit'}
          cooldownRemainingSeconds={isCooldownActive && scanError.category === 'rate_limit' ? remainingSeconds : undefined}
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
            {isLoading && (
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

            {!isLoading && scanResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-sm">No scan results yet. Configure and run a scan above.</p>
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
              {!isLoading && scanResults.length > 0 && (
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
