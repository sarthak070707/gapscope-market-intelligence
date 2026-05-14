// Types for ProductHunt Gap Finder Agent

export type GapType = 'missing_feature' | 'weak_ux' | 'expensive' | 'underserved' | 'overcrowded';
export type SaturationLevel = 'low' | 'medium' | 'high';
export type Severity = 'low' | 'medium' | 'high';
export type TrendDirection = 'growing' | 'declining' | 'stable';
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ComplaintCategory = 'pricing' | 'missing_feature' | 'performance' | 'ux' | 'support' | 'integration';
export type Sentiment = 'negative' | 'neutral' | 'mixed';
export type TimePeriod = '7d' | '30d' | '90d';

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

// PRIORITY 1: Evidence Layer - structured evidence under every gap insight
export interface EvidenceDetail {
  similarProducts: number;
  repeatedComplaints: number;
  launchFrequency: number;
  commentSnippets: string[];
  pricingOverlap: number;
}

// PRIORITY 7: Sub-Niche Detection
export interface SubNiche {
  name: string;
  description: string;
  parentCategory: string;
  opportunityScore: number;
}

// PRIORITY 8: Real Product Examples
export interface ProductReference {
  name: string;
  pricing: string;
  strengths: string[];
  weaknesses: string[];
}

// PRIORITY 12: Underserved Users
export interface UnderservedUserGroup {
  userGroup: string;
  description: string;
  evidence: string;
  opportunityScore: number;
}

// PRIORITY 2: Complaint Clustering
export interface ComplaintCluster {
  category: string;
  label: string;
  percentage: number;
  count: number;
  exampleSnippets: string[];
}

export interface GapAnalysis {
  gapType: GapType;
  title: string;
  description: string;
  evidence: string;
  severity: Severity;
  // PRIORITY 1: Evidence Layer
  evidenceDetail?: EvidenceDetail;
  // PRIORITY 6: Why This Matters
  whyThisMatters?: string;
  // PRIORITY 7: Sub-Niche Detection
  subNiche?: SubNiche;
  // PRIORITY 8: Real Product Examples
  affectedProducts?: ProductReference[];
  // PRIORITY 12: Underserved Users
  underservedUsers?: UnderservedUserGroup[];
}

export interface MarketSaturation {
  category: string;
  score: number; // 0-100
  level: SaturationLevel;
  factors: {
    similarProducts: number;
    featureOverlap: number;
    launchFrequency: number;
    userComplaints: number;
    pricingSimilarity: number;
  };
  // PRIORITY 3: Competitor Breakdown
  topCompetitors?: ProductReference[];
  // PRIORITY 7: Sub-Niche Detection
  subNiches?: SubNiche[];
}

export interface ComplaintAnalysis {
  text: string;
  category: ComplaintCategory;
  sentiment: Sentiment;
  frequency: number;
}

// PRIORITY 5: Opportunity Score
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
  // PRIORITY 1: Evidence Layer
  evidenceDetail?: EvidenceDetail;
  // PRIORITY 5: Opportunity Score
  opportunityScore?: OpportunityScoreBreakdown;
  // PRIORITY 6: Why This Matters
  whyThisMatters?: string;
  // PRIORITY 7: Sub-Niche Detection
  subNiche?: SubNiche;
  // PRIORITY 8: Real Product Examples
  affectedProducts?: ProductReference[];
  // PRIORITY 12: Underserved Users
  underservedUsers?: UnderservedUserGroup[];
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
  // PRIORITY 7: Sub-Niche Detection
  subNiches?: SubNiche[];
  // PRIORITY 12: Underserved Users
  underservedUsers?: UnderservedUserGroup[];
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
  // PRIORITY 12: Underserved Users
  underservedUsers?: UnderservedUserGroup[];
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

// Dashboard stats - PRIORITY 10: Enhanced dashboard
export interface DashboardStats {
  totalProducts: number;
  totalGaps: number;
  totalOpportunities: number;
  avgSaturation: number;
  topCategories: { name: string; count: number }[];
  recentGaps: GapAnalysis[];
  trendingCategories: { name: string; growth: number }[];
  // PRIORITY 10: New dashboard sections
  trendingGaps: GapAnalysis[];
  saturatedMarkets: MarketSaturation[];
  emergingNiches: SubNiche[];
  complaintTrends: ComplaintCluster[];
  fastestGrowingCategories: { name: string; growth: number; productCount: number }[];
  // PRIORITY 12: Underserved Users
  underservedUsers: UnderservedUserGroup[];
}
