import { NextRequest, NextResponse } from 'next/server';
import { db, checkDatabaseConnection } from '@/lib/db';
import { webSearch, readPage, generateStructuredResponse } from '@/lib/zai';
import { retryWithBackoff, withTimeout, logError, classifyError, withErrorHandler, type ModuleError } from '@/lib/error-handler';
import type { ScannedProduct } from '@/types';

const MODULE_NAME = 'Product Hunt Scanner';
const SCAN_TIMEOUT_MS = 120_000;
const LLM_TIMEOUT_MS = 90_000;
const MAX_RETRIES = 2;
const MAX_CONCURRENT_READS = 3;
const INTER_CALL_DELAY_MS = 2000; // 2s pause between LLM calls to avoid rate limits

export const POST = withErrorHandler(MODULE_NAME, '/api/scan', async (request: NextRequest) => {
  let body: Record<string, unknown> | null = null;
  try {
    body = await request.json();
    const { category, period = 'monthly' } = body;

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
            timestamp: new Date().toISOString(),
            endpoint: '/api/scan',
            requestCategory: category,
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
            possibleReason: 'The database may be temporarily unavailable or misconfigured. Check that the SQLite database file exists and is accessible.',
            retryable: true,
            timestamp: new Date().toISOString(),
            endpoint: '/api/scan',
            requestCategory: category,
          }
        },
        { status: 503 }
      );
    }
    console.log(`[${MODULE_NAME}] Database OK (${dbHealth.latencyMs}ms)`);

    // Create a scan job to track progress
    console.log(`[${MODULE_NAME}] Creating scan job...`);
    const scanJob = await db.scanJob.create({
      data: {
        status: 'running',
        category,
      },
    });
    console.log(`[${MODULE_NAME}] Scan job created: ${scanJob.id}`);

    try {
      // Wrap entire scan operation with timeout protection
      console.log(`[${MODULE_NAME}] Starting scan execution (timeout: ${SCAN_TIMEOUT_MS}ms)...`);
      const result = await withTimeout(
        () => executeScan(effectiveCategory, scanJob.id, category),
        SCAN_TIMEOUT_MS,
        MODULE_NAME
      );
      return result;
    } catch (innerError) {
      const moduleError = classifyError(innerError, MODULE_NAME, '/api/scan', {
        category: body.category,
        payload: `category=${body.category}, timePeriod=${body.timePeriod || 'N/A'}`,
        backendMessage: innerError instanceof Error ? innerError.message : String(innerError),
      });

      // Update scan job as failed
      try {
        await db.scanJob.update({
          where: { id: scanJob.id },
          data: {
            status: 'failed',
            errors: JSON.stringify([moduleError]),
          },
        });
      } catch (dbErr) {
        logError(MODULE_NAME, dbErr, { context: 'Failed to update scan job status' });
      }

      logError(MODULE_NAME, innerError, { endpoint: '/api/scan', category });

      return NextResponse.json(
        {
          error: moduleError.message,
          moduleError,
          debug: {
            receivedCategory: body?.category,
            receivedTimePeriod: body?.timePeriod,
            originalError: innerError instanceof Error ? innerError.message : String(innerError),
            errorCategory: moduleError.category,
          }
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logError(MODULE_NAME, error, { endpoint: '/api/scan' });
    const moduleError = classifyError(error, MODULE_NAME, '/api/scan', {
      category: body?.category as string | undefined,
      payload: `category=${body?.category}, timePeriod=${body?.timePeriod || 'N/A'}`,
      backendMessage: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: moduleError.message,
        moduleError,
        debug: {
          receivedCategory: body?.category,
          receivedTimePeriod: body?.timePeriod,
          originalError: error instanceof Error ? error.message : String(error),
          errorCategory: moduleError.category,
        }
      },
      { status: 500 }
    );
  }
});

