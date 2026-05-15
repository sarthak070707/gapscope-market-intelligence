/**
 * Auto-Seed Module
 *
 * Automatically populates the database with sample products on first scan
 * if the database is empty. This ensures the preview is never blank.
 *
 * Seed data is tagged with dataSource: "seed" so users know it's sample data.
 * A live scan will replace or supplement this with real data.
 */

import { db } from '@/lib/db';

const CURRENT_YEAR = new Date().getFullYear();

interface SeedProduct {
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
  dataSource: string;
}

// ─── Seed Data: Real, well-known products across all 12 categories ──────────

const SEED_PRODUCTS: SeedProduct[] = [
  // ── AI Tools ──
  {
    name: 'ChatGPT',
    tagline: 'AI assistant for conversation and content creation',
    description: 'Advanced AI chatbot that can help with writing, analysis, coding, and creative tasks through natural language conversation.',
    url: 'https://chat.openai.com',
    category: 'AI Tools',
    upvotes: 4850,
    launchDate: '2022-11',
    features: ['Natural language conversation', 'Code generation', 'Content writing', 'Data analysis', 'Image generation'],
    pricing: 'Freemium',
    comments: ['Revolutionary product that changed how we interact with AI', 'GPT-4 is significantly better than 3.5', 'The API is easy to integrate'],
    reviewScore: 9.2,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Midjourney',
    tagline: 'AI-powered image generation from text prompts',
    description: 'Create stunning, imaginative artwork from text descriptions using advanced AI models. Known for high artistic quality.',
    url: 'https://midjourney.com',
    category: 'AI Tools',
    upvotes: 3200,
    launchDate: '2022-07',
    features: ['Text-to-image generation', 'Style customization', 'Upscaling', 'Variations', 'Community gallery'],
    pricing: 'Paid',
    comments: ['Best AI art quality I have seen', 'V6 is incredibly photorealistic', 'Discord-only interface is a bit clunky'],
    reviewScore: 8.8,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Perplexity AI',
    tagline: 'AI-powered search engine with cited sources',
    description: 'Ask questions and get answers with real-time web sources cited. Combines LLM capabilities with live web search.',
    url: 'https://perplexity.ai',
    category: 'AI Tools',
    upvotes: 2800,
    launchDate: '2022-12',
    features: ['Cited answers', 'Real-time web search', 'Follow-up questions', 'Collections', 'API access'],
    pricing: 'Freemium',
    comments: ['Better than Google for research questions', 'The citations make it trustworthy', 'Pro search is very thorough'],
    reviewScore: 8.5,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Cursor',
    tagline: 'AI-first code editor built for pair programming',
    description: 'Code editor with AI built in. Features include AI autocomplete, codebase chat, and automated code edits across multiple files.',
    url: 'https://cursor.sh',
    category: 'AI Tools',
    upvotes: 2400,
    launchDate: '2023-03',
    features: ['AI autocomplete', 'Codebase chat', 'Multi-file edits', 'Code generation', 'Terminal integration'],
    pricing: 'Freemium',
    comments: ['Replaced VS Code for me entirely', 'The codebase context feature is game-changing', 'Composer mode is incredible'],
    reviewScore: 9.0,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Claude',
    tagline: 'AI assistant focused on safety and helpfulness',
    description: 'Advanced AI assistant by Anthropic known for long context windows, careful reasoning, and nuanced responses.',
    url: 'https://claude.ai',
    category: 'AI Tools',
    upvotes: 2200,
    launchDate: '2023-03',
    features: ['200K context window', 'Document analysis', 'Code generation', 'Careful reasoning', 'Artifacts'],
    pricing: 'Freemium',
    comments: ['Best for long document analysis', 'More careful and nuanced than competitors', 'Artifacts feature is really useful'],
    reviewScore: 8.7,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },

  // ── Productivity ──
  {
    name: 'Notion',
    tagline: 'All-in-one workspace for notes, docs, and projects',
    description: 'A connected workspace combining notes, docs, project management, and databases. AI-powered writing and organization.',
    url: 'https://notion.so',
    category: 'Productivity',
    upvotes: 3900,
    launchDate: '2018-03',
    features: ['Databases', 'Wiki-style docs', 'Project boards', 'AI writing assistant', 'Templates'],
    pricing: 'Freemium',
    comments: ['Replaced 5 different apps for me', 'The database feature is incredibly flexible', 'Can be slow with large workspaces'],
    reviewScore: 8.5,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Linear',
    tagline: 'The issue tracking tool built for speed',
    description: 'Streamlined issue tracking and project management designed for modern software teams. Keyboard-first, beautiful interface.',
    url: 'https://linear.app',
    category: 'Productivity',
    upvotes: 2600,
    launchDate: '2019-07',
    features: ['Keyboard shortcuts', 'Cycles', 'Roadmaps', 'Git integration', 'Workflow automation'],
    pricing: 'Freemium',
    comments: ['So much faster than Jira', 'The design is beautiful', 'Keyboard-first approach is refreshing'],
    reviewScore: 9.1,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Raycast',
    tagline: 'Blazingly fast launcher for productivity',
    description: 'Spotlight replacement that lets you control tools, search, run scripts, and manage workflows from a single launcher.',
    url: 'https://raycast.com',
    category: 'Productivity',
    upvotes: 2100,
    launchDate: '2020-10',
    features: ['App launcher', 'Clipboard history', 'Snippet expansion', 'Extensions store', 'AI integration'],
    pricing: 'Freemium',
    comments: ['Replaced Alfred for me', 'The extension API is great', 'AI features are well-integrated'],
    reviewScore: 9.0,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Todoist',
    tagline: 'The to-do list that helps you organize work and life',
    description: 'Task management app with natural language input, project organization, and cross-platform sync.',
    url: 'https://todoist.com',
    category: 'Productivity',
    upvotes: 1800,
    launchDate: '2013-01',
    features: ['Natural language input', 'Project organization', 'Labels and filters', 'Karma system', 'Integrations'],
    pricing: 'Freemium',
    comments: ['Best natural language task input', 'Clean and simple interface', 'Premium is worth it for reminders'],
    reviewScore: 8.3,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },

  // ── Developer Tools ──
  {
    name: 'GitHub Copilot',
    tagline: 'AI pair programmer that suggests code in real-time',
    description: 'AI-powered code completion tool that suggests whole lines or blocks of code as you type, integrated into your IDE.',
    url: 'https://github.com/features/copilot',
    category: 'Developer Tools',
    upvotes: 4100,
    launchDate: '2021-10',
    features: ['Code completion', 'Chat interface', 'Code explanation', 'Test generation', 'Multi-language support'],
    pricing: 'Paid',
    comments: ['Saves me hours every week', 'Gets context from my entire codebase', 'Sometimes suggests outdated patterns'],
    reviewScore: 8.6,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Vercel',
    tagline: 'Deploy web projects with zero configuration',
    description: 'Frontend cloud platform for deploying web applications with automatic CI/CD, edge functions, and preview deployments.',
    url: 'https://vercel.com',
    category: 'Developer Tools',
    upvotes: 3500,
    launchDate: '2020-04',
    features: ['Git integration', 'Preview deployments', 'Edge functions', 'Analytics', 'Serverless functions'],
    pricing: 'Freemium',
    comments: ['Deploying is literally just pushing to git', 'Preview URLs for every PR are amazing', 'Cold starts can be slow on hobby tier'],
    reviewScore: 8.8,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Supabase',
    tagline: 'Open source Firebase alternative',
    description: 'Backend-as-a-service with Postgres database, authentication, storage, and real-time subscriptions. Open source Firebase alternative.',
    url: 'https://supabase.com',
    category: 'Developer Tools',
    upvotes: 2900,
    launchDate: '2020-01',
    features: ['Postgres database', 'Authentication', 'Storage', 'Real-time subscriptions', 'Edge functions'],
    pricing: 'Freemium',
    comments: ['Postgres instead of NoSQL is a huge advantage', 'Real-time features work great', 'Migration from Firebase was easy'],
    reviewScore: 8.5,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Postman',
    tagline: 'API platform for building and using APIs',
    description: 'Comprehensive API development platform for designing, testing, documenting, and monitoring APIs.',
    url: 'https://postman.com',
    category: 'Developer Tools',
    upvotes: 2200,
    launchDate: '2014-10',
    features: ['API testing', 'Mock servers', 'Documentation', 'Collaboration', 'Automation'],
    pricing: 'Freemium',
    comments: ['Industry standard for API testing', 'The collection sharing feature is great', 'Getting heavy and slow over the years'],
    reviewScore: 7.8,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },

  // ── Education ──
  {
    name: 'Duolingo',
    tagline: 'Learn a language for free. Forever.',
    description: 'Gamified language learning app with bite-sized lessons, streak tracking, and AI-powered feedback.',
    url: 'https://duolingo.com',
    category: 'Education',
    upvotes: 2600,
    launchDate: '2012-06',
    features: ['Gamified lessons', 'Streak tracking', 'Speech recognition', 'Leaderboards', 'AI tutor'],
    pricing: 'Freemium',
    comments: ['Made language learning fun and accessible', 'The gamification actually works', 'Not great for advanced learners'],
    reviewScore: 8.2,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Khan Academy',
    tagline: 'Free world-class education for anyone, anywhere',
    description: 'Nonprofit educational platform with free courses, practice exercises, and instructional videos across many subjects.',
    url: 'https://khanacademy.org',
    category: 'Education',
    upvotes: 2300,
    launchDate: '2008-09',
    features: ['Video lessons', 'Practice exercises', 'Progress tracking', 'Teacher dashboard', 'AI tutor (Khanmigo)'],
    pricing: 'Free',
    comments: ['Incredible resource for students', 'Khanmigo AI tutor is a game-changer', 'Math curriculum is particularly strong'],
    reviewScore: 8.8,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Coursera',
    tagline: 'Learn from the world\'s best universities and companies',
    description: 'Online learning platform offering courses, certificates, and degrees from top universities and companies worldwide.',
    url: 'https://coursera.org',
    category: 'Education',
    upvotes: 1900,
    launchDate: '2012-04',
    features: ['University courses', 'Professional certificates', 'Degrees', 'Peer grading', 'Financial aid'],
    pricing: 'Freemium',
    comments: ['Got a Google certificate that helped my career', 'Course quality varies significantly', 'Good value compared to traditional education'],
    reviewScore: 8.0,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Quizlet',
    tagline: 'AI-powered flashcards and study tools',
    description: 'Study platform with AI-powered flashcards, practice tests, and learning modes to help students master any subject.',
    url: 'https://quizlet.com',
    category: 'Education',
    upvotes: 1500,
    launchDate: '2007-01',
    features: ['AI flashcards', 'Practice tests', 'Learn mode', 'Spaced repetition', 'Study guides'],
    pricing: 'Freemium',
    comments: ['Saved me during finals', 'AI-generated flashcards are surprisingly good', 'Premium features are overpriced'],
    reviewScore: 7.5,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },

  // ── Finance ──
  {
    name: 'Stripe',
    tagline: 'Financial infrastructure for the internet',
    description: 'Payment processing platform for online businesses. Handles payments, subscriptions, billing, and financial operations.',
    url: 'https://stripe.com',
    category: 'Finance',
    upvotes: 3800,
    launchDate: '2011-06',
    features: ['Payment processing', 'Subscriptions', 'Billing', 'Connect marketplace', 'Radar fraud detection'],
    pricing: 'Paid',
    comments: ['Best developer experience in payments', 'Documentation is excellent', 'Fees add up for small businesses'],
    reviewScore: 9.0,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Mercury',
    tagline: 'Banking for startups',
    description: 'Business banking platform designed for startups with beautiful UI, no fees, and integrated financial tools.',
    url: 'https://mercury.com',
    category: 'Finance',
    upvotes: 2100,
    launchDate: '2019-04',
    features: ['Business checking', 'Savings accounts', 'Virtual cards', 'API access', 'Cash management'],
    pricing: 'Free',
    comments: ['Best banking experience for startups', 'No fees is incredible', 'The UI is beautiful'],
    reviewScore: 8.7,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Brex',
    tagline: 'Financial stack for ambitious companies',
    description: 'Corporate card and spend management platform offering credit cards, expense management, and business accounts.',
    url: 'https://brex.com',
    category: 'Finance',
    upvotes: 1800,
    launchDate: '2018-06',
    features: ['Corporate cards', 'Expense management', 'Bill pay', 'Travel booking', 'Budgeting'],
    pricing: 'Freemium',
    comments: ['Great for startup spending', 'Limits grow with your company', 'Rewards are generous'],
    reviewScore: 8.0,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Wise',
    tagline: 'The cheap, fast way to send money abroad',
    description: 'International money transfer service with real exchange rates and low, transparent fees. Formerly TransferWise.',
    url: 'https://wise.com',
    category: 'Finance',
    upvotes: 2400,
    launchDate: '2011-01',
    features: ['International transfers', 'Multi-currency accounts', 'Debit card', 'Business accounts', 'Real exchange rate'],
    pricing: 'Freemium',
    comments: ['Saved me hundreds on international transfers', 'The multi-currency account is great', 'Much cheaper than banks'],
    reviewScore: 8.6,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },

  // ── Automation ──
  {
    name: 'Zapier',
    tagline: 'Automate without coding — connect your apps',
    description: 'Workflow automation platform connecting 6,000+ apps. Build automated workflows (Zaps) without writing code.',
    url: 'https://zapier.com',
    category: 'Automation',
    upvotes: 2800,
    launchDate: '2012-01',
    features: ['6,000+ integrations', 'Multi-step Zaps', 'Filters and logic', 'Schedule triggers', 'Webhooks'],
    pricing: 'Freemium',
    comments: ['Connects everything to everything', 'Saved me hours of manual work', 'Gets expensive as you scale'],
    reviewScore: 8.2,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Make (Integromat)',
    tagline: 'Visual platform for building automation',
    description: 'Visual automation platform that lets you design, build, and automate workflows with a drag-and-drop interface.',
    url: 'https://make.com',
    category: 'Automation',
    upvotes: 1900,
    launchDate: '2016-08',
    features: ['Visual builder', '1,500+ apps', 'Data transformation', 'Error handling', 'Scenario templates'],
    pricing: 'Freemium',
    comments: ['More powerful than Zapier for complex workflows', 'Visual builder is intuitive', 'Learning curve is steeper though'],
    reviewScore: 8.0,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'n8n',
    tagline: 'Workflow automation for technical teams',
    description: 'Open-source workflow automation platform that can be self-hosted. Node-based visual editor for building integrations.',
    url: 'https://n8n.io',
    category: 'Automation',
    upvotes: 2200,
    launchDate: '2019-05',
    features: ['Self-hostable', 'Visual editor', 'Custom code nodes', '400+ integrations', 'AI nodes'],
    pricing: 'Freemium',
    comments: ['Self-hosting saves money at scale', 'More flexible than Zapier', 'Community edition has everything you need'],
    reviewScore: 8.4,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Bardeen',
    tagline: 'AI-powered workflow automation',
    description: 'Automation app that uses AI to scrape, automate, and streamline workflows directly in your browser.',
    url: 'https://bardeen.ai',
    category: 'Automation',
    upvotes: 1400,
    launchDate: '2021-09',
    features: ['AI automations', 'Web scraping', 'Meeting notes', 'Data extraction', 'Pre-built playbooks'],
    pricing: 'Freemium',
    comments: ['AI suggests automations based on my workflow', 'Scraper is really handy', 'Still early stage but promising'],
    reviewScore: 7.5,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },

  // ── Health & Fitness ──
  {
    name: 'Strava',
    tagline: 'The social network for athletes',
    description: 'Fitness tracking app for runners and cyclists with route tracking, social features, and performance analytics.',
    url: 'https://strava.com',
    category: 'Health & Fitness',
    upvotes: 2200,
    launchDate: '2009-08',
    features: ['GPS tracking', 'Route discovery', 'Segments', 'Social feed', 'Training plans'],
    pricing: 'Freemium',
    comments: ['The social aspect keeps me motivated', 'Segments are addictive', 'Premium features could be better'],
    reviewScore: 8.0,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Headspace',
    tagline: 'Meditation and mindfulness made simple',
    description: 'Guided meditation and mindfulness app with courses for sleep, focus, stress, and more.',
    url: 'https://headspace.com',
    category: 'Health & Fitness',
    upvotes: 1800,
    launchDate: '2012-02',
    features: ['Guided meditations', 'Sleep sounds', 'Focus music', 'Mindful exercises', 'Progress tracking'],
    pricing: 'Freemium',
    comments: ['Best meditation app for beginners', 'Andy\'s voice is very calming', 'Content library is extensive'],
    reviewScore: 8.3,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'MyFitnessPal',
    tagline: 'Track calories and reach your nutrition goals',
    description: 'Nutrition tracking app with a massive food database, barcode scanner, and exercise logging.',
    url: 'https://myfitnesspal.com',
    category: 'Health & Fitness',
    upvotes: 1600,
    launchDate: '2005-09',
    features: ['Calorie tracking', 'Food database', 'Barcode scanner', 'Recipe importer', 'Exercise logging'],
    pricing: 'Freemium',
    comments: ['Huge food database makes tracking easy', 'The free version is quite limited now', 'Good for building awareness of eating habits'],
    reviewScore: 7.2,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Whoop',
    tagline: 'Wearable for performance optimization',
    description: 'Fitness wearable and app that tracks recovery, strain, and sleep to optimize athletic performance.',
    url: 'https://whoop.com',
    category: 'Health & Fitness',
    upvotes: 1200,
    launchDate: '2015-11',
    features: ['Recovery score', 'Strain tracking', 'Sleep analysis', 'HRV monitoring', 'Journal'],
    pricing: 'Paid',
    comments: ['Changed how I think about recovery', 'The data is incredibly detailed', 'Subscription model is expensive'],
    reviewScore: 7.8,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },

  // ── Marketing ──
  {
    name: 'HubSpot',
    tagline: 'CRM platform for growing businesses',
    description: 'All-in-one CRM platform with marketing, sales, and service hubs. Free CRM with premium upgrades.',
    url: 'https://hubspot.com',
    category: 'Marketing',
    upvotes: 2500,
    launchDate: '2006-06',
    features: ['Free CRM', 'Email marketing', 'Landing pages', 'Social media', 'Analytics'],
    pricing: 'Freemium',
    comments: ['Free CRM is genuinely useful', 'All-in-one approach saves tool fatigue', 'Gets expensive at scale'],
    reviewScore: 8.0,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Mailchimp',
    tagline: 'Email marketing and automation platform',
    description: 'Email marketing platform with automation, audience management, and creative tools for growing businesses.',
    url: 'https://mailchimp.com',
    category: 'Marketing',
    upvotes: 2100,
    launchDate: '2001-09',
    features: ['Email campaigns', 'Automation workflows', 'Audience management', 'Creative assistant', 'A/B testing'],
    pricing: 'Freemium',
    comments: ['Industry standard for email marketing', 'Easy to get started', 'Pricing changed and is less favorable now'],
    reviewScore: 7.6,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Buffer',
    tagline: 'Social media management made easy',
    description: 'Social media management tool for scheduling posts, analyzing performance, and managing multiple accounts.',
    url: 'https://buffer.com',
    category: 'Marketing',
    upvotes: 1800,
    launchDate: '2010-11',
    features: ['Post scheduling', 'Analytics', 'Multi-platform posting', 'AI assistant', 'Engagement tools'],
    pricing: 'Freemium',
    comments: ['Clean and simple scheduling', 'The free plan is generous', 'Analytics could be more detailed'],
    reviewScore: 8.0,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Semrush',
    tagline: 'All-in-one marketing toolkit',
    description: 'SEO, content marketing, and competitor research platform with keyword tracking and site audit tools.',
    url: 'https://semrush.com',
    category: 'Marketing',
    upvotes: 1500,
    launchDate: '2008-01',
    features: ['Keyword research', 'Site audit', 'Competitor analysis', 'Content marketing', 'Rank tracking'],
    pricing: 'Paid',
    comments: ['Best SEO tool on the market', 'Data is very comprehensive', 'Pricey but worth it for agencies'],
    reviewScore: 8.5,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },

  // ── Design ──
  {
    name: 'Figma',
    tagline: 'Collaborative interface design tool',
    description: 'Cloud-based design tool for interface and prototype design. Real-time collaboration, design systems, and developer handoff.',
    url: 'https://figma.com',
    category: 'Design',
    upvotes: 4200,
    launchDate: '2016-09',
    features: ['Real-time collaboration', 'Auto layout', 'Design systems', 'Prototyping', 'Dev mode'],
    pricing: 'Freemium',
    comments: ['Revolutionized design collaboration', 'Killed the need for Sketch', 'Dev mode makes handoff seamless'],
    reviewScore: 9.2,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Canva',
    tagline: 'Design anything. Publish anywhere.',
    description: 'Graphic design platform for creating social media graphics, presentations, posters, and other visual content.',
    url: 'https://canva.com',
    category: 'Design',
    upvotes: 3600,
    launchDate: '2013-08',
    features: ['Templates library', 'Brand kit', 'AI design tools', 'Video editing', 'Magic resize'],
    pricing: 'Freemium',
    comments: ['Made design accessible to everyone', 'Templates save so much time', 'Pro features are worth it'],
    reviewScore: 8.5,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Framer',
    tagline: 'Design and publish stunning websites',
    description: 'Design tool that lets you create and publish websites without code. Combines design and development in one tool.',
    url: 'https://framer.com',
    category: 'Design',
    upvotes: 2400,
    launchDate: '2021-03',
    features: ['No-code website builder', 'CMS', 'Animations', 'Responsive design', 'AI generation'],
    pricing: 'Freemium',
    comments: ['Best no-code website builder for designers', 'Animations are smooth', 'CMS is surprisingly capable'],
    reviewScore: 8.3,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },

  // ── Communication ──
  {
    name: 'Slack',
    tagline: 'Where work happens',
    description: 'Business communication platform with channels, messaging, file sharing, and integrations. The hub for team collaboration.',
    url: 'https://slack.com',
    category: 'Communication',
    upvotes: 3800,
    launchDate: '2013-08',
    features: ['Channels', 'Direct messages', 'Integrations', 'Huddles', 'Canvas'],
    pricing: 'Freemium',
    comments: ['Essential for team communication', 'Integrations make it the hub of everything', 'Can be noisy without good channel hygiene'],
    reviewScore: 8.4,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Discord',
    tagline: 'Group chatting that connects your community',
    description: 'Communication platform for communities with voice, video, and text chat. Originally for gamers, now for everyone.',
    url: 'https://discord.com',
    category: 'Communication',
    upvotes: 3200,
    launchDate: '2015-05',
    features: ['Voice channels', 'Server management', 'Bots', 'Screen sharing', 'Threads'],
    pricing: 'Freemium',
    comments: ['Best community platform', 'Always-on voice channels are great', 'Nitro features are nice but not essential'],
    reviewScore: 8.6,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Loom',
    tagline: 'Record quick videos of your screen and cam',
    description: 'Video messaging tool for recording and sharing screen and camera recordings. Replace meetings with async video.',
    url: 'https://loom.com',
    category: 'Communication',
    upvotes: 2100,
    launchDate: '2016-11',
    features: ['Screen recording', 'AI transcription', 'Editing tools', 'Embed anywhere', 'Viewer insights'],
    pricing: 'Freemium',
    comments: ['Replaced so many meetings for me', 'AI transcription is accurate', 'Free tier is very limited now'],
    reviewScore: 8.0,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },

  // ── Security ──
  {
    name: '1Password',
    tagline: 'The password manager for the whole family',
    description: 'Password manager that secures passwords, credit cards, and sensitive data. Enterprise features for teams.',
    url: 'https://1password.com',
    category: 'Security',
    upvotes: 2600,
    launchDate: '2006-06',
    features: ['Password vault', 'Watchtower breach alerts', 'Travel mode', 'Family sharing', 'SSH key management'],
    pricing: 'Paid',
    comments: ['Best password manager I have used', 'Watchtower alerts are incredibly useful', 'The secret key adds real security'],
    reviewScore: 8.8,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Auth0',
    tagline: 'Authentication as a service',
    description: 'Identity platform for authentication and authorization. Add login, SSO, and MFA to any application.',
    url: 'https://auth0.com',
    category: 'Security',
    upvotes: 2000,
    launchDate: '2013-05',
    features: ['Social login', 'SSO', 'MFA', 'Passwordless', 'Universal login'],
    pricing: 'Freemium',
    comments: ['Saved weeks of auth development', 'Customization is great', 'Pricing for B2C is steep'],
    reviewScore: 8.2,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Cloudflare',
    tagline: 'Security, performance, and reliability for the internet',
    description: 'Web infrastructure and security company providing CDN, DDoS protection, DNS, and edge computing services.',
    url: 'https://cloudflare.com',
    category: 'Security',
    upvotes: 2400,
    launchDate: '2009-07',
    features: ['CDN', 'DDoS protection', 'WAF', 'Zero Trust', 'Workers edge computing'],
    pricing: 'Freemium',
    comments: ['Free tier is incredibly generous', 'Workers are amazing for edge computing', 'Dashboard can be complex'],
    reviewScore: 8.7,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },

  // ── No-Code ──
  {
    name: 'Bubble',
    tagline: 'Build software without code',
    description: 'Visual programming platform for building web applications without writing code. Full-stack app builder.',
    url: 'https://bubble.io',
    category: 'No-Code',
    upvotes: 2200,
    launchDate: '2015-04',
    features: ['Visual editor', 'Workflow engine', 'Database', 'Plugin marketplace', 'API connector'],
    pricing: 'Freemium',
    comments: ['Most powerful no-code platform', 'Learning curve is steep but worth it', 'Can build real SaaS products'],
    reviewScore: 8.0,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Webflow',
    tagline: 'The no-code platform for web design',
    description: 'Visual web design platform that generates clean HTML/CSS/JS. Build responsive websites without writing code.',
    url: 'https://webflow.com',
    category: 'No-Code',
    upvotes: 2800,
    launchDate: '2013-10',
    features: ['Visual CSS editor', 'CMS', 'E-commerce', 'Interactions', 'SEO tools'],
    pricing: 'Freemium',
    comments: ['Produces cleaner code than any other builder', 'Great for marketing sites', 'CMS is surprisingly capable'],
    reviewScore: 8.4,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Airtable',
    tagline: 'Build apps. Not spreadsheets.',
    description: 'Low-code platform that combines spreadsheet simplicity with database power. Build custom apps and workflows.',
    url: 'https://airtable.com',
    category: 'No-Code',
    upvotes: 2500,
    launchDate: '2015-05',
    features: ['Spreadsheet-database hybrid', 'Views', 'Automations', 'Interfaces', 'Extensions'],
    pricing: 'Freemium',
    comments: ['Like Excel on steroids', 'Interfaces feature makes it a real app builder', 'Row limits on free tier are tight'],
    reviewScore: 8.2,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
  {
    name: 'Softr',
    tagline: 'Turn Airtable into apps in minutes',
    description: 'No-code app builder that creates client portals and internal tools powered by Airtable or Google Sheets.',
    url: 'https://softr.io',
    category: 'No-Code',
    upvotes: 1500,
    launchDate: '2020-06',
    features: ['Airtable integration', 'Client portals', 'User authentication', 'Payment integration', 'Templates'],
    pricing: 'Freemium',
    comments: ['Fastest way to build on Airtable', 'Templates are well-designed', 'Limited customization for complex apps'],
    reviewScore: 7.8,
    sourceUrl: 'seed',
    dataSource: 'seed',
  },
];

// ─── Auto-Seed Logic ────────────────────────────────────────────────────

const MIN_PRODUCTS_PER_CATEGORY = 3;
const SEED_CHECK_INTERVAL_MS = 5 * 60 * 1000; // Re-check every 5 minutes

let lastSeedCheckTime = 0;

/**
 * Ensure the database has sufficient seed data for ALL categories.
 * Runs on scan requests (lightweight check, throttled to every 5 minutes).
 * Seeds products for categories that have fewer than MIN_PRODUCTS_PER_CATEGORY products.
 */
export async function ensureSeedData(): Promise<void> {
  const now = Date.now();
  if (now - lastSeedCheckTime < SEED_CHECK_INTERVAL_MS) {
    return; // Checked recently, skip
  }
  lastSeedCheckTime = now;
  try {
    // Get counts per category
    const allProducts = await db.product.findMany({
      select: { category: true, dataSource: true },
    });

    const countsByCategory: Record<string, number> = {};
    for (const p of allProducts) {
      countsByCategory[p.category] = (countsByCategory[p.category] || 0) + 1;
    }

    // Find categories that need seeding (less than MIN_PRODUCTS_PER_CATEGORY products)
    const categoriesNeedingSeed = SEED_PRODUCTS
      .map(p => p.category)
      .filter((cat, idx, arr) => arr.indexOf(cat) === idx) // unique categories
      .filter(cat => (countsByCategory[cat] || 0) < MIN_PRODUCTS_PER_CATEGORY);

    if (categoriesNeedingSeed.length === 0 && allProducts.length > 0) {
      return; // All categories have sufficient data
    }

    if (categoriesNeedingSeed.length > 0) {
      console.log(`[AutoSeed] Categories needing seed data: ${categoriesNeedingSeed.join(', ')} (current counts: ${Object.entries(countsByCategory).map(([k,v]) => `${k}=${v}`).join(', ')})`);
    }

    // If DB is completely empty or some categories need seeding
    if (allProducts.length === 0) {
      console.log(`[AutoSeed] No products found — seeding all ${SEED_PRODUCTS.length} sample products...`);
    } else {
      console.log(`[AutoSeed] Seeding products for ${categoriesNeedingSeed.length} under-represented categories...`);
    }

    const start = Date.now();
    let seededCount = 0;

    for (const product of SEED_PRODUCTS) {
      // Only seed if the category needs more products
      const currentCount = countsByCategory[product.category] || 0;
      if (currentCount >= MIN_PRODUCTS_PER_CATEGORY) continue;

      try {
        await db.product.create({
          data: {
            name: product.name,
            tagline: product.tagline,
            description: product.description,
            url: product.url,
            category: product.category,
            upvotes: product.upvotes,
            launchDate: product.launchDate,
            features: JSON.stringify(product.features),
            pricing: product.pricing,
            comments: JSON.stringify(product.comments),
            reviewScore: product.reviewScore,
            sourceUrl: product.sourceUrl,
            dataSource: product.dataSource,
          },
        });
        countsByCategory[product.category] = (countsByCategory[product.category] || 0) + 1;
        seededCount++;
      } catch (err) {
        // Skip duplicates or other insert errors
        console.warn(`[AutoSeed] Skipped "${product.name}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (seededCount > 0) {
      console.log(`[AutoSeed] Seeded ${seededCount} products in ${Date.now() - start}ms`);
    }
  } catch (err) {
    console.error(`[AutoSeed] Failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Get seed product count for a category.
 * Useful for knowing how much data is available before hitting APIs.
 */
export function getSeedProductCount(category: string): number {
  return SEED_PRODUCTS.filter(
    (p) => p.category.toLowerCase() === category.toLowerCase()
  ).length;
}
