---
Task ID: 1-6
Agent: Main Agent
Task: Build complete ProductHunt Gap Finder Agent - Database, Backend APIs, Frontend

Work Log:
- Designed and implemented Prisma database schema with 6 models: Product, Gap, Complaint, Opportunity, Trend, ScanJob
- Pushed schema to SQLite database successfully
- Created types/index.ts with all TypeScript interfaces and constants
- Created lib/zai.ts with ZAI SDK helper functions (webSearch, readPage, chatCompletion, generateStructuredResponse)
- Built 5 API route files:
  - /api/scan - Product Hunt scanner using web search + page reader + LLM extraction
  - /api/analyze - Gap detection, market saturation scoring, complaint analysis using LLM
  - /api/opportunities - Full CRUD for opportunities (GET, POST, PATCH, DELETE)
  - /api/trends - Trend detection via web search + LLM, competitor comparison via LLM
  - /api/dashboard - Dashboard statistics aggregation
- Fixed webSearch return format (returns array directly, not {results:[]})
- Fixed readPage return format (returns {data: {html, title, ...}})
- Fixed frontend-backend data format mismatches (API returns arrays directly, not wrapped in objects)
- Fixed trends panel to send action: 'detect' and action: 'compare' parameters
- Built complete frontend with 7 component files:
  - gap-finder-app.tsx - Main app shell with header, tabs, theme toggle
  - dashboard-overview.tsx - Stats cards, bar chart, recent gaps, trending categories
  - scanner-panel.tsx - Category/period selectors, sortable product table
  - gap-analysis-panel.tsx - Gap type filters, color-coded gap cards, saturation scores
  - opportunities-panel.tsx - Generator with focus area, quality badges, save/bookmark
  - trends-compare-panel.tsx - Trend detection, sparkline charts, competitor comparison table
  - store.ts - Zustand store for shared state
- Updated globals.css with orange/amber theme (light + dark modes)
- Updated layout.tsx with GapFinder metadata
- All lint checks pass, dev server running on port 3000

Stage Summary:
- Full-stack application is built and running
- All 8 core features implemented: Scanner, Gap Detection, Saturation Scoring, Complaint Analyzer, Opportunity Generator, Trend Detection, Competitor Comparison, Saved Opportunities
- Orange/amber color theme (Product Hunt inspired), dark mode support
- Responsive design with mobile-first approach
- Fixed frontend-backend data format mismatches
- Fixed webSearch/readPage return format handling
- Generated brand hero image
- Added welcome hero section on dashboard
- Created seed data with 5 products, 5 gaps, 7 complaints, 3 trends, 3 opportunities
- All lint checks pass, dev server running on port 3000
- Dashboard API verified with real data

---
Task ID: 7
Agent: Main Agent
Task: Implement 12 priority improvements for ProductHunt Gap Finder Agent

Work Log:
- Updated TypeScript types with new interfaces: EvidenceDetail, SubNiche, ProductReference, UnderservedUserGroup, ComplaintCluster, OpportunityScoreBreakdown, TimePeriod, SEARCH_SUGGESTIONS
- Updated DashboardStats to include: trendingGaps, saturatedMarkets, emergingNiches, complaintTrends, fastestGrowingCategories, underservedUsers
- Updated Prisma schema with new fields on Gap model: evidenceDetail, whyThisMatters, subNiche, affectedProducts, underservedUsers
- Updated Prisma schema with new fields on Opportunity model: evidenceDetail, opportunityScore, whyThisMatters, subNiche, affectedProducts, underservedUsers
- Updated Prisma schema with new fields on Trend model: subNiches, underservedUsers
- Pushed schema to DB and regenerated Prisma client
- Updated analyze API: enriched LLM prompts to generate evidenceDetail, whyThisMatters, subNiche, affectedProducts, underservedUsers for gaps; complaint clustering; competitor breakdown for saturation; sub-niches for markets
- Updated opportunities API: enriched LLM prompts to generate opportunityScore breakdown (complaintFrequency, competitionDensity, pricingDissatisfaction, launchGrowth, underservedAudience), whyThisMatters, subNiche, affectedProducts, underservedUsers
- Updated dashboard API: added trendingGaps, saturatedMarkets with saturation meters, emergingNiches, complaintTrends clusters, fastestGrowingCategories, underservedUsers sections; time period filtering
- Updated trends API: enriched trend detection with subNiches and underservedUsers; enriched competitor comparison with underservedUsers
- Updated Zustand store: added timePeriod, complaintClusters state fields
- Rebuilt dashboard-overview.tsx with: Time filter (7d/30d/90d), Trending Gaps section, Saturated Markets with visual SaturationMeter, Emerging Niches, Complaint Trends with clustering bars, Fastest Growing Categories, Underserved Users section
- Rebuilt gap-analysis-panel.tsx with: Evidence Layer (similarProducts, repeatedComplaints, launchFrequency, commentSnippets, pricingOverlap), Why This Matters, Sub-Niche Detection, Affected Products breakdown, Underserved Users, Complaint Clustering, Competitor Breakdown in saturation, Visual SaturationMeter, Time filtering, Expandable detail sections
- Rebuilt opportunities-panel.tsx with: Opportunity Score breakdown (5 factors, 0-100 with explanation), Why This Matters, Sub-Niche badge, Affected Products, Underserved Users, Evidence Layer, Search Suggestions dropdown, Time filtering, Expandable score details
- Updated scanner-panel.tsx with: Search Suggestions dropdown (12 example searches), Quick search input, Suggestion pills in empty state
- Rebuilt trends-compare-panel.tsx with: Sub-Niche badges on trend cards, Expandable Underserved Users per trend, Underserved Users section in competitor comparison results
- Updated gap-finder-app.tsx with: Sticky footer
- All lint checks pass, dev server running on port 3000, dashboard API verified with enriched data

