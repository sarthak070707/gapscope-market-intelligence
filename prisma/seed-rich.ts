import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Wiping existing data...')

  // Delete in correct order for foreign keys
  await db.complaint.deleteMany()
  await db.gap.deleteMany()
  await db.opportunity.deleteMany()
  await db.trend.deleteMany()
  await db.scanJob.deleteMany()
  await db.product.deleteMany()

  console.log('✅ All existing data wiped.')

  // ========================================
  // PRODUCTS (13 products across 6 categories)
  // ========================================
  console.log('📦 Inserting products...')

  const products = await Promise.all([
    // --- AI Tools ---
    db.product.create({
      data: {
        name: 'CopyForge AI',
        tagline: 'AI copywriter that turns briefs into high-converting landing pages',
        description: 'CopyForge uses GPT-4 fine-tuned on 12,000 direct-response landing pages to generate headlines, body copy, and CTAs. Targets marketing agencies running 10+ campaigns per month who need first drafts in under 3 minutes.',
        url: 'https://copyforge.ai',
        category: 'AI Tools',
        upvotes: 847,
        launchDate: '2025-01-15',
        features: JSON.stringify([
          'Fine-tuned on 12K direct-response landing pages for higher conversion copy',
          'Brand voice cloning from 3 sample URLs in under 2 minutes',
          'A/B headline generator producing 20 variants ranked by predicted CTR',
          'One-click WordPress and Webflow export with preserved formatting',
          'Real-time SEO readability score with Hemingway-style suggestions'
        ]),
        pricing: '$29/mo',
        comments: JSON.stringify([
          'Great for quick landing page drafts but the $29/mo tier limits you to 15 generations — we burn through that in 2 days during launch sprints',
          'Brand voice cloning is legit scary good — uploaded our 3 blog posts and it nailed our tone on the first try',
          'Wish it handled long-form content better. After 800 words it starts repeating the same CTAs and transitional phrases',
          'The SEO readability score saved me from publishing a page with a Flesch-Kincaid grade level of 16 — my audience reads at grade 8',
          'Export to Webflow lost all my custom CSS classes. Had to manually re-apply 40+ styles. Please fix this'
        ]),
        reviewScore: 7.8,
        sourceUrl: 'https://producthunt.com/posts/copyforge-ai'
      }
    }),
    db.product.create({
      data: {
        name: 'DocuMentor AI',
        tagline: 'AI-powered technical documentation writer for software teams',
        description: 'DocuMentor reads your codebase, API schemas, and commit history to auto-generate API references, onboarding guides, and changelogs. Currently supports Python, TypeScript, and Go repositories with 500+ stars on GitHub.',
        url: 'https://documentor.dev',
        category: 'AI Tools',
        upvotes: 432,
        launchDate: '2025-02-03',
        features: JSON.stringify([
          'Auto-generates API docs from OpenAPI specs and code comments',
          'Changelog writer that summarizes Git diffs into user-facing release notes',
          'Onboarding guide creator that maps dependency graphs into learning paths',
          'Supports Python, TypeScript, and Go with Rust support in beta',
          'Slack integration that posts doc updates to #engineering channel'
        ]),
        pricing: 'Freemium',
        comments: JSON.stringify([
          'Perfect for our startup — we went from zero docs to decent API reference in 20 minutes. But the onboarding guides it generates assume senior developer knowledge',
          'The changelog feature is a lifesaver. Our PM used to spend 3 hours per release writing notes. Now it takes 15 minutes to review and edit',
          'No HIPAA or SOC2 compliance templates. We\'re in healthcare SaaS and can\'t use AI-generated docs without regulatory review stamps',
          'Rust support is still rough — generated docs for unsafe blocks were dangerously wrong. Had to manually rewrite 4 sections',
          'Would kill for a "regulatory mode" that adds compliance checkboxes and audit trail sections automatically'
        ]),
        reviewScore: 7.2,
        sourceUrl: 'https://producthunt.com/posts/documentor-ai'
      }
    }),
    db.product.create({
      data: {
        name: 'ScribeLens',
        tagline: 'AI meeting notes that actually capture decisions and action items',
        description: 'ScribeLens joins your Zoom, Meet, or Teams calls and produces structured notes with decisions, action items, deadlines, and owners. Uses speaker diarization accurate to 97.2% for up to 8 participants. Designed for product teams running 15+ meetings per week.',
        url: 'https://scribelens.io',
        category: 'AI Tools',
        upvotes: 1203,
        launchDate: '2024-11-20',
        features: JSON.stringify([
          '97.2% speaker diarization accuracy for meetings with up to 8 participants',
          'Auto-extracts decisions, action items, deadlines, and assigns owners',
          'Integrates with Jira, Linear, and Asana to create tasks directly from action items',
          'Meeting digest email sent within 5 minutes of call ending',
          'Searchable transcript archive with semantic search across all past meetings'
        ]),
        pricing: '$15/mo per user',
        comments: JSON.stringify([
          'The action item extraction is magical — it caught 3 commitments I would have forgotten. But $15/user/month adds up fast for our 12-person team',
          'Speaker diarization breaks down with more than 5 people. In our standups with 7 devs, it merged two speakers named "Mike M" and "Mike T" consistently',
          'Love the Jira integration. Action items show up as tickets within 2 minutes of meeting end. Our sprint retros are actually useful now',
          'No support for German or Japanese meetings. Our Tokyo office is excluded from using it entirely',
          'Wish I could set custom categories beyond "decision" and "action item" — we track risks and dependencies separately'
        ]),
        reviewScore: 8.4,
        sourceUrl: 'https://producthunt.com/posts/scribelens'
      }
    }),

    // --- Productivity ---
    db.product.create({
      data: {
        name: 'FlowState',
        tagline: 'Focus timer that blocks distractions and tracks deep work hours',
        description: 'FlowState combines a Pomodoro timer with OS-level distraction blocking (notifications, specific apps, websites) and generates weekly deep work reports. Tracks which apps you use during focus sessions vs. breaks. Built for knowledge workers trying to log 4+ hours of deep work daily.',
        url: 'https://flowstate.app',
        category: 'Productivity',
        upvotes: 634,
        launchDate: '2025-01-08',
        features: JSON.stringify([
          'OS-level distraction blocking for macOS and Windows (notifications, apps, sites)',
          'Automatic deep work tracking with weekly reports showing focus distribution',
          'Calendar integration that auto-suggests focus blocks based on meeting schedule',
          'Team dashboard showing aggregate deep work hours without exposing individual apps',
          'Pomodoro, 90-minute ultradian, and custom interval modes'
        ]),
        pricing: '$9/mo',
        comments: JSON.stringify([
          'Finally broke my 4-hour daily deep work goal after 3 weeks. The weekly report showing I spent 2.1 hours on Slack was a wake-up call',
          'Blocking is easy to bypass — just quit FlowState and all blocks vanish. Needs a lock-in mode that requires a waiting period to disable',
          'Team dashboard is great for our 8-person remote team. We set a collective goal of 120 deep work hours/week and actually hit it',
          'Linux support is "coming soon" for 6 months. Half our engineering team can\'t use it',
          'The calendar integration suggested a 90-minute focus block during my lunch break three times this week. Needs smarter scheduling logic'
        ]),
        reviewScore: 7.5,
        sourceUrl: 'https://producthunt.com/posts/flowstate-2'
      }
    }),
    db.product.create({
      data: {
        name: 'PlanGrid Pro',
        tagline: 'Project planning that adapts when tasks slip — no manual re-scheduling',
        description: 'PlanGrid Pro auto-adjusts dependent task dates when a predecessor slips, propagating changes across the full project timeline. Built for agency PMs managing 8-15 concurrent projects with shared resource pools. Replaces the Monday.com + resource spreadsheet combo.',
        url: 'https://plangridpro.com',
        category: 'Productivity',
        upvotes: 289,
        launchDate: '2025-03-01',
        features: JSON.stringify([
          'Auto-cascade: slipping a task pushes all dependents and alerts affected team members',
          'Resource conflict detection flags when the same designer is double-booked across projects',
          'Client-facing timeline view that hides internal tasks and shows only milestones',
          'Slack/Teams bot that sends daily "what slipped" summaries to stakeholders',
          'Budget tracking with burn rate alerts when project spend exceeds 80% at 50% completion'
        ]),
        pricing: '$19/mo per user',
        comments: JSON.stringify([
          'The auto-cascade is what sold us. We had a 3-day slip on a design task and it re-calculated 14 dependent tasks in 2 seconds. Our old PM had to manually shift everything',
          '$19/user/month is steep for our 20-person agency. That\'s $380/month just for project planning. We currently use a $12/user tool',
          'Client-facing view is clean but we can\'t customize the branding. Clients see "PlanGrid Pro" everywhere',
          'No integration with Harvest or Toggl for time tracking. We still have to manually enter hours in two places',
          'The burn rate alerts saved a $45K project — we were at 82% budget with only 40% of deliverables done. Caught it 3 weeks earlier than we would have'
        ]),
        reviewScore: 7.1,
        sourceUrl: 'https://producthunt.com/posts/plangrid-pro'
      }
    }),

    // --- Developer Tools ---
    db.product.create({
      data: {
        name: 'BugHunter AI',
        tagline: 'AI debugging assistant that finds root causes from error logs',
        description: 'BugHunter ingests stack traces, error logs, and recent Git diffs to pinpoint root causes and suggest fixes. Trained on 50K real-world bug reports from open-source projects. Currently supports Node.js, Python, and Java. Average time to root cause: 4.2 minutes vs. 23 minutes manual debugging.',
        url: 'https://bughunter.dev',
        category: 'Developer Tools',
        upvotes: 956,
        launchDate: '2025-02-14',
        features: JSON.stringify([
          'Root cause analysis from stack traces + Git diffs in under 5 minutes on average',
          'Suggested code fixes with confidence scores and links to similar resolved issues',
          'Integration with Sentry, Datadog, and PagerDuty for automatic triage',
          'Learning mode that improves suggestions based on your team\'s merge history',
          'Root cause reports exportable for post-mortems with timeline reconstruction'
        ]),
        pricing: '$49/mo',
        comments: JSON.stringify([
          'Found a race condition in our Node.js service that 3 senior devs missed in 2 days of debugging. The fix suggestion was spot-on. Worth every penny of $49/mo',
          'Useless for our Rust codebase. Only supports Node.js, Python, Java. The FAQ says "more languages coming" but no timeline',
          'The Sentry integration is great but it only processes errors from the last 24 hours. We needed it to analyze a spike from 5 days ago and it couldn\'t',
          '$49/month for a team of 8 devs is $392/month. We\'re a bootstrapped startup — that\'s more than our CI/CD bill',
          'The confidence scores are weird — it gave 92% confidence to a suggestion that was completely wrong for our codebase. Misleading'
        ]),
        reviewScore: 8.1,
        sourceUrl: 'https://producthunt.com/posts/bughunter-ai'
      }
    }),
    db.product.create({
      data: {
        name: 'DeployPilot',
        tagline: 'Deployment orchestrator that catches breaking changes before they hit production',
        description: 'DeployPilot sits between your CI pipeline and production. It runs canary deploys to 2% of traffic, monitors error rates and latency for 10 minutes, then auto-rolls back if SLOs are breached. Supports Kubernetes, ECS, and Vercel. Teams using it report 73% fewer production incidents.',
        url: 'https://deploypilot.io',
        category: 'Developer Tools',
        upvotes: 721,
        launchDate: '2024-12-10',
        features: JSON.stringify([
          'Automated canary deploys to 2% traffic with 10-minute SLO validation window',
          'Auto-rollback when error rate increases >2x baseline or p99 latency exceeds SLO threshold',
          'Pre-deploy breaking change detection by diffing API schemas and database migrations',
          'Slack alerts with rollback reasons, affected endpoints, and suggested investigation paths',
          'Deployment calendar showing change-freeze windows and high-risk deploy slots'
        ]),
        pricing: '$29/mo',
        comments: JSON.stringify([
          'Caught a breaking API change that our test suite missed. Would have affected 12K users. The schema diff feature paid for itself in the first week',
          'Only works with Kubernetes, ECS, and Vercel. We\'re on bare metal with Ansible and it\'s not supported at all',
          'The 10-minute canary window is too short for our low-traffic service. We get maybe 5 requests in 10 minutes at 2% — not statistically significant',
          'Wish the deployment calendar integrated with our company holidays. We had a deploy go out on Black Friday because the change-freeze wasn\'t set',
          'Rollback saved us twice in one month. But the rollback itself took 8 minutes once — longer than the canary window. Needs faster revert'
        ]),
        reviewScore: 8.7,
        sourceUrl: 'https://producthunt.com/posts/deploypilot'
      }
    }),
    db.product.create({
      data: {
        name: 'APIForge',
        tagline: 'Generate type-safe API clients from any OpenAPI spec in 8 languages',
        description: 'APIForge reads OpenAPI 3.0/3.1 specs and generates fully typed API clients for TypeScript, Python, Go, Rust, Java, Kotlin, Swift, and C#. Handles pagination, error types, and file uploads. Designed for platform teams maintaining 10+ internal APIs consumed by 50+ developers.',
        url: 'https://apiforge.dev',
        category: 'Developer Tools',
        upvotes: 518,
        launchDate: '2025-01-22',
        features: JSON.stringify([
          'Type-safe client generation from OpenAPI 3.0/3.1 in 8 languages',
          'Automatic pagination handling with async iterators and cursor support',
          'Error type generation with status-code-specific error classes',
          'CI/CD integration that auto-generates clients when specs change in your monorepo',
          'Diff reports showing breaking vs. non-breaking spec changes before client regeneration'
        ]),
        pricing: 'Free',
        comments: JSON.stringify([
          'Finally ditched our hand-rolled TypeScript client. The generated types caught 3 bugs on day one that our manual types missed',
          'The Rust generator produces code that doesn\'t compile for optional query parameters. Had to patch 11 generated files manually',
          'Free tier is genuinely free — no rate limits, no watermarks. But there\'s no SLA and the GitHub repo hasn\'t had a commit in 6 weeks',
          'Diff reports are the killer feature. Our platform team caught a breaking change before it reached 23 downstream services',
          'No GraphQL support. We have 8 REST APIs and 3 GraphQL APIs — still need a separate tool for the GraphQL ones'
        ]),
        reviewScore: 8.0,
        sourceUrl: 'https://producthunt.com/posts/apiforge'
      }
    }),

    // --- Health & Fitness ---
    db.product.create({
      data: {
        name: 'NutriTrack Pro',
        tagline: 'Meal planner for athletes that adjusts macros based on training load',
        description: 'NutriTrack syncs with Garmin, WHOOP, and Apple Health to pull daily training load, then auto-adjusts macro targets. Provides meal plans that hit adjusted macros within 5% tolerance. Designed for competitive athletes and coaches managing 10+ clients. Database of 1.2M verified food items.',
        url: 'https://nutritrackpro.com',
        category: 'Health & Fitness',
        upvotes: 376,
        launchDate: '2025-02-20',
        features: JSON.stringify([
          'Auto-adjusts macro targets based on training load from Garmin/WHOOP/Apple Health',
          '1.2M verified food database with barcode scanning and restaurant meal lookups',
          'Meal plan generator that hits adjusted macros within 5% tolerance in under 3 seconds',
          'Coach dashboard to manage 10+ athletes with shared meal templates',
          'Pre/post workout nutrition timing suggestions based on exercise type and intensity'
        ]),
        pricing: '$12/mo',
        comments: JSON.stringify([
          'As a cycling coach with 14 athletes, the shared templates save me 6 hours/week. But I can\'t set sport-specific targets — my cyclists and swimmers need different carb periodization',
          'The WHOOP sync broke after their last API update. Been broken for 3 weeks with no ETA on a fix',
          '1.2M food database is impressive but 40% of items lack micronutrient data. My nutritionist can\'t rely on it for iron and vitamin D tracking',
          '$12/month is fine for one person but my team of 8 athletes paying individually is $96/month. No team pricing available',
          'The meal plan generator keeps suggesting recipes with 12+ ingredients that take 45 minutes. Athletes need simple, batch-cookable options'
        ]),
        reviewScore: 6.9,
        sourceUrl: 'https://producthunt.com/posts/nutritrack-pro'
      }
    }),
    db.product.create({
      data: {
        name: 'MindForge',
        tagline: 'CBT-based anxiety management with guided journaling and mood tracking',
        description: 'MindForge delivers daily CBT exercises tailored to your anxiety patterns, detected through mood tracking and journal entries. Developed with 3 licensed therapists. 8-week structured program with progress reports shareable with your therapist. Compliant with HIPAA and GDPR.',
        url: 'https://mindforge.health',
        category: 'Health & Fitness',
        upvotes: 156,
        launchDate: '2025-03-05',
        features: JSON.stringify([
          '8-week structured CBT program adapted to your anxiety patterns via mood tracking',
          'Guided journaling with prompts based on cognitive distortions detected in entries',
          'Therapist-sharing mode that generates progress reports for your provider',
          'Crisis detection that surfaces emergency resources when high-distress patterns appear',
          'HIPAA-compliant data handling with end-to-end encryption for all journal entries'
        ]),
        pricing: 'Freemium',
        comments: JSON.stringify([
          'The cognitive distortion detection genuinely helped me spot my catastrophizing pattern. After 4 weeks, my GAD-7 score dropped from 14 to 9',
          'The crisis detection triggered a false positive during a normal bad day. Getting emergency resources when I was just having a frustrating afternoon felt alarming and unnecessary',
          'Therapist sharing is great in theory but my therapist uses a different EHR system. The PDF export doesn\'t match their intake format at all',
          'Free tier only gives you 3 journal entries per week. That\'s not enough for daily CBT practice — feels like a bait-and-switch',
          'No group support or community features. Anxiety management works better with peer support, and this feels isolating'
        ]),
        reviewScore: 7.4,
        sourceUrl: 'https://producthunt.com/posts/mindforge'
      }
    }),

    // --- Finance ---
    db.product.create({
      data: {
        name: 'LedgerLite',
        tagline: 'Bookkeeping for freelancers who hate bookkeeping',
        description: 'LedgerLite auto-categorizes 94% of bank transactions using AI trained on freelancer spending patterns. Generates Schedule C-ready reports, tracks quarterly estimated tax payments, and sends 5-day deadline reminders. Built for US-based solo freelancers earning $30K-$150K/year.',
        url: 'https://ledgerlite.co',
        category: 'Finance',
        upvotes: 498,
        launchDate: '2025-01-28',
        features: JSON.stringify([
          '94% auto-categorization of bank transactions trained on freelancer spending patterns',
          'Schedule C-ready tax reports with deduction suggestions based on your industry',
          'Quarterly estimated tax calculator with 5-day payment deadline reminders',
          'Mileage tracking via GPS with automatic trip classification (business vs. personal)',
          'Invoice creation with integrated payment tracking and overdue alerts'
        ]),
        pricing: '$9/mo',
        comments: JSON.stringify([
          'Auto-categorization is shockingly good — correctly tagged my Adobe subscription as "Software - Business" and my personal Netflix as "Entertainment". But it miscategorizes Amazon purchases constantly',
          'Schedule C reports look professional but my CPA said the depreciation calculations were wrong for my home office. Had to manually adjust 3 line items',
          'Only supports US tax system. I\'m a US citizen living in Germany and need FEIE support. The app can\'t handle foreign income exclusion at all',
          '$9/month is the right price point. QuickBooks Self-Employed is $15 and does the same thing with more bugs',
          'Mileage tracking drains my phone battery by 15% per day even with "low power" GPS mode. Needs optimization'
        ]),
        reviewScore: 7.6,
        sourceUrl: 'https://producthunt.com/posts/ledgerlite'
      }
    }),
    db.product.create({
      data: {
        name: 'InvestScope',
        tagline: 'Portfolio analytics that explains why your portfolio moved today',
        description: 'InvestScope connects to 12 brokerages via Plaid and provides daily attribution reports showing which holdings drove gains or losses. Offers factor exposure analysis (value, momentum, quality, size, volatility) and sector concentration alerts. For self-directed investors with $50K-$2M portfolios.',
        url: 'https://investscope.io',
        category: 'Finance',
        upvotes: 312,
        launchDate: '2025-02-10',
        features: JSON.stringify([
          'Daily portfolio attribution reports explaining gains/losses by holding and factor',
          'Factor exposure analysis across value, momentum, quality, size, and volatility',
          'Sector concentration alerts when any sector exceeds 30% of portfolio value',
          'Plaid integration with 12 brokerages for automatic position syncing',
          'Tax-loss harvesting suggestions showing specific lots to sell and replacements'
        ]),
        pricing: '$15/mo',
        comments: JSON.stringify([
          'The daily attribution email is the reason I open this app. "Your portfolio gained $340 today, driven by NVDA (+$210) and AAPL (+$95), partially offset by TSLA (-$65)." Finally, clarity',
          'Plaid sync fails with Fidelity about 40% of the time. I have to manually reconnect every 2-3 days. Support says it\'s a Fidelity API issue but hasn\'t fixed it in 2 months',
          'Factor exposure is interesting but the explanations are too academic. "Your momentum tilt is 0.3 standard deviations above benchmark" means nothing to me — tell me what to do about it',
          'No crypto or alternative asset support. My portfolio is 15% Bitcoin and real estate crowdfunding — those positions just show as "uncategorized cash"',
          'Tax-loss harvesting suggestions are useful but only for taxable accounts. Can\'t distinguish between my IRA and brokerage positions'
        ]),
        reviewScore: 7.3,
        sourceUrl: 'https://producthunt.com/posts/investscope'
      }
    }),

    // --- Marketing ---
    db.product.create({
      data: {
        name: 'ReachEngine',
        tagline: 'Micro-influencer discovery and outreach automation for DTC brands',
        description: 'ReachEngine indexes 4.2M Instagram and TikTok creators with 5K-100K followers, scoring them on engagement rate, audience authenticity, and brand-fit. Auto-generates personalized DM outreach sequences. Built for DTC brands spending $2K-$20K/month on influencer marketing.',
        url: 'https://reachengine.co',
        category: 'Marketing',
        upvotes: 567,
        launchDate: '2025-01-05',
        features: JSON.stringify([
          '4.2M creator index (5K-100K followers) with engagement rate and audience authenticity scoring',
          'Brand-fit scoring using computer vision on creator content to match aesthetic and values',
          'Auto-generated DM outreach sequences personalized from creator\'s recent 5 posts',
          'Campaign ROI tracking with discount code attribution and UTM link generation',
          'Creator relationship CRM with conversation history and payment tracking'
        ]),
        pricing: '$49/mo',
        comments: JSON.stringify([
          'Found 3 micro-influencers that drove $12K in sales on a $1.8K spend. The brand-fit scoring actually works — these creators\' aesthetics matched our product perfectly',
          '4.2M creators sounds impressive but the database is 70% US/UK creators. We need German and French creators for our EU expansion and found only 200 in our niche',
          'The auto-DM feature got our Instagram account flagged for spam. Reached out to 30 creators in one hour and Instagram rate-limited us for 48 hours',
          '$49/month for 50 outreach credits. We burn through 50 in 2 days during campaign season. The $99/month plan gives 200 but that\'s still not enough for Q4',
          'Creator authenticity scoring caught 2 accounts with 60%+ fake followers. Saved us from wasting $800 on bot-driven creators'
        ]),
        reviewScore: 7.9,
        sourceUrl: 'https://producthunt.com/posts/reachengine'
      }
    }),
    db.product.create({
      data: {
        name: 'FunnelMetrics',
        tagline: 'Conversion funnel analytics that shows exactly where revenue leaks',
        description: 'FunnelMetrics instruments your entire purchase funnel from ad click to checkout, showing revenue lost at each step with estimated recovery value. Integrates with Shopify, Stripe, and Google Analytics. Average customer recovers 12% of leaked revenue within 90 days.',
        url: 'https://funnelmetrics.io',
        category: 'Marketing',
        upvotes: 423,
        launchDate: '2025-02-25',
        features: JSON.stringify([
          'Full-funnel revenue leak detection from ad click to checkout with dollar amounts at each step',
          'Estimated recovery value for each leak point with confidence intervals',
          'Shopify and Stripe integration for real-time purchase data',
          'Cart abandonment analysis segmented by traffic source, device, and customer cohort',
          'A/B test impact calculator showing how a funnel fix would affect monthly revenue'
        ]),
        pricing: '$29/mo',
        comments: JSON.stringify([
          'Found a $4.2K/month revenue leak at our shipping cost display page. 23% of users abandoned after seeing $12 shipping on a $35 item. We switched to free shipping over $50 and recovered 61% of that leak',
          'The Shopify integration was a 2-click setup but Stripe required manual field mapping that took 3 hours. Not the "5-minute setup" promised on the landing page',
          'Revenue leak estimates are directionally correct but the confidence intervals are 30-40% wide. Would be more useful with tighter ranges',
          'No support for WooCommerce or BigCommerce. We\'re on WooCommerce and the team says it\'s "on the roadmap" with no ETA',
          'The A/B test calculator is theoretical only — it doesn\'t actually run tests. You have to use a separate tool (Optimizely, VWO) and then come back to input results'
        ]),
        reviewScore: 8.2,
        sourceUrl: 'https://producthunt.com/posts/funnelmetrics'
      }
    })
  ])

  console.log(`✅ Inserted ${products.length} products.`)

  // ========================================
  // GAPS (10 gaps linked to products)
  // ========================================
  console.log('🔍 Inserting gaps...')

  const gaps = await Promise.all([
    // Gap 1: CopyForge — no regulated-industry doc support
    db.gap.create({
      data: {
        productId: products[0].id, // CopyForge AI
        gapType: 'underserved',
        title: 'No AI copywriting tool serves regulated industries requiring compliance-reviewed marketing copy',
        description: 'Of 53 AI writing tools launched in Q4 2024, zero offer compliance review stamps for financial services, healthcare, or legal marketing. CopyForge, Jasper, Copy.ai, and Writesonic all generate marketing copy without any regulatory checkpoint. Financial advisors at RIAs must have all marketing reviewed by compliance before distribution — AI tools skip this entirely.',
        evidence: 'Surveyed 53 AI writing tools on ProductHunt (Oct-Dec 2024): 0 include compliance review workflows. 14 healthcare marketers in a focus group confirmed they cannot use AI-generated copy without manual compliance overlay.',
        evidenceDetail: JSON.stringify({
          similarProducts: 53,
          repeatedComplaints: 14,
          launchFrequency: 18,
          commentSnippets: [
            '"I work at an RIA and every piece of marketing copy needs Series 24 review — AI tools just give me text with no audit trail"',
            '"Our compliance team rejected 8 out of 10 AI-generated headlines for using prohibited performance claims"',
            '"Healthcare marketing copy requires HIPAA-reviewed disclaimers that no AI tool generates automatically"',
            '"I spend $800/month on a compliance consultant to review AI-generated copy — the AI tool itself is only $29/month"'
          ],
          pricingOverlap: 6
        }),
        whyThisMatters: 'The SEC fined RIAs $4.6M in 2024 for unapproved marketing materials. A copywriting tool with built-in compliance checkpoints (FINRA Rule 2210, SEC Marketing Rule) could charge $99-199/month — 3-7x the current $29/month average — because the alternative is paying a compliance consultant $150-300/hour. The 15,000+ SEC-registered RIAs each spend $12K-48K/year on marketing compliance review.',
        subNiche: JSON.stringify({
          name: 'Compliance-reviewed AI copywriting for SEC-registered investment advisors',
          description: 'AI-generated marketing copy with embedded FINRA Rule 2210 and SEC Marketing Rule checkpoints, audit trails, and compliance officer approval workflows',
          parentCategory: 'AI Tools',
          opportunityScore: 87
        }),
        affectedProducts: JSON.stringify([
          { name: 'CopyForge AI', pricing: '$29/mo', strengths: ['High-converting copy generation', 'Brand voice cloning'], weaknesses: ['No compliance review', 'No audit trail', 'No regulatory checkpoints'] },
          { name: 'Jasper', pricing: '$49/mo', strengths: ['Enterprise features', 'Template library'], weaknesses: ['No compliance workflows', 'No FINRA/SEC rules built in', 'Generic disclaimers only'] },
          { name: 'Copy.ai', pricing: '$36/mo', strengths: ['Workflow automation', 'Multi-channel output'], weaknesses: ['No industry-specific compliance', 'No approval chain', 'No regulatory templates'] },
          { name: 'Writesonic', pricing: '$16/mo', strengths: ['Affordable pricing', 'Fast generation'], weaknesses: ['No compliance features', 'No audit logging', 'No review workflows'] },
          { name: 'Anyword', pricing: '$39/mo', strengths: ['Predictive performance scoring'], weaknesses: ['No regulatory awareness', 'No compliance stamps', 'No approval process'] },
          { name: 'Pepper Content', pricing: '$99/mo', strengths: ['Content operations platform', 'Team workflows'], weaknesses: ['Compliance is manual add-on', 'No AI + compliance integration', 'No regulatory auto-checks'] }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'Compliance officers at SEC-registered RIAs', description: 'Review 50-200 marketing pieces per month manually, spending 15-30 minutes per piece on compliance checks', evidence: 'RIA compliance teams average 3.2 FTEs dedicated to marketing review per $500M AUM firm', opportunityScore: 91 },
          { userGroup: 'Healthcare marketing managers at HIPAA-covered entities', description: 'Cannot use AI-generated copy without legal review for HIPAA disclaimers, FDA claim restrictions, and patient privacy language', evidence: 'Healthcare marketers spend 40% of campaign production time on legal/compliance review per AHIMA survey', opportunityScore: 84 },
          { userGroup: 'Legal marketing directors at law firms', description: 'Bar association rules prohibit specific claims in attorney advertising; AI tools routinely generate prohibited superlatives and guarantees', evidence: '27 state bar associations issued advertising compliance fines in 2024; AI-generated content is a growing citation', opportunityScore: 78 }
        ]),
        severity: 'high'
      }
    }),

    // Gap 2: DocuMentor — no regulatory compliance templates
    db.gap.create({
      data: {
        productId: products[1].id, // DocuMentor AI
        gapType: 'missing_feature',
        title: 'AI documentation tools lack HIPAA, SOC 2, and GDPR compliance documentation templates',
        description: 'DocuMentor generates technical docs from code but provides zero templates for compliance documentation required by HIPAA, SOC 2 Type II, ISO 27001, or GDPR Article 30. Healthcare SaaS companies must maintain separate compliance doc systems, duplicating work. No AI doc tool fills this gap.',
        evidence: 'Interviewed 8 DevOps leads at healthcare SaaS companies: all maintain compliance docs manually in Google Docs alongside AI-generated technical docs. None found an AI tool that bridges technical and compliance documentation.',
        evidenceDetail: JSON.stringify({
          similarProducts: 12,
          repeatedComplaints: 8,
          launchFrequency: 5,
          commentSnippets: [
            '"We use DocuMentor for API docs but still write our SOC 2 control descriptions in Google Docs — there\'s zero overlap between the two systems"',
            '"HIPAA requires us to document every system that touches PHI. Our API docs don\'t cover that, and no tool generates both"',
            '"I need a tool that can say \'this endpoint processes PHI and here\'s the required documentation for it\' — nothing does that"',
            '"GDPR Article 30 requires records of processing activities. Our technical docs don\'t satisfy that requirement"'
          ],
          pricingOverlap: 4
        }),
        whyThisMatters: 'Healthcare SaaS companies spend an average of $85K/year on SOC 2 + HIPAA compliance documentation, with 60% of that being manual writing and updating. An AI tool that generates compliance-ready documentation from code could capture 15-25% of that spend ($12K-$21K per company per year). With 4,500+ HIPAA-covered SaaS companies in the US alone, the addressable market is $54M-$95M/year.',
        subNiche: JSON.stringify({
          name: 'AI compliance documentation generator for HIPAA-covered SaaS companies',
          description: 'Auto-generates HIPAA security rule documentation, SOC 2 control descriptions, and GDPR Article 30 records from codebase analysis and infrastructure configs',
          parentCategory: 'Developer Tools',
          opportunityScore: 82
        }),
        affectedProducts: JSON.stringify([
          { name: 'DocuMentor AI', pricing: 'Freemium', strengths: ['Codebase-aware doc generation', 'Changelog automation'], weaknesses: ['No compliance templates', 'No HIPAA/SOC2 awareness', 'No regulatory mapping'] },
          { name: 'ReadMe', pricing: '$99/mo', strengths: ['Beautiful API docs', 'Interactive examples'], weaknesses: ['No compliance docs', 'Pure developer documentation', 'No regulatory awareness'] },
          { name: 'GitBook', pricing: '$6.90/user/mo', strengths: ['Knowledge base', 'Team collaboration'], weaknesses: ['Manual compliance doc creation', 'No AI generation', 'No regulatory templates'] },
          { name: 'Vanta', pricing: '$500/mo+', strengths: ['Compliance automation', 'SOC 2 monitoring'], weaknesses: ['No doc generation from code', 'Monitoring-only, not authoring', 'Expensive for startups'] }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'DevOps engineers at HIPAA-covered SaaS startups (10-50 employees)', description: 'Spend 8-15 hours per month manually writing compliance documentation that could be auto-generated from infrastructure-as-code and API definitions', evidence: 'Healthcare SaaS startups under 50 employees typically have 1 DevOps engineer who spends 30-40% of time on compliance docs', opportunityScore: 88 },
          { userGroup: 'Security compliance analysts preparing for SOC 2 Type II audits', description: 'Must document evidence for 60+ trust service criteria controls; currently write descriptions manually by reading code and interviewing engineers', evidence: 'SOC 2 audit preparation takes 3-6 months with 40% of time spent on evidence documentation per AICPA survey', opportunityScore: 79 }
        ]),
        severity: 'high'
      }
    }),

    // Gap 3: ScribeLens — multi-language and enterprise limitations
    db.gap.create({
      data: {
        productId: products[2].id, // ScribeLens
        gapType: 'underserved',
        title: 'AI meeting tools fail multilingual teams — no product handles mixed-language meetings with 5+ speakers',
        description: 'ScribeLens supports English-only with 97.2% accuracy but breaks down in meetings where participants switch between languages mid-sentence (common in EU and APAC teams). Otter.ai, Fireflies, and Fathom all share this limitation. Companies with offices in 3+ countries report unusable transcripts for cross-regional meetings.',
        evidence: 'Tested 5 AI meeting tools (ScribeLens, Otter, Fireflies, Fathom, Grain) on 12 multilingual meetings. Average accuracy dropped from 95%+ (monolingual) to 34% (code-switching). None detected language switches mid-utterance.',
        evidenceDetail: JSON.stringify({
          similarProducts: 5,
          repeatedComplaints: 9,
          launchFrequency: 3,
          commentSnippets: [
            '"Our Berlin office meetings switch between German and English every 2-3 minutes. ScribeLens just outputs gibberish during switches"',
            '"Japanese team members speak Japanese then switch to English for technical terms. The transcript mixes katakana and English incorrectly"',
            '"We gave up on AI meeting notes entirely for our EU standups. 4 countries, 4 languages, 0 usable transcripts"',
            '"Fireflies handles Spanish-only meetings fine but when our Mexico City team uses Spanglish, the transcript is unreliable"'
          ],
          pricingOverlap: 5
        }),
        whyThisMatters: 'Fortune 500 companies with 3+ country offices run an average of 240 cross-regional meetings per month. At $15/user/month, a multilingual meeting tool could capture $180K-$360K per enterprise account per year. The global enterprise meeting intelligence market is estimated at $2.1B in 2025, with multilingual support being the #1 feature gap cited by buyers.',
        subNiche: JSON.stringify({
          name: 'Code-switching meeting transcription for multinational EU/APAC teams',
          description: 'AI meeting notes that detect and handle mid-sentence language switches, producing dual-language transcripts with aligned action items and decisions in both languages',
          parentCategory: 'AI Tools',
          opportunityScore: 79
        }),
        affectedProducts: JSON.stringify([
          { name: 'ScribeLens', pricing: '$15/user/mo', strengths: ['97.2% English accuracy', 'Action item extraction', 'Jira/Linear integration'], weaknesses: ['English only', 'Fails on code-switching', 'No language detection'] },
          { name: 'Otter.ai', pricing: '$17/user/mo', strengths: ['Real-time transcription', 'Speaker identification'], weaknesses: ['English only', 'No multilingual support', 'Breaks on accents'] },
          { name: 'Fireflies.ai', pricing: '$10/user/mo', strengths: ['60+ integrations', 'Conversation search'], weaknesses: ['English-dominant', 'Poor on non-English', 'No code-switching'] },
          { name: 'Fathom', pricing: 'Free', strengths: ['Free tier', 'CRM integration'], weaknesses: ['English only', 'No multilingual', 'Limited to Zoom'] },
          { name: 'Grain', pricing: '$19/user/mo', strengths: ['Video highlights', 'Story creation'], weaknesses: ['English only', 'No language detection', 'No dual-language output'] }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'Product managers leading cross-regional EU teams (3+ countries)', description: 'Run 8-15 multilingual meetings per week where participants code-switch between local language and English', evidence: 'EU-based PMs at companies with 500+ employees average 12 cross-regional meetings/week with language switching', opportunityScore: 83 },
          { userGroup: 'APAC engineering leads managing teams across Japan, Korea, and India', description: 'Daily standups mix Japanese/Korean/Hindi technical terms with English, making transcripts from current tools unusable', evidence: 'APAC tech companies with 100+ engineers report 85% transcript unusability for mixed-language technical meetings', opportunityScore: 76 }
        ]),
        severity: 'high'
      }
    }),

    // Gap 4: BugHunter — no Rust/Go/systems language support
    db.gap.create({
      data: {
        productId: products[5].id, // BugHunter AI
        gapType: 'missing_feature',
        title: 'AI debugging tools ignore Rust, Go, and systems programming despite 340% growth in Rust adoption',
        description: 'BugHunter supports only Node.js, Python, and Java. No AI debugging tool on ProductHunt supports Rust, Go, C++, or Zig. Rust adoption grew 340% in production systems between 2022-2025 (JetBrains survey), yet debugging tools still target web-stack languages exclusively.',
        evidence: 'Analyzed 23 AI debugging tools on ProductHunt (2024-2025): 21 support Python, 19 support JavaScript/Node, 14 support Java, 3 support Go, 0 support Rust, 0 support C++, 0 support Zig.',
        evidenceDetail: JSON.stringify({
          similarProducts: 23,
          repeatedComplaints: 11,
          launchFrequency: 7,
          commentSnippets: [
            '"Rust\'s borrow checker errors are notoriously hard to debug — this is exactly where AI should help but no tool supports it"',
            '"Our entire backend is Go microservices. Every AI debugging tool says \'coming soon\' for Go support. It\'s been 18 months"',
            '"I\'d pay $100/month for an AI that understands Rust\'s lifetime errors and suggests fixes. Currently spending 6 hours/week on lifetime issues"',
            '"C++ debugging in production is a nightmare. Memory corruption, race conditions, undefined behavior — AI could help but nobody builds for us"'
          ],
          pricingOverlap: 8
        }),
        whyThisMatters: 'The Rust Foundation reports 3.2M Rust developers in 2025, up from 800K in 2022. These developers spend an average of 4.6 hours/week debugging lifetime and borrow-checker errors specifically. At $49/month (matching BugHunter\'s pricing), a Rust-aware debugging tool could generate $156M/year in subscription revenue from just 10% of the Rust developer base.',
        subNiche: JSON.stringify({
          name: 'AI Rust lifetime and borrow-checker debugging assistant for systems developers',
          description: 'Specialized AI debugger that analyzes Rust compiler errors, suggests lifetime annotations, explains borrow-checker violations with visual ownership graphs, and proposes idiomatic fixes',
          parentCategory: 'Developer Tools',
          opportunityScore: 85
        }),
        affectedProducts: JSON.stringify([
          { name: 'BugHunter AI', pricing: '$49/mo', strengths: ['Root cause analysis', 'Sentry integration', 'Fix suggestions'], weaknesses: ['No Rust support', 'No Go support', 'No systems language support'] },
          { name: 'GitHub Copilot', pricing: '$10/mo', strengths: ['Code completion', 'Chat interface', 'Multi-language'], weaknesses: ['Not debugging-focused', 'Generic Rust suggestions', 'No error-specific analysis'] },
          { name: 'Cursor IDE', pricing: '$20/mo', strengths: ['AI-native editor', 'Context-aware chat'], weaknesses: ['Not debugger', 'No error log ingestion', 'No root cause analysis'] },
          { name: 'Sourcery', pricing: 'Free', strengths: ['Code review', 'Refactoring suggestions'], weaknesses: ['Python/JS only', 'No debugging', 'No error analysis'] }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'Rust developers at infrastructure companies (Cloudflare, AWS, Discord)', description: 'Spend 4-6 hours per week debugging lifetime errors, borrow-checker violations, and async/concurrency issues that current AI tools cannot analyze', evidence: 'Rust developers report 3x more time on compiler-error debugging vs. Python developers per JetBrains 2024 survey', opportunityScore: 90 },
          { userGroup: 'Junior Go developers at startups (0-2 years Go experience)', description: 'Struggle with goroutine leaks, channel deadlocks, and interface assertion panics — all Go-specific issues that general AI debuggers miss', evidence: 'Go developer survey 2024: 67% of respondents with <2 years experience cite concurrency debugging as their top challenge', opportunityScore: 74 }
        ]),
        severity: 'high'
      }
    }),

    // Gap 5: FlowState — too easy to bypass
    db.gap.create({
      data: {
        productId: products[3].id, // FlowState
        gapType: 'weak_ux',
        title: 'Focus/distraction-blocking apps are trivially bypassable — no tool offers enforceable deep work commitments',
        description: 'FlowState, like Forest, Freedom, and Cold Turkey, removes blocks the moment you quit the app or switch users. Zero focus tools offer a lock-in mechanism that enforces a commitment period. Users who need enforced focus (ADHD adults, students in exam prep, deadline-driven freelancers) report bypassing their own blocks within 48 hours of installation.',
        evidence: 'Surveyed 120 FlowState users: 73% admitted to bypassing distraction blocks within the first week. 89% said they would prefer an "enforced mode" with a waiting period or accountability partner override.',
        evidenceDetail: JSON.stringify({
          similarProducts: 8,
          repeatedComplaints: 18,
          launchFrequency: 4,
          commentSnippets: [
            '"I just quit the app when I want to check Instagram. The 3-second friction isn\'t enough to stop me"',
            '"ADHD brain: I set a 90-minute focus block, then immediately bypassed it to check a \'quick notification\'. 45 minutes later..."',
            '"Forest\'s tree dying is cute but not enough motivation when a Slack message feels urgent"',
            '"I need something where my accountability partner has to approve the unlock. Self-control doesn\'t work for me"'
          ],
          pricingOverlap: 6
        }),
        whyThisMatters: '8.7M US adults have ADHD and 60% report that digital distraction costs them 2+ productive hours daily. Current focus tools generate $180M/year in revenue but have 30-day retention rates below 25% because they\'re trivially bypassable. A tool with social accountability (partner/friend must approve unlock) could achieve 60%+ retention and command $15/month vs. current $9/month average — the accountability feature justifies the premium.',
        subNiche: JSON.stringify({
          name: 'Enforceable focus blocks with social accountability for ADHD adults in remote work',
          description: 'Focus app where block periods cannot be self-bypassed; unlock requires approval from a designated accountability partner, with optional monetary stakes donated to charity on bypass',
          parentCategory: 'Productivity',
          opportunityScore: 76
        }),
        affectedProducts: JSON.stringify([
          { name: 'FlowState', pricing: '$9/mo', strengths: ['OS-level blocking', 'Deep work tracking', 'Team dashboard'], weaknesses: ['Trivially bypassable', 'No enforcement', 'No accountability partner'] },
          { name: 'Forest', pricing: '$3.99 one-time', strengths: ['Gamification', 'Visual motivation', 'Low price'], weaknesses: ['Mobile only', 'Easy to bypass', 'No enforcement'] },
          { name: 'Freedom', pricing: '$6.99/mo', strengths: ['Cross-device blocking', 'Scheduled blocks'], weaknesses: ['Easy bypass via uninstall', 'No accountability', 'No team features'] },
          { name: 'Cold Turkey', pricing: '$29 one-time', strengths: ['Aggressive blocking', 'Hard to bypass'], weaknesses: ['Windows only', 'Can still force-quit', 'No social accountability'] },
          { name: 'Opal', pricing: '$9.99/mo', strengths: ['Mobile focus', 'DNS-level blocking'], weaknesses: ['iOS only', 'Bypassable via settings', 'No commitment enforcement'] },
          { name: 'RescueTime', pricing: '$12/mo', strengths: ['Detailed tracking', 'Productivity scoring'], weaknesses: ['Tracking only, no blocking', 'No enforcement', 'Passive not active'] }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'ADHD adults in remote work positions', description: 'Lose 2-4 hours daily to digital distractions; self-imposed blocks fail because executive dysfunction overrides intention within minutes', evidence: 'CHADD survey: 67% of ADHD adults tried focus apps but abandoned within 2 weeks due to easy bypass', opportunityScore: 88 },
          { userGroup: 'Law and medical students in exam preparation (3-month intensive periods)', description: 'Need enforced study blocks during 10-14 hour study days; currently rely on study groups for accountability but lack digital enforcement', evidence: 'Bar exam prep students average 11.2 hours/day studying; 71% report digital distraction as top focus challenge', opportunityScore: 72 }
        ]),
        severity: 'medium'
      }
    }),

    // Gap 6: ReachEngine — spam limits and non-English creators
    db.gap.create({
      data: {
        productId: products[11].id, // ReachEngine
        gapType: 'underserved',
        title: 'Influencer marketing tools focus on US/UK creators, leaving EU and APAC DTC brands without local creator databases',
        description: 'ReachEngine\'s 4.2M creator database is 70% US/UK. Modash, Upfluence, and Heepsy similarly skew English-speaking. A German skincare brand found only 200 creators in their niche across all platforms. The EU influencer market grew 28% in 2024 to €4.8B yet tools remain US-centric.',
        evidence: 'Analyzed 6 influencer marketing tools: average 72% US/UK creator coverage. Tested German, French, and Japanese niche searches across all tools — average results were 85% fewer than equivalent US searches.',
        evidenceDetail: JSON.stringify({
          similarProducts: 6,
          repeatedComplaints: 12,
          launchFrequency: 2,
          commentSnippets: [
            '"We\'re a French skincare brand and ReachEngine returned 23 creators for "soin naturel" vs. 1,200 for "natural skincare" in English"',
            '"Our Japanese K-beade partner couldn\'t find a single Japanese creator with audience data. The tools just don\'t index JP social media"',
            '"Modash claims 250M creators but only 8M are in the EU. That\'s a 3.2% coverage rate for a €4.8B market"',
            '"We spent $3K on Heepsy for our German launch and found 14 relevant creators. Our manual Instagram search found 40+ in the same time"'
          ],
          pricingOverlap: 5
        }),
        whyThisMatters: 'The EU influencer marketing market is €4.8B in 2025 (28% YoY growth) with 1.2M active creators who are largely invisible to US-built tools. If a tool indexed even 50% of EU creators (600K) with proper language support, at $49/month it would generate $588K/month from 12K subscribers — the demand exists, the database doesn\'t.',
        subNiche: JSON.stringify({
          name: 'Local-language influencer discovery for DTC brands expanding into EU markets',
          description: 'Creator database that indexes local-language Instagram, TikTok, and YouTube creators in DE, FR, ES, IT with native language content analysis, local engagement metrics, and EU advertising disclosure compliance',
          parentCategory: 'Marketing',
          opportunityScore: 81
        }),
        affectedProducts: JSON.stringify([
          { name: 'ReachEngine', pricing: '$49/mo', strengths: ['4.2M creators', 'Brand-fit scoring', 'Auto DM outreach'], weaknesses: ['70% US/UK', 'No local language analysis', 'No EU ad disclosure compliance'] },
          { name: 'Modash', pricing: '$49/mo', strengths: ['250M creator index', 'Email finder'], weaknesses: ['Only 8M EU creators', 'Poor non-English search', 'No local engagement norms'] },
          { name: 'Upfluence', pricing: '$478/mo', strengths: ['Enterprise features', 'Affiliate management'], weaknesses: ['Expensive for mid-market', 'US-centric database', 'Limited EU creators'] },
          { name: 'Heepsy', pricing: '$49/mo', strengths: ['Fraud detection', 'Audience demographics'], weaknesses: ['Small EU index', 'No local language support', 'Limited niche search'] },
          { name: 'CreatorIQ', pricing: '$2K+/mo', strengths: ['Enterprise analytics', 'Workflow management'], weaknesses: ['Enterprise pricing only', 'US-focused', 'Not for mid-market DTC'] }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'DTC brand marketing managers expanding from US to EU markets', description: 'Need local-language creator discovery in DE, FR, ES, IT but existing tools return 85% fewer results than equivalent US searches', evidence: '75% of US DTC brands expanding to EU cite influencer discovery as their top marketing challenge (eCommerce Europe 2024)', opportunityScore: 85 },
          { userGroup: 'EU-based DTC brands scaling influencer marketing domestically', description: 'German, French, and Spanish brands with €1M-10M revenue need affordable influencer tools that understand local market norms and disclosure regulations', evidence: 'EU DTC brands spend average €2.4K/month on influencer marketing but rate their tool satisfaction at 3.1/10 for local coverage', opportunityScore: 78 }
        ]),
        severity: 'high'
      }
    }),

    // Gap 7: LedgerLite — no multi-country tax support
    db.gap.create({
      data: {
        productId: products[9].id, // LedgerLite
        gapType: 'underserved',
        title: 'Freelancer bookkeeping tools only handle single-country tax systems — digital nomads with income in 2+ countries have no solution',
        description: 'LedgerLite is US-only. Wave, FreshBooks, and Xero each support one country\'s tax system per account. An estimated 35M digital nomads and remote workers earn income across 2+ countries, yet no bookkeeping tool handles multi-jurisdiction tax reporting, foreign income exclusion, or dual-currency tracking properly.',
        evidence: 'Tested 7 freelancer bookkeeping tools: none support multi-country tax filing in a single account. 12 digital nomads interviewed all maintain separate spreadsheets for each country\'s income and expenses.',
        evidenceDetail: JSON.stringify({
          similarProducts: 7,
          repeatedComplaints: 15,
          launchFrequency: 2,
          commentSnippets: [
            '"I\'m a US citizen in Portugal. I need to track US self-employment tax AND Portuguese NHR obligations. Currently using two separate tools"',
            '"My income comes from US clients (USD) and German clients (EUR). Wave can\'t handle dual-currency bookkeeping properly"',
            '"FEIE calculation requires knowing exactly how many days I spent in each country. No bookkeeping app tracks that"',
            '"I pay accountants in 3 countries $600/month total because no tool handles multi-jurisdiction freelancer taxes"'
          ],
          pricingOverlap: 5
        }),
        whyThisMatters: '35M digital nomads worldwide earn an average of $68K/year. They spend $3,600/year on accountants across multiple countries because no software handles their situation. A multi-jurisdiction freelancer bookkeeping tool at $25/month ($300/year) would save them $3,300/year — an 11x ROI. Even capturing 1% of this market (350K users) generates $105M ARR.',
        subNiche: JSON.stringify({
          name: 'Multi-jurisdiction bookkeeping for US-citizen digital nomads in the EU',
          description: 'Bookkeeping tool that handles US self-employment tax, foreign income exclusion (FEIE), and host-country tax obligations in a single dashboard with dual-currency tracking and day-count tracking for tax residency',
          parentCategory: 'Finance',
          opportunityScore: 80
        }),
        affectedProducts: JSON.stringify([
          { name: 'LedgerLite', pricing: '$9/mo', strengths: ['Freelancer-specific', 'Auto-categorization', 'Schedule C reports'], weaknesses: ['US only', 'Single currency', 'No FEIE support'] },
          { name: 'QuickBooks Self-Employed', pricing: '$15/mo', strengths: ['Mileage tracking', 'Tax estimation'], weaknesses: ['US only', 'No multi-currency', 'No foreign income'] },
          { name: 'Wave', pricing: 'Free', strengths: ['Free invoicing', 'Receipt scanning'], weaknesses: ['Single country', 'Weak multi-currency', 'No tax filing abroad'] },
          { name: 'Xero', pricing: '$13/mo', strengths: ['Multi-currency support', 'Integrations'], weaknesses: ['Not freelancer-focused', 'One tax jurisdiction', 'No day tracking'] },
          { name: 'FreshBooks', pricing: '$17/mo', strengths: ['Time tracking', 'Client portal'], weaknesses: ['Single country', 'No FEIE', 'No residency tracking'] }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'US-citizen digital nomads residing in EU countries on D7/digital nomad visas', description: 'Must file US taxes (worldwide income) plus host-country taxes; need FEIE day-count tracking, dual-currency bookkeeping, and treaty-benefit calculations', evidence: '1.1M US citizens live in the EU; 340K are self-employed and must file in both jurisdictions', opportunityScore: 86 },
          { userGroup: 'Freelance consultants with clients in 3+ countries', description: 'Invoice in multiple currencies, pay taxes in home country, need VAT/GST handling per client location, and must track where work was physically performed', evidence: 'EU freelance consultants with international clients spend average 6 hours/month on multi-jurisdiction bookkeeping manually', opportunityScore: 73 }
        ]),
        severity: 'high'
      }
    }),

    // Gap 8: NutriTrack Pro — sport-specific limitations
    db.gap.create({
      data: {
        productId: products[7].id, // NutriTrack Pro
        gapType: 'missing_feature',
        title: 'Sports nutrition apps offer generic macro tracking but no periodized fueling plans for endurance athletes training 15+ hours/week',
        description: 'NutriTrack adjusts macros based on training load but uses a single formula. Competitive marathoners, triathletes, and cyclists need periodized nutrition — high-carb build weeks, low-carb recovery weeks, race-week carb loading protocols — with specific timing windows (pre-race 36h load, intra-workout 60-90g/hr). No app delivers this.',
        evidence: 'Reviewed 11 sports nutrition apps: 9 offer macro tracking, 2 offer basic periodization (bulk/cut), 0 offer endurance-specific periodized fueling with timing protocols. 16 competitive endurance athletes interviewed: 14 use spreadsheets alongside their nutrition app.',
        evidenceDetail: JSON.stringify({
          similarProducts: 11,
          repeatedComplaints: 16,
          launchFrequency: 3,
          commentSnippets: [
            '"I\'m training 18 hours/week for an Ironman. NutriTrack gives me the same carb ratio on recovery weeks and build weeks. That\'s not how endurance fueling works"',
            '"Race-week carb loading is a specific 36-48h protocol. No app implements this — I calculate it in a spreadsheet every time"',
            '"Intra-workout nutrition for 4+ hour rides needs 60-90g carbs per hour from mixed sources. MyFitnessPal can\'t even track intra-workout separately"',
            '"My coach gives me a periodized plan in a PDF. I manually enter each week\'s targets into NutriTrack. It takes 45 minutes every Sunday"'
          ],
          pricingOverlap: 7
        }),
        whyThisMatters: '4.2M Americans compete in triathlons, marathons, or ultramarathons annually, spending an average of $3,200/year on nutrition products and coaching. These athletes currently pay coaches $150-300/month for periodized nutrition plans that could be automated. A subscription at $25/month (matching coach cost for 1 hour) would generate $1.26B/year from the full endurance market, or $126M from just 10% adoption.',
        subNiche: JSON.stringify({
          name: 'Periodized endurance fueling planner for Ironman-distance triathletes',
          description: 'Auto-generates periodized nutrition plans aligned to training mesocycles (build, recovery, taper, race week) with carb-loading protocols, intra-workout fueling schedules, and electrolyte management for 15+ hour training weeks',
          parentCategory: 'Health & Fitness',
          opportunityScore: 77
        }),
        affectedProducts: JSON.stringify([
          { name: 'NutriTrack Pro', pricing: '$12/mo', strengths: ['Training load sync', '1.2M food database', 'Coach dashboard'], weaknesses: ['Single macro formula', 'No periodization', 'No timing protocols'] },
          { name: 'MyFitnessPal', pricing: '$20/mo', strengths: ['Largest food database', 'Barcode scanning'], weaknesses: ['Not sports-specific', 'No periodization', 'No training sync'] },
          { name: 'MacroFactor', pricing: '$12/mo', strengths: ['Adaptive coaching', 'Smart macro adjustments'], weaknesses: ['No endurance protocols', 'No periodization', 'No intra-workout tracking'] },
          { name: 'Fuelin', pricing: '$15/mo', strengths: ['Training-synced meal plans', 'Grocery lists'], weaknesses: ['Generic periodization', 'No race-week protocols', 'Limited timing features'] },
          { name: 'TrainingPeaks', pricing: '$19/mo', strengths: ['Training planning', 'Performance analytics'], weaknesses: ['No nutrition built-in', 'Coaches add nutrition externally', 'No meal generation'] },
          { name: 'InsideTracker', pricing: '$199/test', strengths: ['Blood biomarker analysis', 'Personalized recommendations'], weaknesses: ['Not a meal planner', 'Expensive per test', 'No periodization'] }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'Self-coached Ironman triathletes training 15-25 hours/week', description: 'Follow generic training plans online but have no periodized nutrition to match. Currently calculate fueling in spreadsheets based on blog posts and podcast advice', evidence: '67% of Ironman finishers are self-coached (Ironman survey 2024); average nutrition spend is $0 on software, $200/month on trial-and-error products', opportunityScore: 82 },
          { userGroup: 'Endurance sports coaches managing 10-30 athletes', description: 'Create individual periodized nutrition plans manually for each athlete — 2-3 hours per athlete per month. Need tool to auto-generate plans from training data they already track in TrainingPeaks', evidence: 'Endurance coaches spend 30% of client management time on nutrition planning that could be automated', opportunityScore: 75 }
        ]),
        severity: 'medium'
      }
    }),

    // Gap 9: InvestScope — no alternative assets
    db.gap.create({
      data: {
        productId: products[10].id, // InvestScope
        gapType: 'missing_feature',
        title: 'Portfolio analytics tools ignore crypto, real estate, and alternative investments — 35% of self-directed investor wealth is uncategorized',
        description: 'InvestScope supports stocks and ETFs via Plaid but categorizes crypto, real estate crowdfunding, private credit, and angel investments as "uncategorized cash." With 35% of self-directed investor portfolios in alternatives (Constellation Report 2024), most portfolio analytics tools analyze only 65% of the portfolio.',
        evidence: 'Tested portfolio analytics on a $500K portfolio with 22% crypto, 8% real estate, and 5% private credit: InvestScope, SigFig, and Morningstar all showed $175K as "uncategorized." Only Kubera handled alternatives but with no analytics (just tracking).',
        evidenceDetail: JSON.stringify({
          similarProducts: 6,
          repeatedComplaints: 9,
          launchFrequency: 2,
          commentSnippets: [
            '"My portfolio is 22% Bitcoin and Ethereum. InvestScope shows $110K as \'uncategorized cash\'. That\'s not cash — it\'s my highest-conviction position"',
            '"Real estate crowdfunding returns show up as a deposit transaction. No attribution, no factor analysis, just a number"',
            '"I have 4 angel investments worth $45K total. InvestScope can\'t even track them — they\'re not on any brokerage"',
            '"Crypto moves 5x more than my stock portfolio on volatile days but InvestScope\'s daily email doesn\'t mention it at all"'
          ],
          pricingOverlap: 4
        }),
        whyThisMatters: 'Self-directed investors with $50K-$2M portfolios hold an average of 35% in alternatives ($17.5K-$700K). These investors pay $15/month for portfolio analytics that ignores a third of their wealth. A tool that provides attribution analysis, factor exposure, and risk metrics across stocks, crypto, real estate, and private credit could charge $29-49/month — 2-3x current pricing — because it covers 100% vs. 65% of the portfolio.',
        subNiche: JSON.stringify({
          name: 'Unified portfolio analytics for self-directed investors with 20%+ alternative assets',
          description: 'Portfolio attribution and risk analysis that covers stocks, ETFs, crypto, real estate crowdfunding, private credit, and angel investments in a single dashboard with cross-asset correlation and factor analysis',
          parentCategory: 'Finance',
          opportunityScore: 74
        }),
        affectedProducts: JSON.stringify([
          { name: 'InvestScope', pricing: '$15/mo', strengths: ['Daily attribution', 'Factor exposure', 'Tax-loss harvesting'], weaknesses: ['No crypto analytics', 'No real estate tracking', 'No alternative assets'] },
          { name: 'Morningstar Investor', pricing: '$249/yr', strengths: ['Deep fund analysis', 'Research reports'], weaknesses: ['No crypto', 'No real estate', 'Traditional assets only'] },
          { name: 'Kubera', pricing: '$150/yr', strengths: ['Tracks all asset types', 'Net worth dashboard'], weaknesses: ['No analytics', 'No attribution', 'Tracking only'] },
          { name: 'Delta Investment Tracker', pricing: 'Free', strengths: ['Crypto + stocks tracking', 'Multi-exchange sync'], weaknesses: ['No analytics', 'No factor analysis', 'No attribution reports'] }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'Self-directed investors aged 30-45 with $100K-$500K portfolios including 20%+ crypto and alternatives', description: 'Need holistic portfolio analytics including alternative asset volatility, correlation with stocks, and risk metrics. Currently cobble together 2-3 tools', evidence: '32% of millennial investors hold crypto and traditional assets but only 4% use a single tool for both', opportunityScore: 79 }
        ]),
        severity: 'medium'
      }
    }),

    // Gap 10: FunnelMetrics — no A/B testing execution
    db.gap.create({
      data: {
        productId: products[12].id, // FunnelMetrics
        gapType: 'missing_feature',
        title: 'Conversion analytics tools diagnose revenue leaks but don\'t fix them — no product combines leak detection with A/B test execution',
        description: 'FunnelMetrics shows where revenue leaks but requires a separate tool (Optimizely, VWO) to run fixes. This creates a 2-tool, 2-workflow gap: diagnose in FunnelMetrics, configure in Optimizely, measure back in FunnelMetrics. 68% of identified leaks go unfixed for 30+ days because the fix workflow is too fragmented.',
        evidence: 'Surveyed 45 FunnelMetrics users: 68% reported identified leaks remaining unfixed for 30+ days due to the multi-tool workflow. 52% said they abandoned fixes entirely because the estimated lift didn\'t justify the setup time in a separate A/B testing tool.',
        evidenceDetail: JSON.stringify({
          similarProducts: 4,
          repeatedComplaints: 11,
          launchFrequency: 2,
          commentSnippets: [
            '"FunnelMetrics found a $7K/month leak on our checkout page. It took 3 weeks to set up the A/B test in Optimizely because our dev team was backlogged"',
            '"I know the problem but I can\'t fix it without a developer. Why can\'t the analytics tool just let me swap the headline?"',
            '"We identified 6 revenue leaks last quarter. We fixed 1 because each fix required a Jira ticket, dev time, and Optimizely configuration"',
            '"The estimated recovery value is useless if I can\'t act on it directly. I need a \'Fix This Now\' button, not a PDF report"'
          ],
          pricingOverlap: 3
        }),
        whyThisMatters: 'ECommerce brands lose an average of 18% of potential revenue to funnel leaks. They pay $29/month for analytics (FunnelMetrics) + $300+/month for A/B testing (Optimizely) but still fix only 32% of identified leaks due to workflow fragmentation. A combined tool at $99/month that detects leaks AND runs no-code fixes would eliminate the gap and save $230+/month on the Optimizely subscription while fixing 3x more leaks.',
        subNiche: JSON.stringify({
          name: 'One-click conversion fix execution for Shopify stores with $100K-$5M annual revenue',
          description: 'Conversion funnel analytics that detects revenue leaks and immediately offers no-code A/B test variations (headline swaps, CTA color changes, shipping threshold adjustments) deployable directly from the analytics dashboard without developer involvement',
          parentCategory: 'Marketing',
          opportunityScore: 83
        }),
        affectedProducts: JSON.stringify([
          { name: 'FunnelMetrics', pricing: '$29/mo', strengths: ['Revenue leak detection', 'Recovery value estimates', 'Shopify integration'], weaknesses: ['No A/B test execution', 'Diagnose-only workflow', 'Requires dev for fixes'] },
          { name: 'Optimizely', pricing: '$300+/mo', strengths: ['Full A/B testing', 'Feature flags', 'Statistical engine'], weaknesses: ['Expensive', 'No funnel analytics', 'Requires technical setup', 'No leak detection'] },
          { name: 'VWO', pricing: '$199+/mo', strengths: ['A/B testing', 'Heatmaps', 'Session recordings'], weaknesses: ['No revenue attribution', 'No leak detection', 'Separate from analytics'] },
          { name: 'Hotjar', pricing: '$32/mo', strengths: ['Heatmaps', 'Session recordings', 'Surveys'], weaknesses: ['No A/B testing', 'No revenue tracking', 'Qualitative only'] }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'Solo eCommerce managers at Shopify stores doing $100K-$1M annual revenue', description: 'Know their sites leak revenue but can\'t afford Optimizely ($300+/month) or a developer to set up A/B tests. Need one tool that finds and fixes leaks', evidence: 'Shopify stores under $1M revenue typically have 1 marketing person who manages analytics, CRO, and ads simultaneously — no dev resources for test setup', opportunityScore: 84 },
          { userGroup: 'Growth marketers at bootstrapped DTC brands', description: 'Identify 5-10 funnel improvements per month but can only execute 1-2 because each requires developer time in a separate A/B testing platform', evidence: 'DTC growth marketers report spending 60% of CRO time on coordination between analytics and testing tools vs. actual optimization', opportunityScore: 77 }
        ]),
        severity: 'high'
      }
    })
  ])

  console.log(`✅ Inserted ${gaps.length} gaps.`)

  // ========================================
  // COMPLAINTS (18 complaints linked to products)
  // ========================================
  console.log('💬 Inserting complaints...')

  const complaints = await Promise.all([
    // CopyForge complaints
    db.complaint.create({
      data: {
        productId: products[0].id,
        text: '7 out of 12 users mention the $29/month tier is too expensive for freelancers processing fewer than 10 documents/month — at that volume, cost per document exceeds $3.20, making manual writing more economical',
        category: 'pricing',
        sentiment: 'negative',
        frequency: 7
      }
    }),
    db.complaint.create({
      data: {
        productId: products[0].id,
        text: '9 users report that long-form content (800+ words) produces repetitive CTAs and transitional phrases — specifically the phrase "Ready to transform your [X]?" appears in 4 out of 5 generated long-form pieces',
        category: 'performance',
        sentiment: 'negative',
        frequency: 9
      }
    }),

    // DocuMentor complaints
    db.complaint.create({
      data: {
        productId: products[1].id,
        text: '5 healthcare SaaS teams confirm there are no HIPAA or SOC2 compliance templates — they must maintain separate compliance documentation in Google Docs alongside AI-generated technical docs, duplicating 15-25 hours of work per month',
        category: 'missing_feature',
        sentiment: 'negative',
        frequency: 5
      }
    }),
    db.complaint.create({
      data: {
        productId: products[1].id,
        text: '4 Rust developers report that generated documentation for unsafe blocks contains dangerously incorrect safety justifications — one generated doc claimed "This unsafe block is safe because the pointer is non-null" without verifying the actual invariant',
        category: 'performance',
        sentiment: 'negative',
        frequency: 4
      }
    }),

    // ScribeLens complaints
    db.complaint.create({
      data: {
        productId: products[2].id,
        text: '6 users in EU offices report that ScribeLens produces unusable transcripts for meetings where participants code-switch between local language and English — accuracy drops from 97% to an estimated 34% during language switches',
        category: 'missing_feature',
        sentiment: 'negative',
        frequency: 6
      }
    }),
    db.complaint.create({
      data: {
        productId: products[2].id,
        text: '3 companies with teams of 7+ people report speaker diarization merges participants with similar names — specifically "Mike M." and "Mike T." were merged in 8 out of 10 standup recordings over a 2-week test period',
        category: 'performance',
        sentiment: 'mixed',
        frequency: 3
      }
    }),
    db.complaint.create({
      data: {
        productId: products[2].id,
        text: '8 users request custom action item categories beyond "decision" and "action item" — specifically wanting "risk," "dependency," and "blocker" categories that align with their project management frameworks',
        category: 'missing_feature',
        sentiment: 'neutral',
        frequency: 8
      }
    }),

    // FlowState complaints
    db.complaint.create({
      data: {
        productId: products[3].id,
        text: '9 users admit to bypassing distraction blocks by quitting the app — one user said "I just quit FlowState when I want to check Instagram. The 3-second friction isn\'t enough to stop me" — suggesting the blocking mechanism lacks enforceability',
        category: 'ux',
        sentiment: 'negative',
        frequency: 9
      }
    }),
    db.complaint.create({
      data: {
        productId: products[3].id,
        text: '5 Linux users report the app has been "coming soon" for 6 months — half their engineering team cannot use the tool, making the team dashboard feature useless for tracking collective deep work hours',
        category: 'missing_feature',
        sentiment: 'negative',
        frequency: 5
      }
    }),

    // BugHunter AI complaints
    db.complaint.create({
      data: {
        productId: products[5].id,
        text: '11 users from Rust, Go, and C++ backgrounds note that BugHunter only supports Node.js, Python, and Java — one Rust developer said "I\'d pay $100/month for an AI that understands Rust\'s lifetime errors and suggests fixes" but no such tool exists',
        category: 'missing_feature',
        sentiment: 'negative',
        frequency: 11
      }
    }),
    db.complaint.create({
      data: {
        productId: products[5].id,
        text: '6 startup CTOs report that $49/month per developer is $392/month for an 8-person team — that exceeds their CI/CD bill and is 4x more expensive than GitHub Copilot at $10/month per developer',
        category: 'pricing',
        sentiment: 'negative',
        frequency: 6
      }
    }),
    db.complaint.create({
      data: {
        productId: products[5].id,
        text: '4 users report the confidence scores are misleading — one received 92% confidence on a suggestion that was completely wrong for their codebase, specifically suggesting a Node.js async pattern for a synchronous Express middleware',
        category: 'ux',
        sentiment: 'mixed',
        frequency: 4
      }
    }),

    // NutriTrack Pro complaints
    db.complaint.create({
      data: {
        productId: products[7].id,
        text: '7 endurance athletes (marathoners, triathletes, cyclists) report that NutriTrack uses a single macro formula regardless of training phase — they need periodized nutrition with high-carb build weeks, low-carb recovery weeks, and race-week carb loading protocols',
        category: 'missing_feature',
        sentiment: 'negative',
        frequency: 7
      }
    }),
    db.complaint.create({
      data: {
        productId: products[7].id,
        text: '3 cycling coaches managing 14+ athletes report they cannot set sport-specific macro targets — cyclists need different carb periodization than swimmers, but the coach dashboard applies one formula to all athletes',
        category: 'missing_feature',
        sentiment: 'negative',
        frequency: 3
      }
    }),

    // LedgerLite complaints
    db.complaint.create({
      data: {
        productId: products[9].id,
        text: '8 US-citizen expats in the EU report LedgerLite cannot handle multi-jurisdiction tax obligations — one user pays accountants $600/month across 3 countries because no bookkeeping tool supports FEIE, dual-currency, and day-count tracking',
        category: 'missing_feature',
        sentiment: 'negative',
        frequency: 8
      }
    }),
    db.complaint.create({
      data: {
        productId: products[9].id,
        text: '4 users report Amazon purchases are miscategorized 60% of the time — the AI labels business supply purchases as "Personal Shopping" because it can\'t distinguish between office supplies and consumer goods from the same retailer',
        category: 'performance',
        sentiment: 'negative',
        frequency: 4
      }
    }),

    // InvestScope complaints
    db.complaint.create({
      data: {
        productId: products[10].id,
        text: '7 users with 20%+ crypto allocations report that crypto holdings appear as "uncategorized cash" — on volatile days when Bitcoin moves $5K, the daily attribution email doesn\'t mention it, making the report useless for portfolio review',
        category: 'missing_feature',
        sentiment: 'negative',
        frequency: 7
      }
    }),
    db.complaint.create({
      data: {
        productId: products[10].id,
        text: '5 users report Plaid sync with Fidelity fails approximately 40% of the time, requiring manual reconnection every 2-3 days — support has acknowledged the Fidelity API issue but hasn\'t fixed it in 2 months',
        category: 'integration',
        sentiment: 'negative',
        frequency: 5
      }
    }),

    // ReachEngine complaints
    db.complaint.create({
      data: {
        productId: products[11].id,
        text: '5 EU-based brands report that ReachEngine\'s creator database is 70% US/UK — a French skincare brand found only 23 creators for "soin naturel" vs. 1,200 for the English equivalent "natural skincare"',
        category: 'missing_feature',
        sentiment: 'negative',
        frequency: 5
      }
    }),
    db.complaint.create({
      data: {
        productId: products[11].id,
        text: '3 users had their Instagram accounts flagged for spam after using the auto-DM feature to reach out to 30 creators in one hour — Instagram rate-limited their accounts for 48 hours, blocking all DMs including legitimate customer conversations',
        category: 'performance',
        sentiment: 'negative',
        frequency: 3
      }
    })
  ])

  console.log(`✅ Inserted ${complaints.length} complaints.`)

  // ========================================
  // OPPORTUNITIES (8 opportunities)
  // ========================================
  console.log('🎯 Inserting opportunities...')

  const opportunities = await Promise.all([
    // Opportunity 1: Compliance-reviewed AI copywriting
    db.opportunity.create({
      data: {
        title: 'Build compliance-reviewed AI copywriting for SEC-registered investment advisors',
        description: 'Create an AI copywriting tool with built-in FINRA Rule 2210 and SEC Marketing Rule compliance checkpoints, audit trails, and compliance officer approval workflows. The tool generates marketing copy AND validates it against regulatory requirements before publishing. Target the 15,000+ SEC-registered RIAs who spend $12K-$48K/year on marketing compliance review.',
        category: 'AI Tools',
        saturation: 'low',
        saturationScore: 18,
        gapEvidence: JSON.stringify([
          '53 AI writing tools launched in Q4 2024 — zero include compliance review workflows',
          'SEC fined RIAs $4.6M in 2024 for unapproved marketing materials',
          '14 healthcare marketers confirmed they cannot use AI-generated copy without manual compliance overlay',
          '0 of 53 tools offer FINRA Rule 2210 or SEC Marketing Rule checkpoints'
        ]),
        complaintRefs: JSON.stringify([
          '7 of 12 CopyForge users say $29/month tier is too expensive for freelancers — compliance tools can charge 3-7x more',
          '4 healthcare marketing managers spend 40% of campaign time on compliance review',
          '8 of 10 AI-generated headlines rejected for prohibited performance claims by compliance teams'
        ]),
        trendSignals: JSON.stringify([
          'SEC Marketing Rule enforcement increased 340% in 2024 vs. 2023',
          'RIA compliance spending grew from $2.1B to $3.8B between 2022-2025',
          'AI copywriting market is $1.2B but compliance segment is $0 — entirely unserved'
        ]),
        qualityScore: 91,
        evidenceDetail: JSON.stringify({
          similarProducts: 53,
          repeatedComplaints: 14,
          launchFrequency: 18,
          commentSnippets: [
            '"I spend $800/month on a compliance consultant to review AI-generated copy — the AI tool itself is only $29/month"',
            '"Our compliance team rejected 8 out of 10 AI-generated headlines for using prohibited performance claims"',
            '"Healthcare marketing copy requires HIPAA-reviewed disclaimers that no AI tool generates automatically"'
          ],
          pricingOverlap: 6
        }),
        opportunityScore: JSON.stringify({
          complaintFrequency: 82,
          competitionDensity: 12,
          pricingDissatisfaction: 88,
          launchGrowth: 75,
          underservedAudience: 91,
          total: 70,
          explanation: 'Extremely low competition (0 compliant tools) and high underserved audience (15K+ RIAs) offset by moderate complaint visibility — compliance pain is felt acutely by specialists but not broadly discussed. Pricing dissatisfaction is high because $29/month AI tools require $800+/month compliance consultants on top.'
        }),
        whyThisMatters: 'The 15,000+ SEC-registered RIAs each spend $12K-$48K/year on marketing compliance review. A tool that generates compliant copy at $99-199/month saves them $11K-$46K/year while capturing revenue that currently goes to human compliance consultants. The SEC fined RIAs $4.6M in 2024 for unapproved materials — the regulatory urgency is real and growing.',
        subNiche: JSON.stringify({
          name: 'FINRA/SEC compliance-reviewed copywriting for RIA marketing teams',
          description: 'AI copy generator with embedded compliance validation against FINRA Rule 2210, SEC Marketing Rule, and state-specific advertising regulations, plus compliance officer approval workflows and audit trail generation',
          parentCategory: 'AI Tools',
          opportunityScore: 87
        }),
        affectedProducts: JSON.stringify([
          { name: 'CopyForge AI', pricing: '$29/mo', strengths: ['High-converting copy', 'Brand voice cloning'], weaknesses: ['No compliance', 'No audit trail'] },
          { name: 'Jasper', pricing: '$49/mo', strengths: ['Enterprise features'], weaknesses: ['No FINRA/SEC rules', 'Generic disclaimers'] },
          { name: 'Copy.ai', pricing: '$36/mo', strengths: ['Workflow automation'], weaknesses: ['No compliance workflows', 'No approval chain'] }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'Compliance officers at SEC-registered RIAs', description: 'Review 50-200 marketing pieces per month manually at 15-30 min each', evidence: '3.2 FTEs per $500M AUM firm dedicated to marketing review', opportunityScore: 91 },
          { userGroup: 'Healthcare marketing managers at HIPAA-covered entities', description: 'Cannot use AI copy without legal review for HIPAA disclaimers and FDA claim restrictions', evidence: '40% of campaign time on compliance review per AHIMA', opportunityScore: 84 }
        ]),
        isSaved: true,
        isGenerated: false
      }
    }),

    // Opportunity 2: AI compliance documentation for healthcare SaaS
    db.opportunity.create({
      data: {
        title: 'Build AI compliance documentation generator that bridges technical docs and HIPAA/SOC 2 requirements',
        description: 'Create a tool that analyzes codebases, API definitions, and infrastructure configs to auto-generate both technical documentation AND compliance documentation (HIPAA security rule, SOC 2 Type II controls, GDPR Article 30 records). Eliminates the dual-system problem where DevOps teams maintain technical docs in one tool and compliance docs in Google Docs.',
        category: 'Developer Tools',
        saturation: 'low',
        saturationScore: 22,
        gapEvidence: JSON.stringify([
          '12 AI documentation tools on ProductHunt — 0 generate compliance documentation',
          '8 DevOps leads at healthcare SaaS companies maintain compliance docs manually in Google Docs',
          'SOC 2 audit preparation takes 3-6 months with 40% of time on evidence documentation',
          'Healthcare SaaS startups under 50 employees have 1 DevOps engineer spending 30-40% of time on compliance docs'
        ]),
        complaintRefs: JSON.stringify([
          '5 healthcare SaaS teams confirm no HIPAA/SOC2 templates in documentation tools',
          '3 DevOps leads spend 8-15 hours/month manually writing compliance documentation',
          'SOC 2 audit preparation takes 3-6 months — 40% is evidence documentation'
        ]),
        trendSignals: JSON.stringify([
          'HIPAA enforcement penalties increased 65% in 2024',
          'SOC 2 certification demand grew 42% YoY as B2B SaaS buyers require it',
          '4,500+ HIPAA-covered SaaS companies in US alone, growing 18% annually'
        ]),
        qualityScore: 86,
        evidenceDetail: JSON.stringify({
          similarProducts: 12,
          repeatedComplaints: 8,
          launchFrequency: 5,
          commentSnippets: [
            '"We use DocuMentor for API docs but still write our SOC 2 control descriptions in Google Docs"',
            '"I need a tool that can say \'this endpoint processes PHI and here\'s the required documentation for it\'"',
            '"GDPR Article 30 requires records of processing activities. Our technical docs don\'t satisfy that requirement"'
          ],
          pricingOverlap: 4
        }),
        opportunityScore: JSON.stringify({
          complaintFrequency: 74,
          competitionDensity: 18,
          pricingDissatisfaction: 72,
          launchGrowth: 68,
          underservedAudience: 88,
          total: 64,
          explanation: 'Strong underserved audience and low competition but moderate complaint frequency — compliance documentation pain is severe but discussed in specialized channels (DevOps, security) not broadly. The opportunity is large ($54M-$95M) but requires domain expertise to build correctly.'
        }),
        whyThisMatters: 'Healthcare SaaS companies spend $85K/year average on compliance documentation. 4,500+ HIPAA-covered SaaS companies in the US represent a $382M annual spend on compliance docs. A tool capturing 15-25% of that would generate $57M-$95M in revenue. DevOps engineers at these companies spend 30-40% of their time on compliance docs — automating this is a direct productivity unlock.',
        subNiche: JSON.stringify({
          name: 'AI compliance doc generator for HIPAA-covered SaaS startups under 50 employees',
          description: 'Auto-generates HIPAA security rule documentation, SOC 2 Type II control descriptions, and GDPR Article 30 records from codebase analysis, API definitions, and Terraform/CloudFormation configs',
          parentCategory: 'Developer Tools',
          opportunityScore: 82
        }),
        affectedProducts: JSON.stringify([
          { name: 'DocuMentor AI', pricing: 'Freemium', strengths: ['Codebase-aware generation'], weaknesses: ['No compliance templates', 'No regulatory mapping'] },
          { name: 'Vanta', pricing: '$500/mo+', strengths: ['Compliance monitoring'], weaknesses: ['No doc generation from code', 'Monitoring only'] },
          { name: 'ReadMe', pricing: '$99/mo', strengths: ['API docs'], weaknesses: ['No compliance awareness', 'Dev docs only'] }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'DevOps engineers at HIPAA-covered SaaS startups (10-50 employees)', description: 'Spend 8-15 hours/month manually writing compliance docs from code they already wrote', evidence: '1 DevOps engineer spending 30-40% time on compliance docs at typical startup', opportunityScore: 88 },
          { userGroup: 'Security compliance analysts preparing for SOC 2 Type II audits', description: 'Document evidence for 60+ trust service criteria manually by reading code and interviewing engineers', evidence: '40% of SOC 2 prep time is evidence documentation per AICPA', opportunityScore: 79 }
        ]),
        isSaved: true,
        isGenerated: false
      }
    }),

    // Opportunity 3: Enforceable focus blocks with social accountability
    db.opportunity.create({
      data: {
        title: 'Build enforceable focus app with social accountability for ADHD adults and remote workers',
        description: 'Create a focus/distraction-blocking app where block periods cannot be self-bypassed — unlocking requires approval from a designated accountability partner. Include optional monetary stakes (charity donation on bypass). Target the 8.7M US adults with ADHD who lose 2+ productive hours daily to digital distraction and have tried but abandoned all existing focus tools.',
        category: 'Productivity',
        saturation: 'medium',
        saturationScore: 52,
        gapEvidence: JSON.stringify([
          '8 focus/distraction-blocking tools on ProductHunt — all trivially bypassable by quitting the app',
          '73% of FlowState users admit to bypassing their own blocks within the first week',
          '89% of surveyed users say they would prefer an "enforced mode" with accountability partner override',
          'Current focus tools have 30-day retention rates below 25% due to bypassability'
        ]),
        complaintRefs: JSON.stringify([
          '9 FlowState users bypass blocks by quitting the app — "3-second friction isn\'t enough"',
          '67% of ADHD adults abandoned focus apps within 2 weeks due to easy bypass (CHADD survey)',
          '6 users explicitly request accountability partner approval for block unlocks'
        ]),
        trendSignals: JSON.stringify([
          'ADHD diagnoses in adults increased 34% from 2020-2024',
          'Remote work digital distraction costs estimated $10K/employee/year in lost productivity',
          'Focus/attention apps grew 180% in downloads since 2022 but retention remains poor'
        ]),
        qualityScore: 78,
        evidenceDetail: JSON.stringify({
          similarProducts: 8,
          repeatedComplaints: 18,
          launchFrequency: 4,
          commentSnippets: [
            '"I just quit the app when I want to check Instagram. The 3-second friction isn\'t enough to stop me"',
            '"ADHD brain: I set a 90-minute focus block, then immediately bypassed it for a \'quick notification\'. 45 minutes later..."',
            '"I need something where my accountability partner has to approve the unlock. Self-control doesn\'t work for me"'
          ],
          pricingOverlap: 6
        }),
        opportunityScore: JSON.stringify({
          complaintFrequency: 89,
          competitionDensity: 48,
          pricingDissatisfaction: 62,
          launchGrowth: 71,
          underservedAudience: 88,
          total: 72,
          explanation: 'Very high complaint frequency (users loudly frustrated with bypassability) and strong underserved audience (ADHD adults), but competition is moderate (8+ tools exist, just poorly differentiated on enforcement). The key differentiator is accountability partner enforcement — if well-executed, could achieve 60%+ retention vs. current <25%.'
        }),
        whyThisMatters: '8.7M US adults with ADHD lose 2+ hours daily to digital distraction. Current focus tools generate $180M/year but have <25% 30-day retention because they\'re trivially bypassable. An enforceable tool with social accountability could achieve 60%+ retention and command $15/month ($6 premium over current $9/month average). At 500K users (5.7% of ADHD adults), that\'s $90M ARR — 50% of the entire current market with a fraction of the user base.',
        subNiche: JSON.stringify({
          name: 'Accountability-partner-enforced focus blocks for ADHD adults in remote work',
          description: 'Focus app with non-bypassable blocks (partner approval required to unlock), optional monetary stakes, ADHD-specific UX (shorter default blocks, dopamine-aware reward system), and integration with ADHD coaching platforms',
          parentCategory: 'Productivity',
          opportunityScore: 76
        }),
        affectedProducts: JSON.stringify([
          { name: 'FlowState', pricing: '$9/mo', strengths: ['OS-level blocking', 'Deep work tracking'], weaknesses: ['Trivially bypassable', 'No enforcement'] },
          { name: 'Forest', pricing: '$3.99 one-time', strengths: ['Gamification', 'Low price'], weaknesses: ['Easy bypass', 'No enforcement'] },
          { name: 'Freedom', pricing: '$6.99/mo', strengths: ['Cross-device blocking'], weaknesses: ['Bypassable via uninstall', 'No accountability'] }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'ADHD adults in remote work positions', description: 'Lose 2-4 hours daily; self-imposed blocks fail because executive dysfunction overrides intention', evidence: '67% abandoned focus apps within 2 weeks due to easy bypass (CHADD)', opportunityScore: 88 },
          { userGroup: 'Law and medical students in exam prep', description: 'Need enforced study blocks during 10-14 hour study days; currently rely on study groups for accountability', evidence: '71% report digital distraction as top focus challenge during exam prep', opportunityScore: 72 }
        ]),
        isSaved: false,
        isGenerated: false
      }
    }),

    // Opportunity 4: Rust/Go AI debugging
    db.opportunity.create({
      data: {
        title: 'Build AI debugging assistant for Rust lifetime errors and Go concurrency bugs — the 3.2M developer gap',
        description: 'Create an AI debugger specialized in Rust\'s borrow checker and lifetime annotations, Go\'s goroutine leaks and channel deadlocks, and C++ memory corruption. Ingests compiler errors and produces visual ownership graphs, idiomatic fix suggestions, and explanations. No current tool serves the systems programming debugging market.',
        category: 'Developer Tools',
        saturation: 'low',
        saturationScore: 15,
        gapEvidence: JSON.stringify([
          '23 AI debugging tools analyzed — 0 support Rust, 0 support C++, 3 claim "coming soon" for Go',
          'Rust developers spend 4.6 hours/week debugging lifetime and borrow-checker errors specifically',
          'Rust adoption grew 340% in production systems between 2022-2025 (JetBrains survey)',
          '67% of junior Go developers cite concurrency debugging as their top challenge'
        ]),
        complaintRefs: JSON.stringify([
          '11 users from Rust/Go/C++ backgrounds note BugHunter only supports Node.js, Python, Java',
          'One Rust developer: "I\'d pay $100/month for an AI that understands Rust\'s lifetime errors"',
          'Go developer survey: 67% with <2 years experience cite goroutine/channel debugging as top challenge'
        ]),
        trendSignals: JSON.stringify([
          'Rust developer base grew from 800K to 3.2M (2022-2025)',
          'Linux kernel, Android, and Windows all adopting Rust for new code',
          'Go is #4 most-wanted language in Stack Overflow 2024 survey'
        ]),
        qualityScore: 88,
        evidenceDetail: JSON.stringify({
          similarProducts: 23,
          repeatedComplaints: 11,
          launchFrequency: 7,
          commentSnippets: [
            '"Rust\'s borrow checker errors are notoriously hard to debug — this is exactly where AI should help"',
            '"Our entire backend is Go microservices. Every AI debugging tool says \'coming soon\' for Go support"',
            '"I\'d pay $100/month for an AI that understands Rust\'s lifetime errors and suggests fixes"'
          ],
          pricingOverlap: 8
        }),
        opportunityScore: JSON.stringify({
          complaintFrequency: 71,
          competitionDensity: 8,
          pricingDissatisfaction: 82,
          launchGrowth: 91,
          underservedAudience: 90,
          total: 68,
          explanation: 'Extremely low competition and high growth trajectory (Rust up 340%) but the complaint frequency is moderate because the target audience is smaller and more technical — they discuss pain in niche forums, not ProductHunt comments. The $100/month WTP (willingness to pay) is 2x BugHunter\'s $49/month, indicating strong value perception.'
        }),
        whyThisMatters: '3.2M Rust developers spend 4.6 hours/week on compiler-error debugging (3x more than Python developers). At $49/month, capturing 10% (320K users) generates $188M ARR. Rust is now used in the Linux kernel, Android, and Windows — the developer base will continue growing. First-mover advantage in Rust debugging is extremely valuable because training data on real Rust errors creates a defensible moat.',
        subNiche: JSON.stringify({
          name: 'AI Rust lifetime/borrow-checker debugging for infrastructure developers',
          description: 'Specialized AI debugger analyzing Rust compiler errors, suggesting lifetime annotations, explaining borrow-checker violations with visual ownership graphs, and proposing idiomatic fixes — focused on developers building production infrastructure',
          parentCategory: 'Developer Tools',
          opportunityScore: 85
        }),
        affectedProducts: JSON.stringify([
          { name: 'BugHunter AI', pricing: '$49/mo', strengths: ['Root cause analysis', 'Sentry integration'], weaknesses: ['No Rust/Go/C++', 'Web-stack only'] },
          { name: 'GitHub Copilot', pricing: '$10/mo', strengths: ['Multi-language completion'], weaknesses: ['Not debugging-focused', 'Generic Rust suggestions'] },
          { name: 'Cursor IDE', pricing: '$20/mo', strengths: ['AI-native editor'], weaknesses: ['Not a debugger', 'No error log ingestion'] }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'Rust developers at infrastructure companies (Cloudflare, AWS, Discord)', description: 'Spend 4-6 hours/week on lifetime errors and borrow-checker violations that current AI tools cannot analyze', evidence: 'Rust devs report 3x more time on compiler debugging vs. Python devs', opportunityScore: 90 },
          { userGroup: 'Junior Go developers at startups (0-2 years experience)', description: 'Struggle with goroutine leaks, channel deadlocks, and interface assertion panics', evidence: '67% cite concurrency debugging as top challenge', opportunityScore: 74 }
        ]),
        isSaved: false,
        isGenerated: false
      }
    }),

    // Opportunity 5: EU influencer discovery
    db.opportunity.create({
      data: {
        title: 'Build local-language influencer discovery tool for EU DTC brands — the €4.8B market with 3% tool coverage',
        description: 'Create an influencer marketing platform that indexes local-language Instagram, TikTok, and YouTube creators in DE, FR, ES, IT with native content analysis, local engagement metrics, and EU advertising disclosure compliance (DSA Article 26). Current tools cover only 3-8% of EU creators despite the EU influencer market being €4.8B.',
        category: 'Marketing',
        saturation: 'low',
        saturationScore: 25,
        gapEvidence: JSON.stringify([
          '6 influencer marketing tools analyzed — average 72% US/UK coverage, only 3-8% EU coverage',
          'German skincare brand found only 200 creators across all platforms for their niche',
          'EU influencer market grew 28% in 2024 to €4.8B — 1.2M active creators largely invisible to US tools',
          'EU DTC brands rate influencer tool satisfaction at 3.1/10 for local market coverage'
        ]),
        complaintRefs: JSON.stringify([
          '5 EU brands report 85% fewer creator results than equivalent US searches',
          'French brand found 23 creators for "soin naturel" vs. 1,200 for English equivalent',
          '3 brands had Instagram accounts flagged after using auto-DM feature aggressively'
        ]),
        trendSignals: JSON.stringify([
          'EU DTC market grew 22% in 2024, driven by social commerce',
          'EU Digital Services Act requires influencer ad disclosures — compliance tooling needed',
          'TikTok Shop launching in DE, FR, ES in 2025 — creator demand will surge'
        ]),
        qualityScore: 82,
        evidenceDetail: JSON.stringify({
          similarProducts: 6,
          repeatedComplaints: 12,
          launchFrequency: 2,
          commentSnippets: [
            '"We\'re a French skincare brand and ReachEngine returned 23 creators for \'soin naturel\' vs. 1,200 for English"',
            '"Our Japanese K-beauty partner couldn\'t find a single Japanese creator with audience data"',
            '"We spent $3K on Heepsy for our German launch and found 14 relevant creators"'
          ],
          pricingOverlap: 5
        }),
        opportunityScore: JSON.stringify({
          complaintFrequency: 78,
          competitionDensity: 22,
          pricingDissatisfaction: 65,
          launchGrowth: 72,
          underservedAudience: 85,
          total: 64,
          explanation: 'Strong underserved audience and low competition, but moderate pricing dissatisfaction (existing tools are affordable, just ineffective for EU). The DSA compliance angle is a unique differentiator that could justify 2x pricing. The €4.8B market size with only 3-8% tool coverage is the strongest signal.'
        }),
        whyThisMatters: 'The EU influencer market is €4.8B with 1.2M active creators but existing tools index only 3-8% of them. EU DTC brands spend €2.4K/month average on influencer marketing but rate their tools 3.1/10 for local coverage. A tool that indexes 50% of EU creators (600K) at €49/month would generate €588K/month from 12K subscribers. The upcoming DSA Article 26 disclosure requirements create a compliance moat.',
        subNiche: JSON.stringify({
          name: 'DSA-compliant influencer discovery for French and German DTC beauty brands',
          description: 'Creator database indexing DE and FR Instagram/TikTok/YouTube creators with native language content analysis, local engagement benchmarks, and DSA Article 26 disclosure compliance tracking',
          parentCategory: 'Marketing',
          opportunityScore: 81
        }),
        affectedProducts: JSON.stringify([
          { name: 'ReachEngine', pricing: '$49/mo', strengths: ['4.2M creators', 'Brand-fit scoring'], weaknesses: ['70% US/UK', 'No local languages'] },
          { name: 'Modash', pricing: '$49/mo', strengths: ['250M index'], weaknesses: ['Only 8M EU creators', 'Poor non-English'] },
          { name: 'Heepsy', pricing: '$49/mo', strengths: ['Fraud detection'], weaknesses: ['Small EU index', 'No local language'] }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'DTC brand marketing managers expanding from US to EU markets', description: 'Need local-language creator discovery in DE, FR, ES, IT but get 85% fewer results than US', evidence: '75% cite influencer discovery as top challenge for EU expansion', opportunityScore: 85 },
          { userGroup: 'EU-based DTC brands scaling influencer marketing domestically', description: 'German, French, Spanish brands with €1M-10M revenue need affordable tools for local markets', evidence: 'Tool satisfaction 3.1/10 for local coverage', opportunityScore: 78 }
        ]),
        isSaved: true,
        isGenerated: false
      }
    }),

    // Opportunity 6: Multi-jurisdiction freelancer bookkeeping
    db.opportunity.create({
      data: {
        title: 'Build multi-jurisdiction bookkeeping for 35M digital nomads earning income in 2+ countries',
        description: 'Create a freelancer bookkeeping tool that handles US self-employment tax, FEIE day-count tracking, host-country tax obligations, and dual-currency bookkeeping in a single dashboard. Target US-citizen digital nomads in the EU and freelance consultants with clients in 3+ countries. Current tools are single-country only.',
        category: 'Finance',
        saturation: 'low',
        saturationScore: 20,
        gapEvidence: JSON.stringify([
          '7 freelancer bookkeeping tools tested — none support multi-country tax filing in a single account',
          '12 digital nomads interviewed all maintain separate spreadsheets for each country',
          '35M digital nomads worldwide earn average $68K/year but no bookkeeping tool serves them',
          '1.1M US citizens live in the EU; 340K are self-employed filing in both jurisdictions'
        ]),
        complaintRefs: JSON.stringify([
          '8 US-citizen expats pay $600/month to accountants across 3 countries',
          '4 users cannot handle dual-currency bookkeeping — USD income, EUR expenses',
          'FEIE calculation requires day-count tracking that no bookkeeping app provides'
        ]),
        trendSignals: JSON.stringify([
          'Digital nomad population grew from 10.9M to 35M (2019-2025)',
          '60+ countries now offer digital nomad visas, creating new tax obligations',
          'Remote work cross-border taxation disputes increased 45% in 2024'
        ]),
        qualityScore: 80,
        evidenceDetail: JSON.stringify({
          similarProducts: 7,
          repeatedComplaints: 15,
          launchFrequency: 2,
          commentSnippets: [
            '"I\'m a US citizen in Portugal. I need to track US self-employment tax AND Portuguese NHR obligations"',
            '"My income comes from US clients (USD) and German clients (EUR). Wave can\'t handle dual-currency"',
            '"I pay accountants in 3 countries $600/month total because no tool handles multi-jurisdiction taxes"'
          ],
          pricingOverlap: 5
        }),
        opportunityScore: JSON.stringify({
          complaintFrequency: 76,
          competitionDensity: 15,
          pricingDissatisfaction: 85,
          launchGrowth: 82,
          underservedAudience: 86,
          total: 69,
          explanation: 'Very low competition and high pricing dissatisfaction (digital nomads currently pay $600/month to accountants vs. $9/month for tools that don\'t work). The 35M user base is large but fragmented. Key challenge: tax law complexity across jurisdictions. A focused start on US+EU would capture the highest-value segment first.'
        }),
        whyThisMatters: '35M digital nomads spend $3,600/year average on accountants across multiple countries because no software handles multi-jurisdiction freelancing. A tool at $25/month ($300/year) saves $3,300/year — 11x ROI. Capturing 1% (350K users) generates $105M ARR. The US-citizen-in-EU segment alone is 340K self-employed people paying $600/month to accountants.',
        subNiche: JSON.stringify({
          name: 'US-EU dual-jurisdiction bookkeeping for self-employed digital nomads on D7/nomad visas',
          description: 'Bookkeeping tool handling US Schedule C + self-employment tax, FEIE day-count tracking, and host-country tax obligations (Portugal NHR, Germany Freiberufler, Spain autónomo) with dual-currency USD/EUR tracking',
          parentCategory: 'Finance',
          opportunityScore: 80
        }),
        affectedProducts: JSON.stringify([
          { name: 'LedgerLite', pricing: '$9/mo', strengths: ['Auto-categorization', 'Schedule C'], weaknesses: ['US only', 'Single currency', 'No FEIE'] },
          { name: 'QuickBooks SE', pricing: '$15/mo', strengths: ['Mileage tracking'], weaknesses: ['US only', 'No foreign income'] },
          { name: 'Xero', pricing: '$13/mo', strengths: ['Multi-currency'], weaknesses: ['One tax jurisdiction', 'Not freelancer-focused'] }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'US-citizen digital nomads on EU digital nomad visas', description: 'Must file US taxes (worldwide income) plus host-country taxes; need FEIE tracking and treaty calculations', evidence: '340K US self-employed in EU, spending $600/month on multi-country accountants', opportunityScore: 86 },
          { userGroup: 'Freelance consultants with clients in 3+ countries', description: 'Invoice in multiple currencies, need VAT/GST per client location, track where work was physically performed', evidence: '6 hours/month on multi-jurisdiction bookkeeping manually', opportunityScore: 73 }
        ]),
        isSaved: false,
        isGenerated: false
      }
    }),

    // Opportunity 7: Conversion fix execution
    db.opportunity.create({
      data: {
        title: 'Build one-click conversion fix tool for Shopify stores — combine leak detection with no-code A/B test execution',
        description: 'Create a conversion analytics tool that not only detects revenue leaks but also offers no-code A/B test variations deployable directly from the analytics dashboard. Target Shopify stores with $100K-$5M annual revenue that currently use FunnelMetrics ($29/month) for detection + Optimizely ($300+/month) for testing but only fix 32% of identified leaks due to workflow fragmentation.',
        category: 'Marketing',
        saturation: 'medium',
        saturationScore: 42,
        gapEvidence: JSON.stringify([
          '68% of identified revenue leaks go unfixed for 30+ days due to multi-tool workflow',
          '4 conversion analytics tools diagnose leaks but 0 execute fixes directly',
          '52% of users abandon fixes because estimated lift doesn\'t justify setup time in a separate A/B tool',
          'eCommerce brands lose average 18% of potential revenue to unfixed funnel leaks'
        ]),
        complaintRefs: JSON.stringify([
          'FunnelMetrics user: "Found a $7K/month leak but took 3 weeks to set up A/B test in Optimizely"',
          '6 identified leaks per month, only 1-2 fixed due to dev backlogs and tool fragmentation',
          'Solo eCommerce managers need one tool that finds AND fixes leaks without developer involvement'
        ]),
        trendSignals: JSON.stringify([
          'Shopify store count grew 18% to 4.6M in 2024',
          'No-code A/B testing market growing 28% annually',
          'Conversion rate optimization SaaS market estimated at $1.2B by 2026'
        ]),
        qualityScore: 84,
        evidenceDetail: JSON.stringify({
          similarProducts: 4,
          repeatedComplaints: 11,
          launchFrequency: 2,
          commentSnippets: [
            '"FunnelMetrics found a $7K/month leak. It took 3 weeks to set up the A/B test in Optimizely"',
            '"I know the problem but I can\'t fix it without a developer. Why can\'t the analytics tool just let me swap the headline?"',
            '"We identified 6 revenue leaks last quarter. We fixed 1 because each fix required a Jira ticket + Optimizely configuration"'
          ],
          pricingOverlap: 3
        }),
        opportunityScore: JSON.stringify({
          complaintFrequency: 85,
          competitionDensity: 38,
          pricingDissatisfaction: 72,
          launchGrowth: 68,
          underservedAudience: 84,
          total: 69,
          explanation: 'High complaint frequency (users actively frustrated by fragmented workflow) and strong underserved audience (solo eCommerce managers), but moderate competition (analytics and A/B tools exist separately). The "Fix This Now" button combining detection + execution is the key differentiator. Users pay $329/month for two separate tools; one combined tool at $99/month is a clear cost saving.'
        }),
        whyThisMatters: 'Shopify stores with $100K-$5M revenue lose 18% of potential revenue to unfixed funnel leaks. They pay $29/month for analytics + $300+/month for A/B testing but only fix 32% of identified leaks. A combined tool at $99/month saves $230+/month AND increases fix rate from 32% to 80%+ by eliminating the workflow gap. At 10K subscribers (0.2% of Shopify stores), that\'s $11.9M ARR.',
        subNiche: JSON.stringify({
          name: 'One-click conversion fix execution for Shopify stores under $5M annual revenue',
          description: 'Conversion funnel analytics + no-code A/B test execution in one tool. Detects revenue leaks and offers deployable fixes (headline swaps, CTA changes, shipping threshold adjustments) without developer involvement. Shopify-native with Theme Editor integration.',
          parentCategory: 'Marketing',
          opportunityScore: 83
        }),
        affectedProducts: JSON.stringify([
          { name: 'FunnelMetrics', pricing: '$29/mo', strengths: ['Revenue leak detection'], weaknesses: ['No A/B execution', 'Diagnose only'] },
          { name: 'Optimizely', pricing: '$300+/mo', strengths: ['Full A/B testing'], weaknesses: ['Expensive', 'No funnel analytics', 'Needs dev setup'] },
          { name: 'VWO', pricing: '$199+/mo', strengths: ['A/B testing + heatmaps'], weaknesses: ['No revenue attribution', 'No leak detection'] }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'Solo eCommerce managers at Shopify stores ($100K-$1M revenue)', description: 'Can\'t afford Optimizely or dev resources for A/B testing; need one tool that finds AND fixes leaks', evidence: '1 marketing person manages analytics + CRO + ads at typical small Shopify store', opportunityScore: 84 },
          { userGroup: 'Growth marketers at bootstrapped DTC brands', description: 'Identify 5-10 funnel improvements per month but can only execute 1-2 due to fragmented tooling', evidence: '60% of CRO time spent on tool coordination vs. actual optimization', opportunityScore: 77 }
        ]),
        isSaved: true,
        isGenerated: false
      }
    }),

    // Opportunity 8: Periodized endurance nutrition
    db.opportunity.create({
      data: {
        title: 'Build periodized endurance fueling planner — the $3,200/year athlete spend with zero software automation',
        description: 'Create a nutrition planning tool that auto-generates periodized fueling plans aligned to training mesocycles (build, recovery, taper, race week) with carb-loading protocols, intra-workout fueling schedules, and electrolyte management. Target the 4.2M competitive endurance athletes who currently pay coaches $150-300/month for manual nutrition planning that could be automated.',
        category: 'Health & Fitness',
        saturation: 'low',
        saturationScore: 28,
        gapEvidence: JSON.stringify([
          '11 sports nutrition apps reviewed — 9 offer macro tracking, 2 offer basic periodization, 0 offer endurance-specific periodized fueling',
          '16 competitive endurance athletes interviewed: 14 use spreadsheets alongside their nutrition app',
          '67% of Ironman finishers are self-coached and calculate fueling from blog posts and podcasts',
          'No app implements race-week carb loading protocols (36-48h specific loading) or intra-workout 60-90g/hr fueling'
        ]),
        complaintRefs: JSON.stringify([
          '7 endurance athletes report same macro formula regardless of training phase',
          '3 coaches cannot set sport-specific targets for different athlete types',
          'Race-week carb loading is a specific 36-48h protocol that no app implements'
        ]),
        trendSignals: JSON.stringify([
          'Marathon finishers grew 12% in 2024 to 1.1M in the US alone',
          'Endurance sports nutrition market worth $8.4B globally',
          'Wearable integration (Garmin, WHOOP) enabling real-time fueling recommendations'
        ]),
        qualityScore: 79,
        evidenceDetail: JSON.stringify({
          similarProducts: 11,
          repeatedComplaints: 16,
          launchFrequency: 3,
          commentSnippets: [
            '"I\'m training 18 hours/week for an Ironman. NutriTrack gives me the same carb ratio on recovery and build weeks"',
            '"Race-week carb loading is a specific 36-48h protocol. No app implements this"',
            '"My coach gives me a periodized plan in a PDF. I manually enter each week\'s targets. 45 minutes every Sunday"'
          ],
          pricingOverlap: 7
        }),
        opportunityScore: JSON.stringify({
          complaintFrequency: 72,
          competitionDensity: 25,
          pricingDissatisfaction: 58,
          launchGrowth: 65,
          underservedAudience: 82,
          total: 60,
          explanation: 'Moderate complaint frequency (endurance athletes are a passionate niche but small vs. general fitness) and low competition. The $3,200/year average nutrition spend indicates willingness to pay, but current tool pricing is $12-20/month — the gap is between what athletes pay for products vs. software. A $25/month tool that replaces $150-300/month coach nutrition planning has clear value.'
        }),
        whyThisMatters: '4.2M Americans compete in endurance events annually, spending $3,200/year average on nutrition products. They pay coaches $150-300/month for periodized plans that could be automated. A subscription at $25/month generates $1.26B/year from full market, or $126M from 10% adoption. The self-coached segment (67% of Ironman finishers) is the lowest-hanging fruit — they have the need but not the budget for a coach.',
        subNiche: JSON.stringify({
          name: 'Periodized fueling planner for self-coached Ironman triathletes training 15-25 hours/week',
          description: 'Auto-generates periodized nutrition plans from TrainingPeaks data aligned to mesocycles, with race-week carb loading protocols, intra-workout fueling schedules (60-90g/hr), and electrolyte management',
          parentCategory: 'Health & Fitness',
          opportunityScore: 77
        }),
        affectedProducts: JSON.stringify([
          { name: 'NutriTrack Pro', pricing: '$12/mo', strengths: ['Training load sync', 'Coach dashboard'], weaknesses: ['Single macro formula', 'No periodization'] },
          { name: 'MyFitnessPal', pricing: '$20/mo', strengths: ['Largest food DB'], weaknesses: ['Not sports-specific', 'No periodization'] },
          { name: 'Fuelin', pricing: '$15/mo', strengths: ['Training-synced meals'], weaknesses: ['Generic periodization', 'No race-week protocols'] }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'Self-coached Ironman triathletes training 15-25 hours/week', description: 'Follow generic training plans but have no periodized nutrition. Calculate fueling in spreadsheets from blog posts', evidence: '67% self-coached; $0 on software, $200/month on trial-and-error products', opportunityScore: 82 },
          { userGroup: 'Endurance sports coaches managing 10-30 athletes', description: 'Create individual periodized plans manually — 2-3 hours per athlete per month', evidence: '30% of coaching time on nutrition planning that could be automated', opportunityScore: 75 }
        ]),
        isSaved: false,
        isGenerated: false
      }
    })
  ])

  console.log(`✅ Inserted ${opportunities.length} opportunities.`)

  // ========================================
  // TRENDS (7 trends)
  // ========================================
  console.log('📈 Inserting trends...')

  const trends = await Promise.all([
    // Trend 1: AI compliance tools
    db.trend.create({
      data: {
        category: 'AI Tools',
        name: 'Regulatory compliance automation for AI-generated content',
        description: 'As AI-generated marketing, documentation, and communications proliferate, regulatory bodies are increasing enforcement. SEC fined RIAs $4.6M in 2024 for unapproved materials; HIPAA penalties increased 65%. The gap between AI content generation and compliance validation is widening, creating demand for compliance-aware AI tools.',
        growthRate: 340,
        direction: 'growing',
        dataPoints: JSON.stringify([
          { label: 'Jan 2024', value: 2 },
          { label: 'Apr 2024', value: 5 },
          { label: 'Jul 2024', value: 12 },
          { label: 'Oct 2024', value: 18 },
          { label: 'Jan 2025', value: 31 },
          { label: 'Mar 2025', value: 47 }
        ]),
        period: '15 months',
        subNiches: JSON.stringify([
          { name: 'FINRA/SEC compliance review for RIA marketing copy', description: 'Automated validation of investment marketing materials against FINRA Rule 2210 and SEC Marketing Rule before publication', parentCategory: 'AI Tools', opportunityScore: 87 },
          { name: 'HIPAA-compliant AI documentation for healthcare SaaS', description: 'AI-generated technical documentation that includes required HIPAA security rule language, PHI handling documentation, and audit trail sections', parentCategory: 'Developer Tools', opportunityScore: 82 },
          { name: 'GDPR Article 30 auto-generation from codebase analysis', description: 'Automatically creating records of processing activities by analyzing data flows in API definitions and database schemas', parentCategory: 'Developer Tools', opportunityScore: 75 }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'Compliance officers at SEC-registered RIAs reviewing 50-200 marketing pieces monthly', description: 'Manual review process takes 15-30 minutes per piece; AI could reduce to 2-5 minutes with pre-validation', evidence: '3.2 FTEs per $500M AUM firm dedicated to marketing compliance review', opportunityScore: 91 }
        ])
      }
    }),

    // Trend 2: Systems programming tooling
    db.trend.create({
      data: {
        category: 'Developer Tools',
        name: 'Developer tooling shift toward Rust and Go as infrastructure languages',
        description: 'Rust adoption in production systems grew 340% between 2022-2025, driven by adoption in Linux kernel, Android, and Windows. Go continues to dominate cloud-native infrastructure. Yet developer tools (debugging, testing, documentation) remain focused on web-stack languages (JavaScript, Python, Java), creating a growing tooling gap for systems programmers.',
        growthRate: 180,
        direction: 'growing',
        dataPoints: JSON.stringify([
          { label: '2022', value: 800 },
          { label: '2023', value: 1400 },
          { label: 'H1 2024', value: 2100 },
          { label: 'H2 2024', value: 2700 },
          { label: 'Q1 2025', value: 3000 },
          { label: 'Mar 2025', value: 3200 }
        ]),
        period: '3 years',
        subNiches: JSON.stringify([
          { name: 'AI Rust lifetime/borrow-checker debugging for infrastructure developers', description: 'Specialized debugger that understands Rust ownership model and suggests lifetime annotations with visual ownership graphs', parentCategory: 'Developer Tools', opportunityScore: 85 },
          { name: 'Go concurrency debugging tools for junior developers at startups', description: 'AI assistant that detects goroutine leaks, channel deadlocks, and race conditions in Go microservices', parentCategory: 'Developer Tools', opportunityScore: 74 },
          { name: 'C++ memory safety analysis for legacy codebases', description: 'Automated detection of memory corruption, use-after-free, and buffer overflow vulnerabilities in production C++ systems', parentCategory: 'Developer Tools', opportunityScore: 68 }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'Rust developers at infrastructure companies spending 4-6 hours/week on compiler debugging', description: 'Current AI tools cannot analyze Rust lifetime errors or suggest borrow-checker fixes', evidence: 'Rust devs report 3x more debugging time vs. Python devs per JetBrains 2024', opportunityScore: 90 },
          { userGroup: 'Junior Go developers (0-2 years experience) at cloud-native startups', description: 'Struggle with goroutine leaks and channel deadlocks that senior developers catch in code review but tools cannot detect', evidence: '67% cite concurrency debugging as top challenge', opportunityScore: 74 }
        ])
      }
    }),

    // Trend 3: ADHD productivity tools
    db.trend.create({
      data: {
        category: 'Productivity',
        name: 'ADHD-specific productivity tools with enforcement mechanisms',
        description: 'ADHD diagnoses in adults increased 34% from 2020-2024, and 8.7M US adults with ADHD report losing 2+ productive hours daily to digital distraction. Current focus tools are trivially bypassable with <25% 30-day retention. There is growing demand for enforceable focus tools with social accountability and ADHD-aware UX.',
        growthRate: 95,
        direction: 'growing',
        dataPoints: JSON.stringify([
          { label: '2020', value: 6.5 },
          { label: '2021', value: 7.1 },
          { label: '2022', value: 7.8 },
          { label: '2023', value: 8.2 },
          { label: '2024', value: 8.7 },
          { label: 'Q1 2025', value: 9.1 }
        ]),
        period: '5 years',
        subNiches: JSON.stringify([
          { name: 'Accountability-partner-enforced focus blocks for ADHD remote workers', description: 'Focus app where blocks require partner approval to unlock, with ADHD-specific UX (shorter defaults, dopamine-aware rewards)', parentCategory: 'Productivity', opportunityScore: 76 },
          { name: 'ADHD-optimized task management for creative professionals', description: 'Task manager designed for executive dysfunction — externalized deadlines, body-doubling features, and dopamine-mapped reward schedules', parentCategory: 'Productivity', opportunityScore: 71 },
          { name: 'Digital wellness tools for students with ADHD during exam periods', description: 'Enforced study sessions with social accountability, specifically designed for law/medical students in intensive exam prep', parentCategory: 'Productivity', opportunityScore: 65 }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'ADHD adults in remote work losing 2-4 hours daily to digital distraction', description: 'Tried and abandoned all existing focus tools due to easy bypass; need external enforcement because self-control is insufficient', evidence: '67% abandoned focus apps within 2 weeks (CHADD survey)', opportunityScore: 88 },
          { userGroup: 'Law and medical students in 3-month intensive exam preparation', description: 'Need enforced study blocks during 10-14 hour days but current tools lack accountability mechanisms', evidence: '71% report digital distraction as top focus challenge during exam prep', opportunityScore: 72 }
        ])
      }
    }),

    // Trend 4: EU creator economy
    db.trend.create({
      data: {
        category: 'Marketing',
        name: 'EU creator economy expansion with DSA compliance requirements',
        description: 'The EU influencer market grew 28% to €4.8B in 2024, with 1.2M active creators. The Digital Services Act (Article 26) now requires advertising disclosure for sponsored content. TikTok Shop is launching in DE, FR, ES in 2025. Yet creator marketing tools remain US-centric with only 3-8% EU creator coverage.',
        growthRate: 28,
        direction: 'growing',
        dataPoints: JSON.stringify([
          { label: '2022', value: 2900 },
          { label: '2023', value: 3750 },
          { label: 'H1 2024', value: 4100 },
          { label: 'Q3 2024', value: 4500 },
          { label: 'Q4 2024', value: 4800 },
          { label: 'Q1 2025', value: 5100 }
        ]),
        period: '3 years',
        subNiches: JSON.stringify([
          { name: 'DSA-compliant influencer discovery for DE/FR/ES beauty and fashion brands', description: 'Creator database with native language content analysis, local engagement benchmarks, and DSA Article 26 disclosure compliance tracking', parentCategory: 'Marketing', opportunityScore: 81 },
          { name: 'TikTok Shop creator matching for EU market entry', description: 'Tool connecting EU creators with brands for TikTok Shop affiliate programs, with local tax and disclosure compliance built in', parentCategory: 'Marketing', opportunityScore: 73 },
          { name: 'EU micro-influencer fraud detection with local engagement benchmarks', description: 'Fraud detection that accounts for regional engagement norms — what looks like low engagement in DE is normal for the market', parentCategory: 'Marketing', opportunityScore: 66 }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'US DTC brand marketing managers expanding to EU markets', description: 'Need local-language creator discovery but existing tools return 85% fewer results than equivalent US searches', evidence: '75% cite influencer discovery as top EU expansion challenge', opportunityScore: 85 },
          { userGroup: 'EU-based DTC brands with €1M-10M revenue scaling influencer marketing', description: 'Affordable local market tools don\'t exist; current tools rate 3.1/10 for EU coverage satisfaction', evidence: 'EU DTC brands average €2.4K/month on influencer marketing with 3.1/10 tool satisfaction', opportunityScore: 78 }
        ])
      }
    }),

    // Trend 5: Digital nomad financial tools
    db.trend.create({
      data: {
        category: 'Finance',
        name: 'Cross-border financial tooling for 35M digital nomads and remote workers',
        description: 'The digital nomad population grew from 10.9M to 35M between 2019-2025. 60+ countries now offer digital nomad visas, creating new tax obligations in multiple jurisdictions. Yet financial tools (bookkeeping, tax filing, banking) remain single-country, forcing digital nomads to maintain separate systems for each country or pay $600+/month to accountants.',
        growthRate: 42,
        direction: 'growing',
        dataPoints: JSON.stringify([
          { label: '2019', value: 10.9 },
          { label: '2021', value: 15.5 },
          { label: '2022', value: 21.0 },
          { label: '2023', value: 27.2 },
          { label: '2024', value: 31.8 },
          { label: 'Q1 2025', value: 35.0 }
        ]),
        period: '6 years',
        subNiches: JSON.stringify([
          { name: 'US-EU dual-jurisdiction bookkeeping for self-employed digital nomads', description: 'Handles US Schedule C + SE tax, FEIE day tracking, and host-country taxes (PT NHR, DE Freiberufler, ES autónomo) with dual-currency', parentCategory: 'Finance', opportunityScore: 80 },
          { name: 'Tax residency day-count tracker for multi-country remote workers', description: 'GPS-based day counting across tax jurisdictions with automatic residency status alerts and treaty benefit calculations', parentCategory: 'Finance', opportunityScore: 72 },
          { name: 'Cross-border invoicing with multi-currency and VAT/GST handling for freelance consultants', description: 'Invoice in client\'s currency with automatic VAT/GST calculation based on service location and reverse charge rules', parentCategory: 'Finance', opportunityScore: 68 }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'US-citizen self-employed digital nomads on EU digital nomad visas', description: 'Must file US taxes on worldwide income plus host-country taxes; currently pay $600/month to accountants across 3 countries', evidence: '340K US self-employed in EU with no integrated tax solution', opportunityScore: 86 }
        ])
      }
    }),

    // Trend 6: Unified portfolio analytics
    db.trend.create({
      data: {
        category: 'Finance',
        name: 'Unified portfolio analytics across traditional and alternative assets',
        description: 'Self-directed investors aged 30-45 hold an average of 35% of their portfolio in alternatives (crypto, real estate, private credit, angel investments). Yet portfolio analytics tools analyze only the 65% in stocks and ETFs, showing alternatives as "uncategorized cash." As alternative assets grow, the demand for holistic portfolio analytics covering 100% of holdings is intensifying.',
        growthRate: 45,
        direction: 'growing',
        dataPoints: JSON.stringify([
          { label: '2021', value: 18 },
          { label: '2022', value: 22 },
          { label: '2023', value: 28 },
          { label: 'H1 2024', value: 31 },
          { label: 'Q3 2024', value: 33 },
          { label: 'Q1 2025', value: 35 }
        ]),
        period: '4 years',
        subNiches: JSON.stringify([
          { name: 'Cross-asset portfolio analytics for millennial investors with 20%+ crypto allocation', description: 'Portfolio attribution, factor analysis, and risk metrics covering stocks, ETFs, and crypto in a single dashboard with cross-asset correlation', parentCategory: 'Finance', opportunityScore: 74 },
          { name: 'Real estate crowdfunding portfolio tracking with IRR calculations', description: 'Track Fundrise, CrowdStreet, and RealtyMogul investments with auto-calculated IRR, distribution schedules, and diversification analysis', parentCategory: 'Finance', opportunityScore: 62 },
          { name: 'Angel investment portfolio tracker with paper-value estimation', description: 'Track startup investments across platforms (AngelList, Republic) with 409A-based paper value estimation and portfolio-level return calculations', parentCategory: 'Finance', opportunityScore: 58 }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'Self-directed investors aged 30-45 with $100K-$500K portfolios including 20%+ alternatives', description: 'Need holistic analytics across all assets but currently cobble together 2-3 tools for stocks, crypto, and alternatives separately', evidence: '32% hold both crypto and traditional assets but only 4% use a single tool', opportunityScore: 79 }
        ])
      }
    }),

    // Trend 7: No-code conversion optimization
    db.trend.create({
      data: {
        category: 'Marketing',
        name: 'No-code conversion optimization combining analytics with A/B test execution',
        description: 'eCommerce brands lose 18% of potential revenue to funnel leaks but only fix 32% of identified issues due to fragmented tooling (separate analytics + A/B testing tools). The market is consolidating toward tools that combine leak detection with one-click fix execution, eliminating the developer bottleneck. Shopify\'s 4.6M stores are the primary market.',
        growthRate: 28,
        direction: 'growing',
        dataPoints: JSON.stringify([
          { label: 'Q1 2024', value: 3.9 },
          { label: 'Q2 2024', value: 4.1 },
          { label: 'Q3 2024', value: 4.3 },
          { label: 'Q4 2024', value: 4.5 },
          { label: 'Jan 2025', value: 4.55 },
          { label: 'Mar 2025', value: 4.6 }
        ]),
        period: '12 months',
        subNiches: JSON.stringify([
          { name: 'One-click conversion fix tool for Shopify stores under $5M revenue', description: 'Detects revenue leaks and offers deployable no-code A/B variations directly from the analytics dashboard without developer involvement', parentCategory: 'Marketing', opportunityScore: 83 },
          { name: 'AI-powered checkout optimization for WooCommerce stores', description: 'Automated checkout flow analysis with one-click implementation of best-practice fixes (trust badges, progress indicators, guest checkout)', parentCategory: 'Marketing', opportunityScore: 69 },
          { name: 'Mobile conversion optimization for DTC brands with 60%+ mobile traffic', description: 'Mobile-specific funnel analytics with touch-optimized A/B test creation and thumb-zone-aware CTA placement suggestions', parentCategory: 'Marketing', opportunityScore: 64 }
        ]),
        underservedUsers: JSON.stringify([
          { userGroup: 'Solo eCommerce managers at Shopify stores ($100K-$1M revenue)', description: 'One person managing analytics + CRO + ads; can\'t afford Optimizely or dev resources; need a tool that finds and fixes leaks', evidence: '1 marketing person handles all CRO at typical small Shopify store', opportunityScore: 84 },
          { userGroup: 'Growth marketers at bootstrapped DTC brands', description: 'Identify 5-10 funnel improvements monthly but execute only 1-2 due to tool fragmentation between analytics and A/B testing', evidence: '60% of CRO time on coordination vs. optimization', opportunityScore: 77 }
        ])
      }
    })
  ])

  console.log(`✅ Inserted ${trends.length} trends.`)

  // ========================================
  // Summary
  // ========================================
  console.log('\n🎉 Rich seed data inserted successfully!')
  console.log(`   📦 Products:     ${products.length}`)
  console.log(`   🔍 Gaps:         ${gaps.length}`)
  console.log(`   💬 Complaints:   ${complaints.length}`)
  console.log(`   🎯 Opportunities: ${opportunities.length}`)
  console.log(`   📈 Trends:       ${trends.length}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
