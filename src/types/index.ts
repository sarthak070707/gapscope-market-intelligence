// Types for GapScope — Startup Opportunity Intelligence

export type GapType = 'missing_feature' | 'weak_ux' | 'expensive' | 'underserved' | 'overcrowded';
export type SaturationLevel = 'low' | 'medium' | 'high';
export type Severity = 'low' | 'medium' | 'high';
export type TrendDirection = 'growing' | 'declining' | 'stable';
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ComplaintCategory = 'pricing' | 'missing_feature' | 'performance' | 'ux' | 'support' | 'integration';
export type Sentiment = 'negative' | 'neutral' | 'mixed';
export type TimePeriod = '7d' | '30d' | '90d';
export type ExecutionDifficultyLevel = 'low' | 'low-medium' | 'medium' | 'medium-high' | 'high';
export type FounderFitType = 'solo_developer' | 'b2b_saas' | 'content_creator' | 'student_founder' | 'agency' | 'enterprise';

export const CATEGORIES = [
  'AI Tools',
  'Productivity',
  'Developer Tools',
  'Education',
  'Finance',
  'Automation',
  'Health & Fitness',
  'Marketing',
  'Design',
  'Communication',
  'Security',
  'No-Code',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const FOUNDER_FIT_LABELS: Record<FounderFitType, string> = {
  solo_developer: 'Solo Developers',
  b2b_saas: 'B2B SaaS Founders',
  content_creator: 'Content Creators',
  student_founder: 'Student Founders',
  agency: 'Agencies',
  enterprise: 'Enterprise Teams',
};

export const SEARCH_SUGGESTIONS = [
  'ATS resume builders',
  'AI coding assistants',
  'Home workout apps',
  'Productivity tools',
  'Developer portfolio builders',
  'AI writing tools',
  'Project management SaaS',
  'Email automation',
  'No-code website builders',
  'Fitness tracking apps',
  'Note-taking apps',
  'AI image generators',
];

export interface ScannedProduct {
  id?: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  category: string;
  upvotes: number;
  launchDate: string;
  features: string[];
  pricing: string;
  comments: string[];
  reviewScore: number;
  sourceUrl: string;
}

// ─── Evidence Layer ───────────────────────────────────────────────
export interface EvidenceDetail {
  similarProducts: number;
  repeatedComplaints: number;
  launchFrequency: number;
  commentSnippets: string[];
  pricingOverlap: number;
  launchGrowth?: number;
}

// ─── Sub-Niche Detection ──────────────────────────────────────────
export interface SubNiche {
  name: string;
  description: string;
  parentCategory: string;
  opportunityScore: number;
}

// ─── Product References ───────────────────────────────────────────
export interface ProductReference {
  name: string;
  pricing: string;
  strengths: string[];
  weaknesses: string[];
}

// ─── Underserved Users ────────────────────────────────────────────
export interface UnderservedUserGroup {
  userGroup: string;
  description: string;
  evidence: string;
  opportunityScore: number;
}

// ─── Complaint Clustering ─────────────────────────────────────────
export interface ComplaintCluster {
  category: string;
  label: string;
  percentage: number;
  count: number;
  exampleSnippets: string[];
}

// ─── NEW: "WHY NOW?" Analysis ────────────────────────────────────
export interface WhyNowAnalysis {
  marketGrowthDriver: string; // why this market is growing NOW
  incumbentWeakness: string; // why incumbents are weak NOW
  timingAdvantage: string; // why timing matters
  catalystEvents?: string[]; // recent events enabling this opportunity
}

// ─── NEW: Execution Difficulty ────────────────────────────────────
export interface ExecutionDifficulty {
  level: ExecutionDifficultyLevel;
  demandLevel: 'low' | 'medium' | 'high';
  competitionLevel: 'low' | 'medium' | 'high';
  technicalComplexity: 'low' | 'medium' | 'high';
  timeToMvp: string; // e.g., "2-4 weeks", "3-6 months"
  estimatedBudget: string; // e.g., "$0-500", "$5k-20k", "$50k+"
  keyChallenges: string[]; // top 2-3 challenges
}

// ─── NEW: False Opportunity Detection ─────────────────────────────
export interface FalseOpportunityAnalysis {
  isFalseOpportunity: boolean;
  reason?: string; // e.g., "Low opportunity despite complaints due to limited market size"
  estimatedMarketSize?: string; // e.g., "<$1M", "$1-10M", "$10-100M", "$100M+"
  riskFactors?: string[]; // reasons this might not be worth pursuing
  verdict: 'pursue' | 'caution' | 'avoid'; // simple traffic light
}

// ─── NEW: Founder Fit Suggestions ─────────────────────────────────
export interface FounderFitSuggestion {
  bestFit: FounderFitType[];
  rationale: string; // why these founder types are best suited
  requiredSkills: string[]; // skills needed to execute
  idealTeamSize: string; // "Solo", "2-3 people", "5+ team"
}

// ─── NEW: Source Transparency ─────────────────────────────────────
export interface SourceTransparency {
  sourcePlatforms: string[]; // e.g., ["Product Hunt", "G2", "Reddit"]
  totalComments: number;
  complaintFrequency: number; // complaints per 100 reviews
  reviewSources: { platform: string; count: number; avgScore: number }[];
  dataFreshness: string; // e.g., "Data from last 30 days"
  confidenceLevel: 'high' | 'medium' | 'low';
}

// ─── NEW: Why Existing Products Fail ──────────────────────────────
export interface WhyExistingProductsFail {
  rootCause: string; // business reasoning, not feature listing
  userImpact: string; // how this affects users
  missedByCompetitors: string; // why competitors haven't addressed this
}

// ─── NEW: Market Quadrant Position ────────────────────────────────
export interface MarketQuadrantPosition {
  competitionScore: number; // 0-100 (higher = more competition)
  opportunityScore: number; // 0-100 (higher = more opportunity)
  quadrant: 'goldmine' | 'blue_ocean' | 'crowded' | 'dead_zone';
  // goldmine: low competition, high opportunity
  // blue_ocean: low competition, moderate opportunity
  // crowded: high competition, low differentiation
  // dead_zone: high competition, low opportunity
  label: string; // human-readable quadrant label
}

// ─── Gap Analysis ─────────────────────────────────────────────────
export interface GapAnalysis {
  gapType: GapType;
  title: string;
  description: string;
  evidence: string;
  severity: Severity;
  evidenceDetail?: EvidenceDetail;
  whyThisMatters?: string;
  subNiche?: SubNiche;
  affectedProducts?: ProductReference[];
  underservedUsers?: UnderservedUserGroup[];
  // NEW features
  whyNow?: WhyNowAnalysis;
  executionDifficulty?: ExecutionDifficulty;
  falseOpportunity?: FalseOpportunityAnalysis;
  founderFit?: FounderFitSuggestion;
  sourceTransparency?: SourceTransparency;
  whyExistingProductsFail?: WhyExistingProductsFail;
  marketQuadrant?: MarketQuadrantPosition;
}

export interface MarketSaturation {
  category: string;
  score: number;
  level: SaturationLevel;
  factors: {
    similarProducts: number;
    featureOverlap: number;
    launchFrequency: number;
    userComplaints: number;
    pricingSimilarity: number;
  };
  topCompetitors?: ProductReference[];
  subNiches?: SubNiche[];
  // NEW
  marketQuadrant?: MarketQuadrantPosition;
}

export interface ComplaintAnalysis {
  text: string;
  category: ComplaintCategory;
  sentiment: Sentiment;
  frequency: number;
}

// ─── Opportunity Score Breakdown ──────────────────────────────────
export interface OpportunityScoreBreakdown {
  complaintFrequency: number; // 0-20
  competitionDensity: number; // 0-20
  pricingDissatisfaction: number; // 0-20
  launchGrowth: number; // 0-20
  underservedAudience: number; // 0-20
  total: number; // 0-100
  explanation: string;
}

export interface OpportunitySuggestion {
  id?: string;
  title: string;
  description: string;
  category: string;
  saturation: SaturationLevel;
  saturationScore: number;
  gapEvidence: string[];
  complaintRefs: string[];
  trendSignals: string[];
  qualityScore: number;
  evidenceDetail?: EvidenceDetail;
  opportunityScore?: OpportunityScoreBreakdown;
  whyThisMatters?: string;
  subNiche?: SubNiche;
  affectedProducts?: ProductReference[];
  underservedUsers?: UnderservedUserGroup[];
  // NEW features
  whyNow?: WhyNowAnalysis;
  executionDifficulty?: ExecutionDifficulty;
  falseOpportunity?: FalseOpportunityAnalysis;
  founderFit?: FounderFitSuggestion;
  sourceTransparency?: SourceTransparency;
  whyExistingProductsFail?: WhyExistingProductsFail;
  marketQuadrant?: MarketQuadrantPosition;
  // DB fields
  isSaved?: boolean;
  isGenerated?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TrendData {
  id?: string;
  category: string;
  name: string;
  description: string;
  growthRate: number;
  direction: TrendDirection;
  dataPoints: { label: string; value: number }[];
  period: string;
  subNiches?: SubNiche[];
  underservedUsers?: UnderservedUserGroup[];
  marketContext?: {
    productCount: number;
    avgUpvotes: number;
    launchFrequency: number;
    highComplaintActivity: boolean;
    rapidGrowth: boolean;
  };
  // NEW
  whyNow?: WhyNowAnalysis;
  sourceTransparency?: SourceTransparency;
}

export interface CompetitorComparison {
  products: {
    name: string;
    pricing: string;
    features: string[];
    reviewScore: number;
    strengths: string[];
    weaknesses: string[];
  }[];
  summary: string;
  underservedUsers?: UnderservedUserGroup[];
  // NEW
  whyExistingProductsFail?: WhyExistingProductsFail;
  founderFit?: FounderFitSuggestion;
}

export interface ScanRequest {
  category: Category | 'all';
  period?: 'daily' | 'weekly' | 'monthly';
}

export interface AnalyzeRequest {
  category: Category | 'all';
  analysisType: 'gaps' | 'saturation' | 'complaints' | 'full';
  timePeriod?: TimePeriod;
}

export interface GenerateOpportunityRequest {
  category: Category | 'all';
  focusArea?: string;
  timePeriod?: TimePeriod;
}

export interface CompareRequest {
  productIds: string[];
  category: string;
}

// ─── Dashboard Stats ──────────────────────────────────────────────
// ─── Time-Based Trend Comparison ──────────────────────────────────
export interface TrendComparisonSnapshot {
  period: TimePeriod;
  productCount: number;
  complaintCount: number;
  avgOpportunityScore: number;
  launchGrowth: number;
  topComplaintCategory: string;
  topComplaintPercentage: number;
}

export interface TrendComparison {
  category: string;
  snapshots: TrendComparisonSnapshot[];
  trendDirection: 'improving' | 'declining' | 'stable';
  summary: string; // e.g., "Opportunity score increased 15% from 7d to 30d"
}

// ─── Feasibility Summary ───────────────────────────────────────────
export interface FeasibilitySummary {
  opportunityLevel: 'high' | 'medium' | 'low';
  executionDifficulty: 'easy' | 'medium' | 'hard';
  competitionLevel: 'low' | 'medium' | 'high';
  overallVerdict: 'strong_pursue' | 'pursue' | 'caution' | 'avoid';
}

export interface DashboardStats {
  totalProducts: number;
  totalGaps: number;
  totalOpportunities: number;
  avgSaturation: number;
  topCategories: { name: string; count: number }[];
  recentGaps: GapAnalysis[];
  trendingCategories: { name: string; growth: number }[];
  trendingGaps: GapAnalysis[];
  saturatedMarkets: MarketSaturation[];
  emergingNiches: SubNiche[];
  complaintTrends: ComplaintCluster[];
  fastestGrowingCategories: { name: string; growth: number; productCount: number }[];
  underservedUsers: UnderservedUserGroup[];
  // Market overview metrics
  marketMetrics?: {
    avgLaunchGrowth: number;
    totalComplaints: number;
    highOpportunityCount: number;
    avgOpportunityScore: number;
    marketHealth: 'expanding' | 'stable' | 'contracting';
  };
  // Market quadrant overview for all categories
  marketQuadrants?: MarketQuadrantPosition[];
  // Time-based trend comparisons
  trendComparisons?: TrendComparison[];
}
