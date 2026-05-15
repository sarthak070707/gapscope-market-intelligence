import { NextRequest, NextResponse } from 'next/server';
import { db, checkDatabaseConnection } from '@/lib/db';
import { webSearch, generateStructuredResponse } from '@/lib/zai';
import { retryWithBackoff, withTimeout, logError, classifyError, withErrorHandler, logStageError, logStageStart, logStageEnd } from '@/lib/error-handler';
import { safeJsonParse } from '@/lib/json';
import type { TrendData, CompetitorComparison, SubNiche, UnderservedUserGroup } from '@/types';

const LLM_TIMEOUT_MS = 90_000;
const WEBSEARCH_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const INTER_CALL_DELAY_MS = 2000;
const RATE_LIMIT_COOLDOWN_MS = 12_000; // 12s pause after a 429 before the next web search query
const PRE_SEARCH_DELAY_MS = 1_500; // 1.5s initial delay before first search to let rate limits cool
const MODULE_NAME = 'Trend Detection';
const CURRENT_YEAR = new Date().getFullYear();

/**
 * GET /api/trends
 * List all trends, with optional ?category=xxx filter
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    console.log(`[${MODULE_NAME}] GET request received, category: ${category || 'all'}`);

    const where: Record<string, unknown> = {};
    if (category && category !== 'all') {
      where.category = category;
    }

    const trends = await db.trend.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Parse JSON string fields for frontend consumption
    const parsed = trends.map((trend) => ({
      ...trend,
      dataPoints: safeJsonParse(trend.dataPoints, []),
      subNiches: safeJsonParse(trend.subNiches, []),
      underservedUsers: safeJsonParse(trend.underservedUsers, []),
    }));

    return NextResponse.json(parsed);
  } catch (error) {
    logStageError(MODULE_NAME, 'GET_HANDLER', error);
    logError(MODULE_NAME, error, { endpoint: '/api/trends', method: 'GET' });
    const moduleError = classifyError(error, MODULE_NAME, '/api/trends');
    return NextResponse.json(
      {
        error: moduleError.message,
        moduleError,
        debug: {
          originalError: error instanceof Error ? error.message : String(error),
          originalStack: error instanceof Error ? error.stack : undefined,
          stage: moduleError.stage,
          errorCategory: moduleError.category,
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/trends
 * Two actions:
 * - { action: 'detect', category }: Detect trending categories on Product Hunt
 * - { action: 'compare', productIds, category }: Compare specific products
 * Also supports just { category } as shorthand for detect
 */
