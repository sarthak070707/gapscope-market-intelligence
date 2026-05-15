'use client'

import { useRef, useMemo, useCallback } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { GapScopeApp } from '@/components/gap-finder-app'

function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      }),
    []
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          {children}
          <Toaster richColors position="bottom-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

/**
 * Hydration-safe wrapper: uses a ref to track hydration state.
 * Shows a CSS-only loading skeleton until the client-side app renders.
 * The skeleton is always present in SSR HTML, then hidden via a
 * CSS class added by the GapScopeApp after it mounts.
 */
function HydrationSafeApp() {
  // The #ssr-loading div is always rendered. GapScopeApp will hide it
  // on mount by adding the 'app-loaded' class to the body.
  return (
    <>
      {/* CSS-only loading skeleton — visible immediately in SSR, hidden after hydration */}
      <div id="ssr-loading">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 mb-6 px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="22" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="2" y2="12" /><line x1="12" y1="6" x2="12" y2="2" /><line x1="12" y1="22" x2="12" y2="18" />
            </svg>
          </div>
          <div>
            <div className="text-xl font-bold">GapScope</div>
            <div className="text-xs text-muted-foreground">Startup Opportunity Intelligence</div>
          </div>
        </div>

        {/* Nav skeleton */}
        <div className="flex gap-1 mb-6 px-4 sm:px-6 lg:px-8">
          {['Dashboard', 'Scanner', 'Gap Analysis', 'Opportunities', 'Trends'].map((tab) => (
            <div
              key={tab}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                tab === 'Dashboard'
                  ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400'
                  : 'text-muted-foreground'
              }`}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* Stat cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 px-4 sm:px-6 lg:px-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border bg-card p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-muted animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <div className="h-8 w-8 border-3 border-muted border-t-orange-600 rounded-full animate-spin" />
          <p className="mt-4 text-sm">Loading GapScope...</p>
        </div>
      </div>

      {/* Actual app — will be shown after hydration via CSS */}
      <div id="app-root" className="app-hidden">
        <GapScopeApp />
      </div>
    </>
  )
}

export default function Home() {
  return (
    <Providers>
      <HydrationSafeApp />
    </Providers>
  )
}
