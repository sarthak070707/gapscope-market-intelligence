import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding enriched database with all 8 new features...');

  // Clear existing data
  await prisma.complaint.deleteMany();
  await prisma.gap.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.trend.deleteMany();
  await prisma.scanJob.deleteMany();
  await prisma.product.deleteMany();

  // ─── Products ───────────────────────────────────────────────────
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'ResumeAI Pro',
        tagline: 'AI-powered resume builder for tech professionals',
        description: 'Uses GPT-4 to optimize resumes for ATS systems with keyword matching and formatting suggestions.',
        url: 'https://resumeai.pro',
        category: 'AI Tools',
        upvotes: 342,
        launchDate: '2024-01-15',
        features: JSON.stringify(['ATS optimization', 'GPT-4 writing', 'Keyword matching', 'Template library', 'PDF export']),
        pricing: 'Freemium',
        comments: JSON.stringify(['Great for basic resumes but fails on technical project formats', 'No offline mode', 'Templates look generic', 'Wish it handled portfolio-style resumes for devs']),
        reviewScore: 6.8,
        sourceUrl: 'https://producthunt.com/posts/resumeai-pro',
      },
    }),
    prisma.product.create({
      data: {
        name: 'FitTrack',
        tagline: 'Simple fitness tracking for beginners',
        description: 'A minimal fitness tracker focused on consistency over complexity. Track workouts, set goals, build habits.',
        url: 'https://fittrack.app',
        category: 'Health & Fitness',
        upvotes: 189,
        launchDate: '2024-02-20',
        features: JSON.stringify(['Workout logging', 'Goal setting', 'Habit streaks', 'Basic analytics', 'Community feed']),
        pricing: 'Free',
        comments: JSON.stringify(['Too basic for intermediate lifters', 'No gym-specific equipment tracking', 'Does not support bodyweight-only workouts', 'No nutrition tracking at all']),
        reviewScore: 5.2,
        sourceUrl: 'https://producthunt.com/posts/fittrack',
      },
    }),
    prisma.product.create({
      data: {
        name: 'NoteForge',
        tagline: 'AI note-taking that actually works offline',
        description: 'Smart note-taking app with local-first architecture and AI-powered organization.',
        url: 'https://noteforge.io',
        category: 'Productivity',
        upvotes: 567,
        launchDate: '2024-03-10',
        features: JSON.stringify(['Offline-first', 'AI organization', 'Markdown support', 'Backlinks', 'Quick capture']),
        pricing: 'Freemium',
        comments: JSON.stringify(['Offline mode is buggy on mobile', 'Sync conflicts when switching devices', 'Great desktop app but mobile needs work', 'No collaboration features']),
        reviewScore: 7.1,
        sourceUrl: 'https://producthunt.com/posts/noteforge',
      },
    }),
    prisma.product.create({
      data: {
        name: 'CodeMentor AI',
        tagline: 'AI pair programmer for junior developers',
        description: 'Real-time coding assistant that explains code as you write it. Built for learners, not experts.',
        url: 'https://codementor.ai',
        category: 'Developer Tools',
        upvotes: 891,
        launchDate: '2024-01-28',
        features: JSON.stringify(['Code explanations', 'Bug detection', 'Learning paths', 'VS Code extension', 'Multi-language']),
        pricing: 'Freemium',
        comments: JSON.stringify(['Too expensive for students at $20/month', 'Does not support Rust or Go', 'Explanations too shallow for intermediate devs', 'No project-based learning']),
        reviewScore: 7.5,
        sourceUrl: 'https://producthunt.com/posts/codementor-ai',
      },
    }),
    prisma.product.create({
      data: {
        name: 'BudgetWise',
        tagline: 'Personal finance for freelancers',
        description: 'Track income from multiple sources, manage irregular expenses, plan for tax season.',
        url: 'https://budgetwise.co',
        category: 'Finance',
        upvotes: 234,
        launchDate: '2024-04-05',
        features: JSON.stringify(['Multi-income tracking', 'Tax estimation', 'Expense categorization', 'Invoice management', 'Cash flow forecasting']),
        pricing: 'Free',
        comments: JSON.stringify(['No integration with Indian banks', 'Tax features only work for US', 'Missing investment tracking', 'No mobile app yet']),
        reviewScore: 6.0,
        sourceUrl: 'https://producthunt.com/posts/budgetwise',
      },
    }),
    prisma.product.create({
      data: {
        name: 'DesignPulse',
        tagline: 'Design feedback tool for remote teams',
        description: 'Annotate designs, leave contextual comments, and track design decisions in one place.',
        url: 'https://designpulse.io',
        category: 'Design',
        upvotes: 156,
        launchDate: '2024-02-14',
        features: JSON.stringify(['Visual annotations', 'Version comparison', 'Design tokens', 'Figma integration', 'Comment threads']),
        pricing: 'Paid',
        comments: JSON.stringify(['Too expensive for small teams', 'No free tier at all', 'Figma sync breaks often', 'Does not support Sketch files']),
        reviewScore: 5.8,
        sourceUrl: 'https://producthunt.com/posts/designpulse',
      },
    }),
    prisma.product.create({
      data: {
        name: 'AutoFlow',
        tagline: 'No-code automation for non-technical founders',
        description: 'Connect your tools with simple drag-and-drop automations. No coding required.',
        url: 'https://autoflow.dev',
        category: 'No-Code',
        upvotes: 423,
        launchDate: '2024-03-22',
        features: JSON.stringify(['Visual workflow builder', '500+ integrations', 'Conditional logic', 'Webhook support', 'Templates']),
        pricing: 'Freemium',
        comments: JSON.stringify(['Complex automations break silently', 'Error handling is terrible', 'No version control for workflows', 'Pricing jumps too fast']),
        reviewScore: 6.5,
        sourceUrl: 'https://producthunt.com/posts/autoflow',
      },
    }),
    prisma.product.create({
      data: {
        name: 'LearnStack',
        tagline: 'Interactive coding courses with AI feedback',
        description: 'Learn to code through hands-on projects with instant AI-powered code review.',
        url: 'https://learnstack.dev',
        category: 'Education',
        upvotes: 312,
        launchDate: '2024-01-05',
        features: JSON.stringify(['Project-based learning', 'AI code review', 'Progress tracking', 'Community projects', 'Certificates']),
        pricing: 'Paid',
        comments: JSON.stringify(['Only covers web development', 'No mobile development courses', 'AI feedback is too generic', 'Wish there were more advanced topics']),
        reviewScore: 7.0,
        sourceUrl: 'https://producthunt.com/posts/learnstack',
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} products`);

  // ─── Complaints ─────────────────────────────────────────────────
  const complaintData = [
    { productId: products[0].id, text: 'Fails to optimize technical project-based resumes for students', category: 'missing_feature', sentiment: 'negative', frequency: 47 },
    { productId: products[0].id, text: 'No offline mode - useless without internet', category: 'missing_feature', sentiment: 'negative', frequency: 32 },
    { productId: products[0].id, text: 'Templates look generic and identical to competitors', category: 'ux', sentiment: 'negative', frequency: 28 },
    { productId: products[0].id, text: 'Pricing is too steep for students', category: 'pricing', sentiment: 'negative', frequency: 56 },
    { productId: products[1].id, text: 'No gym-specific equipment tracking', category: 'missing_feature', sentiment: 'negative', frequency: 38 },
    { productId: products[1].id, text: 'Does not support bodyweight-only workout plans', category: 'missing_feature', sentiment: 'negative', frequency: 44 },
    { productId: products[1].id, text: 'No nutrition tracking feature', category: 'missing_feature', sentiment: 'negative', frequency: 51 },
    { productId: products[1].id, text: 'Too basic for anyone past beginner stage', category: 'performance', sentiment: 'mixed', frequency: 29 },
    { productId: products[2].id, text: 'Offline mode is buggy on mobile devices', category: 'performance', sentiment: 'negative', frequency: 63 },
    { productId: products[2].id, text: 'Sync conflicts when switching devices frequently', category: 'performance', sentiment: 'negative', frequency: 41 },
    { productId: products[2].id, text: 'No collaboration features at all', category: 'missing_feature', sentiment: 'negative', frequency: 35 },
    { productId: products[2].id, text: 'AI organization makes weird categorization choices', category: 'ux', sentiment: 'mixed', frequency: 22 },
    { productId: products[3].id, text: 'Too expensive for students at $20/month', category: 'pricing', sentiment: 'negative', frequency: 72 },
    { productId: products[3].id, text: 'Does not support Rust, Go, or newer languages', category: 'missing_feature', sentiment: 'negative', frequency: 33 },
    { productId: products[3].id, text: 'Explanations too shallow for intermediate developers', category: 'performance', sentiment: 'mixed', frequency: 27 },
    { productId: products[3].id, text: 'No project-based learning paths', category: 'missing_feature', sentiment: 'negative', frequency: 45 },
    { productId: products[4].id, text: 'No integration with banks outside the US', category: 'integration', sentiment: 'negative', frequency: 58 },
    { productId: products[4].id, text: 'Tax features only work for US tax system', category: 'missing_feature', sentiment: 'negative', frequency: 44 },
    { productId: products[4].id, text: 'Missing investment and portfolio tracking', category: 'missing_feature', sentiment: 'negative', frequency: 37 },
    { productId: products[4].id, text: 'No mobile app - only web interface', category: 'missing_feature', sentiment: 'negative', frequency: 52 },
    { productId: products[5].id, text: 'No free tier - too expensive for small teams', category: 'pricing', sentiment: 'negative', frequency: 67 },
    { productId: products[5].id, text: 'Figma sync breaks frequently', category: 'performance', sentiment: 'negative', frequency: 39 },
    { productId: products[5].id, text: 'Does not support Sketch or Adobe XD files', category: 'integration', sentiment: 'negative', frequency: 31 },
    { productId: products[6].id, text: 'Complex automations break silently without alerts', category: 'performance', sentiment: 'negative', frequency: 54 },
    { productId: products[6].id, text: 'No version control for workflow changes', category: 'missing_feature', sentiment: 'negative', frequency: 36 },
    { productId: products[6].id, text: 'Pricing jumps too quickly between tiers', category: 'pricing', sentiment: 'negative', frequency: 48 },
    { productId: products[6].id, text: 'Error handling is practically non-existent', category: 'support', sentiment: 'negative', frequency: 42 },
    { productId: products[7].id, text: 'Only covers web development topics', category: 'missing_feature', sentiment: 'negative', frequency: 29 },
    { productId: products[7].id, text: 'AI feedback feels too generic and repetitive', category: 'performance', sentiment: 'mixed', frequency: 34 },
    { productId: products[7].id, text: 'No mobile app development courses', category: 'missing_feature', sentiment: 'negative', frequency: 41 },
  ];

  for (const c of complaintData) {
    await prisma.complaint.create({ data: c });
  }
  console.log(`✅ Created ${complaintData.length} complaints`);

  // ─── Gaps with ALL 8 new features ───────────────────────────────
  const gaps = [
    {
      productId: products[0].id,
      gapType: 'underserved',
      title: 'No ATS-optimized resume builder for engineering students with project-based experience',
      description: 'AI resume tools focus on corporate-style resumes but fail to properly format technical project portfolios, GitHub contributions, and hackathon experience that engineering students rely on.',
      evidence: '47 complaints about project-based resume formatting, 32 about offline access',
      severity: 'high',
      evidenceDetail: JSON.stringify({
        similarProducts: 12,
        repeatedComplaints: 47,
        launchFrequency: 3,
        commentSnippets: [
          'Fails to optimize technical project-based resumes for students',
          'No offline mode - useless without internet',
          'Templates look generic and identical to competitors',
        ],
        pricingOverlap: 75,
        launchGrowth: 28,
      }),
      whyThisMatters: 'Engineering students represent 40% of the resume builder market but every tool ignores their project-based format. This creates a $50M+ underserved segment with zero purpose-built solutions.',
      subNiche: JSON.stringify({ name: 'ATS Resume Tools for Engineering Students', description: 'Resume builders specifically designed for students with project-based experience, GitHub portfolios, and hackathon wins', parentCategory: 'AI Tools', opportunityScore: 82 }),
      affectedProducts: JSON.stringify([
        { name: 'ResumeAI Pro', pricing: 'Freemium', strengths: ['ATS optimization', 'GPT-4 writing'], weaknesses: ['No project-based format', 'No offline mode'] },
        { name: 'Kickresume', pricing: 'Paid', strengths: ['Template variety', 'Good design'], weaknesses: ['Generic templates', 'No tech focus'] },
        { name: 'Resume.io', pricing: 'Freemium', strengths: ['Easy to use', 'Good exports'], weaknesses: ['No GitHub integration', 'Corporate-only formats'] },
      ]),
      underservedUsers: JSON.stringify([
        { userGroup: 'Engineering students with no corporate experience', description: 'Students whose resume value comes from projects, not job history. ATS tools fail to parse project sections correctly.', evidence: 'Multiple complaints about project-based resume formatting failures', opportunityScore: 85 },
        { userGroup: 'Career switchers with portfolio-style experience', description: 'Bootcamp grads and self-taught developers who need project-focused resumes', evidence: 'Users report having to manually hack resume templates to show projects', opportunityScore: 72 },
      ]),
      whyNow: JSON.stringify({
        marketGrowthDriver: 'ATS-heavy hiring workflows now reject 75% of resumes before human review, making ATS optimization critical for job seekers',
        incumbentWeakness: 'Current tools prioritize corporate ladder formatting over project-based experience representation, leaving a growing segment completely unserved',
        timingAdvantage: 'Remote hiring surge means more ATS-first screening than ever, and GitHub/project portfolios are now standard for engineering roles',
        catalystEvents: ['75% ATS pre-screening rate in 2024', 'GitHub portfolio becoming standard requirement', 'Remote hiring reducing human resume review'],
      }),
      executionDifficulty: JSON.stringify({
        level: 'low-medium',
        demandLevel: 'high',
        competitionLevel: 'medium',
        technicalComplexity: 'medium',
        timeToMvp: '4-6 weeks',
        estimatedBudget: '$2k-8k',
        keyChallenges: ['Building ATS parsing engine that understands project sections', 'Getting training data for project-based resume formats'],
      }),
      falseOpportunity: JSON.stringify({
        isFalseOpportunity: false,
        estimatedMarketSize: '$50-100M',
        riskFactors: ['ATS algorithms change frequently', 'Student market has lower willingness to pay'],
        verdict: 'pursue',
      }),
      founderFit: JSON.stringify({
        bestFit: ['solo_developer', 'student_founder'],
        rationale: 'This problem is best understood by someone who has personally struggled with project-based resume formatting. Student founders have direct domain expertise and access to their target market.',
        requiredSkills: ['Full-stack development', 'ATS system knowledge', 'Design sensibility'],
        idealTeamSize: '1-2 people',
      }),
      sourceTransparency: JSON.stringify({
        sourcePlatforms: ['Product Hunt', 'Reddit', 'Hacker News'],
        totalComments: 234,
        complaintFrequency: 18,
        reviewSources: [
          { platform: 'Product Hunt', count: 142, avgScore: 6.8 },
          { platform: 'Reddit', count: 67, avgScore: 5.2 },
          { platform: 'Hacker News', count: 25, avgScore: 7.1 },
        ],
        dataFreshness: 'Data from last 30 days',
        confidenceLevel: 'high',
      }),
      whyExistingProductsFail: JSON.stringify({
        rootCause: 'Existing tools prioritize cloud collaboration over reliability for users with unstable internet access, and corporate formatting over project-based experience representation',
        userImpact: 'Engineering students must manually hack resume templates, often resulting in ATS-incompatible formats that get auto-rejected',
        missedByCompetitors: 'Competitors assume all resume writers follow corporate career paths, missing the growing project-based segment entirely',
      }),
      marketQuadrant: JSON.stringify({
        competitionScore: 35,
        opportunityScore: 82,
        quadrant: 'goldmine',
        label: 'Goldmine — Low competition, high opportunity',
      }),
    },
    {
      productId: products[1].id,
      gapType: 'underserved',
      title: 'No fitness app for skinny beginners with no gym access',
      description: 'Every fitness app assumes you either have a gym membership or are trying to lose weight. Skinny beginners who want to gain muscle with bodyweight exercises have zero purpose-built solutions.',
      evidence: '44 complaints about bodyweight workout support, 51 about nutrition tracking',
      severity: 'high',
      evidenceDetail: JSON.stringify({
        similarProducts: 15,
        repeatedComplaints: 44,
        launchFrequency: 4,
        commentSnippets: [
          'Does not support bodyweight-only workout plans',
          'No nutrition tracking feature',
          'Too basic for anyone past beginner stage',
        ],
        pricingOverlap: 80,
        launchGrowth: 22,
      }),
      whyThisMatters: 'The "hardgainer" community represents millions of potential users who are actively looking for solutions but every fitness app targets weight loss. This is a completely blind spot in a $14B market.',
      subNiche: JSON.stringify({ name: 'Bodyweight Muscle-Building for Skinny Beginners', description: 'Fitness apps designed specifically for underweight beginners who want to gain muscle at home without gym equipment', parentCategory: 'Health & Fitness', opportunityScore: 78 }),
      affectedProducts: JSON.stringify([
        { name: 'FitTrack', pricing: 'Free', strengths: ['Simple interface', 'Habit tracking'], weaknesses: ['No bodyweight focus', 'No nutrition'] },
        { name: 'MyFitnessPal', pricing: 'Freemium', strengths: ['Huge food database', 'Nutrition tracking'], weaknesses: ['Weight-loss focused', 'No workout plans'] },
        { name: 'Nike Training Club', pricing: 'Free', strengths: ['Video workouts', 'Good variety'], weaknesses: ['Not for beginners', 'No muscle gain focus'] },
      ]),
      underservedUsers: JSON.stringify([
        { userGroup: 'Skinny beginners with no gym access', description: 'People who are underweight and want to build muscle using only bodyweight exercises at home', evidence: '44 complaints about missing bodyweight workout support', opportunityScore: 88 },
        { userGroup: 'Hardgainers looking for muscle-building nutrition', description: 'Users who need calorie surplus meal plans, not calorie deficit diets', evidence: '51 complaints about missing nutrition tracking features', opportunityScore: 76 },
      ]),
      whyNow: JSON.stringify({
        marketGrowthDriver: 'Home workout market exploded post-pandemic and continues growing at 15% annually as people reject expensive gym memberships',
        incumbentWeakness: 'Every major fitness app optimizes for weight loss because that is where the ad revenue is, leaving muscle-gain-at-home completely unserved',
        timingAdvantage: 'Social media has created massive awareness of bodyweight fitness (calisthenics), but no app has captured this audience yet',
        catalystEvents: ['Post-pandemic home workout habit persistence', 'Calisthenics trend on TikTok/YouTube', 'Gym membership costs rising 20% YoY'],
      }),
      executionDifficulty: JSON.stringify({
        level: 'low-medium',
        demandLevel: 'high',
        competitionLevel: 'low',
        technicalComplexity: 'low',
        timeToMvp: '3-5 weeks',
        estimatedBudget: '$1k-5k',
        keyChallenges: ['Creating effective bodyweight progressive overload programs', 'Building nutrition features for calorie surplus (opposite of most tools)'],
      }),
      falseOpportunity: JSON.stringify({
        isFalseOpportunity: false,
        estimatedMarketSize: '$100-500M',
        riskFactors: ['Free alternatives exist (YouTube, Reddit routines)', 'Hardgainer segment may have lower retention rates'],
        verdict: 'pursue',
      }),
      founderFit: JSON.stringify({
        bestFit: ['solo_developer', 'content_creator'],
        rationale: 'A content creator who is themselves a hardgainer can build audience + product simultaneously. The fitness space rewards authentic personal stories.',
        requiredSkills: ['Mobile development', 'Fitness knowledge', 'Content creation'],
        idealTeamSize: 'Solo or 2 people',
      }),
      sourceTransparency: JSON.stringify({
        sourcePlatforms: ['Product Hunt', 'Reddit', 'App Store Reviews'],
        totalComments: 312,
        complaintFrequency: 22,
        reviewSources: [
          { platform: 'Product Hunt', count: 89, avgScore: 5.2 },
          { platform: 'Reddit', count: 156, avgScore: 4.8 },
          { platform: 'App Store', count: 67, avgScore: 5.5 },
        ],
        dataFreshness: 'Data from last 30 days',
        confidenceLevel: 'high',
      }),
      whyExistingProductsFail: JSON.stringify({
        rootCause: 'Existing tools prioritize weight loss features and gym-based exercises because those drive more ad impressions and engagement metrics',
        userImpact: 'Skinny beginners must cobble together YouTube routines, Reddit threads, and separate nutrition apps with no cohesive experience',
        missedByCompetitors: 'The muscle-gain-at-home segment appears smaller than weight-loss but has significantly higher willingness to pay and lifetime value',
      }),
      marketQuadrant: JSON.stringify({
        competitionScore: 20,
        opportunityScore: 78,
        quadrant: 'goldmine',
        label: 'Goldmine — Low competition, high opportunity',
      }),
    },
    {
      productId: products[2].id,
      gapType: 'missing_feature',
      title: 'AI note apps lack reliable offline mode for users with unstable internet',
      description: 'Note-taking apps prioritize cloud sync over local reliability. Users in areas with poor connectivity lose work constantly.',
      evidence: '63 complaints about offline bugs, 41 about sync conflicts',
      severity: 'high',
      evidenceDetail: JSON.stringify({
        similarProducts: 18,
        repeatedComplaints: 63,
        launchFrequency: 5,
        commentSnippets: [
          'Offline mode is buggy on mobile devices',
          'Sync conflicts when switching devices frequently',
          'No collaboration features at all',
        ],
        pricingOverlap: 65,
        launchGrowth: 15,
      }),
      whyThisMatters: 'Over 2 billion internet users have unreliable connectivity. Every note app assumes always-on internet, losing these users entirely.',
      subNiche: JSON.stringify({ name: 'Offline-First Note-Taking for Unstable Connections', description: 'Note apps built on local-first architecture that work flawlessly offline and sync when connectivity is available', parentCategory: 'Productivity', opportunityScore: 68 }),
      affectedProducts: JSON.stringify([
        { name: 'NoteForge', pricing: 'Freemium', strengths: ['AI organization', 'Markdown support'], weaknesses: ['Buggy offline', 'Sync conflicts'] },
        { name: 'Notion', pricing: 'Freemium', strengths: ['Powerful features', 'Good collaboration'], weaknesses: ['Terrible offline', 'Slow sync'] },
        { name: 'Obsidian', pricing: 'Free', strengths: ['Local-first', 'Great offline'], weaknesses: ['Steep learning curve', 'No built-in sync'] },
      ]),
      underservedUsers: JSON.stringify([
        { userGroup: 'Users in areas with unstable internet access', description: 'People in developing regions, remote workers, travelers who need reliable offline note access', evidence: '63 complaints about offline mode bugs', opportunityScore: 72 },
      ]),
      whyNow: JSON.stringify({
        marketGrowthDriver: 'CRDTs and local-first sync technology have matured, making reliable offline-first apps technically feasible for indie developers',
        incumbentWeakness: 'Cloud-first apps like Notion have deeply ingrained architectures that cannot be easily retrofitted for offline reliability',
        timingAdvantage: 'Growing remote work culture means more people working from varied connectivity environments',
        catalystEvents: ['CRDT technology maturation', 'Remote work becoming permanent', 'Increasing cloud service outages'],
      }),
      executionDifficulty: JSON.stringify({
        level: 'medium-high',
        demandLevel: 'medium',
        competitionLevel: 'medium',
        technicalComplexity: 'high',
        timeToMvp: '2-4 months',
        estimatedBudget: '$10k-30k',
        keyChallenges: ['Implementing reliable conflict resolution with CRDTs', 'Building intuitive sync UI that handles edge cases'],
      }),
      falseOpportunity: JSON.stringify({
        isFalseOpportunity: false,
        reason: 'Genuine gap but requires significant technical investment. Obsidian proves the market exists.',
        estimatedMarketSize: '$50-200M',
        riskFactors: ['Obsidian already captures much of this market', 'Technical complexity is high', 'Users may not pay premium for offline reliability'],
        verdict: 'caution',
      }),
      founderFit: JSON.stringify({
        bestFit: ['solo_developer', 'b2b_saas'],
        rationale: 'Requires deep technical knowledge of CRDTs and sync architectures. Best suited for experienced developers who can handle the complexity.',
        requiredSkills: ['CRDT/sync architecture', 'Mobile development', 'Data persistence'],
        idealTeamSize: '2-3 people',
      }),
      sourceTransparency: JSON.stringify({
        sourcePlatforms: ['Product Hunt', 'Reddit', 'Hacker News'],
        totalComments: 189,
        complaintFrequency: 14,
        reviewSources: [
          { platform: 'Product Hunt', count: 98, avgScore: 7.1 },
          { platform: 'Reddit', count: 56, avgScore: 6.3 },
          { platform: 'Hacker News', count: 35, avgScore: 7.5 },
        ],
        dataFreshness: 'Data from last 30 days',
        confidenceLevel: 'medium',
      }),
      whyExistingProductsFail: JSON.stringify({
        rootCause: 'Existing tools prioritize cloud collaboration over reliability, architecting their entire sync engine around the assumption of always-on connectivity',
        userImpact: 'Users in low-connectivity environments lose work, experience data conflicts, and cannot access their notes when they need them most',
        missedByCompetitors: 'Cloud-first architecture is a business decision (drives subscription metrics), not a technical limitation. Competitors choose collaboration over reliability because it improves their funnel metrics',
      }),
      marketQuadrant: JSON.stringify({
        competitionScore: 55,
        opportunityScore: 68,
        quadrant: 'blue_ocean',
        label: 'Blue Ocean — Moderate competition, good opportunity',
      }),
    },
    {
      productId: products[3].id,
      gapType: 'expensive',
      title: 'AI coding assistants are too expensive for students and learners',
      description: 'Tools like CodeMentor AI charge $20/month which is prohibitive for students. Free alternatives lack depth.',
      evidence: '72 complaints about pricing, 45 about missing project-based learning',
      severity: 'high',
      evidenceDetail: JSON.stringify({
        similarProducts: 14,
        repeatedComplaints: 72,
        launchFrequency: 4,
        commentSnippets: [
          'Too expensive for students at $20/month',
          'No project-based learning paths',
          'Explanations too shallow for intermediate developers',
        ],
        pricingOverlap: 85,
        launchGrowth: 35,
      }),
      whyThisMatters: 'The AI coding education market is growing 35% YoY but pricing excludes the largest potential user base: students and learners in developing countries.',
      subNiche: JSON.stringify({ name: 'Affordable AI Coding Education for Students', description: 'Budget-friendly AI coding assistants with student pricing and project-based learning paths', parentCategory: 'Developer Tools', opportunityScore: 75 }),
      affectedProducts: JSON.stringify([
        { name: 'CodeMentor AI', pricing: 'Freemium ($20/mo)', strengths: ['Good explanations', 'Multi-language'], weaknesses: ['Too expensive', 'No project paths'] },
        { name: 'GitHub Copilot', pricing: 'Paid ($10/mo)', strengths: ['In-editor integration', 'Fast'], weaknesses: ['Not educational', 'No explanations'] },
        { name: 'Replit', pricing: 'Freemium', strengths: ['Browser-based', 'Community'], weaknesses: ['AI features limited', 'Performance issues'] },
      ]),
      underservedUsers: JSON.stringify([
        { userGroup: 'Computer science students on tight budgets', description: 'Students who need coding help but cannot afford $20/month subscriptions', evidence: '72 pricing complaints across multiple platforms', opportunityScore: 80 },
      ]),
      whyNow: JSON.stringify({
        marketGrowthDriver: 'AI coding assistance market growing 35% YoY as programming education moves online globally',
        incumbentWeakness: 'Current tools price for professional developers, ignoring the massive student market that needs cheaper, more educational features',
        timingAdvantage: 'LLM API costs have dropped 10x in 2024, making student-tier pricing economically viable for the first time',
        catalystEvents: ['LLM API costs dropped 90% in 2024', 'CS enrollment up 40% globally', 'GitHub Copilot proving market demand'],
      }),
      executionDifficulty: JSON.stringify({
        level: 'medium',
        demandLevel: 'high',
        competitionLevel: 'high',
        technicalComplexity: 'medium',
        timeToMvp: '6-8 weeks',
        estimatedBudget: '$5k-15k',
        keyChallenges: ['Competing with well-funded incumbents on features', 'Balancing low pricing with LLM API costs'],
      }),
      falseOpportunity: JSON.stringify({
        isFalseOpportunity: false,
        estimatedMarketSize: '$200M-1B',
        riskFactors: ['High competition from well-funded players', 'Students may upgrade to premium tools after learning', 'LLM costs still volatile'],
        verdict: 'pursue',
      }),
      founderFit: JSON.stringify({
        bestFit: ['student_founder', 'solo_developer'],
        rationale: 'Student founders understand the budget constraints and learning needs firsthand. They also have direct access to their target market through campus networks.',
        requiredSkills: ['Full-stack development', 'LLM integration', 'Educational content design'],
        idealTeamSize: '2-3 people',
      }),
      sourceTransparency: JSON.stringify({
        sourcePlatforms: ['Product Hunt', 'Reddit', 'Stack Overflow'],
        totalComments: 267,
        complaintFrequency: 24,
        reviewSources: [
          { platform: 'Product Hunt', count: 134, avgScore: 7.5 },
          { platform: 'Reddit', count: 89, avgScore: 6.1 },
          { platform: 'Stack Overflow', count: 44, avgScore: 7.8 },
        ],
        dataFreshness: 'Data from last 30 days',
        confidenceLevel: 'high',
      }),
      whyExistingProductsFail: JSON.stringify({
        rootCause: 'Existing tools optimize for professional developer productivity (willingness to pay $20+/mo) rather than educational depth, creating a feature gap for learners',
        userImpact: 'Students either cannot afford the tools or use free tiers that lack the educational features they actually need',
        missedByCompetitors: 'Student pricing requires accepting lower margins per user, which VC-funded companies avoid to maintain growth metrics',
      }),
      marketQuadrant: JSON.stringify({
        competitionScore: 75,
        opportunityScore: 75,
        quadrant: 'crowded',
        label: 'Crowded but Viable — High competition, high opportunity',
      }),
    },
    {
      productId: products[4].id,
      gapType: 'missing_feature',
      title: 'Personal finance apps ignore international users and freelancers',
      description: 'BudgetWise and similar tools only support US banks and tax systems. International freelancers are completely ignored.',
      evidence: '58 complaints about bank integration, 44 about non-US tax support',
      severity: 'medium',
      evidenceDetail: JSON.stringify({
        similarProducts: 10,
        repeatedComplaints: 58,
        launchFrequency: 2,
        commentSnippets: [
          'No integration with banks outside the US',
          'Tax features only work for US tax system',
          'Missing investment and portfolio tracking',
        ],
        pricingOverlap: 70,
        launchGrowth: 12,
      }),
      whyThisMatters: 'The global freelancer economy is worth $1.5T and growing. Every finance tool assumes US banking infrastructure, ignoring 95% of the world.',
      subNiche: JSON.stringify({ name: 'International Freelancer Finance Management', description: 'Finance tools built for freelancers in emerging markets with multi-currency, local bank, and regional tax support', parentCategory: 'Finance', opportunityScore: 65 }),
      affectedProducts: JSON.stringify([
        { name: 'BudgetWise', pricing: 'Free', strengths: ['Multi-income tracking', 'Tax estimation'], weaknesses: ['US only', 'No mobile app'] },
        { name: 'QuickBooks', pricing: 'Paid', strengths: ['Comprehensive', 'Trusted brand'], weaknesses: ['Too complex', 'US-centric'] },
        { name: 'Wave', pricing: 'Free', strengths: ['Free invoicing', 'Good basics'], weaknesses: ['Limited countries', 'No tax support'] },
      ]),
      underservedUsers: JSON.stringify([
        { userGroup: 'Freelancers in emerging markets', description: 'Workers in India, Southeast Asia, and Latin America who earn in multiple currencies and need local tax compliance', evidence: '58 complaints about missing international bank integration', opportunityScore: 70 },
      ]),
      whyNow: JSON.stringify({
        marketGrowthDriver: 'Global freelancer economy growing at 15% CAGR, with fastest growth in Asia and Latin America',
        incumbentWeakness: 'US finance tools cannot easily adapt to international banking APIs and tax regulations, creating a structural moat for localized solutions',
        timingAdvantage: 'Open banking regulations are expanding globally, making bank integrations increasingly feasible in emerging markets',
        catalystEvents: ['Open banking regulations in India and Brazil', 'Remote work normalizing cross-border income', 'Fintech infrastructure maturing in emerging markets'],
      }),
      executionDifficulty: JSON.stringify({
        level: 'medium-high',
        demandLevel: 'high',
        competitionLevel: 'low',
        technicalComplexity: 'high',
        timeToMvp: '3-6 months',
        estimatedBudget: '$20k-50k',
        keyChallenges: ['Navigating different country tax regulations', 'Building bank integrations for multiple countries', 'Multi-currency handling'],
      }),
      falseOpportunity: JSON.stringify({
        isFalseOpportunity: false,
        estimatedMarketSize: '$500M-2B',
        riskFactors: ['Regulatory complexity varies by country', 'Banking APIs differ significantly across regions', 'Monetization harder in lower-income markets'],
        verdict: 'pursue',
      }),
      founderFit: JSON.stringify({
        bestFit: ['b2b_saas', 'agency'],
        rationale: 'Requires understanding of multiple financial systems and regulations. Best suited for teams with international finance expertise.',
        requiredSkills: ['Fintech knowledge', 'Regulatory compliance', 'Multi-country banking API experience'],
        idealTeamSize: '3-5 people',
      }),
      sourceTransparency: JSON.stringify({
        sourcePlatforms: ['Product Hunt', 'Reddit', 'Twitter'],
        totalComments: 156,
        complaintFrequency: 16,
        reviewSources: [
          { platform: 'Product Hunt', count: 78, avgScore: 6.0 },
          { platform: 'Reddit', count: 56, avgScore: 5.5 },
          { platform: 'Twitter', count: 22, avgScore: 5.8 },
        ],
        dataFreshness: 'Data from last 30 days',
        confidenceLevel: 'medium',
      }),
      whyExistingProductsFail: JSON.stringify({
        rootCause: 'US finance tools built their architecture around US banking and tax infrastructure, making international expansion a complete rewrite rather than a feature addition',
        userImpact: 'International freelancers must manually track income across currencies, estimate taxes without tools, and cannot automate any financial workflows',
        missedByCompetitors: 'The unit economics of launching country-by-country are unattractive for VC-backed companies seeking rapid global growth, creating space for locally-focused solutions',
      }),
      marketQuadrant: JSON.stringify({
        competitionScore: 30,
        opportunityScore: 65,
        quadrant: 'goldmine',
        label: 'Goldmine — Low competition, good opportunity',
      }),
    },
    {
      productId: products[6].id,
      gapType: 'overcrowded',
      title: 'No-code automation space is saturated with similar features and pricing',
      description: 'AutoFlow, Zapier, Make, and dozens of others offer nearly identical feature sets. Differentiation is minimal.',
      evidence: '54 complaints about silent failures, 48 about pricing jumps',
      severity: 'low',
      evidenceDetail: JSON.stringify({
        similarProducts: 25,
        repeatedComplaints: 54,
        launchFrequency: 6,
        commentSnippets: [
          'Complex automations break silently without alerts',
          'No version control for workflow changes',
          'Pricing jumps too quickly between tiers',
        ],
        pricingOverlap: 90,
        launchGrowth: 8,
      }),
      whyThisMatters: 'The no-code automation market is saturated with 25+ nearly identical products. New entrants will struggle to differentiate.',
      subNiche: JSON.stringify({ name: 'Developer-Friendly Automation with Version Control', description: 'Automation tools that combine no-code simplicity with git-like version control and error monitoring for technical users', parentCategory: 'No-Code', opportunityScore: 45 }),
      affectedProducts: JSON.stringify([
        { name: 'AutoFlow', pricing: 'Freemium', strengths: ['Visual builder', 'Many integrations'], weaknesses: ['Silent failures', 'No version control'] },
        { name: 'Zapier', pricing: 'Freemium', strengths: ['Largest integration library', 'Reliable'], weaknesses: ['Expensive at scale', 'Limited logic'] },
        { name: 'Make', pricing: 'Freemium', strengths: ['Complex workflows', 'Good pricing'], weaknesses: ['Steep learning curve', 'Buggy'] },
      ]),
      underservedUsers: JSON.stringify([]),
      whyNow: JSON.stringify({
        marketGrowthDriver: 'Automation demand continues growing as businesses digitize workflows',
        incumbentWeakness: 'Error handling and observability remain terrible across all major platforms',
        timingAdvantage: 'The market is consolidating, making it harder for new entrants without strong differentiation',
        catalystEvents: ['Zapier raising prices significantly', 'Make.com reliability issues', 'Growing demand for automation observability'],
      }),
      executionDifficulty: JSON.stringify({
        level: 'high',
        demandLevel: 'medium',
        competitionLevel: 'high',
        technicalComplexity: 'high',
        timeToMvp: '3-6 months',
        estimatedBudget: '$50k+',
        keyChallenges: ['Competing against well-funded incumbents', 'Building reliable integration library', 'Error handling at scale is extremely hard'],
      }),
      falseOpportunity: JSON.stringify({
        isFalseOpportunity: true,
        reason: 'Low opportunity despite complaints due to extreme market saturation. 25+ competitors with near-identical features. New entrants need massive funding to compete.',
        estimatedMarketSize: '$5B+',
        riskFactors: ['25+ direct competitors', 'Well-funded incumbents (Zapier valued at $5B)', 'Integration library is a massive moat', 'Low differentiation possible'],
        verdict: 'avoid',
      }),
      founderFit: JSON.stringify({
        bestFit: ['enterprise'],
        rationale: 'Only viable as an enterprise-focused tool with strong observability and compliance features. Consumer/builder market is completely saturated.',
        requiredSkills: ['Enterprise sales', 'Integration engineering', 'Observability infrastructure'],
        idealTeamSize: '10+ team',
      }),
      sourceTransparency: JSON.stringify({
        sourcePlatforms: ['Product Hunt', 'G2', 'Reddit'],
        totalComments: 445,
        complaintFrequency: 12,
        reviewSources: [
          { platform: 'Product Hunt', count: 167, avgScore: 6.5 },
          { platform: 'G2', count: 201, avgScore: 7.2 },
          { platform: 'Reddit', count: 77, avgScore: 6.0 },
        ],
        dataFreshness: 'Data from last 30 days',
        confidenceLevel: 'high',
      }),
      whyExistingProductsFail: JSON.stringify({
        rootCause: 'Automation platforms prioritize integration quantity over reliability, treating error handling as an afterthought rather than a core feature',
        userImpact: 'Businesses relying on automations experience silent failures that go unnoticed for days, causing data inconsistencies and missed workflows',
        missedByCompetitors: 'Observability and version control are "unsexy" features that do not drive marketing metrics, so no major player has invested deeply in them',
      }),
      marketQuadrant: JSON.stringify({
        competitionScore: 90,
        opportunityScore: 35,
        quadrant: 'dead_zone',
        label: 'Dead Zone — High competition, low opportunity for new entrants',
      }),
    },
  ];

  for (const gap of gaps) {
    await prisma.gap.create({ data: gap });
  }
  console.log(`✅ Created ${gaps.length} gaps`);

  // ─── Opportunities with ALL 8 features ──────────────────────────
  const opportunities = [
    {
      title: 'ATS Resume Builder for Engineering Students',
      description: 'Build a resume builder specifically designed for engineering students and bootcamp grads whose value comes from projects, not corporate job history. Include GitHub integration, project showcase sections, and ATS-optimized formatting.',
      category: 'AI Tools',
      saturation: 'low' as const,
      saturationScore: 25,
      gapEvidence: JSON.stringify(['47 complaints about project-based resume formatting', '32 complaints about offline access', '12 similar products all ignore project-based format']),
      complaintRefs: JSON.stringify(['"Fails to optimize technical project-based resumes for students"', '"No offline mode - useless without internet"', '"Templates look generic"']),
      trendSignals: JSON.stringify(['ATS pre-screening rate up to 75%', 'GitHub portfolio now standard requirement', 'Remote hiring reducing human review']),
      qualityScore: 8.5,
      evidenceDetail: JSON.stringify({ similarProducts: 12, repeatedComplaints: 47, launchFrequency: 3, commentSnippets: ['Fails to optimize project-based resumes'], pricingOverlap: 75, launchGrowth: 28 }),
      opportunityScore: JSON.stringify({ complaintFrequency: 18, competitionDensity: 8, pricingDissatisfaction: 16, launchGrowth: 14, underservedAudience: 18, total: 74, explanation: 'High complaints + low competition + growing market = strong opportunity' }),
      whyThisMatters: 'Engineering students are 40% of the resume market with zero purpose-built solutions. This is a $50M+ blind spot.',
      subNiche: JSON.stringify({ name: 'ATS Tools for Engineering Students', description: 'Resume builders designed for project-based experience', parentCategory: 'AI Tools', opportunityScore: 82 }),
      affectedProducts: JSON.stringify([
        { name: 'ResumeAI Pro', pricing: 'Freemium', strengths: ['ATS optimization'], weaknesses: ['No project format'] },
        { name: 'Kickresume', pricing: 'Paid', strengths: ['Templates'], weaknesses: ['Generic'] },
      ]),
      underservedUsers: JSON.stringify([
        { userGroup: 'Engineering students with no corporate experience', description: 'Students whose value is projects, not job history', evidence: '47 complaints about project formatting', opportunityScore: 85 },
      ]),
      whyNow: JSON.stringify({
        marketGrowthDriver: '75% of resumes now rejected by ATS before human review',
        incumbentWeakness: 'Every tool assumes corporate career path formatting',
        timingAdvantage: 'GitHub portfolios now standard for engineering roles',
        catalystEvents: ['ATS pre-screening at 75%', 'GitHub as standard', 'Remote hiring surge'],
      }),
      executionDifficulty: JSON.stringify({
        level: 'low-medium',
        demandLevel: 'high',
        competitionLevel: 'medium',
        technicalComplexity: 'medium',
        timeToMvp: '4-6 weeks',
        estimatedBudget: '$2k-8k',
        keyChallenges: ['ATS parsing for project sections', 'Training data for project formats'],
      }),
      falseOpportunity: JSON.stringify({
        isFalseOpportunity: false,
        estimatedMarketSize: '$50-100M',
        riskFactors: ['ATS algorithms change frequently', 'Student market lower willingness to pay'],
        verdict: 'pursue',
      }),
      founderFit: JSON.stringify({
        bestFit: ['solo_developer', 'student_founder'],
        rationale: 'Best understood by someone who personally struggled with this problem',
        requiredSkills: ['Full-stack dev', 'ATS knowledge', 'Design'],
        idealTeamSize: '1-2 people',
      }),
      sourceTransparency: JSON.stringify({
        sourcePlatforms: ['Product Hunt', 'Reddit', 'Hacker News'],
        totalComments: 234,
        complaintFrequency: 18,
        reviewSources: [
          { platform: 'Product Hunt', count: 142, avgScore: 6.8 },
          { platform: 'Reddit', count: 67, avgScore: 5.2 },
        ],
        dataFreshness: 'Data from last 30 days',
        confidenceLevel: 'high',
      }),
      whyExistingProductsFail: JSON.stringify({
        rootCause: 'Existing tools prioritize corporate formatting over project-based experience, architecting templates around job history rather than portfolio showcase',
        userImpact: 'Engineering students must manually hack templates, creating ATS-incompatible formats',
        missedByCompetitors: 'Competitors assume all resume writers follow corporate career paths',
      }),
      marketQuadrant: JSON.stringify({
        competitionScore: 35,
        opportunityScore: 82,
        quadrant: 'goldmine',
        label: 'Goldmine',
      }),
    },
    {
      title: 'Bodyweight Muscle-Building App for Skinny Beginners',
      description: 'A fitness app specifically designed for underweight beginners who want to gain muscle at home without gym equipment. Include progressive overload bodyweight programs and calorie-surplus meal plans.',
      category: 'Health & Fitness',
      saturation: 'low' as const,
      saturationScore: 20,
      gapEvidence: JSON.stringify(['44 complaints about missing bodyweight support', '51 complaints about nutrition tracking', 'Every fitness app targets weight loss']),
      complaintRefs: JSON.stringify(['"Does not support bodyweight-only workout plans"', '"No nutrition tracking feature"', '"Too basic for anyone past beginner"']),
      trendSignals: JSON.stringify(['Home workout market growing 15% annually', 'Calisthenics trending on social media', 'Gym costs rising 20% YoY']),
      qualityScore: 9.0,
      evidenceDetail: JSON.stringify({ similarProducts: 15, repeatedComplaints: 44, launchFrequency: 4, commentSnippets: ['No bodyweight support'], pricingOverlap: 80, launchGrowth: 22 }),
      opportunityScore: JSON.stringify({ complaintFrequency: 17, competitionDensity: 6, pricingDissatisfaction: 14, launchGrowth: 16, underservedAudience: 20, total: 73, explanation: 'Extremely low competition in a high-demand niche. Every competitor targets weight loss.' }),
      whyThisMatters: 'The "hardgainer" community is millions strong with zero purpose-built solutions in a $14B market.',
      subNiche: JSON.stringify({ name: 'Bodyweight Muscle-Building for Beginners', description: 'Fitness apps for underweight beginners gaining muscle at home', parentCategory: 'Health & Fitness', opportunityScore: 78 }),
      affectedProducts: JSON.stringify([
        { name: 'FitTrack', pricing: 'Free', strengths: ['Simple'], weaknesses: ['No bodyweight focus'] },
        { name: 'MyFitnessPal', pricing: 'Freemium', strengths: ['Nutrition DB'], weaknesses: ['Weight-loss only'] },
      ]),
      underservedUsers: JSON.stringify([
        { userGroup: 'Skinny beginners with no gym access', description: 'Underweight people wanting to build muscle at home', evidence: '44 bodyweight complaints', opportunityScore: 88 },
        { userGroup: 'Hardgainers needing muscle-building nutrition', description: 'Users needing calorie surplus plans, not deficit', evidence: '51 nutrition complaints', opportunityScore: 76 },
      ]),
      whyNow: JSON.stringify({
        marketGrowthDriver: 'Home workout market growing 15% annually post-pandemic',
        incumbentWeakness: 'Every major app optimizes for weight loss because that drives ad revenue',
        timingAdvantage: 'Social media has created massive calisthenics awareness with no app to capture it',
        catalystEvents: ['Post-pandemic home workout persistence', 'Calisthenics TikTok trend', 'Rising gym costs'],
      }),
      executionDifficulty: JSON.stringify({
        level: 'low-medium',
        demandLevel: 'high',
        competitionLevel: 'low',
        technicalComplexity: 'low',
        timeToMvp: '3-5 weeks',
        estimatedBudget: '$1k-5k',
        keyChallenges: ['Creating effective progressive overload programs', 'Building calorie-surplus nutrition features'],
      }),
      falseOpportunity: JSON.stringify({
        isFalseOpportunity: false,
        estimatedMarketSize: '$100-500M',
        riskFactors: ['Free YouTube alternatives exist', 'Lower retention rates possible'],
        verdict: 'pursue',
      }),
      founderFit: JSON.stringify({
        bestFit: ['solo_developer', 'content_creator'],
        rationale: 'Content creators who are hardgainers can build audience + product simultaneously',
        requiredSkills: ['Mobile dev', 'Fitness knowledge', 'Content creation'],
        idealTeamSize: 'Solo or 2 people',
      }),
      sourceTransparency: JSON.stringify({
        sourcePlatforms: ['Product Hunt', 'Reddit', 'App Store'],
        totalComments: 312,
        complaintFrequency: 22,
        reviewSources: [
          { platform: 'Product Hunt', count: 89, avgScore: 5.2 },
          { platform: 'Reddit', count: 156, avgScore: 4.8 },
        ],
        dataFreshness: 'Data from last 30 days',
        confidenceLevel: 'high',
      }),
      whyExistingProductsFail: JSON.stringify({
        rootCause: 'Weight loss features drive more ad impressions and engagement metrics, so every fitness app optimizes for that instead',
        userImpact: 'Hardgainers cobble together YouTube, Reddit, and separate nutrition apps with no cohesive experience',
        missedByCompetitors: 'Muscle-gain-at-home appears smaller but has higher willingness to pay and lifetime value',
      }),
      marketQuadrant: JSON.stringify({
        competitionScore: 20,
        opportunityScore: 78,
        quadrant: 'goldmine',
        label: 'Goldmine',
      }),
    },
    {
      title: 'Affordable AI Coding Assistant for Students',
      description: 'A budget-friendly AI coding assistant with student pricing ($5/month) and project-based learning paths that explain code step by step.',
      category: 'Developer Tools',
      saturation: 'medium' as const,
      saturationScore: 55,
      gapEvidence: JSON.stringify(['72 complaints about pricing being too high for students', '45 complaints about missing project-based learning', '14 similar products all price for professionals']),
      complaintRefs: JSON.stringify(['"Too expensive for students at $20/month"', '"No project-based learning paths"', '"Explanations too shallow"']),
      trendSignals: JSON.stringify(['AI coding market growing 35% YoY', 'LLM API costs dropped 10x', 'CS enrollment up 40% globally']),
      qualityScore: 7.5,
      evidenceDetail: JSON.stringify({ similarProducts: 14, repeatedComplaints: 72, launchFrequency: 4, commentSnippets: ['Too expensive for students'], pricingOverlap: 85, launchGrowth: 35 }),
      opportunityScore: JSON.stringify({ complaintFrequency: 19, competitionDensity: 14, pricingDissatisfaction: 18, launchGrowth: 17, underservedAudience: 16, total: 84, explanation: 'Massive demand gap between professional pricing and student budgets. LLM cost drops make student pricing viable.' }),
      whyThisMatters: 'The largest potential user base (students) is excluded by pricing in a market growing 35% YoY.',
      subNiche: JSON.stringify({ name: 'Student-Priced AI Coding Education', description: 'Budget AI coding assistants with educational features for learners', parentCategory: 'Developer Tools', opportunityScore: 75 }),
      affectedProducts: JSON.stringify([
        { name: 'CodeMentor AI', pricing: '$20/mo', strengths: ['Good explanations'], weaknesses: ['Too expensive'] },
        { name: 'GitHub Copilot', pricing: '$10/mo', strengths: ['In-editor'], weaknesses: ['Not educational'] },
      ]),
      underservedUsers: JSON.stringify([
        { userGroup: 'CS students on tight budgets', description: 'Students who need coding help but cannot afford premium tools', evidence: '72 pricing complaints', opportunityScore: 80 },
      ]),
      whyNow: JSON.stringify({
        marketGrowthDriver: 'AI coding market growing 35% YoY with online programming education booming',
        incumbentWeakness: 'Current tools price for professionals, ignoring the massive student market',
        timingAdvantage: 'LLM API costs dropped 10x in 2024, making student-tier pricing economically viable',
        catalystEvents: ['LLM costs dropped 90%', 'CS enrollment up 40%', 'Copilot proving demand'],
      }),
      executionDifficulty: JSON.stringify({
        level: 'medium',
        demandLevel: 'high',
        competitionLevel: 'high',
        technicalComplexity: 'medium',
        timeToMvp: '6-8 weeks',
        estimatedBudget: '$5k-15k',
        keyChallenges: ['Competing with well-funded incumbents', 'Balancing low pricing with API costs'],
      }),
      falseOpportunity: JSON.stringify({
        isFalseOpportunity: false,
        estimatedMarketSize: '$200M-1B',
        riskFactors: ['High competition from funded players', 'Students upgrade after learning', 'LLM costs volatile'],
        verdict: 'pursue',
      }),
      founderFit: JSON.stringify({
        bestFit: ['student_founder', 'solo_developer'],
        rationale: 'Student founders understand budget constraints and learning needs firsthand',
        requiredSkills: ['Full-stack dev', 'LLM integration', 'EdTech design'],
        idealTeamSize: '2-3 people',
      }),
      sourceTransparency: JSON.stringify({
        sourcePlatforms: ['Product Hunt', 'Reddit', 'Stack Overflow'],
        totalComments: 267,
        complaintFrequency: 24,
        reviewSources: [
          { platform: 'Product Hunt', count: 134, avgScore: 7.5 },
          { platform: 'Reddit', count: 89, avgScore: 6.1 },
        ],
        dataFreshness: 'Data from last 30 days',
        confidenceLevel: 'high',
      }),
      whyExistingProductsFail: JSON.stringify({
        rootCause: 'Tools optimize for professional productivity (high WTP) rather than educational depth, creating a feature gap for learners',
        userImpact: 'Students cannot afford tools or use free tiers lacking educational features they need',
        missedByCompetitors: 'Student pricing means lower margins, which VC-funded companies avoid for growth metrics',
      }),
      marketQuadrant: JSON.stringify({
        competitionScore: 75,
        opportunityScore: 75,
        quadrant: 'crowded',
        label: 'Crowded but Viable',
      }),
    },
  ];

  for (const opp of opportunities) {
    await prisma.opportunity.create({ data: opp });
  }
  console.log(`✅ Created ${opportunities.length} opportunities`);

  // ─── Trends ─────────────────────────────────────────────────────
  const trends = [
    {
      category: 'AI Tools',
      name: 'AI-Powered Career Tools',
      description: 'Rapid growth in AI tools for job seekers, resume optimization, and interview preparation. Driven by ATS-heavy hiring and remote work.',
      growthRate: 35,
      direction: 'growing',
      dataPoints: JSON.stringify([
        { label: 'Jan', value: 12 },
        { label: 'Feb', value: 15 },
        { label: 'Mar', value: 19 },
        { label: 'Apr', value: 24 },
        { label: 'May', value: 28 },
        { label: 'Jun', value: 35 },
      ]),
      period: '6 months',
      subNiches: JSON.stringify([
        { name: 'ATS Resume Optimization for Technical Roles', description: 'AI tools that understand technical project portfolios', parentCategory: 'AI Tools', opportunityScore: 82 },
        { name: 'AI Interview Prep for Engineering', description: 'Mock interview tools specialized for technical interviews', parentCategory: 'AI Tools', opportunityScore: 68 },
      ]),
      underservedUsers: JSON.stringify([
        { userGroup: 'Engineering students entering job market', description: 'Students with project-based experience that does not fit traditional resume formats', evidence: 'Multiple complaints about resume formatting', opportunityScore: 85 },
      ]),
      whyNow: JSON.stringify({
        marketGrowthDriver: '75% of resumes rejected by ATS before human review',
        incumbentWeakness: 'Generic resume tools ignore technical project formats',
        timingAdvantage: 'Remote hiring makes ATS screening universal',
        catalystEvents: ['ATS adoption surge', 'Remote hiring standard', 'AI model cost drops'],
      }),
      sourceTransparency: JSON.stringify({
        sourcePlatforms: ['Product Hunt', 'LinkedIn', 'Hacker News'],
        totalComments: 456,
        complaintFrequency: 18,
        reviewSources: [
          { platform: 'Product Hunt', count: 234, avgScore: 7.2 },
          { platform: 'LinkedIn', count: 156, avgScore: 6.5 },
          { platform: 'Hacker News', count: 66, avgScore: 7.8 },
        ],
        dataFreshness: 'Data from last 90 days',
        confidenceLevel: 'high',
      }),
    },
    {
      category: 'Health & Fitness',
      name: 'Home Fitness Solutions',
      description: 'Post-pandemic shift to home workouts driving demand for bodyweight and minimal-equipment fitness solutions.',
      growthRate: 22,
      direction: 'growing',
      dataPoints: JSON.stringify([
        { label: 'Jan', value: 8 },
        { label: 'Feb', value: 9 },
        { label: 'Mar', value: 11 },
        { label: 'Apr', value: 13 },
        { label: 'May', value: 16 },
        { label: 'Jun', value: 22 },
      ]),
      period: '6 months',
      subNiches: JSON.stringify([
        { name: 'Bodyweight Muscle-Building for Beginners', description: 'Programs for skinny beginners without gym access', parentCategory: 'Health & Fitness', opportunityScore: 78 },
        { name: 'Calisthenics Progression Tracking', description: 'Apps that track progressive overload in bodyweight exercises', parentCategory: 'Health & Fitness', opportunityScore: 62 },
      ]),
      underservedUsers: JSON.stringify([
        { userGroup: 'Skinny beginners with no gym access', description: 'Underweight people wanting to gain muscle at home', evidence: '44 bodyweight complaints', opportunityScore: 88 },
      ]),
      whyNow: JSON.stringify({
        marketGrowthDriver: 'Home workout market growing 15% annually post-pandemic',
        incumbentWeakness: 'Every major app targets weight loss for ad revenue',
        timingAdvantage: 'Calisthenics trend on social media with no dedicated app',
        catalystEvents: ['Post-pandemic habits', 'Gym costs rising', 'Social media fitness trend'],
      }),
      sourceTransparency: JSON.stringify({
        sourcePlatforms: ['Product Hunt', 'App Store', 'Reddit'],
        totalComments: 312,
        complaintFrequency: 22,
        reviewSources: [
          { platform: 'Product Hunt', count: 89, avgScore: 5.2 },
          { platform: 'App Store', count: 156, avgScore: 5.5 },
        ],
        dataFreshness: 'Data from last 30 days',
        confidenceLevel: 'high',
      }),
    },
    {
      category: 'Developer Tools',
      name: 'AI Coding Assistants',
      description: 'Explosive growth in AI tools that help developers write, review, and understand code. Market expanding from pros to learners.',
      growthRate: 45,
      direction: 'growing',
      dataPoints: JSON.stringify([
        { label: 'Jan', value: 15 },
        { label: 'Feb', value: 21 },
        { label: 'Mar', value: 28 },
        { label: 'Apr', value: 34 },
        { label: 'May', value: 40 },
        { label: 'Jun', value: 45 },
      ]),
      period: '6 months',
      subNiches: JSON.stringify([
        { name: 'Student-Priced AI Coding Education', description: 'Affordable AI assistants for learners', parentCategory: 'Developer Tools', opportunityScore: 75 },
      ]),
      underservedUsers: JSON.stringify([
        { userGroup: 'CS students on tight budgets', description: 'Students priced out of professional AI coding tools', evidence: '72 pricing complaints', opportunityScore: 80 },
      ]),
      whyNow: JSON.stringify({
        marketGrowthDriver: 'AI coding market growing 35% YoY',
        incumbentWeakness: 'Professional pricing excludes the student market',
        timingAdvantage: 'LLM API costs dropped 10x making student pricing viable',
        catalystEvents: ['API cost drops', 'CS enrollment surge', 'Copilot proving market'],
      }),
      sourceTransparency: JSON.stringify({
        sourcePlatforms: ['Product Hunt', 'Stack Overflow', 'GitHub'],
        totalComments: 567,
        complaintFrequency: 24,
        reviewSources: [
          { platform: 'Product Hunt', count: 234, avgScore: 7.5 },
          { platform: 'Stack Overflow', count: 189, avgScore: 7.8 },
        ],
        dataFreshness: 'Data from last 30 days',
        confidenceLevel: 'high',
      }),
    },
    {
      category: 'Finance',
      name: 'Freelancer Financial Tools',
      description: 'Growing demand for finance tools that serve freelancers and independent workers, especially outside the US.',
      growthRate: 15,
      direction: 'growing',
      dataPoints: JSON.stringify([
        { label: 'Jan', value: 5 },
        { label: 'Feb', value: 6 },
        { label: 'Mar', value: 7 },
        { label: 'Apr', value: 9 },
        { label: 'May', value: 11 },
        { label: 'Jun', value: 15 },
      ]),
      period: '6 months',
      subNiches: JSON.stringify([
        { name: 'International Freelancer Finance', description: 'Finance tools for freelancers in emerging markets', parentCategory: 'Finance', opportunityScore: 65 },
      ]),
      underservedUsers: JSON.stringify([
        { userGroup: 'Freelancers in emerging markets', description: 'Workers earning in multiple currencies needing local tax compliance', evidence: '58 bank integration complaints', opportunityScore: 70 },
      ]),
      whyNow: JSON.stringify({
        marketGrowthDriver: 'Global freelancer economy growing at 15% CAGR',
        incumbentWeakness: 'US finance tools cannot adapt to international banking',
        timingAdvantage: 'Open banking regulations expanding globally',
        catalystEvents: ['Open banking in India/Brazil', 'Cross-border income normalization', 'Fintech infrastructure maturing'],
      }),
      sourceTransparency: JSON.stringify({
        sourcePlatforms: ['Product Hunt', 'Reddit', 'Twitter'],
        totalComments: 156,
        complaintFrequency: 16,
        reviewSources: [
          { platform: 'Product Hunt', count: 78, avgScore: 6.0 },
          { platform: 'Reddit', count: 56, avgScore: 5.5 },
        ],
        dataFreshness: 'Data from last 30 days',
        confidenceLevel: 'medium',
      }),
    },
    {
      category: 'No-Code',
      name: 'Automation Platforms',
      description: 'Saturated market of no-code automation tools with similar features. Growth slowing as market consolidates.',
      growthRate: 8,
      direction: 'stable',
      dataPoints: JSON.stringify([
        { label: 'Jan', value: 10 },
        { label: 'Feb', value: 10 },
        { label: 'Mar', value: 9 },
        { label: 'Apr', value: 9 },
        { label: 'May', value: 8 },
        { label: 'Jun', value: 8 },
      ]),
      period: '6 months',
      subNiches: JSON.stringify([
        { name: 'Developer-Friendly Automation with Version Control', description: 'Automation tools combining no-code with git-like features', parentCategory: 'No-Code', opportunityScore: 45 },
      ]),
      underservedUsers: JSON.stringify([]),
      whyNow: JSON.stringify({
        marketGrowthDriver: 'Automation demand continues but market is consolidating',
        incumbentWeakness: 'Error handling remains terrible across all platforms',
        timingAdvantage: 'Market consolidation makes new entry harder without strong differentiation',
        catalystEvents: ['Zapier price increases', 'Make reliability issues'],
      }),
      sourceTransparency: JSON.stringify({
        sourcePlatforms: ['Product Hunt', 'G2', 'Reddit'],
        totalComments: 445,
        complaintFrequency: 12,
        reviewSources: [
          { platform: 'Product Hunt', count: 167, avgScore: 6.5 },
          { platform: 'G2', count: 201, avgScore: 7.2 },
        ],
        dataFreshness: 'Data from last 30 days',
        confidenceLevel: 'high',
      }),
    },
  ];

  for (const trend of trends) {
    await prisma.trend.create({ data: trend });
  }
  console.log(`✅ Created ${trends.length} trends`);

  console.log('🎉 Enriched database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