export const POST = withErrorHandler(MODULE_NAME, '/api/trends', async (request: NextRequest) => {
  let body: Record<string, unknown> | null = null;
  try {
    body = await request.json();
    const { action, category } = body;

    console.log(`[${MODULE_NAME}] Request received:`, {
      method: request.method,
      url: request.url,
      category: body.category,
      timePeriod: body.timePeriod,
      action: body.action,
    });

    if (!category || category === 'unknown') {
      console.error(`[${MODULE_NAME}] Missing or invalid category:`, { category, body });
      return NextResponse.json(
        {
          error: 'Missing or invalid category. Please select a category or use the default "AI Tools".',
          moduleError: {
            module: MODULE_NAME,
            category: 'validation',
            message: 'Missing or invalid category',
            detail: `Received category: "${category}". A valid category is required.`,
            possibleReason: 'The category was not passed from the frontend, or was set to "unknown". Please select a specific category.',
            retryable: false,
            stage: 'TRENDS_VALIDATE',
            timestamp: new Date().toISOString(),
            endpoint: '/api/trends',
            requestCategory: String(category),
          }
        },
        { status: 400 }
      );
    }

    // Resolve 'all' to a specific default category for better search results
    const effectiveCategory = category === 'all' ? 'AI Tools' : category;
    console.log(`[${MODULE_NAME}] Using effective category: ${effectiveCategory} (original: ${category})`);

    // Pre-flight: check database connection
    console.log(`[${MODULE_NAME}] Checking database connection...`);
    const dbHealth = await checkDatabaseConnection();
    if (!dbHealth.ok) {
      console.error(`[${MODULE_NAME}] Database health check FAILED:`, dbHealth.error);
      return NextResponse.json(
        {
          error: 'Database is not available. Please try again.',
          moduleError: {
            module: MODULE_NAME,
            category: 'database',
            message: 'Database connection failed',
            detail: `Pre-flight database health check failed: ${dbHealth.error}`,
            possibleReason: 'The database may be temporarily unavailable or misconfigured.',
            retryable: true,
            stage: 'TRENDS_DB_HEALTH',
            timestamp: new Date().toISOString(),
            endpoint: '/api/trends',
            requestCategory: effectiveCategory,
          }
        },
        { status: 503 }
      );
    }
    console.log(`[${MODULE_NAME}] Database OK (${dbHealth.latencyMs}ms)`);

    // Default action is 'detect' if not specified
    const effectiveAction = action || 'detect';

    if (effectiveAction === 'detect') {
      return await handleDetectTrends(effectiveCategory, String(category));
    } else if (effectiveAction === 'compare') {
      return await handleCompareProducts(body, effectiveCategory);
    } else {
      return NextResponse.json(
        { error: `Unknown action: ${effectiveAction}. Use "detect" or "compare".` },
        { status: 400 }
      );
    }
  } catch (error) {
    logStageError(MODULE_NAME, 'POST_HANDLER', error);
    logError(MODULE_NAME, error, { endpoint: '/api/trends', method: 'POST' });
    const moduleError = classifyError(error, MODULE_NAME, '/api/trends', {
      category: body?.category ? String(body.category) : undefined,
      payload: `category=${body?.category}, action=${body?.action}, timePeriod=${body?.timePeriod || 'N/A'}`,
      backendMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: moduleError.message,
        moduleError,
        debug: {
          receivedCategory: body?.category,
          receivedAction: body?.action,
          receivedTimePeriod: body?.timePeriod,
          originalError: error instanceof Error ? error.message : String(error),
          originalStack: error instanceof Error ? error.stack : undefined,
          stage: moduleError.stage,
          errorCategory: moduleError.category,
        }
      },
      { status: 500 }
    );
  }
});

/**
 * Detect trending categories on Product Hunt using web search + LLM
 */
