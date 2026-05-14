'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── DashboardSection ─────────────────────────────────────────────

interface DashboardSectionProps {
  icon?: React.ElementType
  iconColor?: string
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}

/**
 * A wrapper for each dashboard section card.
 *
 * - Uses `mb-0` because the parent layout uses `space-y-*` for spacing.
 * - Proper padding and containment — no children escape the parent container.
 * - Normal document flow (NO absolute positioning, NO negative margins).
 * - Card has `overflow-visible` by default so expanded/collapsible content
 *   is never clipped.
 */
export function DashboardSection({
  icon: Icon,
  iconColor = 'text-orange-600 dark:text-orange-400',
  title,
  description,
  children,
  className,
  action,
}: DashboardSectionProps) {
  return (
    <Card className={cn('mb-0 overflow-visible', className)}>
      <CardHeader>
        <div className="flex items-center gap-2">
          {Icon && <Icon className={cn('h-5 w-5 shrink-0', iconColor)} />}
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        {description && <CardDescription>{description}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="overflow-visible">{children}</CardContent>
    </Card>
  )
}

// ─── ScrollableContent ────────────────────────────────────────────

interface ScrollableContentProps {
  children: React.ReactNode
  maxHeight?: number
  scrollX?: boolean
  className?: string
}

/**
 * A scrollable container for expanded detail content.
 *
 * - `max-height` defaults to 320px.
 * - `overflow-y: auto` for vertical scrolling (always).
 * - `overflow-x: auto` only when `scrollX` prop is true.
 * - Uses `custom-scrollbar` class for styled scrollbar.
 * - `overscroll-behavior: contain` to prevent scroll chaining.
 * - NEVER uses `overflow-hidden` — always `overflow-auto`.
 * - Subtle padding for breathing room.
 */
export function ScrollableContent({
  children,
  maxHeight = 320,
  scrollX = false,
  className,
}: ScrollableContentProps) {
  return (
    <div
      className={cn('custom-scrollbar p-2', className)}
      style={{
        maxHeight,
        overflowY: 'auto',
        overflowX: scrollX ? 'auto' : 'clip',
        overscrollBehavior: 'contain',
      }}
    >
      {children}
    </div>
  )
}

// ─── CollapsibleCard ──────────────────────────────────────────────

interface CollapsibleCardProps {
  isExpanded: boolean
  onToggle: () => void
  summary: React.ReactNode
  details: React.ReactNode
  className?: string
  toggleLabel?: string
  collapseLabel?: string
}

/**
 * A card within a section that can expand/collapse.
 *
 * - Collapsed by default — shows only summary/preview content.
 * - When expanded, reveals detail content inside a `ScrollableContent`.
 * - Only ONE card expanded per section at a time (the parent controls this
 *   via `isExpanded` / `onToggle`).
 * - Uses a simple CSS-based animation (opacity + small translateY).
 *   Does NOT animate height, so there is NO need for `overflow-hidden`.
 * - Expanded content pushes subsequent content downward naturally because
 *   it stays in normal document flow.
 */
export function CollapsibleCard({
  isExpanded,
  onToggle,
  summary,
  details,
  className,
  toggleLabel = 'Show Details',
  collapseLabel = 'Show Less',
}: CollapsibleCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* Summary — always visible */}
      <div className="p-3 sm:p-4">{summary}</div>

      {/* Expand / Collapse toggle */}
      <div className="px-3 pb-2 sm:px-4 sm:pb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              isExpanded && 'rotate-180'
            )}
          />
          {isExpanded ? collapseLabel : toggleLabel}
        </Button>
      </div>

      {/* Detail content — fade + slide animation, NO height animation */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-3 pb-3 sm:px-4 sm:pb-4">
              <ScrollableContent>{details}</ScrollableContent>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
