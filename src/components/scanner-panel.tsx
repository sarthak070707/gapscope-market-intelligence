'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, ExternalLink, ChevronUp, ChevronDown, Clock, ShieldAlert, Timer, Database, Brain, Globe, RefreshCw } from 'lucide-react'
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

// ─── Stage labels for progress display (with new fallback stages) ────
const STAGE_LABELS: Record<string, string> = {
  INITIALIZING: 'Initializing scan...',
  DB_CHECK: 'Checking existing products...',
  CACHE_CHECK: 'Checking search cache...',
  WEB_SEARCH: 'Searching Product Hunt...',
  READ_PAGES: 'Reading Product Hunt pages...',
  LLM_EXTRACT: 'AI extracting product data...',
  LLM_KNOWLEDGE_FALLBACK: 'Generating from AI knowledge (rate limit fallback)...',
  SAVE_PRODUCTS: 'Saving products to database...',
  COMPLETED: 'Scan complete!',
}

// ─── Data source badge config ────────────────────────────────────────
const DATA_SOURCE_CONFIG: Record<string, { label: string; icon: React.ReactNode; badgeClass: string }> = {
  web_search: {
    label: 'Live',
    icon: <Globe className="h-2.5 w-2.5" />,
    badgeClass: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/60',
  },
  cached: {
    label: 'Cached',
    icon: <Database className="h-2.5 w-2.5" />,
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/60',
  },
  database: {
    label: 'Database',
    icon: <Database className="h-2.5 w-2.5" />,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60',
  },
  ai_knowledge: {
    label: 'AI Knowledge',
    icon: <Brain className="h-2.5 w-2.5" />,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60',
  },
  seed: {
    label: 'Sample',
    icon: <Database className="h-2.5 w-2.5" />,
    badgeClass: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700/60',
  },
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
  const [isLoadingExisting, setIsLoadingExisting] = useState(false)

  const [scanError, setScanError] = useState<ModuleError | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  // Ref to track whether scanError was already set in mutationFn.
  const scanErrorSetRef = useRef(false)

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

  // ─── Load existing products from DB when category changes ───
  useEffect(() => {
    async function loadExisting() {
      if (scanResults.length > 0 || isScanning || isPolling) return

      setIsLoadingExisting(true)
      try {
        const res = await fetch(`/api/scan?category=${encodeURIComponent(effectiveCategory)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.products?.length > 0) {
            setScanResults(data.products)
          }
        }
      } catch {
        // Silently fail — not critical
      } finally {
        setIsLoadingExisting(false)
      }
    }

    loadExisting()
  }, [effectiveCategory, scanResults.length, isScanning, isPolling, setScanResults])

  const scanMutation = useMutation({
    mutationFn: async ({ forceRefresh = false }: { forceRefresh?: boolean } = {}) => {
      setScanError(null)
      scanErrorSetRef.current = false
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
        scanErrorSetRef.current = true
        setIsScanning(false)
        throw new Error(blockedError.message)
      }

      // Step 1: Start the scan job (returns immediately with jobId)
      // NOTE: By default (forceRefresh=false), the backend uses its multi-layer
      // fallback: DB → Cache → Web Search → LLM Knowledge. This avoids hitting
      // the rate-limited search API when DB data is available.
      // The "Refresh" button sends forceRefresh=true to bypass cached data.
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: selectedCategory, period, forceRefresh }),
      })

      if (!res.ok) {
        const moduleError = await handleFetchError(res, {
          moduleName: 'Product Hunt Scanner',
          endpoint: '/api/scan',
          category: selectedCategory,
          payload: `category=${selectedCategory}, period=${period}`,
        })

        if (moduleError.category === 'rate_limit' && moduleError.retryAfterSeconds) {
          enterCooldown(moduleError)
        }

        setScanError(moduleError)
        scanErrorSetRef.current = true
        throw new Error(moduleError.message)
      }

      const jobData = await res.json()

      // If the response already contains products (synchronous DB fallback), return them directly
      if (jobData.products && Array.isArray(jobData.products) && jobData.status === 'completed') {
        return jobData.products as ScannedProduct[]
      }

      // If the response is an array (backward compat), return directly
      if (Array.isArray(jobData)) {
        return jobData as ScannedProduct[]
      }

      // Step 2: Poll for results using the job ID
      if (jobData.jobId) {
        const result = await startPolling(jobData.jobId)

        // Check if the result is an error
        if ('category' in result && 'message' in result && !('name' in result)) {
          const moduleError = result as ModuleError
          setScanError(moduleError)
          scanErrorSetRef.current = true

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

      // Show data source in toast
      const sources = new Set(data.map(p => p.dataSource).filter(Boolean))
      const sourceLabel = sources.size > 0
        ? sources.has('web_search') ? 'from live search'
          : sources.has('cached') ? 'from cache'
          : sources.has('ai_knowledge') ? 'from AI knowledge'
          : sources.has('database') ? 'from database'
          : sources.has('seed') ? 'sample data'
          : ''
        : ''
      toast.success(`Scan complete! Found ${data.length} products${sourceLabel ? ` ${sourceLabel}` : ''}.`)
    },
    onError: (err) => {
      setIsScanning(false)
      if (!scanErrorSetRef.current) {
        const classifiedError = classifyError(err, 'Product Hunt Scanner', '/api/scan', {
          category: selectedCategory,
          payload: `category=${selectedCategory}, period=${period}`,
        })

        if (classifiedError.category === 'rate_limit') {
          enterCooldown(classifiedError)
        }

        setScanError(classifiedError)
      }

      // Even on error, try to load existing products so preview isn't blank
      if (scanResults.length === 0) {
        fetch(`/api/scan?category=${encodeURIComponent(effectiveCategory)}`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data?.products?.length > 0) {
              setScanResults(data.products)
            }
          })
          .catch(() => {/* silently fail */})
      }

      toast.error('Scan failed. Showing cached data if available.')
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
    const stages = ['INITIALIZING', 'DB_CHECK', 'CACHE_CHECK', 'WEB_SEARCH', 'READ_PAGES', 'LLM_EXTRACT', 'LLM_KNOWLEDGE_FALLBACK', 'SAVE_PRODUCTS', 'COMPLETED']
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
                      scanMutation.mutate({ forceRefresh: false })
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

              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => scanMutation.mutate({ forceRefresh: false })}
                  disabled={isLoading || isCooldownActive}
                  className="flex-1 sm:flex-none bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Scanning...</>
                  ) : isCooldownActive ? (
                    <><Timer className="h-4 w-4" />Cooldown ({formatCooldownTime(remainingSeconds)})</>
                  ) : (
                    <><Search className="h-4 w-4" />Scan</>
                  )}
                </Button>
                <Button
                  onClick={() => scanMutation.mutate({ forceRefresh: true })}
                  disabled={isLoading || isCooldownActive}
                  variant="outline"
                  className="flex-1 sm:flex-none border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950/30 disabled:opacity-50"
                  title="Force refresh from Product Hunt (bypasses cached data)"
                >
                  {isLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /></>
                  ) : (
                    <><RefreshCw className="h-4 w-4" />Refresh</>
                  )}
                </Button>
              </div>
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
                    {currentStage === 'LLM_KNOWLEDGE_FALLBACK'
                      ? 'Search API is rate-limited — using AI knowledge as fallback'
                      : currentStage === 'DB_CHECK'
                      ? 'Checking if we already have products for this category'
                      : currentStage === 'CACHE_CHECK'
                      ? 'Looking for cached search results'
                      : 'This may take 60-120 seconds. The scan runs in the background — no gateway timeout!'}
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    currentStage === 'LLM_KNOWLEDGE_FALLBACK'
                      ? 'bg-purple-500'
                      : 'bg-orange-500'
                  }`}
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
                    The scanner can still return results from the database or AI knowledge during cooldown.
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
          onRetry={() => scanMutation.mutate({ forceRefresh: false })}
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
                    ? `${scanResults.length} products found ${(() => {
                        const sources = new Set(scanResults.map(p => p.dataSource).filter(Boolean))
                        if (sources.has('web_search')) return '(live search)'
                        if (sources.has('cached')) return '(cached)'
                        if (sources.has('ai_knowledge')) return '(AI knowledge)'
                        if (sources.has('database') || sources.has('seed')) return '(database)'
                        return ''
                      })()}`
                    : isLoadingExisting
                    ? 'Loading existing products...'
                    : 'Run a scan to see results'}
                </CardDescription>
              </div>
              {scanResults.length > 0 && (
                <div className="flex items-center gap-2">
                  {/* Data source summary */}
                  {(() => {
                    const sources = new Set(scanResults.map(p => p.dataSource).filter(Boolean))
                    if (sources.size > 0) {
                      return (
                        <div className="hidden sm:flex items-center gap-1">
                          {Array.from(sources).map(source => {
                            const config = DATA_SOURCE_CONFIG[source || 'web_search']
                            return config ? (
                              <Badge key={source} variant="outline" className={`text-[10px] ${config.badgeClass}`}>
                                {config.icon} {config.label}
                              </Badge>
                            ) : null
                          })}
                        </div>
                      )
                    }
                    return null
                  })()}
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400">
                    {scanResults.length} products
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {(isLoading || isLoadingExisting) && (
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

            {!isLoading && !isLoadingExisting && scanResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-sm">No scan results yet. Configure and run a scan above.</p>
                <p className="text-xs mt-1 text-muted-foreground/60">Sample data will auto-populate on first scan.</p>
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
              {!isLoading && !isLoadingExisting && scanResults.length > 0 && (
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
                        <TableHead className="hidden xl:table-cell">Source</TableHead>
                        <TableHead className="hidden xl:table-cell">Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedResults.map((product, i) => {
                        const sourceConfig = DATA_SOURCE_CONFIG[product.dataSource || 'web_search']
                        return (
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
                              <div className="flex items-center gap-1 flex-wrap">
                                <Badge variant="outline" className="text-xs">{product.category}</Badge>
                                {product.dataSource && product.dataSource !== 'web_search' && sourceConfig && (
                                  <Badge variant="outline" className={`text-[10px] ${sourceConfig.badgeClass}`}>
                                    {sourceConfig.icon} {sourceConfig.label}
                                  </Badge>
                                )}
                              </div>
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
                              {sourceConfig ? (
                                <Badge variant="outline" className={`text-[10px] ${sourceConfig.badgeClass}`}>
                                  {sourceConfig.icon} {sourceConfig.label}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
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
                        )
                      })}
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
