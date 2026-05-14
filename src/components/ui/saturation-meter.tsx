'use client'

import { motion } from 'framer-motion'

interface SaturationMeterProps {
  score: number
  label?: string
  showLevel?: boolean
  size?: 'sm' | 'md'
}

function getColor(score: number) {
  if (score >= 75) return 'bg-red-500'
  if (score >= 50) return 'bg-amber-500'
  if (score >= 25) return 'bg-yellow-500'
  return 'bg-green-500'
}

function getBgColor(score: number) {
  if (score >= 75) return 'bg-red-100 dark:bg-red-950/30'
  if (score >= 50) return 'bg-amber-100 dark:bg-amber-950/30'
  if (score >= 25) return 'bg-yellow-100 dark:bg-yellow-950/30'
  return 'bg-green-100 dark:bg-green-950/30'
}

function getLevel(score: number) {
  if (score >= 75) return 'High'
  if (score >= 50) return 'Medium'
  if (score >= 25) return 'Moderate'
  return 'Low'
}

export function SaturationMeter({
  score,
  label,
  showLevel = true,
  size = 'md',
}: SaturationMeterProps) {
  const barHeight = size === 'sm' ? 'h-2' : 'h-3'
  const textSize = size === 'sm' ? 'text-xs' : 'text-xs'
  const spacing = size === 'sm' ? 'space-y-1.5' : 'space-y-2'

  return (
    <div className={spacing}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label || 'Competition Level'}</span>
        {showLevel && (
          <span className={size === 'md' ? 'font-semibold' : 'font-medium'}>
            {score}% — {getLevel(score)}
          </span>
        )}
        {!showLevel && (
          <span className={size === 'md' ? 'font-semibold' : 'font-medium'}>
            {score}%
          </span>
        )}
      </div>
      <div className={`${barHeight} rounded-full ${getBgColor(score)} overflow-hidden`}>
        <motion.div
          className={`h-full rounded-full ${getColor(score)}`}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}