async function executeScan(category: string, scanJobId: string, originalCategory: string): Promise<NextResponse> {
  // Step 1: Search for Product Hunt launches in the category (with retry)
  console.log(`[${MODULE_NAME}] Step 1: Starting parallel web searches for category: ${category}`);
  const searchQuery1 = `site:producthunt.com ${category} launched 2025`;
  const searchQuery2 = `product hunt ${category} tools 2025`;
  const searchStart = Date.now();

  console.log(`[${MODULE_NAME}] Step 1a: Searching: "${searchQuery1}"`);
  console.log(`[${MODULE_NAME}] Step 1b: Searching: "${searchQuery2}"`);

  const [searchResult1, searchResult2] = await Promise.all([
    retryWithBackoff(() => webSearch(searchQuery1, 10), { maxRetries: MAX_RETRIES }, MODULE_NAME).catch((err) => {
      logError(MODULE_NAME, err, { step: 'webSearch', query: searchQuery1 });
      return [];
    }),
    retryWithBackoff(() => webSearch(searchQuery2, 10), { maxRetries: MAX_RETRIES }, MODULE_NAME).catch((err) => {
      logError(MODULE_NAME, err, { step: 'webSearch', query: searchQuery2 });
      return [];
    }),
  ]);

  // webSearch returns an array directly
  const allResults = [
    ...(Array.isArray(searchResult1) ? searchResult1 : []),
    ...(Array.isArray(searchResult2) ? searchResult2 : []),
  ];
  console.log(`[${MODULE_NAME}] Step 1 complete: found ${allResults.length} total results in ${Date.now() - searchStart}ms`);

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const uniqueResults = allResults.filter((r: Record<string, unknown>) => {
    const url = (r.url as string) || (r.link as string) || '';
    if (!url || seenUrls.has(url)) return false;
    seenUrls.add(url);
    return true;
  });

  // Filter for Product Hunt URLs
  const phUrls = uniqueResults
    .map((r: Record<string, unknown>) => (r.url as string) || (r.link as string) || '')
    .filter((url: string) => url.includes('producthunt.com'))
    .slice(0, 3); // Limit to top 3 pages to reduce scan time

  // Step 2: Read top Product Hunt pages in parallel with concurrency limit (with retry)
  console.log(`[${MODULE_NAME}] Step 2: Reading ${phUrls.length} Product Hunt pages in parallel (max ${MAX_CONCURRENT_READS} concurrent)`);
  const pageReadStart = Date.now();
  const pageContents: { url: string; content: string }[] = [];

  async function readSinglePage(url: string): Promise<{ url: string; content: string } | null> {
    try {
      console.log(`[${MODULE_NAME}] Reading page: ${url}`);
      const pageData = await retryWithBackoff(
        () => readPage(url),
        { maxRetries: MAX_RETRIES },
        MODULE_NAME
      );
      // readPage returns { data: { title, html, ... } }
      const html = pageData?.data?.html || '';
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) {
        console.log(`[${MODULE_NAME}] Page read OK: ${url} (${text.length} chars)`);
        return { url, content: text.slice(0, 3000) };
      }
      console.warn(`[${MODULE_NAME}] Page read returned empty text: ${url}`);
      return null;
    } catch (err) {
      // Skip pages that fail to read, but log the error
      logError(MODULE_NAME, err, { step: 'readPage', url });
      return null;
    }
  }

  // Process pages with concurrency limit using a simple pool
  const pageResults: (Awaited<ReturnType<typeof readSinglePage>>)[] = [];
  for (let i = 0; i < phUrls.length; i += MAX_CONCURRENT_READS) {
    const batch = phUrls.slice(i, i + MAX_CONCURRENT_READS);
    const batchResults = await Promise.all(batch.map(readSinglePage));
    pageResults.push(...batchResults);
  }
  for (const result of pageResults) {
    if (result) {
      pageContents.push(result);
    }
  }
  console.log(`[${MODULE_NAME}] Step 2 complete: read ${pageContents.length}/${phUrls.length} pages successfully in ${Date.now() - pageReadStart}ms`);

  // If no PH pages found, use search snippets
  const rawContent =
    pageContents.length > 0
      ? pageContents
          .map((p) => `URL: ${p.url}\nContent: ${p.content}`)
          .join('\n\n---\n\n')
      : uniqueResults
          .map(
            (r: Record<string, unknown>) =>
              `Title: ${r.name || r.title || ''}\nURL: ${r.url || ''}\nSnippet: ${r.snippet || ''}`
          )
          .join('\n\n');

  if (!rawContent.trim()) {
    await db.scanJob.update({
      where: { id: scanJobId },
      data: {
        status: 'failed',
        errors: JSON.stringify(['No search results found']),
      },
    });
    return NextResponse.json(
      {
        error: 'Product Hunt search returned no results for this category. Try a different category or time period.',
        moduleError: {
          module: MODULE_NAME,
          category: 'api',
          message: 'Product Hunt fetch returned no results',
          detail: `Web search for "${category}" products on Product Hunt returned no usable content. Both search queries and page reads yielded empty results.`,
          possibleReason: 'The category may be too niche or Product Hunt may not have recent launches in this area. Try "AI Tools" or "Productivity" which have more listings.',
          retryable: true,
          timestamp: new Date().toISOString(),
          endpoint: '/api/scan',
          requestCategory: category,
        }
      },
      { status: 404 }
    );
  }

  // Delay before LLM call to avoid rate limits
  console.log(`[${MODULE_NAME}] Waiting ${INTER_CALL_DELAY_MS}ms before LLM call to avoid rate limits...`);
  await new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));

  // Step 3: Use LLM to parse raw content into structured product data (with retry + timeout)
  console.log(`[${MODULE_NAME}] Step 3: Calling LLM to extract structured data (timeout: ${LLM_TIMEOUT_MS}ms, content length: ${rawContent.length} chars)`);
  const llmStart = Date.now();
  const products = await retryWithBackoff(
    () => withTimeout(
      () => generateStructuredResponse<ScannedProduct[]>(
        `You are a Product Hunt product data extractor. Extract all products mentioned in the given content. 
For each product, provide:
- name: Product name
- tagline: Short tagline/slogan (max 100 chars)
- description: Brief description of what the product does (max 300 chars)
- url: Product website URL if available, otherwise the Product Hunt URL
- category: "${category}"
- upvotes: Number of upvotes if mentioned, otherwise estimate based on context (0-500)
- launchDate: Launch date if mentioned, otherwise "2025"
- features: Array of key feature strings (3-5 features)
- pricing: Pricing model (Free, Freemium, Paid, Unknown)
- comments: Array of comment/review summary strings (max 5)
- reviewScore: Review score 0-10 if available, otherwise estimate
- sourceUrl: The Product Hunt URL where this product was found

Only include real products that are clearly described. Do not fabricate products.
If you cannot find any products, return an empty array.`,
        `Extract ALL Product Hunt products from this content. Be thorough - identify every product mentioned, even briefly:\n\n${rawContent}`,
        `Return a JSON array of objects with fields: name, tagline, description, url, category, upvotes (number), launchDate, features (string[]), pricing, comments (string[]), reviewScore (number), sourceUrl`
      ),
      LLM_TIMEOUT_MS,
      MODULE_NAME
    ),
    { maxRetries: MAX_RETRIES },
    MODULE_NAME
  );
  console.log(`[${MODULE_NAME}] Step 3 complete: LLM returned ${Array.isArray(products) ? products.length : 0} products in ${Date.now() - llmStart}ms`);

  const safeProducts = Array.isArray(products) ? products : [];

  // If LLM extracted 0 products from non-empty content, that's an AI extraction failure
  if (safeProducts.length === 0 && rawContent.trim().length > 0) {
    console.error(`[${MODULE_NAME}] AI extraction failed: 0 products extracted from ${rawContent.length} chars of content`);
    await db.scanJob.update({
      where: { id: scanJobId },
      data: {
        status: 'failed',
        errors: JSON.stringify(['AI extraction returned 0 products despite having content']),
      },
    });
    return NextResponse.json(
      {
        error: 'AI could not extract any products from the Product Hunt pages. The content may not contain structured product data.',
        moduleError: {
          module: MODULE_NAME,
          category: 'ai_response',
          message: 'AI extraction returned 0 products',
          detail: `Successfully fetched ${pageContents.length} Product Hunt pages (${rawContent.length} chars), but the AI could not parse any products from the content. This may be due to non-standard page formatting or the LLM timing out.`,
          possibleReason: 'Product Hunt pages may have changed their HTML structure, or the AI model timed out while parsing. Retrying may help, or try a different category.',
          retryable: true,
          timestamp: new Date().toISOString(),
          endpoint: '/api/scan',
          requestCategory: category,
        }
      },
      { status: 422 }
    );
  }

  // Step 4: Save scanned products to the database
  console.log(`[${MODULE_NAME}] Step 4: Saving ${safeProducts.length} products to database`);
  const dbStart = Date.now();
  const savedProducts: ScannedProduct[] = [];
  for (const product of safeProducts) {
    try {
      // Check if product already exists (by name + category)
      const existing = await db.product.findFirst({
        where: {
          name: product.name,
          category: product.category || originalCategory,
        },
      });

      if (existing) {
        const updated = await db.product.update({
          where: { id: existing.id },
          data: {
            tagline: product.tagline || existing.tagline,
            description: product.description || existing.description,
            url: product.url || existing.url,
            upvotes: product.upvotes || existing.upvotes,
            launchDate: product.launchDate || existing.launchDate,
            features: JSON.stringify(product.features || []),
            pricing: product.pricing || existing.pricing,
            comments: JSON.stringify(product.comments || []),
            reviewScore: product.reviewScore || existing.reviewScore,
            sourceUrl: product.sourceUrl || existing.sourceUrl,
          },
        });
        savedProducts.push({
          ...product,
          id: updated.id,
        });
      } else {
        const created = await db.product.create({
          data: {
            name: product.name,
            tagline: product.tagline || '',
            description: product.description || '',
            url: product.url || '',
            category: product.category || originalCategory,
            upvotes: product.upvotes || 0,
            launchDate: product.launchDate || '2025',
            features: JSON.stringify(product.features || []),
            pricing: product.pricing || 'Unknown',
            comments: JSON.stringify(product.comments || []),
            reviewScore: product.reviewScore || 0,
            sourceUrl: product.sourceUrl || '',
          },
        });
        savedProducts.push({
          ...product,
          id: created.id,
        });
      }
    } catch (err) {
      logError(MODULE_NAME, err, { step: 'saveProduct', productName: product.name });
    }
  }

  console.log(`[${MODULE_NAME}] Step 4 complete: saved ${savedProducts.length} products in ${Date.now() - dbStart}ms`);

  // Update scan job as completed
  await db.scanJob.update({
    where: { id: scanJobId },
    data: {
      status: 'completed',
      resultCount: savedProducts.length,
    },
  });

  console.log(`[${MODULE_NAME}] Scan complete: ${savedProducts.length} products saved`);
  return NextResponse.json(savedProducts);
}