async function handleDetectTrends(effectiveCategory: string, originalCategory: string) {
  console.log(`[${MODULE_NAME}] handleDetectTrends: starting for "${effectiveCategory}"...`);
  
  // Search for trending products and categories on Product Hunt (sequential fallback)
  // Use 4 strategic queries instead of 10 to reduce rate limit risk
  const searchQueries = [
    `Product Hunt ${effectiveCategory} trending products this month`,
    `site:producthunt.com ${effectiveCategory} ${CURRENT_YEAR}`,
    `latest ${effectiveCategory} Product Hunt launches`,
    `${effectiveCategory} market trends growth ${CURRENT_YEAR}`,
  ];

  console.log(`[${MODULE_NAME}] [SEARCH QUERIES] Final query list before execution:`, JSON.stringify(searchQueries));
  console.log(`[${MODULE_NAME}] Starting sequential search with ${searchQueries.length} queries...`);

  // Pre-search delay: wait a bit to let any previous rate limits cool down
  console.log(`[${MODULE_NAME}] Pre-search cooldown: waiting ${PRE_SEARCH_DELAY_MS}ms before first query...`);
  await new Promise((r) => setTimeout(r, PRE_SEARCH_DELAY_MS));

  let allResults: Record<string, unknown>[] = [];
  const seenUrls = new Set<string>();

  // Track rate limit failures to distinguish from "no results"
  let rateLimitFailures = 0;
  let totalSearchAttempts = 0;
  let lastRateLimitMessage = '';

  logStageStart(MODULE_NAME, 'WEB_SEARCH', `Searching with ${searchQueries.length} queries`);

  for (let i = 0; i < searchQueries.length; i++) {
    const query = searchQueries[i];
    console.log(`[${MODULE_NAME}] Search attempt ${i + 1}/${searchQueries.length}: "${query}"`);
    totalSearchAttempts++;

    try {
      // Don't use retryWithBackoff on 429s — rate limits need cooldown time, not retries.
      const results = await retryWithBackoff(
        () => withTimeout(() => webSearch(query, 10), WEBSEARCH_TIMEOUT_MS, MODULE_NAME),
        {
          maxRetries: 0, // Don't retry 429s — they need cooldown time, not immediate retries
          shouldRetry: (err) => {
            const msg = err instanceof Error ? err.message : String(err);
            return !msg.includes('429') && !msg.toLowerCase().includes('rate limit');
          },
        },
        MODULE_NAME
      ).catch((err) => {
        // Track rate limit failures specifically
        const errMsg = err instanceof Error ? err.message : String(err);
        if (errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('too many')) {
          rateLimitFailures++;
          lastRateLimitMessage = errMsg;
          console.warn(`[${MODULE_NAME}] Rate limit hit on query "${query}" (attempt ${i + 1}): ${errMsg}`);
        } else {
          logError(MODULE_NAME, err, { step: 'webSearch', query, attempt: i + 1 });
        }
        return [];
      });

      if (!results || !Array.isArray(results)) {
        console.warn(`[${MODULE_NAME}] webSearch returned non-array for query "${query}": ${typeof results}`);
        // After a 429, wait much longer before the next query to let rate limits reset
        if (rateLimitFailures > 0 && i < searchQueries.length - 1) {
          console.log(`[${MODULE_NAME}] Rate limited — waiting ${RATE_LIMIT_COOLDOWN_MS / 1000}s before next query to let limits reset...`);
          await new Promise((r) => setTimeout(r, RATE_LIMIT_COOLDOWN_MS));
        } else if (i < searchQueries.length - 1) {
          await new Promise((r) => setTimeout(r, 3000));
        }
        continue;
      }

      const searchResults = Array.isArray(results) ? results : [];

      for (const r of searchResults) {
        const url = (r.url as string) || (r.link as string) || '';
        if (url && !seenUrls.has(url)) {
          seenUrls.add(url);
          allResults.push(r);
        }
      }

      console.log(`[${MODULE_NAME}] Found ${allResults.length} results so far`);

      if (allResults.length > 0) {
        console.log(`[${MODULE_NAME}] Got search results on attempt ${i + 1}, stopping search`);
        break;
      }

      // Normal inter-query delay when we got no results (but no rate limit hit)
      if (i < searchQueries.length - 1) {
        console.log(`[${MODULE_NAME}] No results yet — waiting 4s before next query...`);
        await new Promise((r) => setTimeout(r, 4000));
      }
    } catch (err) {
      logStageError(MODULE_NAME, 'WEB_SEARCH', err, { query, attempt: i + 1 });
    }
  }
  logStageEnd(MODULE_NAME, 'WEB_SEARCH', `Found ${allResults.length} results`, { rateLimitFailures });
  console.log(`[${MODULE_NAME}] Web search returned ${allResults.length} results. Rate limit failures: ${rateLimitFailures}/${totalSearchAttempts}`);

  const searchContext = allResults
    .map(
      (r: Record<string, unknown>) =>
        `Title: ${r.name || r.title || ''}\nSnippet: ${r.snippet || ''}\nURL: ${r.url || ''}`
    )
    .join('\n\n');

  if (!searchContext.trim()) {
    // Distinguish between rate-limited and genuinely empty results
    if (rateLimitFailures > 0 && rateLimitFailures >= totalSearchAttempts - 1) {
      return NextResponse.json(
        {
          error: `All ${totalSearchAttempts} web search queries were rate limited (429). Last error: ${lastRateLimitMessage}. Wait 60 seconds before retrying.`,
          moduleError: {
            module: MODULE_NAME,
            category: 'rate_limit',
            message: 'Web search rate limited during trend detection',
            detail: `All ${totalSearchAttempts} search queries were rate limited (429) when searching for "${effectiveCategory}" trends. Last error: ${lastRateLimitMessage}`,
            possibleReason: 'Too many search requests were sent in a short period. Wait 60 seconds before retrying.',
            retryable: true,
            stage: 'TRENDS_WEB_SEARCH',
            timestamp: new Date().toISOString(),
            endpoint: '/api/trends',
            requestCategory: effectiveCategory,
          }
        },
        { status: 429 }
      );
    }
    return NextResponse.json(
      {
        error: 'No search results found for trend detection. Try a different category.',
        moduleError: {
          module: MODULE_NAME,
          category: 'api',
          message: 'Web search returned no results for trend detection',
          detail: `Tried ${searchQueries.length} different search queries for "${effectiveCategory}" trends on Product Hunt but got no usable results.`,
          possibleReason: 'The category may be too niche for Product Hunt trend detection, or the web search API is temporarily unavailable. Try "AI Tools" or "Productivity" which have more activity.',
          retryable: true,
          stage: 'TRENDS_WEB_SEARCH',
          timestamp: new Date().toISOString(),
          endpoint: '/api/trends',
          requestCategory: effectiveCategory,
        }
      },
      { status: 404 }
    );
  }

  // Delay before LLM call to avoid rate limits
  console.log(`[${MODULE_NAME}] Waiting ${INTER_CALL_DELAY_MS}ms before LLM call...`);
  await new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));

  // Also fetch existing product data from DB for context
  const existingProducts = await db.product.findMany({
    where: originalCategory === 'all' ? {} : { category: originalCategory },
    take: 20,
  });

  const productContext = existingProducts
    .map((p) => `${p.name} (${p.pricing}, ${p.upvotes} upvotes, launched ${p.launchDate})`)
    .join('\n');

  // Use LLM to detect trends from search results (with timeout + retry)
  logStageStart(MODULE_NAME, 'LLM_TRENDS', `Calling LLM for trend detection`);
  console.log(`[${MODULE_NAME}] Calling LLM for trend detection (${searchContext.length} chars search, ${existingProducts.length} products)...`);
  const trends = await retryWithBackoff(
    () => withTimeout(
      () => generateStructuredResponse<TrendData[]>(
        `You are a market trend analyst specializing in Product Hunt and tech product trends. 
Analyze the search results and existing product data to identify trending patterns.

For each trend, provide:
- category: "${effectiveCategory}"
- name: A concise name for the trend
- description: Description of the trend and what's driving it
- growthRate: Estimated growth rate as a percentage
- direction: "growing", "declining", or "stable"
- dataPoints: Array of { label: string, value: number } representing trend data points over time (3-6 points)
- period: Time period this trend covers

SUB-NICHE DETECTION (be SPECIFIC, not broad):
- subNiches: Array of 2-3 sub-niches with:
  - name: Specific sub-niche name
  - description: What this sub-niche encompasses
  - parentCategory: Broader category
  - opportunityScore: 0-100 score

UNDERSERVED USERS:
- underservedUsers: Array of 1-2 underserved user groups with:
  - userGroup: Name
  - description: Why they're underserved
  - evidence: Specific evidence from the data
  - opportunityScore: 0-100 score

Identify 2-5 significant trends.`,
        `Search results:\n${searchContext}\n\nExisting products in DB:\n${productContext || 'None'}`,
        `Return a JSON array of objects with fields: category (string), name (string), description (string), growthRate (number), direction (string: "growing"|"declining"|"stable"), dataPoints (array of {label: string, value: number}), period (string), subNiches (array of {name: string, description: string, parentCategory: string, opportunityScore: number}), underservedUsers (array of {userGroup: string, description: string, evidence: string, opportunityScore: number})`
      ),
      LLM_TIMEOUT_MS,
      MODULE_NAME
    ),
    { maxRetries: MAX_RETRIES },
    MODULE_NAME
  );

  // Normalize: LLM sometimes returns a single object instead of an array
  let safeTrends: TrendData[];
  if (Array.isArray(trends)) {
    safeTrends = trends;
  } else if (trends && typeof trends === 'object') {
    console.warn(`[${MODULE_NAME}] LLM returned a single trend object instead of array — wrapping in array`);
    safeTrends = [trends as unknown as TrendData];
  } else {
    console.error(`[${MODULE_NAME}] LLM returned unexpected type for trends: ${typeof trends}`);
    safeTrends = [];
  }
  logStageEnd(MODULE_NAME, 'LLM_TRENDS', `LLM returned ${safeTrends.length} trends`);
  console.log(`[${MODULE_NAME}] LLM returned ${safeTrends.length} trends`);

  // If LLM returned 0 trends from valid search results, that's an AI extraction failure
  if (safeTrends.length === 0 && searchContext.trim().length > 0) {
    console.error(`[${MODULE_NAME}] AI extraction failed: 0 trends from valid search context`);
    return NextResponse.json(
      {
        error: 'AI could not extract trends from the search results. The model may have timed out.',
        moduleError: {
          module: MODULE_NAME,
          category: 'ai_response',
          message: 'AI returned 0 trends from valid search data',
          detail: `Web search found results for "${effectiveCategory}" but the AI model could not identify any trends from them. Search context was ${searchContext.length} chars. This typically happens when the model times out or returns a truncated response.`,
          possibleReason: 'The AI model may have timed out. Retrying often succeeds. You can also try a different category.',
          retryable: true,
          stage: 'TRENDS_LLM_PARSE',
          timestamp: new Date().toISOString(),
          endpoint: '/api/trends',
          requestCategory: effectiveCategory,
        }
      },
      { status: 422 }
    );
  }

  // Save detected trends to the database
  logStageStart(MODULE_NAME, 'SAVE_TRENDS', `Saving ${safeTrends.length} trends to database`);
  console.log(`[${MODULE_NAME}] Saving ${safeTrends.length} trends to database...`);
  const savedTrends: TrendData[] = [];
  for (const trend of safeTrends) {
    try {
      const created = await db.trend.create({
        data: {
          category: trend.category || effectiveCategory,
          name: trend.name || 'Unnamed Trend',
          description: trend.description || '',
          growthRate: trend.growthRate || 0,
          direction: trend.direction || 'stable',
          dataPoints: JSON.stringify(trend.dataPoints || []),
          period: trend.period || '',
          subNiches: JSON.stringify(trend.subNiches || []),
          underservedUsers: JSON.stringify(trend.underservedUsers || []),
        },
      });
      savedTrends.push({
        ...trend,
        id: created.id,
      });
    } catch (err) {
      logStageError(MODULE_NAME, 'SAVE_TREND', err, { trendName: trend.name });
      logError(MODULE_NAME, err, { step: 'saveTrend', trendName: trend.name });
    }
  }

  logStageEnd(MODULE_NAME, 'SAVE_TRENDS', `Saved ${savedTrends.length} trends`);
  console.log(`[${MODULE_NAME}] Trend detection complete: ${savedTrends.length} trends saved`);
  return NextResponse.json(savedTrends);
}

