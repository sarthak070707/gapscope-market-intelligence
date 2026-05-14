import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { webSearch, readPage, generateStructuredResponse } from '@/lib/zai';
import { retryWithBackoff, withTimeout, logError, classifyError, TimeoutError, type ModuleError } from '@/lib/error-handler';
import type { ScannedProduct } from '@/types';

const SCAN_TIMEOUT_MS = 120_000;
const LLM_TIMEOUT_MS = 60_000;
const MAX_RETRIES = 2;
const MAX_CONCURRENT_READS = 3;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, period = 'monthly' } = body;

    if (!category) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    // Create a scan job to track progress
    const scanJob = await db.scanJob.create({
      data: {
        status: 'running',
        category,
      },
    });

    try {
      // Wrap entire scan operation with timeout protection
      const result = await withTimeout(
        () => executeScan(category, scanJob.id),
        SCAN_TIMEOUT_MS,
        'Product Hunt Scanner'
      );
      return result;
    } catch (innerError) {
      const moduleError = classifyError(innerError, 'Product Hunt Scanner', '/api/scan');

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
        logError('Product Hunt Scanner', dbErr, { context: 'Failed to update scan job status' });
      }

      logError('Product Hunt Scanner', innerError, { endpoint: '/api/scan', category });

      return NextResponse.json(
        {
          error: moduleError.message,
          moduleError,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logError('Product Hunt Scanner', error, { endpoint: '/api/scan' });
    const moduleError = classifyError(error, 'Product Hunt Scanner', '/api/scan');
    return NextResponse.json(
      {
        error: moduleError.message,
        moduleError,
      },
      { status: 500 }
    );
  }
}

async function executeScan(category: string, scanJobId: string): Promise<NextResponse> {
  // Step 1: Search for Product Hunt launches in the category (with retry)
  console.log(`[Scan] Step 1: Starting parallel web searches for category: ${category}`);
  const searchQuery1 = `site:producthunt.com ${category} launched 2025`;
  const searchQuery2 = `product hunt ${category} tools 2025`;
  const searchStart = Date.now();

  const [searchResult1, searchResult2] = await Promise.all([
    retryWithBackoff(() => webSearch(searchQuery1, 10), { maxRetries: MAX_RETRIES }, 'Product Hunt Scanner').catch((err) => {
      logError('Product Hunt Scanner', err, { step: 'webSearch', query: searchQuery1 });
      return [];
    }),
    retryWithBackoff(() => webSearch(searchQuery2, 10), { maxRetries: MAX_RETRIES }, 'Product Hunt Scanner').catch((err) => {
      logError('Product Hunt Scanner', err, { step: 'webSearch', query: searchQuery2 });
      return [];
    }),
  ]);

  // webSearch returns an array directly
  const allResults = [
    ...(Array.isArray(searchResult1) ? searchResult1 : []),
    ...(Array.isArray(searchResult2) ? searchResult2 : []),
  ];
  console.log(`[Scan] Step 1 complete: found ${allResults.length} total results in ${Date.now() - searchStart}ms`);

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
  console.log(`[Scan] Step 2: Reading ${phUrls.length} Product Hunt pages in parallel (max ${MAX_CONCURRENT_READS} concurrent)`);
  const pageReadStart = Date.now();
  const pageContents: { url: string; content: string }[] = [];

  async function readSinglePage(url: string): Promise<{ url: string; content: string } | null> {
    try {
      const pageData = await retryWithBackoff(
        () => readPage(url),
        { maxRetries: MAX_RETRIES },
        'Product Hunt Scanner'
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
        return { url, content: text.slice(0, 5000) };
      }
      return null;
    } catch (err) {
      // Skip pages that fail to read, but log the error
      logError('Product Hunt Scanner', err, { step: 'readPage', url });
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
  console.log(`[Scan] Step 2 complete: read ${pageContents.length}/${phUrls.length} pages successfully in ${Date.now() - pageReadStart}ms`);

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
        status: 'completed',
        resultCount: 0,
        errors: JSON.stringify(['No search results found']),
      },
    });
    return NextResponse.json([]);
  }

  // Step 3: Use LLM to parse raw content into structured product data (with retry + timeout)
  console.log(`[Scan] Step 3: Calling LLM to extract structured data (timeout: ${LLM_TIMEOUT_MS}ms, content length: ${rawContent.length} chars)`);
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
        `Extract Product Hunt products from this content:\n\n${rawContent}`,
        `Return a JSON array of objects with fields: name, tagline, description, url, category, upvotes (number), launchDate, features (string[]), pricing, comments (string[]), reviewScore (number), sourceUrl`
      ),
      LLM_TIMEOUT_MS,
      'Product Hunt Scanner'
    ),
    { maxRetries: MAX_RETRIES },
    'Product Hunt Scanner'
  );
  console.log(`[Scan] Step 3 complete: LLM returned ${Array.isArray(products) ? products.length : 0} products in ${Date.now() - llmStart}ms`);

  const safeProducts = Array.isArray(products) ? products : [];

  // Step 4: Save scanned products to the database
  console.log(`[Scan] Step 4: Saving ${safeProducts.length} products to database`);
  const dbStart = Date.now();
  const savedProducts: ScannedProduct[] = [];
  for (const product of safeProducts) {
    try {
      // Check if product already exists (by name + category)
      const existing = await db.product.findFirst({
        where: {
          name: product.name,
          category: product.category || category,
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
            category: product.category || category,
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
      logError('Product Hunt Scanner', err, { step: 'saveProduct', productName: product.name });
    }
  }

  console.log(`[Scan] Step 4 complete: saved ${savedProducts.length} products in ${Date.now() - dbStart}ms`);

  // Update scan job as completed
  await db.scanJob.update({
    where: { id: scanJobId },
    data: {
      status: 'completed',
      resultCount: savedProducts.length,
    },
  });

  return NextResponse.json(savedProducts);
}