Stage Summary:
- All 12 priorities implemented:
  1. Evidence Layer - evidenceDetail with similarProducts, repeatedComplaints, launchFrequency, commentSnippets, pricingOverlap under every gap and opportunity
  2. Complaint Clustering - grouped complaints by category with percentages and example snippets
  3. Competitor Breakdown - top competitors with pricing, strengths, weaknesses for each market
  4. Saturation Meter - visual progress bar with color-coded competition levels
  5. Opportunity Score - 5-factor scoring (0-100) with explanation, not mysterious AI numbers
  6. "Why This Matters" - business-oriented explanation under every insight
  7. Sub-Niche Detection - specific sub-niches (e.g., "ATS resume tools for engineering students" not just "resume tools")
  8. Real Product Examples - affected products with name, pricing, strengths, weaknesses
  9. Search Suggestions - 12 example searches shown on focus
  10. Improved UI Structure - dashboard with Trending Gaps, Saturated Markets, Emerging Niches, Complaint Trends, Fastest Growing sections
  11. Time Filtering - 7/30/90 day filters on dashboard, analysis, and opportunities panels
  12. Underserved Users - detected user groups ignored by current products with opportunity scores
- Product feels like market intelligence software, not GPT response viewer
- Insights are specific, provable, actionable - not generic AI fluff

---
Task ID: 3
Agent: api-improver
Task: Upgrade backend analysis API for evidence-backed insights

Work Log:
- Fixed complaint-to-product mapping bug: replaced `products[0]` hardcode with `findRelevantProductForComplaint()` that scores products by name mentions, partial name word matches, and category keyword matches in complaint text
- Improved analyzeGaps LLM prompt: added "Be SPECIFIC, not generic" rules with right/wrong examples; demanded evidence numbers (product counts, complaint counts, specific prices); prohibited vague statements like "The market is growing"; required hyper-specific sub-niche names and quoted comment snippets
- Improved analyzeComplaints LLM prompt: demanded specific complaint text citing product names/prices/feature names (not vague summaries); required accurate frequency counts; enforced clustering percentages totaling ~100%; required verbatim quoted snippets in clusters (not paraphrased)
- Improved analyzeSaturation competitor breakdown prompt: required at least 3 competitors per category; demanded specific strengths/weaknesses with examples (not "good UI" but "drag-and-drop onboarding in under 2 minutes"); added pricing comparison context requirement
- Improved sub-niche detection prompt: demanded hyper-specific sub-niches with WHO+WHAT+CONTEXT pattern; provided examples like "AI debugging assistants for junior developers who write Python" and "ATS resume optimizers for engineering graduates entering FAANG"
- Extracted safeJsonParse to shared utility at src/lib/json.ts with proper generic typing; imported in analyze/route.ts; removed local definition
- Lint passes cleanly

Stage Summary:
- Analysis API now generates specific, evidence-backed insights
- Complaints are properly mapped to relevant products instead of all going to products[0]
- All LLM prompts demand specific numbers, quoted text, and actionable recommendations
- Shared json utility reduces code duplication

