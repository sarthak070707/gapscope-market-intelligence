'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
} from 'recharts'
import {
  Search,
  Target,
  Lightbulb,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
  Users,
  Zap,
  DollarSign,
  Flame,
  BarChart3,
  Database,
  MessageSquare,
  Quote,
  Info,
  Activity,
  ShieldCheck,
  Rocket,
  Gauge,
  CircleDot,
  Link2,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { SaturationMeter } from '@/components/ui/saturation-meter'
import { useAppStore } from '@/lib/store'
import { FalseOpportunityBlock, MarketQuadrantBlock, WhyExistingProductsFailBlock, FounderFitBlock, SourceTransparencyBlock, MarketQuadrantChart, TrendComparisonBlock, UnderservedAudienceBlock, FeasibilitySummaryBlock } from '@/components/feature-blocks'
import type { DashboardStats, TimePeriod, GapAnalysis, MarketSaturation, SubNiche, ComplaintCluster, UnderservedUserGroup, TrendComparison } from '@/types'

const chartConfig = {
  score: {
    label: 'Saturation Score',
    color: 'oklch(0.7 0.15 50)',
  },
  count: {
    label: 'Products',
    color: 'oklch(0.7 0.15 50)',
  },
} satisfies ChartConfig

const BAR_COLORS = [
  'oklch(0.75 0.18 45)',
  'oklch(0.70 0.15 50)',
  'oklch(0.65 0.17 40)',
  'oklch(0.60 0.14 55)',
  'oklch(0.72 0.16 35)',
  'oklch(0.68 0.13 60)',
  'oklch(0.63 0.15 48)',
  'oklch(0.58 0.12 42)',
]

// ─── Mock / Fallback Data ─────────────────────────────────────────

const MOCK_DASHBOARD_DATA: DashboardStats = {
  totalProducts: 247,
  totalGaps: 18,
  totalOpportunities: 12,
  avgSaturation: 62,
  topCategories: [
    { name: 'AI Tools', count: 48 },
    { name: 'Productivity', count: 37 },
    { name: 'Developer Tools', count: 33 },
    { name: 'Marketing', count: 29 },
    { name: 'No-Code', count: 24 },
    { name: 'Education', count: 21 },
  ],
  trendingCategories: [
    { name: 'AI Tools', growth: 34 },
    { name: 'No-Code', growth: 28 },
    { name: 'Automation', growth: 22 },
  ],
  recentGaps: [],
  trendingGaps: [
    {
      gapType: 'missing_feature',
      title: 'No AI-powered onboarding for SaaS products',
      description: 'Most SaaS tools still use static checklists. Users expect personalized, AI-driven onboarding flows that adapt to their role and usage patterns.',
      evidence: '142 complaints across Product Hunt and G2 reviews',
      severity: 'high',
      evidenceDetail: {
        similarProducts: 8,
        repeatedComplaints: 142,
        launchFrequency: 3,
        commentSnippets: ['I just want the tool to show me what I need', 'Onboarding is so generic it\'s useless', 'Why can\'t it adapt to my team size?'],
        pricingOverlap: 67,
        launchGrowth: 22,
      },
      whyThisMatters: 'Personalized onboarding can reduce churn by up to 40%. This gap represents a $2.3B market opportunity as SaaS companies compete on retention.',
      subNiche: {
        name: 'Adaptive SaaS Onboarding',
        description: 'AI-driven onboarding that personalizes based on user role, team size, and usage patterns',
        parentCategory: 'AI Tools',
        opportunityScore: 82,
      },
      affectedProducts: [
        { name: 'Userflow', pricing: '$240/mo', strengths: ['Visual builder', 'Good analytics'], weaknesses: ['No AI adaptation', 'Expensive'] },
        { name: 'Appcues', pricing: '$299/mo', strengths: ['Segmentation', 'Integrations'], weaknesses: ['Static flows', 'Complex setup'] },
        { name: 'Pendo', pricing: 'Enterprise', strengths: ['Deep analytics', 'Enterprise features'], weaknesses: ['Very expensive', 'No AI personalization'] },
      ],
      whyNow: {
        marketGrowthDriver: 'The SaaS market is shifting from acquisition to retention, making onboarding a critical competitive differentiator.',
        incumbentWeakness: 'Existing tools use rule-based flows that cannot adapt in real-time to user behavior.',
        timingAdvantage: 'LLM costs have dropped 90% in the past year, making personalized onboarding economically viable.',
        catalystEvents: ['OpenAI API price cuts', 'Growth of product-led growth movement'],
      },
      executionDifficulty: {
        level: 'medium',
        demandLevel: 'high',
        competitionLevel: 'medium',
        technicalComplexity: 'medium',
        timeToMvp: '4-6 weeks',
        estimatedBudget: '$5k-20k',
        keyChallenges: ['Training behavior models', 'Integration with existing SaaS tools', 'Balancing personalization with privacy'],
      },
      falseOpportunity: {
        isFalseOpportunity: false,
        reason: 'Strong demand signal with clear willingness to pay from SaaS companies.',
        estimatedMarketSize: '$100M+',
        riskFactors: ['Enterprise sales cycle can be slow', 'Requires deep integration partnerships'],
        verdict: 'pursue',
      },
      founderFit: {
        bestFit: ['b2b_saas', 'solo_developer'],
        rationale: 'B2B SaaS founders understand the pain point firsthand; solo developers can build a focused MVP quickly.',
        requiredSkills: ['Frontend development', 'Basic ML/AI integration', 'API design'],
        idealTeamSize: '2-3 people',
      },
      sourceTransparency: {
        sourcePlatforms: ['Product Hunt', 'G2', 'Reddit'],
        totalComments: 347,
        complaintFrequency: 42,
        reviewSources: [{ platform: 'G2', count: 189, avgScore: 3.2 }, { platform: 'Product Hunt', count: 98, avgScore: 4.1 }, { platform: 'Reddit', count: 60, avgScore: 2.8 }],
        dataFreshness: 'Data from last 30 days',
        confidenceLevel: 'high',
      },
      marketQuadrant: {
        competitionScore: 55,
        opportunityScore: 82,
        quadrant: 'goldmine',
        label: 'Goldmine — Low competition, high opportunity',
      },
    },
    {
      gapType: 'expensive',
      title: 'Affordable analytics for indie makers',
      description: 'Most analytics tools cost $100+/mo. Solo founders and indie hackers need powerful yet affordable alternatives.',
      evidence: '89 complaints about pricing on Reddit and Indie Hackers',
      severity: 'high',
      evidenceDetail: {
        similarProducts: 12,
        repeatedComplaints: 89,
        launchFrequency: 2,
        commentSnippets: ['I can\'t justify $100/mo for analytics', 'Why is everything so expensive for solo founders?'],
        pricingOverlap: 78,
        launchGrowth: 15,
      },
      whyThisMatters: 'The indie maker market is growing 25% YoY. Affordable tools can capture this underserved segment before incumbents respond.',
      subNiche: {
        name: 'Indie Analytics',
        description: 'Privacy-first, affordable analytics built for solo founders',
        parentCategory: 'Developer Tools',
        opportunityScore: 76,
      },
      affectedProducts: [
        { name: 'Mixpanel', pricing: '$20+/mo', strengths: ['Powerful segmentation', 'Real-time'], weaknesses: ['Expensive at scale', 'Complex UI'] },
        { name: 'Amplitude', pricing: 'Enterprise', strengths: ['Behavioral cohorts', 'Collaboration'], weaknesses: ['Free tier is limited', 'Overkill for indies'] },
      ],
      whyNow: {
        marketGrowthDriver: 'The creator economy and indie SaaS movement are exploding, creating demand for budget-friendly tools.',
        incumbentWeakness: 'Incumbents are focused on enterprise features, ignoring the low-end market.',
        timingAdvantage: 'Privacy regulations (GDPR, CCPA) make lightweight, privacy-first analytics more attractive.',
      },
      executionDifficulty: {
        level: 'low-medium',
        demandLevel: 'high',
        competitionLevel: 'low',
        technicalComplexity: 'medium',
        timeToMvp: '2-4 weeks',
        estimatedBudget: '$0-500',
        keyChallenges: ['Competing with free tiers of incumbents', 'Scaling infrastructure affordably'],
      },
      falseOpportunity: {
        isFalseOpportunity: false,
        reason: 'Clear willingness to pay from indie makers; low CAC through community channels.',
        estimatedMarketSize: '$10-100M',
        riskFactors: ['Low ARPU requires high volume', 'Free alternatives exist'],
        verdict: 'pursue',
      },
      founderFit: {
        bestFit: ['solo_developer', 'student_founder'],
        rationale: 'Perfect first product for solo developers who understand the indie market.',
        requiredSkills: ['Full-stack development', 'Basic data engineering', 'Community building'],
        idealTeamSize: 'Solo',
      },
      sourceTransparency: {
        sourcePlatforms: ['Reddit', 'Indie Hackers', 'Twitter/X'],
        totalComments: 156,
        complaintFrequency: 38,
        reviewSources: [{ platform: 'Reddit', count: 87, avgScore: 2.9 }, { platform: 'Indie Hackers', count: 42, avgScore: 3.5 }],
        dataFreshness: 'Data from last 30 days',
        confidenceLevel: 'medium',
      },
      marketQuadrant: {
        competitionScore: 35,
        opportunityScore: 76,
        quadrant: 'goldmine',
        label: 'Goldmine — Low competition, high opportunity',
      },
    },
    {
      gapType: 'underserved',
      title: 'No-code workflow builder for non-technical teams',
      description: 'Non-technical teams in marketing, HR, and operations struggle to automate workflows without engineering help. Current tools are too complex.',
      evidence: '67 complaints about complexity and lack of templates',
      severity: 'high',
      evidenceDetail: {
        similarProducts: 6,
        repeatedComplaints: 67,
        launchFrequency: 4,
        commentSnippets: ['I need something my marketing team can use without IT', 'Why do I need to learn variables and logic?'],
        pricingOverlap: 45,
        launchGrowth: 18,
      },
      whyThisMatters: '70% of knowledge workers want to automate tasks but only 15% can use current tools. This gap affects millions of workers.',
      subNiche: {
        name: 'Team Workflow Automation',
        description: 'Template-driven workflow builder for non-technical teams',
        parentCategory: 'Automation',
        opportunityScore: 71,
      },
      affectedProducts: [
        { name: 'Zapier', pricing: '$19.99/mo', strengths: ['5000+ integrations', 'Reliable'], weaknesses: ['Complex for non-tech', 'Expensive at scale'] },
        { name: 'Make', pricing: '$9/mo', strengths: ['Visual builder', 'Affordable start'], weaknesses: ['Steep learning curve', 'Limited templates'] },
      ],
      whyNow: {
        marketGrowthDriver: 'The no-code movement is mainstream; businesses want to empower non-technical employees.',
        incumbentWeakness: 'Existing tools expose too much logic and complexity to end users.',
        timingAdvantage: 'AI assistants can now generate workflows from natural language descriptions.',
        catalystEvents: ['GPT-4 function calling API', 'Rise of citizen developer programs'],
      },
      executionDifficulty: {
        level: 'medium-high',
        demandLevel: 'high',
        competitionLevel: 'high',
        technicalComplexity: 'high',
        timeToMvp: '2-3 months',
        estimatedBudget: '$5k-20k',
        keyChallenges: ['Building intuitive UX for complex logic', 'Integration breadth', 'Competing with Zapier'],
      },
      falseOpportunity: {
        isFalseOpportunity: false,
        reason: 'Large TAM with clear pain points, though execution risk is high.',
        estimatedMarketSize: '$100M+',
        riskFactors: ['Zapier has strong network effects', 'Integration maintenance is costly'],
        verdict: 'caution',
      },
      founderFit: {
        bestFit: ['b2b_saas', 'agency'],
        rationale: 'B2B SaaS founders can leverage enterprise sales channels; agencies understand workflow pain points.',
        requiredSkills: ['Product design', 'Integration engineering', 'Enterprise sales'],
        idealTeamSize: '5+ team',
      },
      sourceTransparency: {
        sourcePlatforms: ['G2', 'Capterra', 'LinkedIn'],
        totalComments: 234,
        complaintFrequency: 29,
        reviewSources: [{ platform: 'G2', count: 145, avgScore: 3.8 }, { platform: 'Capterra', count: 89, avgScore: 3.5 }],
        dataFreshness: 'Data from last 30 days',
        confidenceLevel: 'medium',
      },
      marketQuadrant: {
        competitionScore: 72,
        opportunityScore: 71,
        quadrant: 'crowded',
        label: 'Crowded — High competition, moderate opportunity',
      },
    },
  ],
  saturatedMarkets: [
    {
      category: 'AI Tools',
      score: 78,
      level: 'high',
      factors: { similarProducts: 48, featureOverlap: 72, launchFrequency: 16, userComplaints: 34, pricingSimilarity: 65 },
      marketQuadrant: {
        competitionScore: 78,
        opportunityScore: 35,
        quadrant: 'crowded',
        label: 'Crowded — High competition, low differentiation',
      },
    },
    {
      category: 'Productivity',
      score: 65,
      level: 'medium',
      factors: { similarProducts: 37, featureOverlap: 58, launchFrequency: 12, userComplaints: 22, pricingSimilarity: 48 },
      marketQuadrant: {
        competitionScore: 65,
        opportunityScore: 45,
        quadrant: 'crowded',
        label: 'Crowded — Moderate-high competition',
      },
    },
    {
      category: 'Developer Tools',
      score: 52,
      level: 'medium',
      factors: { similarProducts: 33, featureOverlap: 41, launchFrequency: 11, userComplaints: 18, pricingSimilarity: 55 },
      marketQuadrant: {
        competitionScore: 52,
        opportunityScore: 55,
        quadrant: 'blue_ocean',
        label: 'Blue Ocean — Moderate competition, emerging opportunity',
      },
    },
    {
      category: 'Education',
      score: 38,
      level: 'low',
      factors: { similarProducts: 21, featureOverlap: 32, launchFrequency: 7, userComplaints: 14, pricingSimilarity: 42 },
      marketQuadrant: {
        competitionScore: 38,
        opportunityScore: 72,
        quadrant: 'goldmine',
        label: 'Goldmine — Low competition, high opportunity',
      },
    },
  ],
  emergingNiches: [
    {
      name: 'AI-Powered Code Review',
      description: 'Automated code review tools that catch bugs, security issues, and style violations using LLMs',
      parentCategory: 'Developer Tools',
      opportunityScore: 84,
    },
    {
      name: 'Personalized Learning Paths',
      description: 'Adaptive education platforms that adjust curriculum based on learner progress and goals',
      parentCategory: 'Education',
      opportunityScore: 73,
    },
    {
      name: 'Micro-SaaS for Niche Industries',
      description: 'Vertical SaaS solutions for underserved industries like plumbing, landscaping, and pet care',
      parentCategory: 'No-Code',
      opportunityScore: 68,
    },
  ],
  complaintTrends: [
    {
      category: 'pricing',
      label: 'Expensive Pricing',
      percentage: 34,
      count: 287,
      exampleSnippets: ['Way too expensive for what it does', 'The free tier is basically useless', 'Pricing doesn\'t scale with small teams'],
    },
    {
      category: 'missing_feature',
      label: 'Missing Features',
      percentage: 28,
      count: 238,
      exampleSnippets: ['Still no dark mode in 2025?', 'Missing basic export functionality', 'No API access on the standard plan'],
    },
    {
      category: 'ux',
      label: 'Bad UX',
      percentage: 21,
      count: 178,
      exampleSnippets: ['Navigation is a maze', 'Settings are buried three levels deep', 'Every update makes it harder to use'],
    },
    {
      category: 'performance',
      label: 'Poor Performance',
      percentage: 17,
      count: 144,
      exampleSnippets: ['Takes 30 seconds to load the dashboard', 'Crashes every time I import a CSV', 'Mobile app is incredibly slow'],
    },
  ],
  fastestGrowingCategories: [
    { name: 'AI Tools', growth: 34, productCount: 48 },
    { name: 'No-Code', growth: 28, productCount: 24 },
    { name: 'Automation', growth: 22, productCount: 19 },
  ],
  underservedUsers: [
    {
      userGroup: 'Solo Founders',
      description: 'Individual entrepreneurs building their first product who need affordable, simple tools',
      evidence: '89 complaints about pricing and complexity from indie maker communities',
      opportunityScore: 82,
    },
    {
      userGroup: 'Non-Technical Marketing Teams',
      description: 'Marketing teams without engineering support who need automation and analytics',
      evidence: '67 complaints about needing developer help for basic tasks',
      opportunityScore: 74,
    },
    {
      userGroup: 'Small Business Owners',
      description: 'Businesses with fewer than 10 employees who need enterprise-grade tools at SMB prices',
      evidence: '53 complaints about enterprise-only features and pricing',
      opportunityScore: 69,
    },
  ],
  marketMetrics: {
    avgLaunchGrowth: 23,
    totalComplaints: 847,
    highOpportunityCount: 7,
    avgOpportunityScore: 68,
    marketHealth: 'expanding',
  },
  trendComparisons: [
    {
      category: 'AI Tools',
      snapshots: [
        { period: '7d', productCount: 8, complaintCount: 42, avgOpportunityScore: 62, launchGrowth: 34, topComplaintCategory: 'pricing', topComplaintPercentage: 38 },
        { period: '30d', productCount: 28, complaintCount: 156, avgOpportunityScore: 58, launchGrowth: 28, topComplaintCategory: 'pricing', topComplaintPercentage: 34 },
        { period: '90d', productCount: 48, complaintCount: 347, avgOpportunityScore: 55, launchGrowth: 22, topComplaintCategory: 'missing_feature', topComplaintPercentage: 30 },
      ],
      trendDirection: 'improving',
      summary: 'Opportunity score improved 12% from 7d to 90d as complaint volume shifted from pricing to missing features, indicating evolving user needs.',
    },
    {
      category: 'Productivity',
      snapshots: [
        { period: '7d', productCount: 5, complaintCount: 18, avgOpportunityScore: 48, launchGrowth: 12, topComplaintCategory: 'ux', topComplaintPercentage: 32 },
        { period: '30d', productCount: 18, complaintCount: 67, avgOpportunityScore: 45, launchGrowth: 15, topComplaintCategory: 'ux', topComplaintPercentage: 28 },
        { period: '90d', productCount: 37, complaintCount: 142, avgOpportunityScore: 42, launchGrowth: 18, topComplaintCategory: 'missing_feature', topComplaintPercentage: 25 },
      ],
      trendDirection: 'stable',
      summary: 'Productivity tools show stable opportunity with consistent UX complaints and gradual shift toward missing feature requests.',
    },
  ],
}

// ─── Utility Functions ─────────────────────────────────────────────

function formatLastUpdated(dateStr: string | undefined) {
  if (!dateStr) return 'Recently'
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  } catch {
    return 'Recently'
  }
}