/**
 * Compare specific products from the database using LLM
 */
async function handleCompareProducts(body: Record<string, unknown>, effectiveCategory: string) {
  const productIds = body.productIds as string[] | undefined;
  const originalCategory = String(body.category || 'all');

  console.log(`[${MODULE_NAME}] handleCompareProducts: starting for "${effectiveCategory}"...`);

  let products;
  try {
    if (productIds && Array.isArray(productIds) && productIds.length >= 2) {
      const areIds = productIds.every((id) => id.length > 10);
      if (areIds) {
        products = await db.product.findMany({
          where: { id: { in: productIds } },
          include: { gaps: true, complaints: true },
        });
      } else {
        products = await db.product.findMany({
          where: { name: { in: productIds } },
          include: { gaps: true, complaints: true },
        });
      }
    } else {
      products = await db.product.findMany({
        where: originalCategory === 'all' ? {} : { category: originalCategory },
        take: 5,
        include: { gaps: true, complaints: true },
      });
    }
  } catch (error) {
    logStageError(MODULE_NAME, 'COMPARE_PRODUCTS', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes('[TRENDS_')) {
      throw error;
    }
    throw new Error(`[TRENDS_COMPARE_PRODUCTS] ${errMsg}`);
  }

  if (products.length < 2) {
    return NextResponse.json(
      {
        error: 'Could not find enough products for comparison. Run a scan first.',
        moduleError: {
          module: MODULE_NAME,
          category: 'database',
          message: 'Not enough products in database for comparison',
          detail: `Found ${products.length} products for comparison (need at least 2). Searched with category="${originalCategory}". The comparison feature requires at least 2 scanned products.`,
          possibleReason: 'You need to run the Product Hunt Scanner first to populate the database with products before you can compare them.',
          retryable: false,
          stage: 'TRENDS_DB_COMPARE',
          timestamp: new Date().toISOString(),
          endpoint: '/api/trends',
          requestCategory: effectiveCategory,
        }
      },
      { status: 404 }
    );
  }

  const comparisonContext = products
    .map((p) => {
      const features = safeJsonParse(p.features, []);
      const complaints = p.complaints.map((c) => c.text).slice(0, 5);
      return `
Product: ${p.name}
Tagline: ${p.tagline}
Description: ${p.description}
Pricing: ${p.pricing}
Upvotes: ${p.upvotes}
Review Score: ${p.reviewScore}
Features: ${JSON.stringify(features)}
Known Complaints: ${complaints.join('; ') || 'None'}
Gaps: ${p.gaps.map((g) => `${g.gapType}: ${g.title}`).join('; ') || 'None'}`;
    })
    .join('\n\n---\n\n');

  // Use LLM to compare products (with timeout + retry)
  console.log(`[${MODULE_NAME}] Calling LLM for product comparison (${products.length} products)...`);
  const comparison = await retryWithBackoff(
    () => withTimeout(
      () => generateStructuredResponse<CompetitorComparison>(
        `You are a competitive product analyst. Compare the following products in the "${effectiveCategory}" category.
For each product, identify:
- Key pricing information
- Core features list (3-5 features)
- Review assessment (score 0-10)
- Strengths (competitive advantages, 2-3 items)
- Weaknesses (areas where it falls short, 2-3 items)

Also identify UNDERSERVED USER GROUPS:
- underservedUsers: Array of 2-3 user groups that these products collectively fail to serve well

Then provide an overall comparison summary.
Be specific and evidence-based in your analysis.`,
        `Compare these products:\n\n${comparisonContext}`,
        `Return a JSON object with:
- products: array of { name (string), pricing (string), features (string[]), reviewScore (number), strengths (string[]), weaknesses (string[]) }
- underservedUsers: array of { userGroup (string), description (string), evidence (string), opportunityScore (number) }
- summary (string: overall comparison summary)`
      ),
      LLM_TIMEOUT_MS,
      MODULE_NAME
    ),
    { maxRetries: MAX_RETRIES },
    MODULE_NAME
  );

  // Validate comparison response shape
  if (!comparison || typeof comparison !== 'object') {
    console.error(`[${MODULE_NAME}] LLM returned invalid comparison: ${typeof comparison}`);
    return NextResponse.json(
      {
        error: 'AI returned an invalid comparison result. The model may have timed out.',
        moduleError: {
          module: MODULE_NAME,
          category: 'ai_response',
          message: 'AI returned non-object for product comparison',
          detail: `LLM returned ${typeof comparison} instead of a comparison object. This usually means the model timed out or returned a truncated response.`,
          possibleReason: 'The AI model may have timed out. Try again.',
          retryable: true,
          stage: 'TRENDS_COMPARE_LLM',
          timestamp: new Date().toISOString(),
          endpoint: '/api/trends',
          requestCategory: effectiveCategory,
        }
      },
      { status: 422 }
    );
  }
  // Ensure products array exists in comparison
  if (comparison && typeof comparison === 'object' && !Array.isArray((comparison as Record<string, unknown>).products)) {
    console.warn(`[${MODULE_NAME}] Comparison missing products array — normalizing`);
    (comparison as Record<string, unknown>).products = [];
  }

  console.log(`[${MODULE_NAME}] Product comparison complete`);
  return NextResponse.json(comparison);
}