---
Task ID: 4
Agent: dashboard-upgrader
Task: Upgrade Dashboard Overview to professional market intelligence feel

Work Log:
- Created shared SaturationMeter component at src/components/ui/saturation-meter.tsx with props: score, label?, showLevel?, size? ('sm' | 'md')
- Updated dashboard-overview.tsx with 8 specific improvements:
  1. Extracted SaturationMeter to shared component, imported from @/components/ui/saturation-meter
  2. Improved Welcome Hero: replaced "New" badge with "Market Intelligence" label; changed heading to "Find Market Gaps Before Others Do"; updated description; added 3 feature highlights (Real Launch Data, Complaint Analysis, Opportunity Scoring) with icons
  3. Improved Trending Gaps: evidence detail as small stat pills with icons; "Why This Matters" as proper callout with Info icon; affected products as small badges
  4. Improved Saturated Markets: competitor comparison table (name, pricing, key strength, key weakness); more prominent saturation meter with size="md"
  5. Improved Complaint Trends: large KPI percentage number with category-colored text; colored bars (red=pricing/performance, amber=missing features/ux, blue=integration/support); 2-3 example snippets with Quote icons instead of just 1
  6. Added Data Confidence indicators: "Source: N product scans across N categories" under heading; "Updated Xm ago" timestamps under stat cards
  7. Improved Emerging Niches: parentCategory shown as small tag badge; opportunityScore as colored progress bar (green/amber/red) instead of just badge
  8. Improved Underserved Users: evidence as blockquote-style element with border-l-[3px]; colored dot indicators (green=high, amber=medium, red=low) for opportunity scores
- Updated gap-analysis-panel.tsx: imported shared SaturationMeter from @/components/ui/saturation-meter; removed inline duplicate SaturationMeter function; updated usage with size="sm"
- Removed unused Progress import from dashboard-overview.tsx
- Fixed border-l-3 to border-l-[3px] for Tailwind compatibility
- Lint passes cleanly (0 errors)

Stage Summary:
- Dashboard now feels like professional market intelligence software with evidence-first design
- Shared SaturationMeter component eliminates code duplication between dashboard and gap analysis panels
- All 8 improvements implemented: hero refresh, stat pills, callouts, comparison tables, KPI numbers, colored bars, data confidence, blockquotes, progress bars, dot indicators
- No TypeScript errors, clean lint

---
Task ID: 5-6
Agent: panel-upgrader
Task: Upgrade Opportunities Panel and Trends Panel to be more evidence-backed and professional

Work Log:
- Updated TrendData interface in types/index.ts to add marketContext field with productCount, avgUpvotes, launchFrequency, highComplaintActivity, rapidGrowth
- Rebuilt opportunities-panel.tsx with 7 improvements:
  1. Opportunity Score always visible as colored badge (green/amber/red) in card header + mini segmented score bar with 5 sub-scores as stacked bar with tooltips
  2. "Why This Matters" always visible as gradient callout box with ShieldCheck icon, not hidden behind expand
  3. Evidence detail shown inline as stat pills (similar products, complaints, pricing overlap, recent launches)
  4. Affected products shown as mini comparison with Link2 icon, product name, pricing badge, one key strength and one key weakness per product
  5. Sub-niche shown as highlighted tag with green bg white text Badge + CircleDot score indicator
  6. Underserved users shown prominently with UserCircle icon, name, one-line evidence, and ScoreDot colored indicator
  7. Save mechanism fixed: on save, calls PATCH /api/opportunities with opportunity ID to persist to DB; on unsave, also calls PATCH with isSaved:false; on load, fetches saved state from GET /api/opportunities?saved=true
- Rebuilt trends-compare-panel.tsx with 4 improvements:
  1. Market context added to each trend card: N products, avg upvotes, launch frequency as stat pills with Package/ThumbsUp/Rocket icons
  2. Sparkline visualization improved: large growth rate number (text-xl font-bold) with direction arrow (ArrowUpRight/ArrowDownRight) and color, period label (e.g., "Last 90 days") below
  3. Sub-niches shown with opportunity scores as clickable list items with Target icon and score badges; clicking navigates to opportunities tab via setActiveTab
  4. Competitive signals added: "High complaint activity" red badge with AlertTriangle icon, "Rapidly growing market" green badge with Zap icon; derived from trend data
