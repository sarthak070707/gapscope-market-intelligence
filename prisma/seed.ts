import { db } from '@/lib/db';

async function main() {
  // Create sample products
  const productData = [
    {
      name: 'Notion AI',
      tagline: 'AI-powered workspace for notes, docs, and projects',
      description: 'Notion AI helps teams write, plan, and organize with AI assistance built directly into their workspace. It offers automated summaries, content generation, and task management.',
      url: 'https://notion.so',
      category: 'AI Tools',
      upvotes: 2340,
      launchDate: '2025-01-15',
      features: JSON.stringify(['AI writing assistant', 'Auto-summarization', 'Task automation', 'Template generation', 'Knowledge base']),
      pricing: 'Freemium',
      comments: JSON.stringify(['Great for team collaboration', 'Expensive for small teams', 'AI features need improvement', 'Mobile app is clunky', 'Missing offline mode']),
      reviewScore: 7.5,
      sourceUrl: 'https://producthunt.com/posts/notion-ai',
    },
    {
      name: 'Copy.ai',
      tagline: 'AI copywriting tool for marketing teams',
      description: 'Copy.ai generates marketing copy, blog posts, social media content, and emails using GPT-powered AI. It targets marketing teams looking to scale content production.',
      url: 'https://copy.ai',
      category: 'AI Tools',
      upvotes: 1890,
      launchDate: '2025-02-10',
      features: JSON.stringify(['Blog post generation', 'Social media copy', 'Email templates', 'Brand voice training', 'SEO optimization']),
      pricing: 'Paid',
      comments: JSON.stringify(['Output quality is inconsistent', 'Too expensive for freelancers', 'Good for quick drafts', 'Missing WordPress integration', 'Customer support is slow']),
      reviewScore: 6.2,
      sourceUrl: 'https://producthunt.com/posts/copy-ai',
    },
    {
      name: 'TaskMaster Pro',
      tagline: 'Project management with AI-driven prioritization',
      description: 'TaskMaster Pro uses AI to automatically prioritize tasks, predict deadlines, and suggest resource allocation. Built for development teams and project managers.',
      url: 'https://taskmasterpro.example.com',
      category: 'Productivity',
      upvotes: 567,
      launchDate: '2025-03-05',
      features: JSON.stringify(['AI prioritization', 'Deadline prediction', 'Resource allocation', 'Sprint planning', 'Time tracking']),
      pricing: 'Paid',
      comments: JSON.stringify(['Steep learning curve', 'Missing mobile app', 'Good for large teams', 'Pricing not transparent', 'Needs Slack integration']),
      reviewScore: 6.8,
      sourceUrl: 'https://producthunt.com/posts/taskmaster-pro',
    },
    {
      name: 'FitTrack',
      tagline: 'Smart fitness tracking for home workouts',
      description: 'FitTrack provides AI-powered home workout tracking with form correction, personalized plans, and progress analytics. Designed for people who prefer home workouts over gyms.',
      url: 'https://fittrack.example.com',
      category: 'Health & Fitness',
      upvotes: 890,
      launchDate: '2025-01-20',
      features: JSON.stringify(['Form correction AI', 'Home workout plans', 'Progress analytics', 'Nutrition tracking', 'Wearable sync']),
      pricing: 'Freemium',
      comments: JSON.stringify(['Great for home workouts', 'Limited exercise library', 'Form correction is inaccurate sometimes', 'Needs Apple Health integration', 'Free tier is too limited']),
      reviewScore: 7.1,
      sourceUrl: 'https://producthunt.com/posts/fittrack',
    },
    {
      name: 'ResumeForge',
      tagline: 'ATS-optimized resume builder with AI',
      description: 'ResumeForge helps job seekers create ATS-friendly resumes using AI. It analyzes job descriptions and tailors resumes to pass automated screening systems.',
      url: 'https://resumeforge.example.com',
      category: 'Productivity',
      upvotes: 1234,
      launchDate: '2025-02-28',
      features: JSON.stringify(['ATS optimization', 'Job description analysis', 'Template library', 'Cover letter generator', 'Interview prep']),
      pricing: 'Freemium',
      comments: JSON.stringify(['Templates look generic', 'ATS scoring is not accurate', 'Too expensive for students', 'Missing LinkedIn integration', 'Good concept but poor execution']),
      reviewScore: 5.9,
      sourceUrl: 'https://producthunt.com/posts/resumeforge',
    },
  ];

  const productIds: Record<string, string> = {};
  for (const product of productData) {
    const existing = await db.product.findFirst({ where: { name: product.name } });
    if (existing) {
      productIds[product.name] = existing.id;
    } else {
      const created = await db.product.create({ data: product });
      productIds[product.name] = created.id;
    }
  }

  // Create sample gaps
  const gaps = [
    {
      productName: 'Notion AI',
      gapType: 'missing_feature',
      title: 'No offline mode in AI workspace tools',
      description: 'All major AI workspace tools like Notion AI require constant internet connection. Users who travel or have unreliable internet cannot use these tools effectively.',
      evidence: 'Multiple user comments mention the lack of offline mode across AI note-taking and workspace products.',
      severity: 'high',
    },
    {
      productName: 'Copy.ai',
      gapType: 'expensive',
      title: 'AI copywriting tools are overpriced for freelancers',
      description: 'Most AI copywriting tools charge $36-49/month, making them inaccessible for individual freelancers and small businesses who need them most.',
      evidence: 'Pricing analysis shows Copy.ai at $49/mo, Jasper at $49/mo, Writesonic at $16/mo (limited). All lack affordable individual plans.',
      severity: 'medium',
    },
    {
      productName: 'ResumeForge',
      gapType: 'weak_ux',
      title: 'Resume builders have poor ATS optimization accuracy',
      description: 'Users report that ATS scoring features in resume builders are inaccurate and give false confidence. The actual ATS screening process differs significantly from what these tools simulate.',
      evidence: 'User complaints about inaccurate ATS scoring and generic template designs that fail real ATS screening.',
      severity: 'high',
    },
    {
      productName: 'FitTrack',
      gapType: 'underserved',
      title: 'Fitness apps ignore home workout users',
      description: 'Most fitness apps are designed for gym-goers. Home workout users lack proper form tracking, equipment-free exercise libraries, and personalized routines.',
      evidence: 'FitTrack is the only major app targeting home workouts, but its exercise library is limited and form correction is unreliable.',
      severity: 'medium',
    },
    {
      productName: 'Copy.ai',
      gapType: 'overcrowded',
      title: 'AI writing tool market is oversaturated',
      description: 'There are 50+ AI writing tools with nearly identical features. The market has too many similar products competing on the same value proposition.',
      evidence: 'Product Hunt shows 15+ AI writing tool launches per month, all offering blog generation, social media copy, and email templates.',
      severity: 'low',
    },
  ];

  for (const gap of gaps) {
    const existing = await db.gap.findFirst({ where: { title: gap.title } });
    if (!existing && productIds[gap.productName]) {
      await db.gap.create({
        data: {
          productId: productIds[gap.productName],
          gapType: gap.gapType,
          title: gap.title,
          description: gap.description,
          evidence: gap.evidence,
          severity: gap.severity,
        },
      });
    }
  }

  // Create sample complaints
  const complaints = [
    { productName: 'Copy.ai', text: 'Too expensive for individual users and freelancers', category: 'pricing', sentiment: 'negative', frequency: 8 },
    { productName: 'Notion AI', text: 'Missing offline mode - useless without internet', category: 'missing_feature', sentiment: 'negative', frequency: 7 },
    { productName: 'ResumeForge', text: 'ATS scoring is inaccurate and misleading', category: 'performance', sentiment: 'negative', frequency: 6 },
    { productName: 'TaskMaster Pro', text: 'Steep learning curve and poor onboarding', category: 'ux', sentiment: 'mixed', frequency: 5 },
    { productName: 'FitTrack', text: 'Form correction AI is unreliable and gives wrong feedback', category: 'performance', sentiment: 'negative', frequency: 4 },
    { productName: 'Copy.ai', text: 'Missing WordPress and CMS integrations', category: 'integration', sentiment: 'negative', frequency: 5 },
    { productName: 'ResumeForge', text: 'Customer support takes days to respond', category: 'support', sentiment: 'negative', frequency: 3 },
  ];

  for (const complaint of complaints) {
    const existing = await db.complaint.findFirst({ where: { text: complaint.text } });
    if (!existing && productIds[complaint.productName]) {
      await db.complaint.create({
        data: {
          productId: productIds[complaint.productName],
          text: complaint.text,
          category: complaint.category,
          sentiment: complaint.sentiment,
          frequency: complaint.frequency,
        },
      });
    }
  }

  // Create sample trends
  const trends = [
    {
      category: 'AI Tools',
      name: 'AI Coding Assistants',
      description: 'AI-powered coding tools are seeing explosive growth, with launches increasing 240% in the last 3 months on Product Hunt.',
      growthRate: 240,
      direction: 'growing',
      dataPoints: JSON.stringify([
        { label: 'Jan', value: 12 },
        { label: 'Feb', value: 18 },
        { label: 'Mar', value: 28 },
        { label: 'Apr', value: 41 },
      ]),
      period: '3 months',
    },
    {
      category: 'Automation',
      name: 'No-Code AI Automation',
      description: 'No-code AI automation platforms are growing rapidly as non-technical users demand AI-powered workflow tools.',
      growthRate: 85,
      direction: 'growing',
      dataPoints: JSON.stringify([
        { label: 'Jan', value: 8 },
        { label: 'Feb', value: 11 },
        { label: 'Mar', value: 15 },
        { label: 'Apr', value: 15 },
      ]),
      period: '3 months',
    },
    {
      category: 'AI Tools',
      name: 'AI Writing Tools (Declining Innovation)',
      description: 'AI writing tool launches are stable but innovation is declining. New entrants offer no differentiation from established players.',
      growthRate: -15,
      direction: 'declining',
      dataPoints: JSON.stringify([
        { label: 'Jan', value: 22 },
        { label: 'Feb', value: 20 },
        { label: 'Mar', value: 19 },
        { label: 'Apr', value: 18 },
      ]),
      period: '3 months',
    },
  ];

  for (const trend of trends) {
    const existing = await db.trend.findFirst({ where: { name: trend.name } });
    if (!existing) {
      await db.trend.create({ data: trend });
    }
  }

  // Create sample opportunities
  const opportunities = [
    {
      title: 'Offline-first AI Workspace for Remote Workers',
      description: 'Build an AI-powered workspace that works fully offline with local AI models. Target remote workers and digital nomads who frequently have unreliable internet.',
      category: 'AI Tools',
      saturation: 'low',
      saturationScore: 15,
      gapEvidence: JSON.stringify(['No offline mode in AI workspace tools', 'All major AI tools require constant internet']),
      complaintRefs: JSON.stringify(['Missing offline mode - useless without internet', 'Great for team collaboration but needs offline']),
      trendSignals: JSON.stringify(['AI Coding Assistants growing 240%', 'Remote work tools demand increasing']),
      qualityScore: 8.5,
      isSaved: true,
      isGenerated: true,
    },
    {
      title: 'Affordable ATS-Accurate Resume Builder for Students',
      description: 'Create a lightweight, ATS-accurate resume platform specifically for students and freshers. Focus on real ATS algorithm compatibility rather than simulated scoring.',
      category: 'Productivity',
      saturation: 'medium',
      saturationScore: 45,
      gapEvidence: JSON.stringify(['Resume builders have poor ATS optimization accuracy', 'ATS scoring features are inaccurate']),
      complaintRefs: JSON.stringify(['ATS scoring is inaccurate and misleading', 'Too expensive for students', 'Templates look generic']),
      trendSignals: JSON.stringify(['Entry-level job market growing']),
      qualityScore: 7.8,
      isSaved: false,
      isGenerated: true,
    },
    {
      title: 'AI Home Fitness Coach with Wearable Integration',
      description: 'Build an AI fitness app designed exclusively for home workouts, with reliable form correction using phone camera + wearable data, equipment-free exercise library.',
      category: 'Health & Fitness',
      saturation: 'low',
      saturationScore: 22,
      gapEvidence: JSON.stringify(['Fitness apps ignore home workout users', 'Form correction AI is unreliable']),
      complaintRefs: JSON.stringify(['Form correction AI is unreliable and gives wrong feedback', 'Limited exercise library']),
      trendSignals: JSON.stringify(['Home fitness market growing post-pandemic']),
      qualityScore: 7.2,
      isSaved: true,
      isGenerated: true,
    },
  ];

  for (const opp of opportunities) {
    const existing = await db.opportunity.findFirst({ where: { title: opp.title } });
    if (!existing) {
      await db.opportunity.create({ data: opp });
    }
  }

  console.log('Seed data created successfully!');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
