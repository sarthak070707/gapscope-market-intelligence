// Types for ProductHunt Gap Finder Agent

export type GapType = 'missing_feature' | 'weak_ux' | 'expensive' | 'underserved' | 'overcrowded';
export type SaturationLevel = 'low' | 'medium' | 'high';
export type Severity = 'low' | 'medium' | 'high';
export type TrendDirection = 'growing' | 'declining' | 'stable';
export type ScanStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ComplaintCategory = 'pricing' | 'missing_feature' | 'performance' | 'ux' | 'support' | 'integration';
export type Sentiment = 'negative' | 'neutral' | 'mixed';

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

export interface ScannedProduct {
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

export interface GapAnalysis {
  gapType: GapType;
  title: string;
  description: string;
  evidence: string;
  severity: Severity;
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
}

export interface ComplaintAnalysis {
  text: string;
  category: ComplaintCategory;
  sentiment: Sentiment;
  frequency: number;
}

export interface OpportunitySuggestion {
  title: string;
  description: string;
  category: string;
  saturation: SaturationLevel;
  saturationScore: number;
  gapEvidence: string[];
  complaintRefs: string[];
  trendSignals: string[];
  qualityScore: number;
}

export interface TrendData {
  category: string;
  name: string;
  description: string;
  growthRate: number;
  direction: TrendDirection;
  dataPoints: { label: string; value: number }[];
  period: string;
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
}

export interface ScanRequest {
  category: Category | 'all';
  period?: 'daily' | 'weekly' | 'monthly';
}

export interface AnalyzeRequest {
  category: Category | 'all';
  analysisType: 'gaps' | 'saturation' | 'complaints' | 'full';
}

export interface GenerateOpportunityRequest {
  category: Category | 'all';
  focusArea?: string;
}

export interface CompareRequest {
  productIds: string[];
  category: string;
}

// Dashboard stats
export interface DashboardStats {
  totalProducts: number;
  totalGaps: number;
  totalOpportunities: number;
  avgSaturation: number;
  topCategories: { name: string; count: number }[];
  recentGaps: GapAnalysis[];
  trendingCategories: { name: string; growth: number }[];
}
