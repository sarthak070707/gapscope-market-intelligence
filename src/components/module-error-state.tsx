'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Clock,
  ChevronDown,
  Bug,
  Server,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { ModuleError, ErrorCategory } from '@/lib/error-handler'

// ─── Props ──────────────────────────────────────────────────────────

interface ModuleErrorStateProps {
  error: ModuleError
  onRetry?: () => void
  isRetrying?: boolean
  compact?: boolean
}

// ─── Category Config ────────────────────────────────────────────────

interface CategoryConfig {
  label: string
  badgeClass: string
  iconColor: string
  bgTint: string
}

const CATEGORY_CONFIG: Record<ErrorCategory, CategoryConfig> = {
  api: {
    label: 'API Error',
    badgeClass:
      'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/60',
    iconColor: 'text-red-500 dark:text-red-400',
    bgTint: 'bg-red-50/50 dark:bg-red-950/10',
  },
  timeout: {
    label: 'Timeout',
    badgeClass:
      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/60',
    iconColor: 'text-amber-500 dark:text-amber-400',
    bgTint: 'bg-amber-50/50 dark:bg-amber-950/10',
  },
  ai_response: {
    label: 'AI Response',
    badgeClass:
      'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/60',
    iconColor: 'text-purple-500 dark:text-purple-400',
    bgTint: 'bg-purple-50/50 dark:bg-purple-950/10',
  },
  database: {
    label: 'Database',
    badgeClass:
      'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/60',
    iconColor: 'text-orange-500 dark:text-orange-400',
    bgTint: 'bg-orange-50/50 dark:bg-orange-950/10',
  },
  parsing: {
    label: 'Parsing',
    badgeClass:
      'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/60',
    iconColor: 'text-sky-500 dark:text-sky-400',
    bgTint: 'bg-sky-50/50 dark:bg-sky-950/10',
  },
  validation: {
    label: 'Validation',
    badgeClass:
      'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/60',
    iconColor: 'text-red-500 dark:text-red-400',
    bgTint: 'bg-red-50/50 dark:bg-red-950/10',
  },
  unknown: {
    label: 'Unknown',
    badgeClass:
      'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700/60',
    iconColor: 'text-gray-500 dark:text-gray-400',
    bgTint: 'bg-gray-50/50 dark:bg-gray-900/10',
  },
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)

    // Show relative time for recent errors
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`

    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}h ago`

    // Otherwise show formatted date
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function formatFullTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

// ─── Component ──────────────────────────────────────────────────────

export function ModuleErrorState({
  error,
  onRetry,
  isRetrying = false,
  compact = false,
}: ModuleErrorStateProps) {
  const [debugOpen, setDebugOpen] = useState(false)

  const config = CATEGORY_CONFIG[error.category] ?? CATEGORY_CONFIG.unknown
  const Icon = error.category === 'timeout' ? AlertCircle : AlertTriangle

  // ── Compact mode ────────────────────────────────────────────────
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card className={cn('border-dashed', config.bgTint)}>
          <CardContent className="flex items-center gap-2.5 p-3 sm:p-4">
            <Icon className={cn('h-4 w-4 shrink-0', config.iconColor)} />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {error.module} Failed
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {error.message}
              </p>
            </div>

            <Badge
              variant="outline"
              className={cn('shrink-0 text-[10px]', config.badgeClass)}
            >
              {config.label}
            </Badge>

            {error.retryable && onRetry && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={onRetry}
                disabled={isRetrying}
                aria-label="Retry"
              >
                <RefreshCw
                  className={cn(
                    'h-3.5 w-3.5',
                    isRetrying && 'animate-spin'
                  )}
                />
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // ── Full mode ───────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Card className={cn('border-dashed', config.bgTint)}>
        <CardContent className="p-4 sm:p-6">
          {/* Header: icon + title + badge */}
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                config.bgTint
              )}
            >
              <Icon className={cn('h-5 w-5', config.iconColor)} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {error.module} Failed
                </h3>
                <Badge
                  variant="outline"
                  className={cn('text-[10px]', config.badgeClass)}
                >
                  {config.label}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {error.message}
              </p>
            </div>
          </div>

          {/* Error detail */}
          {error.detail && (
            <div className="mt-3 rounded-md bg-background/60 px-3 py-2">
              <p className="text-xs text-muted-foreground">{error.detail}</p>
            </div>
          )}

          {/* Possible reason */}
          {error.possibleReason && (
            <div className="mt-3 flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <span className="font-medium">Possible reason: </span>
                {error.possibleReason}
              </p>
            </div>
          )}

          <Separator className="my-3" />

          {/* Footer row: timestamp + retry */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span title={formatFullTimestamp(error.timestamp)}>
                {formatTimestamp(error.timestamp)}
              </span>
            </div>

            {error.retryable && onRetry && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={onRetry}
                disabled={isRetrying}
              >
                <RefreshCw
                  className={cn(
                    'h-3.5 w-3.5',
                    isRetrying && 'animate-spin'
                  )}
                />
                {isRetrying ? 'Retrying…' : 'Retry'}
              </Button>
            )}
          </div>

          {/* Debug info (collapsible) */}
          {(error.endpoint || error.statusCode || error.detail || error.requestCategory || error.requestPayload || error.backendMessage) && (
            <Collapsible open={debugOpen} onOpenChange={setDebugOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Bug className="h-3 w-3" />
                  Debug Info
                  <ChevronDown
                    className={cn(
                      'h-3 w-3 transition-transform duration-200',
                      debugOpen && 'rotate-180'
                    )}
                  />
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="mt-2 rounded-md border bg-background/80 p-3 font-mono text-[11px] leading-relaxed text-muted-foreground"
                >
                  <div className="space-y-1.5">
                    {error.endpoint && (
                      <div className="flex items-center gap-2">
                        <Server className="h-3 w-3 shrink-0" />
                        <span className="text-foreground/70">Endpoint:</span>{' '}
                        <span className="break-all">{error.endpoint}</span>
                      </div>
                    )}
                    {error.statusCode != null && (
                      <div>
                        <span className="text-foreground/70">Status:</span>{' '}
                        <span
                          className={cn(
                            error.statusCode >= 500
                              ? 'text-red-500'
                              : error.statusCode >= 400
                                ? 'text-amber-500'
                                : 'text-foreground'
                          )}
                        >
                          {error.statusCode}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-foreground/70">Error Type:</span>{' '}
                      {error.category}
                    </div>
                    {error.requestCategory && (
                      <div>
                        <span className="text-foreground/70">Sent Category:</span>{' '}
                        <span className={error.requestCategory === 'unknown' || error.requestCategory === 'undefined' ? 'text-red-500 font-semibold' : 'text-foreground'}>
                          {error.requestCategory}
                        </span>
                      </div>
                    )}
                    {error.requestPayload && (
                      <div>
                        <span className="text-foreground/70">Request Payload:</span>{' '}
                        <span className="break-all">{error.requestPayload}</span>
                      </div>
                    )}
                    {error.backendMessage && (
                      <div>
                        <span className="text-foreground/70">Backend Message:</span>{' '}
                        <span className="break-all text-orange-600 dark:text-orange-400">{error.backendMessage}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-foreground/70">Timestamp:</span>{' '}
                      {formatFullTimestamp(error.timestamp)}
                    </div>
                    {error.detail && (
                      <div>
                        <span className="text-foreground/70">Detail:</span>{' '}
                        <span className="break-all">{error.detail}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