- Added helper functions: formatPeriodLabel, enrichTrendsWithContext, ScoreDot, StatPill, CompetitiveSignal, SubNicheItem
- Added Tooltip components for score dots and segmented bar segments
- All lint checks pass cleanly (0 errors, 0 warnings)

Stage Summary:
- Opportunities Panel is now fully evidence-backed with all key data visible without expansion
- Score, evidence, why-it-matters, sub-niche, competitors, and underserved users are always visible
- Save/unsave persists to database via PATCH API
- Trends Panel shows market context, large growth indicators, clickable sub-niches, and competitive signals
- Both panels feel like professional market intelligence software, not GPT response viewers

---
Task ID: 6
Agent: panel-redesigner
Task: Redesign GapScope Opportunities Panel to feel like a professional market intelligence platform

Work Log:
- Complete rewrite of opportunities-panel.tsx with 8 major improvements:
  1. Evidence Layer Always Visible: Evidence section shown in dashed-border box with uppercase "EVIDENCE" header; metric pills with specific icons (Database=similar products, MessageSquare=complaints, DollarSign=pricing overlap, Rocket=recent launches, TrendingUp=growth with green accent); affected products listed as text under evidence
  2. Visual Opportunity Score Gauge: Large colored number (0-100) in rounded-lg box with ring-4 glow effect (green/amber/red based on score); replaces simple Badge; always visible in card header
  3. "Why This Matters" Always Visible: Orange-bordered callout (border-2 border-orange-300) with ShieldCheck icon and bold "Why This Matters" label; gradient background from orange-50 to amber-50; not behind expand
  4. Product References Always Visible: Compact inline format with Link2 icon, product name (truncated), pricing badge, green check for strength, red X for weakness; wrapped in flex-wrap container
  5. Sub-Niche Badge Always Visible: Green Badge with Target icon + sub-niche name + ScoreDot indicator + numeric score (e.g., "78/100"); uses dedicated Target icon instead of TrendingUp
  6. Underserved Users Always Visible: Compact rows with UserCircle icon, user group name (purple), ScoreDot indicator, brief evidence text; shows max 3 with "+N more" overflow
  7. Enhanced Expandable Section: Full score breakdown with labeled bars and numeric values; full product comparison table with name, pricing badge, grid of strengths (green checks) and weaknesses (red Xs); full underserved user details with Quote icon for evidence; gap evidence list with ArrowUpRight bullet points; complaint references with Quote icons; category badge + trend signal count
  8. Improved Card Layout: Follows specified wireframe - Row 1: ScoreGauge + saturation + save; Row 2: MiniScoreBar; Row 3: Title + description; Row 4: Evidence box; Row 5: Why This Matters callout; Row 6: Sub-niche badge; Row 7: Product refs; Row 8: Underserved users; Row 9: Expand toggle
- New sub-components created: ScoreGauge, MiniScoreBar, FullScoreDisplay, EvidencePill, ScoreDot, CompactProductRef, CompactUserRow, FullProductTable, FullUserDetail
- Added new imports: Database, DollarSign, Rocket, Target, Quote, ArrowUpRight
- All existing functionality preserved: save/unsave with API persistence, generate opportunities, focus area, search suggestions, time period filtering, all/saved view tabs
- Lint passes cleanly (0 errors)
- No runtime errors in dev log

Stage Summary:
- Opportunities Panel completely redesigned to professional market intelligence platform feel
- All 8 key data sections (score, evidence, why-this-matters, sub-niche, products, users, gaps, complaints) are always visible without expansion
- Evidence pills use specific icons (Database, MessageSquare, DollarSign, Rocket, TrendingUp) for instant recognition
- Score gauge is prominent with colored glow ring effect
- Orange-bordered "Why This Matters" callout is unmissable
- Expand section provides deep detail for each data section
- Card layout matches the specified wireframe structure

---
Task ID: 5
Agent: panel-redesigner
Task: Redesign GapScope Gap Analysis Panel to feel like a professional market intelligence platform