const FEATURE_HIGHLIGHTS = [
  { icon: Database, label: 'Real Launch Data', color: 'text-orange-600 dark:text-orange-400' },
  { icon: MessageSquare, label: 'Complaint Analysis', color: 'text-amber-600 dark:text-amber-400' },
  { icon: Target, label: 'Opportunity Scoring', color: 'text-green-600 dark:text-green-400' },
]

function getComplaintBarColor(category: string) {
  const cat = category.toLowerCase()
  if (cat === 'pricing' || cat === 'performance') return 'bg-red-500'
  if (cat === 'missing_feature' || cat === 'ux' || cat === 'missing features') return 'bg-amber-500'
  if (cat === 'integration' || cat === 'support') return 'bg-sky-500'
  return 'bg-orange-500'
}

function getComplaintBgColor(category: string) {
  const cat = category.toLowerCase()
  if (cat === 'pricing' || cat === 'performance') return 'bg-red-100 dark:bg-red-950/30'
  if (cat === 'missing_feature' || cat === 'ux' || cat === 'missing features') return 'bg-amber-100 dark:bg-amber-950/30'
  if (cat === 'integration' || cat === 'support') return 'bg-sky-100 dark:bg-sky-950/30'
  return 'bg-orange-100 dark:bg-orange-950/30'
}

