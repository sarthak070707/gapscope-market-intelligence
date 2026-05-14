'use client'

import { create } from 'zustand'
import type { Category, ScannedProduct, GapAnalysis, MarketSaturation, OpportunitySuggestion, TrendData, CompetitorComparison } from '@/types'

export type TabId = 'dashboard' | 'scanner' | 'analysis' | 'opportunities' | 'trends'

interface AppState {
  // Navigation
  activeTab: TabId
  setActiveTab: (tab: TabId) => void

  // Category filter
  selectedCategory: Category | 'all'
  setSelectedCategory: (category: Category | 'all') => void

  // Scanner
  scanResults: ScannedProduct[]
  setScanResults: (results: ScannedProduct[]) => void

  // Analysis
  analysisResults: GapAnalysis[]
  setAnalysisResults: (results: GapAnalysis[]) => void
  saturationResults: MarketSaturation[]
  setSaturationResults: (results: MarketSaturation[]) => void

  // Opportunities
  opportunities: OpportunitySuggestion[]
  setOpportunities: (opportunities: OpportunitySuggestion[]) => void
  savedOpportunities: OpportunitySuggestion[]
  saveOpportunity: (opp: OpportunitySuggestion) => void
  removeSavedOpportunity: (title: string) => void

  // Trends
  trendResults: TrendData[]
  setTrendResults: (results: TrendData[]) => void
  comparisonResults: CompetitorComparison | null
  setComparisonResults: (results: CompetitorComparison | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  activeTab: 'dashboard',
  setActiveTab: (tab) => set({ activeTab: tab }),

  // Category
  selectedCategory: 'all',
  setSelectedCategory: (category) => set({ selectedCategory: category }),

  // Scanner
  scanResults: [],
  setScanResults: (results) => set({ scanResults: results }),

  // Analysis
  analysisResults: [],
  setAnalysisResults: (results) => set({ analysisResults: results }),
  saturationResults: [],
  setSaturationResults: (results) => set({ saturationResults: results }),

  // Opportunities
  opportunities: [],
  setOpportunities: (opportunities) => set({ opportunities }),
  savedOpportunities: [],
  saveOpportunity: (opp) =>
    set((state) => {
      if (state.savedOpportunities.find((s) => s.title === opp.title)) {
        return state
      }
      return { savedOpportunities: [...state.savedOpportunities, opp] }
    }),
  removeSavedOpportunity: (title) =>
    set((state) => ({
      savedOpportunities: state.savedOpportunities.filter((s) => s.title !== title),
    })),

  // Trends
  trendResults: [],
  setTrendResults: (results) => set({ trendResults: results }),
  comparisonResults: null,
  setComparisonResults: (results) => set({ comparisonResults: results }),
}))
