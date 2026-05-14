'use client'

import { motion } from 'framer-motion'
import {
  Clock,
  Zap,
  Target,
  Shield,
  AlertTriangle,
  Users,
  BarChart3,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Timer,
  DollarSign,
  Wrench,
  Eye,
  Building2,
  GraduationCap,
  Code2,
  PenTool,
  Briefcase,
  Globe,
  ShieldAlert,
  ShieldX,
  ShieldCheck,
  Flame,
  MessageSquare,
  ExternalLink,
  TrendingUp,
  Package,
  CircleDot,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type {
  WhyNowAnalysis,
  ExecutionDifficulty,
  FalseOpportunityAnalysis,
  FounderFitSuggestion,
  SourceTransparency,
  WhyExistingProductsFail,
  MarketQuadrantPosition,
  FounderFitType,
} from '@/types'
import { FOUNDER_FIT_LABELS } from '@/types'

// ─── "WHY NOW?" Analysis Block ────────────────────────────────────
export function WhyNowBlock({ whyNow }: { whyNow: WhyNowAnalysis }) {
  return (
    <div className="rounded-lg border-2 border-amber-300 dark:border-amber-800/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Why Now?</p>
      </div>
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <TrendingUp className="h-3.5 w-3.5 shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Market Growth Driver</p>
            <p className="text-xs text-foreground leading-relaxed">{whyNow.marketGrowthDriver}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Incumbent Weakness</p>
            <p className="text-xs text-foreground leading-relaxed">{whyNow.incumbentWeakness}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Zap className="h-3.5 w-3.5 shrink-0 mt-0.5 text-orange-600 dark:text-orange-400" />
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Timing Advantage</p>
            <p className="text-xs text-foreground leading-relaxed">{whyNow.timingAdvantage}</p>
          </div>
        </div>
      </div>
      {whyNow.catalystEvents && whyNow.catalystEvents.length > 0 && (
        <div className="pt-1.5 border-t border-amber-200 dark:border-amber-800/40">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Catalyst Events</p>
          <div className="flex flex-wrap gap-1.5">
            {whyNow.catalystEvents.map((event, i) => (
              <Badge key={i} variant="outline" className="text-[10px] h-5 bg-amber-100/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/40">
                <ArrowUpRight className="h-2.5 w-2.5 mr-0.5 text-amber-600" />
                {event}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Execution Difficulty Block ────────────────────────────────────
export function ExecutionDifficultyBlock({ difficulty }: { difficulty: ExecutionDifficulty }) {
  const levelColors: Record<string, string> = {
    low: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
    'low-medium': 'bg-lime-100 text-lime-700 dark:bg-lime-950/40 dark:text-lime-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    'medium-high': 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
    high: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  }
  const levelLabels: Record<string, string> = {
    low: 'Easy',
    'low-medium': 'Easy-Moderate',
    medium: 'Moderate',
    'medium-high': 'Moderate-Hard',
    high: 'Hard',
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Execution Difficulty</p>
        </div>
        <Badge variant="outline" className={levelColors[difficulty.level] || levelColors.medium}>
          {levelLabels[difficulty.level] || difficulty.level}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border bg-muted/20 p-2 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Demand</p>
          <p className="text-xs font-bold">{capitalize(difficulty.demandLevel)}</p>
        </div>
        <div className="rounded-md border bg-muted/20 p-2 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Competition</p>
          <p className="text-xs font-bold">{capitalize(difficulty.competitionLevel)}</p>
        </div>
        <div className="rounded-md border bg-muted/20 p-2 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tech Complexity</p>
          <p className="text-xs font-bold">{capitalize(difficulty.technicalComplexity)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs">
          <Timer className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">MVP:</span>
          <span className="font-semibold">{difficulty.timeToMvp}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Budget:</span>
          <span className="font-semibold">{difficulty.estimatedBudget}</span>
        </div>
      </div>

      {difficulty.keyChallenges && difficulty.keyChallenges.length > 0 && (
        <div className="pt-1.5 border-t">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Key Challenges</p>
          <ul className="space-y-0.5">
            {difficulty.keyChallenges.map((challenge, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" />
                <span>{challenge}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── False Opportunity Block ───────────────────────────────────────
export function FalseOpportunityBlock({ falseOpp }: { falseOpp: FalseOpportunityAnalysis }) {
  const verdictConfig: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
    pursue: { icon: ShieldCheck, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/40', label: 'Pursue' },
    caution: { icon: ShieldAlert, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40', label: 'Caution' },
    avoid: { icon: ShieldX, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40', label: 'Avoid' },
  }
  const vc = verdictConfig[falseOpp.verdict] || verdictConfig.caution
  const VerdictIcon = vc.icon

  return (
    <div className={`rounded-lg border-2 p-3 space-y-2 ${vc.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className={`h-4 w-4 shrink-0 ${vc.color}`} />
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Opportunity Verdict</p>
        </div>
        <Badge variant="outline" className={`${vc.bg} ${vc.color} border-current font-bold`}>
          <VerdictIcon className="h-3 w-3 mr-1" />
          {vc.label}
        </Badge>
      </div>

      {falseOpp.isFalseOpportunity && falseOpp.reason && (
        <div className="rounded-md border border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-950/20 p-2">
          <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-0.5">False Opportunity Detected</p>
          <p className="text-xs text-foreground leading-relaxed">{falseOpp.reason}</p>
        </div>
      )}

      {falseOpp.estimatedMarketSize && (
        <div className="flex items-center gap-2 text-xs">
          <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Market Size:</span>
          <span className="font-bold">{falseOpp.estimatedMarketSize}</span>
        </div>
      )}

      {falseOpp.riskFactors && falseOpp.riskFactors.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Risk Factors</p>
          <ul className="space-y-0.5">
            {falseOpp.riskFactors.map((risk, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs">
                <XCircle className="h-3 w-3 shrink-0 mt-0.5 text-red-500" />
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Founder Fit Block ────────────────────────────────────────────
export function FounderFitBlock({ founderFit }: { founderFit: FounderFitSuggestion }) {
  const fitIcons: Record<FounderFitType, React.ElementType> = {
    solo_developer: Code2,
    b2b_saas: Briefcase,
    content_creator: PenTool,
    student_founder: GraduationCap,
    agency: Building2,
    enterprise: Globe,
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Founder Fit</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {founderFit.bestFit.map((fit, i) => {
          const FitIcon = fitIcons[fit as FounderFitType] || Users
          return (
            <Badge key={i} className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 gap-1.5">
              <FitIcon className="h-3 w-3" />
              {FOUNDER_FIT_LABELS[fit as FounderFitType] || fit}
            </Badge>
          )
        })}
      </div>

      <p className="text-xs text-foreground leading-relaxed">{founderFit.rationale}</p>

      <div className="grid grid-cols-2 gap-2">
        {founderFit.requiredSkills && founderFit.requiredSkills.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Required Skills</p>
            <ul className="space-y-0.5">
              {founderFit.requiredSkills.map((skill, i) => (
                <li key={i} className="flex items-center gap-1 text-xs">
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-green-500" />
                  <span>{skill}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Ideal Team</p>
          <p className="text-xs font-semibold">{founderFit.idealTeamSize}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Source Transparency Block ────────────────────────────────────
export function SourceTransparencyBlock({ source }: { source: SourceTransparency }) {
  const confidenceConfig: Record<string, { color: string; bg: string }> = {
    high: { color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-950/40' },
    medium: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/40' },
    low: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-950/40' },
  }
  const cc = confidenceConfig[source.confidenceLevel] || confidenceConfig.medium

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Source Transparency</p>
        </div>
        <Badge variant="outline" className={`${cc.bg} ${cc.color} text-[10px]`}>
          {source.confidenceLevel} confidence
        </Badge>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {source.sourcePlatforms.map((platform, i) => (
          <Badge key={i} variant="outline" className="text-[10px] h-5">
            <ExternalLink className="h-2.5 w-2.5 mr-0.5" />
            {platform}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border bg-background p-1.5 text-center">
          <p className="text-[10px] text-muted-foreground">Comments</p>
          <p className="text-sm font-bold tabular-nums">{source.totalComments}</p>
        </div>
        <div className="rounded-md border bg-background p-1.5 text-center">
          <p className="text-[10px] text-muted-foreground">Complaint Freq</p>
          <p className="text-sm font-bold tabular-nums">{source.complaintFrequency}/100</p>
        </div>
        <div className="rounded-md border bg-background p-1.5 text-center">
          <p className="text-[10px] text-muted-foreground">Sources</p>
          <p className="text-sm font-bold tabular-nums">{source.reviewSources?.length || source.sourcePlatforms.length}</p>
        </div>
      </div>

      {source.reviewSources && source.reviewSources.length > 0 && (
        <div className="space-y-1">
          {source.reviewSources.map((rs, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{rs.platform}</span>
              <div className="flex items-center gap-2">
                <span className="tabular-nums">{rs.count} reviews</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1">{rs.avgScore.toFixed(1)}/10</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      {source.dataFreshness && (
        <p className="text-[10px] text-muted-foreground italic">{source.dataFreshness}</p>
      )}
    </div>
  )
}

// ─── Why Existing Products Fail Block ─────────────────────────────
export function WhyExistingProductsFailBlock({ whyFail }: { whyFail: WhyExistingProductsFail }) {
  return (
    <div className="rounded-lg border-2 border-red-200 dark:border-red-900/40 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
        <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Why Existing Products Fail</p>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Root Cause</p>
          <p className="text-xs text-foreground leading-relaxed">{whyFail.rootCause}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">User Impact</p>
          <p className="text-xs text-foreground leading-relaxed">{whyFail.userImpact}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Why Competitors Miss This</p>
          <p className="text-xs text-foreground leading-relaxed">{whyFail.missedByCompetitors}</p>
        </div>
      </div>
    </div>
  )
}

// ─── Market Quadrant Block ────────────────────────────────────────
export function MarketQuadrantBlock({ quadrant }: { quadrant: MarketQuadrantPosition }) {
  const quadrantConfig: Record<string, { color: string; bg: string; icon: React.ElementType }> = {
    goldmine: { color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/20', icon: Flame },
    blue_ocean: { color: 'text-sky-700 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/20', icon: Globe },
    crowded: { color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20', icon: Users },
    dead_zone: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/20', icon: ShieldX },
  }
  const qc = quadrantConfig[quadrant.quadrant] || quadrantConfig.blue_ocean
  const QuadrantIcon = qc.icon

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${qc.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QuadrantIcon className={`h-4 w-4 shrink-0 ${qc.color}`} />
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Market Position</p>
        </div>
        <Badge variant="outline" className={`${qc.bg} ${qc.color} border-current font-bold text-[10px]`}>
          {quadrant.label || quadrant.quadrant.replace('_', ' ')}
        </Badge>
      </div>

      {/* Mini quadrant chart */}
      <div className="relative w-full aspect-square max-w-[120px] mx-auto">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Axes */}
          <line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground/30" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground/30" />
          {/* Labels */}
          <text x="25" y="20" textAnchor="middle" className="fill-muted-foreground/50 text-[6px] font-medium">GOLDMINE</text>
          <text x="75" y="20" textAnchor="middle" className="fill-muted-foreground/50 text-[6px] font-medium">CROWDED</text>
          <text x="25" y="85" textAnchor="middle" className="fill-muted-foreground/50 text-[6px] font-medium">BLUE OCEAN</text>
          <text x="75" y="85" textAnchor="middle" className="fill-muted-foreground/50 text-[6px] font-medium">DEAD ZONE</text>
          {/* Data point */}
          <circle
            cx={quadrant.competitionScore}
            cy={100 - quadrant.opportunityScore}
            r="5"
            className={qc.color.replace('text-', 'fill-')}
          />
        </svg>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Competition: <span className="font-bold">{quadrant.competitionScore}/100</span></span>
        <span className="text-muted-foreground">Opportunity: <span className="font-bold">{quadrant.opportunityScore}/100</span></span>
      </div>
    </div>
  )
}

// ─── Large Market Quadrant Visualization (for Dashboard) ──────────
export function MarketQuadrantChart({ items }: { items: { name: string; quadrant: MarketQuadrantPosition }[] }) {
  const quadrantColors: Record<string, string> = {
    goldmine: 'fill-green-500',
    blue_ocean: 'fill-sky-500',
    crowded: 'fill-amber-500',
    dead_zone: 'fill-red-500',
  }

  return (
    <div className="relative w-full aspect-square max-w-[280px] mx-auto">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Background quadrants */}
        <rect x="0" y="0" width="100" height="100" className="fill-green-50 dark:fill-green-950/20" />
        <rect x="100" y="0" width="100" height="100" className="fill-amber-50 dark:fill-amber-950/20" />
        <rect x="0" y="100" width="100" height="100" className="fill-sky-50 dark:fill-sky-950/20" />
        <rect x="100" y="100" width="100" height="100" className="fill-red-50 dark:fill-red-950/20" />

        {/* Quadrant labels */}
        <text x="50" y="30" textAnchor="middle" className="fill-green-700 dark:fill-green-400 text-[8px] font-bold">GOLDMINE</text>
        <text x="50" y="40" textAnchor="middle" className="fill-green-600 dark:fill-green-500 text-[5px]">Low Competition · High Opp</text>
        <text x="150" y="30" textAnchor="middle" className="fill-amber-700 dark:fill-amber-400 text-[8px] font-bold">CROWDED</text>
        <text x="150" y="40" textAnchor="middle" className="fill-amber-600 dark:fill-amber-500 text-[5px]">High Competition · High Opp</text>
        <text x="50" y="170" textAnchor="middle" className="fill-sky-700 dark:fill-sky-400 text-[8px] font-bold">BLUE OCEAN</text>
        <text x="50" y="180" textAnchor="middle" className="fill-sky-600 dark:fill-sky-500 text-[5px]">Low Competition · Lower Opp</text>
        <text x="150" y="170" textAnchor="middle" className="fill-red-700 dark:fill-red-400 text-[8px] font-bold">DEAD ZONE</text>
        <text x="150" y="180" textAnchor="middle" className="fill-red-600 dark:fill-red-500 text-[5px]">High Competition · Low Opp</text>

        {/* Axes */}
        <line x1="100" y1="0" x2="100" y2="200" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground/20" />
        <line x1="0" y1="100" x2="200" y2="100" stroke="currentColor" strokeWidth="0.5" className="text-muted-foreground/20" />

        {/* Axis labels */}
        <text x="100" y="198" textAnchor="middle" className="fill-muted-foreground text-[6px]">Competition →</text>
        <text x="3" y="105" textAnchor="start" className="fill-muted-foreground text-[6px]" transform="rotate(-90, 8, 100)">Opportunity →</text>

        {/* Data points */}
        {items.map((item, i) => (
          <g key={item.name + i}>
            <circle
              cx={item.quadrant.competitionScore * 2}
              cy={200 - item.quadrant.opportunityScore * 2}
              r="6"
              className={`${quadrantColors[item.quadrant.quadrant] || 'fill-gray-500'} opacity-80`}
              stroke="white"
              strokeWidth="1"
            />
            <text
              x={item.quadrant.competitionScore * 2}
              y={200 - item.quadrant.opportunityScore * 2 - 10}
              textAnchor="middle"
              className="fill-foreground text-[5px] font-semibold"
            >
              {item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// Helper
function capitalize(str: string): string {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''
}
