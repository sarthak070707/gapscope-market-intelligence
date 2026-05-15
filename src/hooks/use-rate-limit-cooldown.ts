'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ModuleError } from '@/lib/error-handler'

// ─── Rate-Limit Cooldown State ──────────────────────────────────
// Tracks cooldown state by key (category:period:endpoint).
// When a rate_limit error is received with retryAfterSeconds,
// we store the cooldown expiry timestamp and prevent retries.

interface CooldownState {
  /** Timestamp (ms) when the cooldown expires */
  expiresAt: number
  /** Seconds remaining (updated every second) */
  remainingSeconds: number
  /** The original provider message from the rate-limited API */
  providerMessage: string
  /** How many times this key has been rate-limited (escalation count) */
  escalationCount: number
  /** The stage where the 429 occurred */
  stage: string
}

// Global store shared across hook instances
const cooldownStore = new Map<string, CooldownState>()

/**
 * Build a cooldown key from category, period, and endpoint.
 * Must match the backend's key format.
 */
function buildKey(category: string, period: string): string {
  return `${category}:${period}:/api/scan`
}

/**
 * Hook to manage rate-limit cooldown state for a specific scan configuration.
 *
 * Returns:
 * - isCooldownActive: whether a cooldown is currently active
 * - remainingSeconds: seconds until the cooldown expires (updates every second)
 * - cooldownState: the full cooldown state (providerMessage, escalationCount, etc.)
 * - enterCooldown: function to enter a cooldown from a ModuleError
 * - clearCooldown: function to clear the cooldown (e.g., when cooldown expires)
 */
export function useRateLimitCooldown(category: string, period: string) {
  const key = buildKey(category, period)
  const [isCooldownActive, setIsCooldownActive] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [cooldownState, setCooldownState] = useState<CooldownState | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Tick every second to update remainingSeconds
  useEffect(() => {
    const tick = () => {
      const state = cooldownStore.get(key)
      if (!state) {
        setIsCooldownActive(false)
        setRemainingSeconds(0)
        setCooldownState(null)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        return
      }

      const now = Date.now()
      const remaining = Math.max(0, Math.ceil((state.expiresAt - now) / 1000))

      if (remaining <= 0) {
        // Cooldown expired
        cooldownStore.delete(key)
        setIsCooldownActive(false)
        setRemainingSeconds(0)
        setCooldownState(null)
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
        return
      }

      setIsCooldownActive(true)
      setRemainingSeconds(remaining)
      setCooldownState(state)
    }

    // Initial tick
    tick()

    // Set up interval only if there's an active cooldown
    const state = cooldownStore.get(key)
    if (state && state.expiresAt > Date.now()) {
      if (!intervalRef.current) {
        intervalRef.current = setInterval(tick, 1000)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [key])

  // Listen for store changes (when enterCooldown is called from another render)
  const enterCooldown = useCallback((error: ModuleError) => {
    if (error.category !== 'rate_limit' || !error.retryAfterSeconds) return

    const seconds = error.retryAfterSeconds
    const state: CooldownState = {
      expiresAt: Date.now() + seconds * 1000,
      remainingSeconds: seconds,
      providerMessage: error.providerMessage || error.backendMessage || '',
      escalationCount: (error as any).escalationCount || 1,
      stage: error.stage || 'UNKNOWN',
    }

    cooldownStore.set(key, state)
    setIsCooldownActive(true)
    setRemainingSeconds(seconds)
    setCooldownState(state)

    // Start interval if not already running
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        const current = cooldownStore.get(key)
        if (!current) {
          setIsCooldownActive(false)
          setRemainingSeconds(0)
          setCooldownState(null)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          return
        }

        const now = Date.now()
        const remaining = Math.max(0, Math.ceil((current.expiresAt - now) / 1000))

        if (remaining <= 0) {
          cooldownStore.delete(key)
          setIsCooldownActive(false)
          setRemainingSeconds(0)
          setCooldownState(null)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
        } else {
          setRemainingSeconds(remaining)
        }
      }, 1000)
    }
  }, [key])

  const clearCooldown = useCallback(() => {
    cooldownStore.delete(key)
    setIsCooldownActive(false)
    setRemainingSeconds(0)
    setCooldownState(null)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [key])

  return {
    isCooldownActive,
    remainingSeconds,
    cooldownState,
    enterCooldown,
    clearCooldown,
  }
}

/**
 * Format remaining seconds into a human-readable string.
 * E.g., "2m 30s" or "45s"
 */
export function formatCooldownTime(seconds: number): string {
  if (seconds <= 0) return '0s'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }
  return `${secs}s`
}