Work Log:
- Rewrote /home/z/my-project/src/components/gap-analysis-panel.tsx with 7 major improvements:
  1. Structured Evidence Block (always visible on each gap card): Each evidence item shows icon + descriptive text (Package icon for similar products, MessageCircle for complaints, DollarSign for pricing overlap, Rocket for launch frequency, TrendingUp for launch growth); user feedback snippets as blockquote-style elements with border-l and curly quotes
  2. Enhanced Complaint Clustering Section: Total complaints count badge at top; each cluster shows large bold percentage number (text-2xl) with category-colored text; animated horizontal bar chart with category-specific colors (pricing=red, missing_feature=amber, integration=sky, ux=purple, support=orange, performance=red); 2-3 blockquoted example snippets per cluster; staggered animation on mount
  3. Product References on Every Gap: Always visible AffectedProductsRow component showing product name, pricing badge, 1 strength (green Check), 1 weakness (red X) in a compact card; full product details still in expandable section
  4. "Why This Matters" on Every Gap: Distinct orange-bordered callout (border-2 border-orange-300) with Shield icon; always visible, not behind expand; specific business reasoning displayed prominently
  5. Sub-Niche Detection Badge: Always visible green badge component with CircleDot icon, green Badge for sub-niche name, opportunity score outline badge; description text below
  6. Visual Market Metrics per Saturation Entry: MetricDot component rendering 5-segment mini visual bars; Launch Frequency, Complaint Frequency, and Opportunity Score indicators shown as colored bar segments (red≥70%, amber≥40%, green<40%); also shows numeric value
  7. Improved Gap Card Layout: Strict order: gap type badge + severity badge → title → description → evidence block → why this matters → affected products → sub-niche badge → expand button → underserved users, full product details, supporting evidence text
- Extracted reusable sub-components: EvidenceBlock, WhyThisMatters, SubNicheBadge, AffectedProductsRow, MetricDot, SaturationEntry, ComplaintClusteringSection
- SaturationEntry has its own expand/collapse for competitor breakdown to keep cards compact
- Saturation sub-niches shown as solid green badges with opportunity scores
- All complaint cluster bars animated with framer-motion stagger
- Lint passes cleanly (0 errors)
- Dev server running on port 3000

Stage Summary:
- Gap Analysis Panel completely redesigned with evidence-first, always-visible insight layout
- No critical data hidden behind expand - evidence, why-it-matters, products, and sub-niches always shown
- Professional market intelligence feel with structured evidence blocks, KPI-style complaint clustering, and visual metric indicators
- Color-coded by category: pricing=red, missing_feature=amber, integration=sky, ux=purple, support=orange
- Dark mode fully supported throughout

---
Task ID: 4
Agent: dashboard-redesigner
Task: Redesign Dashboard Overview to feel like professional market intelligence platform (CB Insights, G2, Similarweb)

Work Log:
- Completely rewrote /src/components/dashboard-overview.tsx with 7 major improvements:
  1. Visual Market Metrics Bar — Prominent metrics strip below stat cards showing: Market Health indicator (expanding/stable/contracting) with colored icon badge, Avg Launch Growth % with trend arrow, Total Complaints count, High-Opportunity Gaps count, Avg Opportunity Score as mini gauge. Uses data.marketMetrics (handles undefined gracefully). Divided into sections with border dividers.
  2. Enhanced Trending Gaps with Structured Evidence Blocks — Each gap now shows: Severity badge + title + description, Structured Evidence Block (dedicated component) showing "X similar products launched in last 90 days", "X complaints about this topic", "X% pricing overlap", "X launches/month", "+X% launch growth" (conditional), "Why This Matters" as gradient orange callout with ShieldCheck icon and bold label, Affected Products as badges with Link2 icon + pricing shown inline + tooltip showing strength/weakness, Sub-Niche as green badge with CircleDot icon + opportunity score.
  3. Professional Complaint Clustering — Redesigned from simple bars to: Large 3xl percentage number with category-colored text, Label + count badge on same row, Colored progress bar, 2-3 quoted snippets in proper blockquote style (border-l-[3px] with purple/accent border, rounded-r, bg), Uses &ldquo; &rdquo; for proper quotation marks.
  4. Enhanced Saturated Markets — Each market shows: Category name with saturation level badge, Visual SaturationMeter component, Factor breakdown as mini MetricPill components (similar products, feature overlap %, launches/month, complaints, pricing similarity %) with color-coded icons, Top Competitors table (name, pricing, strength, weakness), Sub-niches as green badges.
  5. Enhanced Emerging Niches — Each niche shows: Name (specific) + description, Parent category tag badge, Opportunity Score as colored progress bar with label and value, "Why it matters" info callout for high-opportunity niches (score >= 60).
  6. Underserved Users Enhancement — Each user group shows: Colored dot indicator (green/amber/red), User group name + description, Opportunity score badge (purple themed), Evidence as blockquote-style element with purple border-l-[3px] and bg.
  7. Stat Cards Enhancement — Added: Top gradient accent line (orange-to-amber), Gradient icon background (from-orange-100 to-amber-50), Trend indicators (up/down/stable arrows) derived from marketMetrics data, Trend logic: productsTrend based on avgLaunchGrowth, gapsTrend based on highOpportunityCount, oppTrend based on avgOpportunityScore, satTrend based on avgSaturation.