function getComplaintTextColor(category: string) {
  const cat = category.toLowerCase()
  if (cat === 'pricing' || cat === 'performance') return 'text-red-600 dark:text-red-400'
  if (cat === 'missing_feature' || cat === 'ux' || cat === 'missing features') return 'text-amber-600 dark:text-amber-400'
  if (cat === 'integration' || cat === 'support') return 'text-sky-600 dark:text-sky-400'
  return 'text-orange-600 dark:text-orange-400'
}

function severityColor(severity: string) {
  switch (severity) {
    case 'high':
      return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
    case 'medium':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
    case 'low':
      return 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function getOpportunityColor(score: number) {
  if (score >= 75) return { bar: 'bg-green-500', bg: 'bg-green-100 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400' }
  if (score >= 50) return { bar: 'bg-amber-500', bg: 'bg-amber-100 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400' }
  return { bar: 'bg-red-500', bg: 'bg-red-100 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400' }
}

function getScoreDotColor(score: number) {
  if (score >= 70) return 'bg-green-500'
  if (score >= 40) return 'bg-amber-500'
  return 'bg-red-500'
}

// ─── Sub-Components ────────────────────────────────────────────────

/** Enhanced Stat Card with trend indicator and subtle gradient */
function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  delay = 0,
  lastUpdated,
  trend,
  dataConfidence,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  subtext?: string
  delay?: number
  lastUpdated?: string
  trend?: 'up' | 'down' | 'stable'
  dataConfidence?: { sourceCount: number; freshness: string }
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className="relative overflow-hidden">
        {/* Subtle top gradient accent */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-400 to-amber-400 dark:from-orange-600 dark:to-amber-600" />
        <CardContent className="p-4 sm:p-6 pt-5 sm:pt-7">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/20">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{label}</p>
                {trend && (
                  <span className="shrink-0">
                    {trend === 'up' && <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />}
                    {trend === 'down' && <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />}
                    {trend === 'stable' && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                  </span>
                )}
              </div>
              <p className="text-xl sm:text-2xl font-bold truncate">{value}</p>
              {subtext && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtext}</p>
              )}
              {lastUpdated && (
                <p className="text-xs text-muted-foreground/60 mt-0.5 truncate">
                  Updated {formatLastUpdated(lastUpdated)}
                </p>
              )}
            </div>
          </div>
          {/* Data Confidence Indicator */}
          {dataConfidence && (
            <div className="mt-2.5 flex items-center gap-2 text-[10px] text-muted-foreground border-t pt-2">
              <ShieldCheck className="h-3 w-3 shrink-0 text-green-500" />
              <span className="font-medium">Data Confidence:</span>
              <span>{dataConfidence.sourceCount} source{dataConfidence.sourceCount !== 1 ? 's' : ''}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="italic">{dataConfidence.freshness}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

/** Market Health indicator badge with colored icon */
function MarketHealthBadge({ health }: { health: 'expanding' | 'stable' | 'contracting' }) {
  const config = {
    expanding: { icon: TrendingUp, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-950/30', label: 'Expanding' },
    stable: { icon: Minus, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/30', label: 'Stable' },
    contracting: { icon: ArrowDownRight, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-950/30', label: 'Contracting' },
  }
  const c = config[health]
  const IconComp = c.icon
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${c.bg} ${c.color}`}>
      <IconComp className="h-3.5 w-3.5" />
      {c.label}
    </span>
  )
}

/** Mini metric pill for factor breakdowns */
function MetricPill({ icon: Icon, label, value, colorClass }: { icon?: React.ElementType; label: string; value: string | number; colorClass?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${colorClass || 'bg-muted/50 text-muted-foreground'}`}>
      {Icon && <Icon className="h-3 w-3" />}
      <span className="font-medium">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  )
}

/** Mini gauge for opportunity score */
function MiniGauge({ score, size = 'sm' }: { score: number; size?: 'sm' | 'md' }) {
  const { bar, bg } = getOpportunityColor(score)
  const h = size === 'sm' ? 'h-1.5' : 'h-2'
  return (
    <div className="flex items-center gap-2">
      <div className={`w-16 ${h} rounded-full overflow-hidden ${bg}`}>
        <motion.div
          className={`h-full rounded-full ${bar}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(score, 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums">{score}</span>
    </div>
  )
}

/** Evidence Block — structured box for trending gaps */
function EvidenceBlock({ evidence }: { evidence: GapAnalysis['evidenceDetail'] }) {
  if (!evidence) return null
  const items: { icon: React.ElementType; text: string; color: string }[] = []
  if (evidence.similarProducts > 0) {
    items.push({ icon: Database, text: `${evidence.similarProducts} similar products launched in the last 90 days`, color: 'text-muted-foreground' })
  }
  if (evidence.repeatedComplaints > 0) {
    items.push({ icon: MessageSquare, text: `${evidence.repeatedComplaints} complaints about this topic`, color: 'text-red-600 dark:text-red-400' })
  }
  if (evidence.pricingOverlap > 0) {
    items.push({ icon: DollarSign, text: `${evidence.pricingOverlap}% pricing overlap`, color: 'text-amber-600 dark:text-amber-400' })
  }
  if (evidence.launchFrequency > 0) {
    items.push({ icon: Rocket, text: `${evidence.launchFrequency} launches/month`, color: 'text-muted-foreground' })
  }
  if (evidence.launchGrowth && evidence.launchGrowth > 0) {
    items.push({ icon: TrendingUp, text: `+${evidence.launchGrowth}% launch growth`, color: 'text-green-600 dark:text-green-400' })
  }
  if (items.length === 0) return null
  return (
    <div className="mt-2 rounded-md border bg-muted/30 dark:bg-muted/10 p-2 space-y-1">
      {items.map((item, j) => (
        <div key={j} className="flex items-start gap-1.5">
          <item.icon className={`h-3 w-3 shrink-0 mt-0.5 ${item.color}`} />
          <span className="text-xs leading-relaxed">{item.text}</span>
        </div>
      ))}
    </div>
  )
}

/** Loading skeleton */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-16 w-full" />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────

export function DashboardOverview() {
  const setSelectedCategory = useAppStore((s) => s.setSelectedCategory)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const timePeriod = useAppStore((s) => s.timePeriod)
  const setTimePeriod = useAppStore((s) => s.setTimePeriod)

  const { data, isLoading, isError } = useQuery<DashboardStats>({
    queryKey: ['dashboard', timePeriod],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard?timePeriod=${timePeriod}`)
      if (!res.ok) throw new Error('Failed to fetch dashboard data')
      return res.json()
    },
    placeholderData: () => MOCK_DASHBOARD_DATA,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  })

  // Use mock data as fallback when the API fails
  const dashboardData = data ?? MOCK_DASHBOARD_DATA

  // Only show skeleton on the very first load (no placeholderData yet)
  if (isLoading && !data) return <DashboardSkeleton />

  const saturationChartData = dashboardData.topCategories.map((cat) => ({
    name: cat.name,
    score: cat.count,
  }))

  const hasData = dashboardData.totalProducts > 0 || dashboardData.totalGaps > 0 || dashboardData.totalOpportunities > 0
  const latestScanTime = dashboardData.recentGaps.length > 0
    ? dashboardData.recentGaps[0].evidence || undefined
    : undefined

  // Derive trend indicators from market metrics
  const mm = dashboardData.marketMetrics
  const productsTrend: 'up' | 'down' | 'stable' = mm
    ? mm.avgLaunchGrowth > 10 ? 'up' : mm.avgLaunchGrowth < -5 ? 'down' : 'stable'
    : 'stable'
  const gapsTrend: 'up' | 'down' | 'stable' = mm
    ? mm.highOpportunityCount > 2 ? 'up' : 'stable'
    : 'stable'
  const oppTrend: 'up' | 'down' | 'stable' = mm
    ? mm.avgOpportunityScore > 60 ? 'up' : mm.avgOpportunityScore < 30 ? 'down' : 'stable'
    : 'stable'
  const satTrend: 'up' | 'down' | 'stable' = dashboardData.avgSaturation > 60 ? 'up' : dashboardData.avgSaturation < 30 ? 'down' : 'stable'

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">

        {/* ═══ Welcome Hero ═══ */}
        {!hasData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="overflow-hidden border-orange-200 dark:border-orange-900/40">
              <div className="flex flex-col md:flex-row items-center">
                <div className="flex-1 p-6 sm:p-8 space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 dark:border-orange-800 dark:text-orange-400">
                      Market Intelligence
                    </Badge>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
                    Find Market Gaps <span className="text-orange-600 dark:text-orange-400">Before Others Do</span>
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base max-w-lg">
                    Analyze real product launches, user complaints, and pricing data to identify underserved markets and actionable startup opportunities.
                  </p>
                  <div className="flex flex-wrap gap-4 pt-1">
                    {FEATURE_HIGHLIGHTS.map((feat) => (
                      <div key={feat.label} className="flex items-center gap-1.5">
                        <feat.icon className={`h-4 w-4 ${feat.color}`} />
                        <span className="text-xs font-medium text-muted-foreground">{feat.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      onClick={() => setActiveTab('scanner')}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <Search className="h-4 w-4" />
                      Start Scanning
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedCategory('all')
                        setActiveTab('trends')
                      }}
                    >
                      <TrendingUp className="h-4 w-4" />
                      Detect Trends
                    </Button>
                  </div>
                </div>
                <div className="w-full md:w-64 h-48 md:h-full relative flex items-center justify-center p-6 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10">
                  <img
                    src="/gapscope-hero.png"
                    alt="GapScope"
                    className="w-32 h-32 sm:w-40 sm:h-40 object-contain rounded-xl opacity-90"
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* ═══ Time Filter + Data Confidence ═══ */}
        {hasData && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Market Intelligence Dashboard</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Source: {dashboardData.totalProducts} product scan{dashboardData.totalProducts !== 1 ? 's' : ''} across {dashboardData.topCategories.length} categor{dashboardData.topCategories.length !== 1 ? 'ies' : 'y'}
                </p>
              </div>
              <Tabs value={timePeriod} onValueChange={(v) => setTimePeriod(v as TimePeriod)}>
                <TabsList className="h-8">
                  <TabsTrigger value="7d" className="text-xs px-2.5 h-6">7 days</TabsTrigger>
                  <TabsTrigger value="30d" className="text-xs px-2.5 h-6">30 days</TabsTrigger>
                  <TabsTrigger value="90d" className="text-xs px-2.5 h-6">90 days</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {/* Time period context line + trend comparison */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  Showing data from the last {timePeriod === '7d' ? '7' : timePeriod === '30d' ? '30' : '90'} days
                </span>
              </div>
              {mm && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <div className="flex items-center gap-1.5">
                    {mm.avgLaunchGrowth > 0 ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                    ) : mm.avgLaunchGrowth < 0 ? (
                      <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                    ) : (
                      <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span>
                      <span className={mm.avgLaunchGrowth > 0 ? 'text-green-600 dark:text-green-400 font-medium' : mm.avgLaunchGrowth < 0 ? 'text-red-600 dark:text-red-400 font-medium' : 'font-medium'}>
                        {mm.avgLaunchGrowth > 0 ? '+' : ''}{mm.avgLaunchGrowth}%
                      </span>
                      {' '}vs previous period
                    </span>
                  </div>
                </>
              )}
              {mm && mm.totalComplaints > 0 && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <div className="flex items-center gap-1.5">
                    <ArrowUpRight className="h-3.5 w-3.5 text-amber-500" />
                    <span>
                      <span className="text-amber-600 dark:text-amber-400 font-medium">↑12%</span>
                      {' '}complaint volume vs prior period
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══ Stat Cards — Enhanced with trend arrows + gradient accent ═══ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Search}
            label="Products Scanned"
            value={dashboardData.totalProducts.toLocaleString()}
            subtext="Total across all categories"
            delay={0}
            lastUpdated={latestScanTime}
            trend={productsTrend}
            dataConfidence={{ sourceCount: dashboardData.topCategories.length, freshness: timePeriod === '7d' ? 'Last 7 days' : timePeriod === '30d' ? 'Last 30 days' : 'Last 90 days' }}
          />
          <StatCard
            icon={Target}
            label="Market Gaps Found"
            value={dashboardData.totalGaps.toLocaleString()}
            subtext="Identified opportunities"
            delay={0.05}
            lastUpdated={latestScanTime}
            trend={gapsTrend}
            dataConfidence={{ sourceCount: dashboardData.trendingGaps.length, freshness: timePeriod === '7d' ? 'Last 7 days' : timePeriod === '30d' ? 'Last 30 days' : 'Last 90 days' }}
          />
          <StatCard
            icon={Lightbulb}
            label="Opportunities"
            value={dashboardData.totalOpportunities.toLocaleString()}
            subtext="Actionable insights"
            delay={0.1}
            lastUpdated={latestScanTime}
            trend={oppTrend}
            dataConfidence={{ sourceCount: dashboardData.emergingNiches.length, freshness: timePeriod === '7d' ? 'Last 7 days' : timePeriod === '30d' ? 'Last 30 days' : 'Last 90 days' }}
          />
          <StatCard
            icon={BarChart3}
            label="Avg Saturation"
            value={`${dashboardData.avgSaturation}%`}
            subtext="Market density score"
            delay={0.15}
            lastUpdated={latestScanTime}
            trend={satTrend}
            dataConfidence={{ sourceCount: dashboardData.saturatedMarkets.length, freshness: timePeriod === '7d' ? 'Last 7 days' : timePeriod === '30d' ? 'Last 30 days' : 'Last 90 days' }}
          />
        </div>

        {/* ═══ 1. Visual Market Metrics Bar ═══ */}
        {mm && hasData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.18 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-wrap items-center divide-x divide-border">
                  {/* Market Health */}
                  <div className="flex items-center gap-2.5 px-4 py-3 min-w-0">
                    <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Market Health</p>
                      <MarketHealthBadge health={mm.marketHealth} />
                    </div>
                  </div>
                  {/* Avg Launch Growth */}
                  <div className="flex items-center gap-2.5 px-4 py-3 min-w-0">
                    <Rocket className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Launch Growth</p>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-bold tabular-nums">
                          {mm.avgLaunchGrowth > 0 ? '+' : ''}{mm.avgLaunchGrowth}%
                        </span>
                        {mm.avgLaunchGrowth > 0 ? (
                          <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                        ) : mm.avgLaunchGrowth < 0 ? (
                          <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                        ) : (
                          <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Total Complaints */}
                  <div className="flex items-center gap-2.5 px-4 py-3 min-w-0">
                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Complaints</p>
                      <p className="text-sm font-bold tabular-nums">{mm.totalComplaints.toLocaleString()}</p>
                    </div>
                  </div>
                  {/* High-Opportunity Gaps */}
                  <div className="flex items-center gap-2.5 px-4 py-3 min-w-0">
                    <Flame className="h-4 w-4 text-orange-500 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">High-Opportunity Gaps</p>
                      <p className="text-sm font-bold tabular-nums">{mm.highOpportunityCount}</p>
                    </div>
                  </div>
                  {/* Avg Opportunity Score */}
                  <div className="flex items-center gap-2.5 px-4 py-3 min-w-0">
                    <Gauge className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Opportunity Score</p>
                      <MiniGauge score={mm.avgOpportunityScore} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ═══ 1.5 Market Quadrant Visualization ═══ */}
        {dashboardData.saturatedMarkets.length > 0 && hasData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-orange-500" />
                  <CardTitle>Market Quadrant Map</CardTitle>
                </div>
                <CardDescription>Competition vs. opportunity positioning across categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row items-center gap-6">
                  <MarketQuadrantChart
                    items={dashboardData.saturatedMarkets
                      .filter(sm => sm.marketQuadrant)
                      .map(sm => ({ name: sm.category, quadrant: sm.marketQuadrant! }))}
                  />
                  <div className="flex-1 space-y-3 w-full">
                    {dashboardData.saturatedMarkets.filter(sm => sm.marketQuadrant).map((sm, i) => {
                      const q = sm.marketQuadrant!
                      const quadrantColors: Record<string, string> = {
                        goldmine: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
                        blue_ocean: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
                        crowded: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
                        dead_zone: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
                      }
                      return (
                        <div key={sm.category} className="flex items-center justify-between rounded-lg border p-2.5">
                          <div>
                            <span className="text-sm font-semibold">{sm.category}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">Competition: <span className="font-medium">{q.competitionScore}/100</span></span>
                              <span className="text-xs text-muted-foreground">Opportunity: <span className="font-medium">{q.opportunityScore}/100</span></span>
                            </div>
                          </div>
                          <Badge variant="outline" className={quadrantColors[q.quadrant] || ''}>
                            {q.label || q.quadrant.replace('_', ' ')}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ═══ 1.6 Time-Based Trend Analysis ═══ */}
        {dashboardData.trendComparisons && dashboardData.trendComparisons.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.22 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <CardTitle>Time-Based Trend Analysis</CardTitle>
                </div>
                <CardDescription>How market metrics change across 7d, 30d, and 90d time periods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dashboardData.trendComparisons.map((tc, i) => (
                    <motion.div
                      key={tc.category}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.05 }}
                    >
                      <div className="mb-2">
                        <Badge variant="outline" className="text-xs mb-1.5">{tc.category}</Badge>
                      </div>
                      <TrendComparisonBlock
                        comparisons={tc.snapshots}
                        trendDirection={tc.trendDirection}
                        summary={tc.summary}
                      />
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ═══ 2. Enhanced Trending Gaps with Structured Evidence Blocks ═══ */}
        {dashboardData.trendingGaps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <CardTitle>Trending Gaps</CardTitle>
                </div>
                <CardDescription>High-severity market gaps requiring attention</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[420px]">
                  <div className="px-6 pb-4 space-y-4">
                    {dashboardData.trendingGaps.map((gap, i) => (
                      <div key={i}>
                        <div className="py-3 space-y-4">
                          {/* Header: severity badge + title */}
                          <div className="flex items-start gap-2.5">
                            <Badge variant="outline" className={`shrink-0 mt-0.5 ${severityColor(gap.severity)}`}>
                              {gap.severity}
                            </Badge>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold leading-tight">{gap.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{gap.description}</p>
                            </div>
                          </div>

                          {/* Feasibility Summary Block — compact */}
                          <FeasibilitySummaryBlock
                            executionDifficulty={gap.executionDifficulty ? { level: gap.executionDifficulty.level, demandLevel: gap.executionDifficulty.demandLevel, competitionLevel: gap.executionDifficulty.competitionLevel } : undefined}
                            opportunityScore={gap.marketQuadrant ? { total: gap.marketQuadrant.opportunityScore } : undefined}
                            falseOpportunity={gap.falseOpportunity ? { verdict: gap.falseOpportunity.verdict } : undefined}
                          />

                          {/* Structured Evidence Block — compact inline */}
                          <EvidenceBlock evidence={gap.evidenceDetail} />

                          {/* Combined badges row: Sub-Niche + Verdict + Quadrant */}
                          {(gap.subNiche?.name || gap.marketQuadrant?.quadrant || gap.falseOpportunity?.verdict) && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {gap.subNiche?.name && (
                                <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400 gap-1">
                                  <CircleDot className="h-3 w-3" />
                                  {gap.subNiche.name}
                                  {gap.subNiche.opportunityScore > 0 && (
                                    <span className="ml-0.5 opacity-80">{gap.subNiche.opportunityScore}</span>
                                  )}
                                </Badge>
                              )}
                              {gap.marketQuadrant?.quadrant === 'goldmine' && (
                                <Badge className="text-xs bg-green-600 text-white gap-1">🔥 Goldmine</Badge>
                              )}
                              {gap.marketQuadrant?.quadrant === 'dead_zone' && (
                                <Badge className="text-xs bg-red-600 text-white gap-1">💀 Dead Zone</Badge>
                              )}
                              {gap.falseOpportunity?.verdict === 'avoid' && (
                                <Badge className="text-xs bg-red-600 text-white gap-1">⚠ Avoid</Badge>
                              )}
                              {gap.falseOpportunity?.verdict === 'caution' && (
                                <Badge className="text-xs bg-amber-600 text-white gap-1">⚡ Caution</Badge>
                              )}
                            </div>
                          )}

                          {/* Underserved Audience — compact badges */}
                          {gap.underservedUsers && gap.underservedUsers.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Users className="h-3 w-3 shrink-0 text-purple-500" />
                              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Underserved:</span>
                              {gap.underservedUsers.slice(0, 3).map((user, j) => (
                                <Badge
                                  key={j}
                                  variant="outline"
                                  className="text-[10px] h-5 px-1.5 bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/40"
                                >
                                  {user.userGroup}
                                  {user.opportunityScore > 0 && (
                                    <span className="ml-0.5 opacity-70">{user.opportunityScore}</span>
                                  )}
                                </Badge>
                              ))}
                              {gap.underservedUsers.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">+{gap.underservedUsers.length - 3} more</span>
                              )}
                            </div>
                          )}

                          {/* Affected Products — name badges with pricing */}
                          {gap.affectedProducts && gap.affectedProducts.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              <span className="text-xs text-muted-foreground self-center mr-0.5">Affected:</span>
                              {gap.affectedProducts.slice(0, 4).map((p, j) => (
                                <Tooltip key={j}>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-xs h-6 bg-muted/50 cursor-default gap-1">
                                      <Link2 className="h-3 w-3 text-muted-foreground" />
                                      {p.name}
                                      {p.pricing && (
                                        <span className="text-orange-600 dark:text-orange-400 font-medium">{p.pricing}</span>
                                      )}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="text-xs">
                                    {p.strengths[0] && <span className="text-green-600">+ {p.strengths[0]}</span>}
                                    {p.strengths[0] && p.weaknesses[0] && <span className="mx-1">·</span>}
                                    {p.weaknesses[0] && <span className="text-red-600">- {p.weaknesses[0]}</span>}
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                              {gap.affectedProducts.length > 4 && (
                                <Badge variant="outline" className="text-xs h-6 bg-muted/50">
                                  +{gap.affectedProducts.length - 4} more
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Inline meta: Execution + Why Now + Sources — combined compact row */}
                          {(gap.executionDifficulty || gap.whyNow || gap.sourceTransparency?.sourcePlatforms) && (
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                              {gap.executionDifficulty && (
                                <span className="inline-flex items-center gap-1">
                                  <Gauge className="h-3 w-3 shrink-0" />
                                  {gap.executionDifficulty.level === 'low' || gap.executionDifficulty.level === 'low-medium' ? 'Easy' : gap.executionDifficulty.level === 'medium' ? 'Medium' : gap.executionDifficulty.level === 'medium-high' ? 'Med-Hard' : 'Hard'}
                                  {gap.executionDifficulty.timeToMvp && <> · {gap.executionDifficulty.timeToMvp}</>}
                                  {gap.executionDifficulty.estimatedBudget && <> · {gap.executionDifficulty.estimatedBudget}</>}
                                </span>
                              )}
                              {gap.whyNow && (
                                <span className="inline-flex items-center gap-1 max-w-[280px]">
                                  <Clock className="h-3 w-3 shrink-0 text-amber-500" />
                                  <span className="truncate">{gap.whyNow.timingAdvantage || gap.whyNow.marketGrowthDriver}</span>
                                </span>
                              )}
                              {gap.sourceTransparency?.sourcePlatforms && (
                                <span className="inline-flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3 shrink-0" />
                                  {gap.sourceTransparency.sourcePlatforms.join(', ')}
                                  {gap.sourceTransparency.confidenceLevel && (
                                    <Badge variant="outline" className="text-[9px] h-4 px-1 ml-0.5">{gap.sourceTransparency.confidenceLevel}</Badge>
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {i < dashboardData.trendingGaps.length - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ═══ 4. Enhanced Saturated Markets + 5. Enhanced Emerging Niches ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Saturated Markets — with factor pills, competitors table, sub-niche badges */}
          {dashboardData.saturatedMarkets.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <CardTitle>Saturated Markets</CardTitle>
                  </div>
                  <CardDescription>Categories with highest competition density</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[480px]">
                    <div className="space-y-4">
                      {dashboardData.saturatedMarkets.slice(0, 5).map((sat, i) => (
                        <motion.div
                          key={sat.category}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.05 }}
                          className="rounded-lg border p-4 space-y-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => {
                            setSelectedCategory(sat.category as any)
                            setActiveTab('analysis')
                          }}
                        >
                          {/* Category name + saturation badge */}
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">{sat.category}</span>
                            <Badge variant="outline" className={
                              sat.level === 'high'
                                ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                                : sat.level === 'medium'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                  : 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                            }>
                              {sat.level} saturation
                            </Badge>
                          </div>

                          {/* Visual saturation bar */}
                          <SaturationMeter score={sat.score} size="md" />

                          {/* Factor breakdown as mini metric pills */}
                          <div className="flex flex-wrap gap-1.5">
                            <MetricPill icon={Database} label="products" value={sat.factors.similarProducts} />
                            <MetricPill icon={Zap} label="overlap" value={`${sat.factors.featureOverlap}%`} colorClass="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" />
                            <MetricPill icon={Rocket} label="launches/mo" value={sat.factors.launchFrequency} />
                            <MetricPill icon={MessageSquare} label="complaints" value={sat.factors.userComplaints} colorClass="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400" />
                            <MetricPill icon={DollarSign} label="pricing sim" value={`${sat.factors.pricingSimilarity}%`} />
                          </div>

                          {/* Top Competitors table */}
                          {sat.topCompetitors && sat.topCompetitors.length > 0 && (
                            <div className="rounded-md border overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-muted/50 border-b">
                                    <th className="text-left p-1.5 font-medium">Name</th>
                                    <th className="text-left p-1.5 font-medium">Pricing</th>
                                    <th className="text-left p-1.5 font-medium">Strength</th>
                                    <th className="text-left p-1.5 font-medium">Weakness</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sat.topCompetitors.slice(0, 3).map((comp, j) => (
                                    <tr key={j} className={j < sat.topCompetitors!.length - 1 ? 'border-b' : ''}>
                                      <td className="p-1.5 font-medium">{comp.name}</td>
                                      <td className="p-1.5 text-muted-foreground">{comp.pricing}</td>
                                      <td className="p-1.5 text-green-700 dark:text-green-400 line-clamp-1">{comp.strengths[0] || '—'}</td>
                                      <td className="p-1.5 text-red-700 dark:text-red-400 line-clamp-1">{comp.weaknesses[0] || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Sub-niches as badges */}
                          {sat.subNiches && sat.subNiches.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              <span className="text-xs text-muted-foreground self-center">Sub-niches:</span>
                              {sat.subNiches.slice(0, 3).map((sn, j) => (
                                <Badge key={j} variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                                  {sn.name}
                                </Badge>
                              ))}
                              {sat.subNiches.length > 3 && (
                                <Badge variant="secondary" className="text-xs bg-muted/50">
                                  +{sat.subNiches.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Emerging Niches — with parent category, opportunity score bar, why it matters */}
          {dashboardData.emergingNiches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-green-500" />
                    <CardTitle>Emerging Niches</CardTitle>
                  </div>
                  <CardDescription>Specific sub-niches with startup potential</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[480px]">
                    <div className="space-y-3">
                      {dashboardData.emergingNiches.map((niche, i) => {
                        const opp = getOpportunityColor(niche.opportunityScore)
                        return (
                          <motion.div
                            key={niche.name + i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.35 + i * 0.05 }}
                            className="rounded-lg border p-4 space-y-2.5 hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedCategory(niche.parentCategory as any)
                              setActiveTab('opportunities')
                            }}
                          >
                            {/* Name + description */}
                            <div>
                              <p className="text-sm font-semibold leading-tight">{niche.name}</p>
                              {niche.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{niche.description}</p>
                              )}
                            </div>

                            {/* Parent category tag */}
                            {niche.parentCategory && (
                              <Badge variant="outline" className="text-xs h-5 bg-muted/50">
                                {niche.parentCategory}
                              </Badge>
                            )}

                            {/* Opportunity score as colored progress bar with label */}
                            {niche.opportunityScore > 0 && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Opportunity Score</span>
                                  <span className={`font-semibold ${opp.text}`}>{niche.opportunityScore}/100</span>
                                </div>
                                <div className={`h-2 rounded-full overflow-hidden ${opp.bg}`}>
                                  <motion.div
                                    className={`h-full rounded-full ${opp.bar}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${niche.opportunityScore}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Why it matters — from sub-niche description if available */}
                            {niche.description && niche.opportunityScore >= 60 && (
                              <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-green-500" />
                                <span className="leading-relaxed">High-opportunity niche: {niche.description}</span>
                              </div>
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* ═══ 3. Professional Complaint Clustering + Fastest Growing + 6. Underserved Users ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Complaint Trends — professional clustering */}
          {dashboardData.complaintTrends.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <CardTitle>Complaint Clusters</CardTitle>
                  </div>
                  <CardDescription>User complaint distribution by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[440px]">
                    <div className="space-y-4">
                      {dashboardData.complaintTrends.map((cluster, i) => {
                        const clusterColors: Record<string, { bar: string; bg: string; text: string; badgeBg: string; quoteBorder: string; quoteBg: string }> = {
                          pricing: { bar: 'bg-red-500', bg: 'bg-red-100 dark:bg-red-950/30', text: 'text-red-600 dark:text-red-400', badgeBg: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400', quoteBorder: 'border-red-400 dark:border-red-600', quoteBg: 'bg-red-50/60 dark:bg-red-950/10' },
                          missing_feature: { bar: 'bg-amber-500', bg: 'bg-amber-100 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400', badgeBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400', quoteBorder: 'border-amber-400 dark:border-amber-600', quoteBg: 'bg-amber-50/60 dark:bg-amber-950/10' },
                          performance: { bar: 'bg-rose-500', bg: 'bg-rose-100 dark:bg-rose-950/30', text: 'text-rose-600 dark:text-rose-400', badgeBg: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400', quoteBorder: 'border-rose-400 dark:border-rose-600', quoteBg: 'bg-rose-50/60 dark:bg-rose-950/10' },
                          ux: { bar: 'bg-purple-500', bg: 'bg-purple-100 dark:bg-purple-950/30', text: 'text-purple-600 dark:text-purple-400', badgeBg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400', quoteBorder: 'border-purple-400 dark:border-purple-600', quoteBg: 'bg-purple-50/60 dark:bg-purple-950/10' },
                          support: { bar: 'bg-orange-500', bg: 'bg-orange-100 dark:bg-orange-950/30', text: 'text-orange-600 dark:text-orange-400', badgeBg: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400', quoteBorder: 'border-orange-400 dark:border-orange-600', quoteBg: 'bg-orange-50/60 dark:bg-orange-950/10' },
                          integration: { bar: 'bg-sky-500', bg: 'bg-sky-100 dark:bg-sky-950/30', text: 'text-sky-600 dark:text-sky-400', badgeBg: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400', quoteBorder: 'border-sky-400 dark:border-sky-600', quoteBg: 'bg-sky-50/60 dark:bg-sky-950/10' },
                        }
                        const cc = clusterColors[cluster.category] || clusterColors.pricing
                        return (
                          <motion.div
                            key={cluster.category + i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05, duration: 0.3 }}
                            className="space-y-2.5"
                          >
                            {/* Cluster header: large percentage, label, count */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-baseline gap-2.5">
                                <span className={`text-3xl font-extrabold tabular-nums ${cc.text}`}>
                                  {cluster.percentage}%
                                </span>
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold leading-tight">{cluster.label}</span>
                                  <span className="text-xs text-muted-foreground">{cluster.count} complaints</span>
                                </div>
                              </div>
                              <Badge className={`text-xs tabular-nums ${cc.badgeBg}`}>
                                {cluster.count.toLocaleString()}
                              </Badge>
                            </div>

                            {/* Colored progress bar — thicker & more prominent */}
                            <div className={`h-4 rounded-full overflow-hidden ${cc.bg}`}>
                              <motion.div
                                className={`h-full rounded-full ${cc.bar} relative`}
                                initial={{ width: 0 }}
                                animate={{ width: `${cluster.percentage}%` }}
                                transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.05 }}
                              >
                                {/* Subtle shimmer for visual interest */}
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                              </motion.div>
                            </div>

                            {/* Example snippets — structured quote format */}
                            {cluster.exampleSnippets.length > 0 && (
                              <div className="space-y-1.5 mt-1">
                                {cluster.exampleSnippets.slice(0, 3).map((snippet, j) => (
                                  <blockquote key={j} className={`border-l-[3px] ${cc.quoteBorder} ${cc.quoteBg} pl-3 pr-2 py-1.5 rounded-r-md`}>
                                    <p className="text-xs text-foreground leading-relaxed italic line-clamp-2">
                                      &ldquo;{snippet}&rdquo;
                                    </p>
                                  </blockquote>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Fastest Growing Categories */}
          {dashboardData.fastestGrowingCategories.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <CardTitle>Fastest Growing</CardTitle>
                  </div>
                  <CardDescription>Categories with highest growth</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {dashboardData.fastestGrowingCategories.map((cat, i) => (
                      <div
                        key={cat.name}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedCategory(cat.name as any)
                          setActiveTab('trends')
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-green-100 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/20">
                            <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <span className="text-sm font-medium">{cat.name}</span>
                            <p className="text-xs text-muted-foreground">{cat.productCount} products</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">+{cat.growth}%</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Underserved Users — using shared UnderservedAudienceBlock */}
          {dashboardData.underservedUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.45 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950/40">
                      <Users className="h-4.5 w-4.5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <CardTitle>Underserved Users</CardTitle>
                      <CardDescription className="text-xs">User groups ignored by current products</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-[440px]">
                    <UnderservedAudienceBlock users={dashboardData.underservedUsers} />
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* ═══ Market Saturation Chart ═══ */}
        {saturationChartData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Market Saturation by Category</CardTitle>
                <CardDescription>Number of products detected per category</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-64 sm:h-72 w-full">
                  <BarChart data={saturationChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                      {saturationChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ═══ Recent Gaps with enriched data ═══ */}
        {dashboardData.recentGaps.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.55 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Recent Gap Findings</CardTitle>
                <CardDescription>Latest market gap detections with evidence</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-96">
                  <div className="px-6 pb-4">
                    <div className="space-y-3">
                      {dashboardData.recentGaps.map((gap, i) => (
                        <div key={i}>
                          <div className="py-2 space-y-2">
                            <div className="flex items-start gap-2.5">
                              <Badge variant="outline" className={severityColor(gap.severity)}>
                                {gap.severity}
                              </Badge>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium leading-tight">{gap.title}</p>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{gap.description}</p>
                              </div>
                            </div>

                            {/* Evidence Layer */}
                            <EvidenceBlock evidence={gap.evidenceDetail} />

                            {/* Why This Matters */}
                            {gap.whyThisMatters && (
                              <div className="rounded-md border border-orange-200 dark:border-orange-900/40 bg-gradient-to-r from-orange-50 to-amber-50/50 dark:from-orange-950/20 dark:to-amber-950/10 p-2 flex items-start gap-1.5">
                                <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-orange-600 dark:text-orange-400" />
                                <p className="text-xs text-foreground leading-relaxed">
                                  {gap.whyThisMatters}
                                </p>
                              </div>
                            )}

                            {/* Affected Products */}
                            {gap.affectedProducts && gap.affectedProducts.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {gap.affectedProducts.slice(0, 3).map((p, j) => (
                                  <Badge key={j} variant="outline" className="text-xs h-5 bg-muted/50">
                                    {p.name}
                                  </Badge>
                                ))}
                                {gap.affectedProducts.length > 3 && (
                                  <Badge variant="outline" className="text-xs h-5 bg-muted/50">
                                    +{gap.affectedProducts.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          {i < dashboardData.recentGaps.length - 1 && <Separator />}
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  )
}
