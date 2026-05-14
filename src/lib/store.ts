'use client'

import { create } from 'zustand'
import type { Category, TimePeriod, ScannedProduct, GapAnalysis, MarketSaturation, OpportunitySuggestion, TrendData, CompetitorComparison, ComplaintCluster } from '@/types'

export type TabId = 'dashboard' | 'scanner' | 'analysis' | 'opportunities' | 'trends'

interface AppState {
  // Navigation
  activeTab: TabId
  setActiveTab: (tab: TabId) => void

  // Category filter
  selectedCategory: Category | 'all'
  setSelectedCategory: (category: Category | 'all') => void

  // Time period filter (PRIORITY 11)
  timePeriod: TimePeriod
  setTimePeriod: (period: TimePeriod) => void

  // Scanner
  scanResults: ScannedProduct[]
  setScanResults: (results: ScannedProduct[]) => void

  // Analysis
  analysisResults: GapAnalysis[]
  setAnalysisResults: (results: GapAnalysis[]) => void
  saturationResults: MarketSaturation[]
  setSaturationResults: (results: MarketSaturation[]) => void
  complaintClusters: ComplaintCluster[]
  setComplaintClusters: (clusters: ComplaintCluster[]) => void

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

  // Time period
  timePeriod: '30d',
  setTimePeriod: (period) => set({ timePeriod: period }),

  // Scanner
  scanResults: [],
  setScanResults: (results) => set({ scanResults: results }),

  // Analysis
  analysisResults: [],
  setAnalysisResults: (results) => set({ analysisResults: results }),
  saturationResults: [],
  setSaturationResults: (results) => set({ saturationResults: results }),
  complaintClusters: [],
  setComplaintClusters: (clusters) => set({ complaintClusters: clusters }),

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