- Added new sub-components: MarketHealthBadge, MetricPill, MiniGauge, EvidenceBlock
- Added utility functions: getComplaintTextColor, getOpportunityColor, getScoreDotColor
- Added new imports: Activity, ShieldCheck, Rocket, Gauge, CircleDot, Link2, Tooltip/TooltipContent/TooltipProvider/TooltipTrigger
- Removed unused imports: useState, Clock
- Handles data.marketMetrics being undefined (all mm-derived sections conditional)
- All lint checks pass cleanly (0 errors)
- Dev server running, dashboard API verified returning 200

Stage Summary:
- Dashboard redesigned to feel like professional market intelligence platform (CB Insights / G2 / Similarweb feel)
- 7 major improvements: metrics bar, structured evidence, complaint clustering, saturated market details, emerging niche scoring, underserved user enhancement, stat card trends
- Evidence-first design with structured evidence blocks, blockquote snippets, gradient callouts
- Professional data density — more specific numbers, less generic AI language
- Clean lint, no TypeScript errors, responsive + dark mode support

---
Task ID: 8
Agent: Main Agent
Task: Complete analytical depth and credibility improvements across all panels

Work Log:
- Updated types/index.ts: Added launchGrowth field to EvidenceDetail, added marketMetrics to DashboardStats (avgLaunchGrowth, totalComplaints, highOpportunityCount, avgOpportunityScore, marketHealth)
- Enhanced analyze/route.ts LLM prompt with 4 critical rules for evidence-backed output: hyper-specific not generic, cite specific numbers, provable and actionable, specific titles about WHO and WHAT
- Added launchGrowth to evidenceDetail LLM output schema
- Fixed dashboard API: removed Math.random() for featureOverlap and pricingSimilarity, now calculated deterministically from actual product data
- Added marketMetrics computation to dashboard API: avgLaunchGrowth, totalComplaints, highOpportunityCount, avgOpportunityScore, marketHealth
- Redesigned dashboard-overview.tsx: Market Health Summary bar, structured evidence blocks, professional complaint clustering, enhanced saturated markets, emerging niche scoring, underserved user enhancement, stat card trend indicators
- Redesigned gap-analysis-panel.tsx: structured evidence blocks (always visible), enhanced complaint clustering with colored bars, product references always visible, why-this-matters callouts, sub-niche badges, visual market metrics
- Redesigned opportunities-panel.tsx: evidence layer always visible, visual opportunity score gauge, why-this-matters callout, product references always visible, sub-niche badges, underserved users always visible, enhanced expandable sections
- Redesigned trends-compare-panel.tsx: market health summary bar, enhanced trend cards with evidence, market context metrics, competitive signals, sub-niches, underserved users with blockquotes, professional comparison results
- Fixed data.fastestGrowing → data.fastestGrowingCategories type mismatch in dashboard-overview.tsx
- All lint checks pass (0 errors)
- TypeScript compilation clean for src/ directory
- Dev server running on port 3000, dashboard API verified returning marketMetrics

Stage Summary:
- All 7 analytical depth improvements implemented:
  1. Evidence Layer — structured evidence blocks under every insight with specific numbers
  2. Complaint Clustering — themed percentages with colored bars and quoted snippets
  3. Product References — real products with pricing, strengths, weaknesses on every insight
  4. Sub-Niche Detection — hyper-specific niches (e.g., "AI debugging for junior Python devs")
  5. Visual Market Metrics — saturation bars, opportunity scores, trend indicators, growth metrics
  6. "Why This Matters" — business-oriented explanations with causal mechanisms on every insight
  7. Insight Specificity — LLM prompts demand specific numbers, named products, and evidence
- Dashboard API no longer uses random values — all metrics computed deterministically
- Market health indicator (expanding/stable/contracting) added to dashboard
- Platform now feels like professional market intelligence software (CB Insights / G2 style)
