'use client'

import { useLayoutEffect } from 'react'
import { useTheme } from 'next-themes'
import {
  Crosshair,
  Sun,
  Moon,
  LayoutDashboard,
  Search,
  Target,
  Lightbulb,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore, type TabId } from '@/lib/store'
import { DashboardOverview } from '@/components/dashboard-overview'
import { ScannerPanel } from '@/components/scanner-panel'
import { GapAnalysisPanel } from '@/components/gap-analysis-panel'
import { OpportunitiesPanel } from '@/components/opportunities-panel'
import { TrendsComparePanel } from '@/components/trends-compare-panel'

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'scanner', label: 'Scanner', icon: Search },
  { id: 'analysis', label: 'Gap Analysis', icon: Target },
  { id: 'opportunities', label: 'Opportunities', icon: Lightbulb },
  { id: 'trends', label: 'Trends & Compare', icon: TrendingUp },
]

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="h-9 w-9"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

function TabButton({
  tab,
  isActive,
  onClick,
}: {
  tab: (typeof TABS)[number]
  isActive: boolean
  onClick: () => void
}) {
  const Icon = tab.icon
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
        isActive
          ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 shadow-sm'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{tab.label}</span>
    </button>
  )
}

function TabContent({ activeTab }: { activeTab: TabId }) {
  // No AnimatePresence/motion — just render the active tab directly
  // This avoids opacity:0 on SSR that causes blank preview
  return (
    <div className="animate-fade-in">
      {activeTab === 'dashboard' && <DashboardOverview />}
      {activeTab === 'scanner' && <ScannerPanel />}
      {activeTab === 'analysis' && <GapAnalysisPanel />}
      {activeTab === 'opportunities' && <OpportunitiesPanel />}
      {activeTab === 'trends' && <TrendsComparePanel />}
    </div>
  )
}

export function GapScopeApp() {
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)

  // Signal to CSS that the app has hydrated — hides the SSR loading skeleton
  useLayoutEffect(() => {
    document.documentElement.classList.add('app-ready')
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-orange-600 text-white">
                <Crosshair className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold leading-tight">GapScope</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Startup Opportunity Intelligence
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="sticky top-14 sm:top-16 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 py-2 overflow-x-auto">
            {TABS.map((tab) => (
              <TabButton
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <TabContent activeTab={activeTab} />
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>GapScope — Startup Opportunity Intelligence</span>
            <span>Discover overlooked opportunities using real launch data</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
