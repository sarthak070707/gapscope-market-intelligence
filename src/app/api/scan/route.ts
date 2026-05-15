import { NextRequest, NextResponse } from 'next/server';
import { db, checkDatabaseConnection } from '@/lib/db';
import { webSearch, readPage, generateStructuredResponse } from '@/lib/zai';
import { retryWithBackoff, withTimeout, logError, classifyError, withErrorHandler, logStageError, logStageStart, logStageEnd, createErrorResponse, type ModuleError } from '@/lib/error-handler';
import { getCachedSearchResults, setCachedSearchResults, hasCachedResultsForCategory } from '@/lib/search-cache';
import { ensureSeedData } from '@/lib/auto-seed';
import type { ScannedProduct } from '@/types';

const MODULE_NAME = 'Product Hunt Scanner';
const SCAN_TIMEOUT_MS = 180_000; // 3 minutes — generous for the full pipeline
const LLM_TIMEOUT_MS = 90_000;
const MAX_RETRIES = 2;
const MAX_CONCURRENT_READS = 3;
const INTER_CALL_DELAY_MS = 2000; // 2s pause between LLM calls to avoid rate limits
const CURRENT_YEAR = new Date().getFullYear();

// ─── Rate-Limit Lockout System ────────────────────────────────────
// When a 429 is received, we enter a cooldown period during which:
// - All scan requests are rejected with 429 + retryAfterSeconds
// - The frontend disables Retry and shows a countdown timer
// - Repeated 429s escalate the cooldown from 120s → 300s
// HOWEVER: If the DB has enough products, scans are still allowed
// during cooldown (Layer 1 will return DB results immediately).

const COOLDOWN_INITIAL_MS = 120_000;  // 120 seconds initial cooldown
const COOLDOWN_ESCALATED_MS = 300_000; // 300 seconds (5 min) after repeated 429

interface CooldownEntry {
  cooldownUntil: number;   // Timestamp (ms) when cooldown expires
  durationMs: number;      // How long the cooldown lasts
  stage: string;           // The stage where the 429 occurred
  endpoint: string;        // The endpoint that was rate-limited
  category: string;        // The category that triggered the rate limit
  period: string;          // The period that triggered the rate limit
  providerMessage: string; // The original message from the rate-limited provider
  escalationCount: number; // How many times this key has been rate-limited
}

// Key: `${category}:${period}:${endpoint}`
const cooldownStore = new Map<string, CooldownEntry>();

/**
 * Build a cooldown key from category, period, and endpoint.
 * This ensures cooldowns are scoped to specific scan configurations.
 */
function cooldownKey(category: string, period: string): string {
  return `${category}:${period}:/api/scan`;
}

/**
 * Check if a cooldown is active for the given key.
 * Returns the CooldownEntry if active, null otherwise.
 * Also cleans up expired entries.
 */
function getActiveCooldown(category: string, period: string): CooldownEntry | null {
  const key = cooldownKey(category, period);
  const entry = cooldownStore.get(key);
  if (!entry) return null;

  // Check if cooldown has expired
  if (Date.now() >= entry.cooldownUntil) {
    cooldownStore.delete(key);
    return null;
  }

  return entry;
}

/**
 * Enter a cooldown for the given key.
 * If a cooldown already exists, escalate the duration.
 */
function enterCooldown(
  category: string,
  period: string,
  stage: string,
  providerMessage: string,
): CooldownEntry {
  const key = cooldownKey(category, period);
  const existing = cooldownStore.get(key);
  const escalationCount = (existing?.escalationCount || 0) + 1;

  // Escalate: 2nd+ 429 → 300s, 1st → 120s
  const durationMs = escalationCount > 1 ? COOLDOWN_ESCALATED_MS : COOLDOWN_INITIAL_MS;
  const cooldownUntil = Date.now() + durationMs;

  const entry: CooldownEntry = {
    cooldownUntil,
    durationMs,
    stage,
    endpoint: '/api/scan',
    category,
    period,
    providerMessage,
    escalationCount,
  };

  cooldownStore.set(key, entry);
  console.warn(`[${MODULE_NAME}] RATE LIMIT COOLDOWN entered for "${key}": ${durationMs / 1000}s (escalation #${escalationCount}). Cooldown until: ${new Date(cooldownUntil).toISOString()}`);

  return entry;
}

// ─── In-memory job tracking for background processing ──────────────
// This prevents the gateway from timing out — POST returns immediately
// with a jobId, and the frontend polls GET for results.

interface ActiveScan {
  jobId: string;
  category: string;
  originalCategory: string;
  status: 'running' | 'completed' | 'failed';
  stage: string;
  products: ScannedProduct[];
  error: ModuleError | null;
  startedAt: number;
}

const activeScans = new Map<string, ActiveScan>();

// ─── Shared Helper: Convert DB Product to ScannedProduct ───────────

function dbProductToScannedProduct(p: {
  id: string; name: string; tagline: string; description: string;
  url: string; category: string; upvotes: number; launchDate: string;
  features: string; pricing: string; comments: string;
  reviewScore: number; sourceUrl: string; dataSource?: string;
}): ScannedProduct {
  return {
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    url: p.url,
    category: p.category,
    upvotes: p.upvotes,
    launchDate: p.launchDate,
    features: JSON.parse(p.features || '[]'),
    pricing: p.pricing,
    comments: JSON.parse(p.comments || '[]'),
    reviewScore: p.reviewScore,
    sourceUrl: p.sourceUrl,
    dataSource: (p.dataSource as ScannedProduct['dataSource']) || 'database',
  };
}

// ─── Shared Helper: Save products to database ──────────────────────

async function saveProducts(
  products: ScannedProduct[],
  originalCategory: string,
): Promise<{ savedProducts: ScannedProduct[]; savedProductIds: string[] }> {
  const savedProducts: ScannedProduct[] = [];
  const savedProductIds: string[] = [];

  for (const product of products) {
    try {
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
            dataSource: product.dataSource || existing.dataSource,
          },
        });
        savedProducts.push({ ...product, id: updated.id });
        savedProductIds.push(updated.id);
      } else {
        const created = await db.product.create({
          data: {
            name: product.name,
            tagline: product.tagline || '',
            description: product.description || '',
            url: product.url || '',
            category: product.category || originalCategory,
            upvotes: product.upvotes || 0,
            launchDate: product.launchDate || String(CURRENT_YEAR),
            features: JSON.stringify(product.features || []),
            pricing: product.pricing || 'Unknown',
            comments: JSON.stringify(product.comments || []),
            reviewScore: product.reviewScore || 0,
            sourceUrl: product.sourceUrl || '',
            dataSource: product.dataSource || 'web_search',
          },
        });
        savedProducts.push({ ...product, id: created.id });
        savedProductIds.push(created.id);
      }
    } catch (err) {
      logStageError(MODULE_NAME, 'SAVE_PRODUCT', err, { productName: product.name });
    }
  }

  return { savedProducts, savedProductIds };
}

/**
 * GET /api/scan?jobId=xxx
 * Poll for scan job status and results.
 * Also supports ?category=xxx to load existing products from the database.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const category = searchParams.get('category');

    // ─── Category mode: load existing products from DB ───
    if (category && !jobId) {
      const effectiveCategory = category === 'all' ? 'AI Tools' : category;
      const products = await db.product.findMany({
        where: {
          category: {
            contains: effectiveCategory,
          },
        },
        orderBy: { upvotes: 'desc' },
        take: 30,
      });

      return NextResponse.json({
        products: products.map(dbProductToScannedProduct),
        source: 'database',
        count: products.length,
      });
    }

    if (!jobId) {
      // No jobId and no category — return list of recent scan jobs
      const recentJobs = await db.scanJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      return NextResponse.json(recentJobs);
    }

    // Check in-memory active scans first (for running jobs)
    const activeScan = activeScans.get(jobId);
    if (activeScan) {
      const response: Record<string, unknown> = {
        jobId: activeScan.jobId,
        status: activeScan.status,
        stage: activeScan.stage,
        category: activeScan.category,
        elapsed: Date.now() - activeScan.startedAt,
      };

      if (activeScan.status === 'completed') {
        response.products = activeScan.products;
        response.resultCount = activeScan.products.length;
        // Clean up completed scan from memory after a delay
        activeScans.delete(jobId);
      } else if (activeScan.status === 'failed') {
        response.error = activeScan.error;
        // Clean up failed scan from memory
        activeScans.delete(jobId);
      }

      return NextResponse.json(response);
    }

    // Check database for completed/failed jobs
    const job = await db.scanJob.findUnique({ where: { id: jobId } });
    if (!job) {
      return NextResponse.json(
        { error: 'Scan job not found', jobId },
        { status: 404 }
      );
    }

    // If job is completed, fetch the saved products
    if (job.status === 'completed') {
      const productIds: string[] = JSON.parse(job.productIds || '[]');
      let products: ScannedProduct[] = [];

      if (productIds.length > 0) {
        const dbProducts = await db.product.findMany({
          where: { id: { in: productIds } },
        });
        products = dbProducts.map(dbProductToScannedProduct);
      }

      return NextResponse.json({
        jobId: job.id,
        status: 'completed',
        stage: 'COMPLETED',
        category: job.category,
        resultCount: job.resultCount,
        products,
      });
    }

    // Job exists but not in memory and not completed — might have been lost
    if (job.status === 'running') {
      await db.scanJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errors: JSON.stringify([{ message: 'Scan was interrupted (server may have restarted). Please retry.' }]),
        },
      });

      return NextResponse.json({
        jobId: job.id,
        status: 'failed',
        stage: 'INTERRUPTED',
        category: job.category,
        error: {
          module: MODULE_NAME,
          category: 'api',
          message: '[SCAN_INTERRUPTED] Scan was interrupted. The server may have restarted while the scan was running.',
          detail: 'The scan job was running but is no longer being tracked. This usually means the server restarted.',
          possibleReason: 'Server restart interrupted the scan. Please retry — the second attempt is often faster because data is cached.',
          retryable: true,
          stage: 'SCAN_INTERRUPTED',
        },
      });
    }

    // Failed job
    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      stage: 'FAILED',
      category: job.category,
      error: JSON.parse(job.errors || '[]')[0] || { message: 'Scan failed with unknown error' },
    });
  } catch (error) {
    logStageError(MODULE_NAME, 'GET_HANDLER', error);
    const moduleError = classifyError(error, MODULE_NAME, '/api/scan');
    return NextResponse.json(
      { error: moduleError.message, moduleError, debug: { originalError: error instanceof Error ? error.message : String(error), stage: moduleError.stage } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scan
 * Starts a new Product Hunt scan as a background job.
 * Returns immediately with { jobId, status: 'running' } — no more 502 timeouts!
 * The frontend polls GET /api/scan?jobId=xxx for results.
 */
export const POST = withErrorHandler(MODULE_NAME, '/api/scan', async (request: NextRequest) => {
  let body: Record<string, unknown> | null = null;
  try {
    body = await request.json();
    const { category, period = 'monthly', forceRefresh = false } = body;

    console.log(`[${MODULE_NAME}] POST request received:`, {
      method: request.method,
      url: request.url,
      category: body.category,
      timePeriod: body.timePeriod,
      action: body.action,
      forceRefresh: body.forceRefresh,
    });

    if (!category || category === 'unknown') {
      console.error(`[${MODULE_NAME}] Missing or invalid category:`, { category, body });
      throw new Error(`[SCAN_HANDLER] Missing or invalid category: "${category}". A valid category is required. The category was not passed from the frontend, or was set to "unknown". Please select a specific category.`);
    }

    // Resolve 'all' to a specific default category for better search results
    const effectiveCategory = category === 'all' ? 'AI Tools' : category;
    console.log(`[${MODULE_NAME}] Using effective category: ${effectiveCategory} (original: ${category})`);

    // ─── Cooldown check: only block if DB is empty for this category ───
    // With the multi-layer fallback, we can allow scans during cooldown
    // because Layer 1 (DB check) or Layer 4 (LLM fallback) can still produce results.
    const cooldown = getActiveCooldown(effectiveCategory, period as string);
    if (cooldown) {
      // Check if we have enough DB products to serve the scan
      const existingCount = await db.product.count({
        where: {
          category: { contains: effectiveCategory },
        },
      });

      if (existingCount < 3 && !forceRefresh) {
        // No DB data AND cooldown active AND not forcing refresh — block the scan
        const remainingSeconds = Math.ceil((cooldown.cooldownUntil - Date.now()) / 1000);
        console.warn(`[${MODULE_NAME}] REJECTED: Cooldown active for "${effectiveCategory}:${period}" and only ${existingCount} DB products. ${remainingSeconds}s remaining.`);
        return NextResponse.json(
          {
            error: `Scanner is cooling down. Try again in ${remainingSeconds} seconds.`,
            moduleError: {
              module: MODULE_NAME,
              category: 'rate_limit',
              message: `[RATE_LIMIT] Scanner is cooling down. Try again in ${remainingSeconds} seconds.`,
              detail: `A previous scan for "${effectiveCategory}" (${period}) was rate limited by the search API. The scanner is in cooldown to prevent repeated 429 failures.`,
              possibleReason: `The search API returned HTTP 429 (Too Many Requests). The scanner entered a ${cooldown.durationMs / 1000}s cooldown to prevent hammering the API. This is escalation #${cooldown.escalationCount}. Wait ${remainingSeconds}s before retrying.`,
              retryable: true,
              timestamp: new Date().toISOString(),
              endpoint: '/api/scan',
              statusCode: 429,
              stage: cooldown.stage,
              requestCategory: effectiveCategory,
              requestPayload: `category=${effectiveCategory}, period=${period}`,
              backendMessage: cooldown.providerMessage,
              providerMessage: cooldown.providerMessage,
              retryAfterSeconds: remainingSeconds,
              escalationCount: cooldown.escalationCount,
            },
            debug: {
              stage: cooldown.stage,
              endpoint: '/api/scan',
              category: effectiveCategory,
              retryAfterSeconds: remainingSeconds,
              escalationCount: cooldown.escalationCount,
              providerMessage: cooldown.providerMessage,
              cooldownUntil: new Date(cooldown.cooldownUntil).toISOString(),
              originalError: cooldown.providerMessage,
            },
          },
          { status: 429 }
        );
      }

      // We have enough DB data — allow scan even during cooldown
      console.log(`[${MODULE_NAME}] Cooldown active but ${existingCount} DB products exist — allowing scan (will use DB fallback)`);
    }

    // Pre-flight: check database connection
    console.log(`[${MODULE_NAME}] Checking database connection...`);
    const dbHealth = await checkDatabaseConnection();
    if (!dbHealth.ok) {
      console.error(`[${MODULE_NAME}] Database health check FAILED:`, dbHealth.error);
      throw new Error(`[SCAN_HANDLER] Database connection failed: Pre-flight database health check failed: ${dbHealth.error}. The database may be temporarily unavailable or misconfigured. Check that the SQLite database file exists and is accessible.`);
    }
    console.log(`[${MODULE_NAME}] Database OK (${dbHealth.latencyMs}ms)`);

    // Auto-seed if database is empty
    await ensureSeedData();

    // ─── SYNCHRONOUS DB CHECK: Return immediately if we have enough data ───
    // This avoids the background job entirely when the DB has products.
    // The background job pattern causes server crashes in dev mode.
    if (!forceRefresh) {
      const existingProducts = await db.product.findMany({
        where: {
          category: { contains: effectiveCategory },
        },
        orderBy: { upvotes: 'desc' },
        take: 30,
      });

      if (existingProducts.length >= 3) {
        console.log(`[${MODULE_NAME}] SYNCHRONOUS DB HIT: Found ${existingProducts.length} existing products for "${effectiveCategory}" — returning immediately (no background job)`);
        const dbResults = existingProducts.map(dbProductToScannedProduct);
        return NextResponse.json({
          jobId: null,
          status: 'completed',
          stage: 'COMPLETED',
          category,
          resultCount: dbResults.length,
          products: dbResults,
          source: 'database',
        });
      }
    }

    // Create a scan job to track progress
    console.log(`[${MODULE_NAME}] Creating scan job...`);
    const scanJob = await db.scanJob.create({
      data: {
        status: 'running',
        category,
        stage: 'INITIALIZING',
      },
    });
    console.log(`[${MODULE_NAME}] Scan job created: ${scanJob.id}`);

    // Register in-memory scan tracker
    const activeScan: ActiveScan = {
      jobId: scanJob.id,
      category: effectiveCategory,
      originalCategory: category,
      status: 'running',
      stage: 'INITIALIZING',
      products: [],
      error: null,
      startedAt: Date.now(),
    };
    activeScans.set(scanJob.id, activeScan);

    // ─── Fire-and-forget background processing ───
    executeScanBackground(scanJob.id, effectiveCategory, category, period as string, !!forceRefresh).catch((err) => {
      console.error(`[${MODULE_NAME}] Background scan CRASHED for job ${scanJob.id}:`, err);
    });

    // Return immediately — no more gateway 502 timeouts!
    return NextResponse.json({
      jobId: scanJob.id,
      status: 'running',
      stage: 'INITIALIZING',
      category,
      message: `Scan started for "${effectiveCategory}". Poll GET /api/scan?jobId=${scanJob.id} for results.`,
    });
  } catch (error) {
    logStageError(MODULE_NAME, 'HANDLER', error);
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
          originalStack: error instanceof Error ? error.stack : undefined,
          stage: moduleError.stage,
          errorCategory: moduleError.category,
        }
      },
      { status: 500 }
    );
  }
});

// ─── Background Scan Execution with Multi-Layer Fallback ────────────
//
// Fallback Chain:
//   Layer 1: DB Check — if we have 5+ products for this category, return immediately
//   Layer 2: Cache Check — if we have cached search results, use them
//   Layer 3: Live Web Search — try the live API (with cache reads/writes)
//   Layer 4: LLM Knowledge Fallback — when API is rate-limited, use LLM knowledge
//   Layer 5: Seed Data — auto-seeded on first request, always available as baseline

async function executeScanBackground(scanJobId: string, category: string, originalCategory: string, period: string, forceRefresh: boolean): Promise<void> {
  const activeScan = activeScans.get(scanJobId);
  if (!activeScan) return;

  try {
    // Update helper — tracks stage in both DB and in-memory
    const updateStage = async (stage: string) => {
      activeScan.stage = stage;
      try {
        await db.scanJob.update({
          where: { id: scanJobId },
          data: { stage },
        });
      } catch (dbErr) {
        logStageError(MODULE_NAME, 'UPDATE_STAGE', dbErr, { stage });
      }
    };

    // ─────────────────────────────────────────────────────────────────
    // LAYER 1: Database Check
    // If we already have enough products for this category, return them
    // immediately. No API call needed — instant results!
    // ─────────────────────────────────────────────────────────────────
    if (!forceRefresh) {
      await updateStage('DB_CHECK');
      console.log(`[${MODULE_NAME}] Layer 1: Checking database for existing "${category}" products...`);
      logStageStart(MODULE_NAME, 'DB_CHECK', `category=${category}`);

      const existingProducts = await db.product.findMany({
        where: {
          category: { contains: category },
        },
        orderBy: { upvotes: 'desc' },
        take: 30,
      });

      if (existingProducts.length >= 3) {
        console.log(`[${MODULE_NAME}] Layer 1 HIT: Found ${existingProducts.length} existing products for "${category}" — returning immediately`);
        logStageEnd(MODULE_NAME, 'DB_CHECK', `${existingProducts.length} products from DB`);

        const dbResults = existingProducts.map(dbProductToScannedProduct);

        // Mark scan as completed with DB results
        await db.scanJob.update({
          where: { id: scanJobId },
          data: {
            status: 'completed',
            stage: 'COMPLETED',
            resultCount: dbResults.length,
            productIds: JSON.stringify(dbResults.map(p => p.id).filter(Boolean)),
          },
        });

        activeScan.status = 'completed';
        activeScan.stage = 'COMPLETED';
        activeScan.products = dbResults;
        console.log(`[${MODULE_NAME}] Scan complete (DB fallback): ${dbResults.length} products (jobId: ${scanJobId})`);
        return; // ← EARLY RETURN — no API calls needed!
      }

      console.log(`[${MODULE_NAME}] Layer 1 MISS: Only ${existingProducts.length} products for "${category}" — proceeding to cache check`);
      logStageEnd(MODULE_NAME, 'DB_CHECK', `${existingProducts.length} products (insufficient, need 3+)`);
    } else {
      console.log(`[${MODULE_NAME}] Skipping DB check (forceRefresh=true)`);
    }

    // ─────────────────────────────────────────────────────────────────
    // LAYER 2: Search Cache Check
    // Check if we have cached search results for this category's queries
    // ─────────────────────────────────────────────────────────────────
    if (!forceRefresh) {
      await updateStage('CACHE_CHECK');
      console.log(`[${MODULE_NAME}] Layer 2: Checking search cache for "${category}"...`);
      logStageStart(MODULE_NAME, 'CACHE_CHECK', `category=${category}`);

      const cachedResults = hasCachedResultsForCategory(category);
      if (cachedResults && cachedResults.length > 0) {
        console.log(`[${MODULE_NAME}] Layer 2 HIT: Found ${cachedResults.length} cached search results for "${category}"`);
        logStageEnd(MODULE_NAME, 'CACHE_CHECK', `${cachedResults.length} cached results`);

        // Use cached results — skip to page reading / LLM extraction
        const phUrls = cachedResults
          .map((r: Record<string, unknown>) => (r.url as string) || (r.link as string) || '')
          .filter((url: string) => url.includes('producthunt.com'))
          .slice(0, 3);

        // Build content from cached results
        const rawContent = phUrls.length > 0
          ? `Using ${cachedResults.length} cached search results for "${category}"`
          : cachedResults
              .map((r: Record<string, unknown>) =>
                `Title: ${r.name || r.title || ''}\nURL: ${r.url || ''}\nSnippet: ${r.snippet || ''}`
              )
              .join('\n\n');

        if (rawContent.trim()) {
          // Jump to LLM extraction with cached data
          await updateStage('LLM_EXTRACT');
          console.log(`[${MODULE_NAME}] Extracting products from cached search results...`);
          logStageStart(MODULE_NAME, 'LLM_EXTRACT', `content from cache (${cachedResults.length} results)`);

          const llmStart = Date.now();
          const products = await retryWithBackoff(
            () => withTimeout(
              () => generateStructuredResponse<ScannedProduct[]>(
                `You are a Product Hunt product data extractor. Extract all products mentioned in the given content.
For each product, provide:
- name: Product name
- tagline: Short tagline/slogan (max 100 chars)
- description: Brief description of what the product does (max 300 chars)
- url: Product website URL if available
- category: "${category}"
- upvotes: Number of upvotes if mentioned, otherwise estimate (0-500)
- launchDate: Launch date if mentioned, otherwise "${CURRENT_YEAR}"
- features: Array of key feature strings (3-5 features)
- pricing: Pricing model (Free, Freemium, Paid, Unknown)
- comments: Array of comment/review summary strings (max 5)
- reviewScore: Review score 0-10 if available, otherwise estimate
- sourceUrl: The Product Hunt URL where this product was found

Only include real products that are clearly described. Do not fabricate products.
If you cannot find any products, return an empty array.`,
                `Extract ALL Product Hunt products from this cached content:\n\n${rawContent}`,
                `Return a JSON array of objects with fields: name, tagline, description, url, category, upvotes (number), launchDate, features (string[]), pricing, comments (string[]), reviewScore (number), sourceUrl`
              ),
              LLM_TIMEOUT_MS,
              MODULE_NAME
            ),
            { maxRetries: MAX_RETRIES },
            MODULE_NAME
          );
          console.log(`[${MODULE_NAME}] LLM extraction from cache: ${Array.isArray(products) ? products.length : 0} products in ${Date.now() - llmStart}ms`);

          // Process and save
          let safeProducts: ScannedProduct[];
          if (Array.isArray(products)) {
            safeProducts = products.map(p => ({ ...p, dataSource: 'cached' as const }));
          } else if (products && typeof products === 'object') {
            safeProducts = [{ ...(products as unknown as ScannedProduct), dataSource: 'cached' as const }];
          } else {
            safeProducts = [];
          }

          if (safeProducts.length > 0) {
            await updateStage('SAVE_PRODUCTS');
            const { savedProducts, savedProductIds } = await saveProducts(safeProducts, originalCategory);

            await db.scanJob.update({
              where: { id: scanJobId },
              data: {
                status: 'completed',
                stage: 'COMPLETED',
                resultCount: savedProducts.length,
                productIds: JSON.stringify(savedProductIds),
              },
            });

            activeScan.status = 'completed';
            activeScan.stage = 'COMPLETED';
            activeScan.products = savedProducts;
            console.log(`[${MODULE_NAME}] Scan complete (cache fallback): ${savedProducts.length} products (jobId: ${scanJobId})`);
            return; // ← EARLY RETURN — no API calls needed!
          }
        }
      }

      console.log(`[${MODULE_NAME}] Layer 2 MISS: No cached results for "${category}"`);
      logStageEnd(MODULE_NAME, 'CACHE_CHECK', 'no cached results');
    } else {
      console.log(`[${MODULE_NAME}] Skipping cache check (forceRefresh=true)`);
    }

    // ─────────────────────────────────────────────────────────────────
    // LAYER 3: Live Web Search (existing approach, with cache integration)
    // ─────────────────────────────────────────────────────────────────
    await updateStage('WEB_SEARCH');
    console.log(`[${MODULE_NAME}] Layer 3: Starting sequential web searches for category: ${category}`);
    logStageStart(MODULE_NAME, 'WEB_SEARCH', `category=${category}`);
    const searchStart = Date.now();

    const searchQueries = [
      `site:producthunt.com ${category} ${CURRENT_YEAR}`,
      `Product Hunt ${category} launches this month`,
      `latest ${category} tools Product Hunt`,
      `trending ${category} startups Product Hunt ${CURRENT_YEAR}`,
    ];

    console.log(`[${MODULE_NAME}] [SEARCH QUERIES] Final query list before execution:`, JSON.stringify(searchQueries));

    let allResults: Record<string, unknown>[] = [];
    let phUrls: string[] = [];
    const seenUrls = new Set<string>();

    let rateLimitHit = false;
    let firstRateLimitMessage = '';

    for (let i = 0; i < searchQueries.length; i++) {
      const query = searchQueries[i];
      console.log(`[${MODULE_NAME}] Search attempt ${i + 1}/${searchQueries.length}: "${query}"`);

      // ── Check per-query cache BEFORE hitting the API ──
      const cachedQueryResults = getCachedSearchResults(query);
      if (cachedQueryResults && !forceRefresh) {
        console.log(`[${MODULE_NAME}] Per-query cache hit for "${query}" (${cachedQueryResults.length} results)`);
        for (const r of cachedQueryResults) {
          const url = (r.url as string) || (r.link as string) || '';
          if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
            allResults.push(r);
          }
        }
        // If we got results from cache, don't make the API call
        if (cachedQueryResults.length > 0) continue;
      }

      try {
        const results = await retryWithBackoff(
          () => webSearch(query, 10),
          {
            maxRetries: 0,
            shouldRetry: (err) => {
              const msg = err instanceof Error ? err.message : String(err);
              return !msg.includes('429') && !msg.toLowerCase().includes('rate limit');
            },
          },
          MODULE_NAME
        ).catch((err) => {
          const errMsg = err instanceof Error ? err.message : String(err);
          if (errMsg.includes('429') || errMsg.toLowerCase().includes('rate limit') || errMsg.toLowerCase().includes('too many')) {
            rateLimitHit = true;
            firstRateLimitMessage = errMsg;
            console.warn(`[${MODULE_NAME}] RATE LIMIT HIT on query "${query}" (attempt ${i + 1}): ${errMsg}`);
            console.warn(`[${MODULE_NAME}] STOPPING search immediately — first 429 received.`);
          } else {
            logStageError(MODULE_NAME, 'WEB_SEARCH', err, { query, attempt: i + 1 });
          }
          return null;
        });

        if (rateLimitHit) {
          break;
        }

        if (!results || !Array.isArray(results)) {
          console.warn(`[${MODULE_NAME}] webSearch returned non-array for query "${query}": ${typeof results}`);
          if (i < searchQueries.length - 1) {
            await new Promise((r) => setTimeout(r, 3000));
          }
          continue;
        }

        // ── Cache the successful search results ──
        setCachedSearchResults(query, results as Record<string, unknown>[]);

        const searchResults = results;
        for (const r of searchResults) {
          const url = (r.url as string) || (r.link as string) || '';
          if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
            allResults.push(r);
          }
        }

        phUrls = allResults
          .map((r) => (r.url as string) || (r.link as string) || '')
          .filter((url) => url.includes('producthunt.com'));

        console.log(`[${MODULE_NAME}] Found ${phUrls.length} PH URLs so far (total results: ${allResults.length})`);

        if (phUrls.length > 0 || allResults.length > 0) {
          console.log(`[${MODULE_NAME}] Found results on attempt ${i + 1}, stopping search`);
          break;
        }

        if (i < searchQueries.length - 1) {
          console.log(`[${MODULE_NAME}] No results yet — waiting 4s before next query...`);
          await new Promise((r) => setTimeout(r, 4000));
        }
      } catch (err) {
        logStageError(MODULE_NAME, 'WEB_SEARCH', err, { query, attempt: i + 1 });
      }
    }

    // Deduplicate final results
    const finalSeenUrls = new Set<string>();
    const uniqueResults = allResults.filter((r) => {
      const url = (r.url as string) || (r.link as string) || '';
      if (!url || finalSeenUrls.has(url)) return false;
      finalSeenUrls.add(url);
      return true;
    });

    phUrls = phUrls.slice(0, 3);

    console.log(`[${MODULE_NAME}] Layer 3 complete: found ${uniqueResults.length} unique results (${phUrls.length} PH URLs) in ${Date.now() - searchStart}ms. Rate limit hit: ${rateLimitHit}`);
    logStageEnd(MODULE_NAME, 'WEB_SEARCH', `${uniqueResults.length} results`, { phUrlCount: phUrls.length, durationMs: Date.now() - searchStart, rateLimitHit });

    // ─────────────────────────────────────────────────────────────────
    // If web search succeeded, proceed with the normal pipeline:
    // READ_PAGES → LLM_EXTRACT → SAVE_PRODUCTS
    // ─────────────────────────────────────────────────────────────────
    if (!rateLimitHit && uniqueResults.length > 0) {
      // Step 2: Read top Product Hunt pages in parallel with concurrency limit
      await updateStage('READ_PAGES');
      console.log(`[${MODULE_NAME}] Step 2: Reading ${phUrls.length} Product Hunt pages in parallel (max ${MAX_CONCURRENT_READS} concurrent)`);
      logStageStart(MODULE_NAME, 'READ_PAGES', `${phUrls.length} URLs`);
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
          logStageError(MODULE_NAME, 'READ_PAGE', err, { url });
          return null;
        }
      }

      const pageResults: (Awaited<ReturnType<typeof readSinglePage>>)[] = [];
      for (let i = 0; i < phUrls.length; i += MAX_CONCURRENT_READS) {
        const batch = phUrls.slice(i, i + MAX_CONCURRENT_READS);
        const batchSettled = await Promise.allSettled(batch.map(readSinglePage));
        const batchResults = batchSettled
          .map(r => r.status === 'fulfilled' ? r.value : null);
        pageResults.push(...batchResults);
      }
      for (const result of pageResults) {
        if (result) {
          pageContents.push(result);
        }
      }
      console.log(`[${MODULE_NAME}] Step 2 complete: read ${pageContents.length}/${phUrls.length} pages successfully in ${Date.now() - pageReadStart}ms`);
      logStageEnd(MODULE_NAME, 'READ_PAGES', `${pageContents.length}/${phUrls.length} pages`, { durationMs: Date.now() - pageReadStart });

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
        throw new Error(`[SCAN_WEB_SEARCH] Product Hunt fetch returned no results. Tried ${searchQueries.length} different search queries for "${category}" products on Product Hunt but got no usable content.`);
      }

      // Delay before LLM call to avoid rate limits
      console.log(`[${MODULE_NAME}] Waiting ${INTER_CALL_DELAY_MS}ms before LLM call...`);
      await new Promise((r) => setTimeout(r, INTER_CALL_DELAY_MS));

      // Step 3: Use LLM to parse raw content into structured product data
      await updateStage('LLM_EXTRACT');
      console.log(`[${MODULE_NAME}] Step 3: Calling LLM to extract structured data (content length: ${rawContent.length} chars)`);
      logStageStart(MODULE_NAME, 'LLM_EXTRACT', `content=${rawContent.length} chars`);
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
- launchDate: Launch date if mentioned, otherwise "${CURRENT_YEAR}"
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
      logStageEnd(MODULE_NAME, 'LLM_EXTRACT', `${Array.isArray(products) ? products.length : 0} products`, { durationMs: Date.now() - llmStart });

      // Normalize LLM response
      let safeProducts: ScannedProduct[];
      if (Array.isArray(products)) {
        safeProducts = products.map(p => ({ ...p, dataSource: 'web_search' as const }));
      } else if (products && typeof products === 'object') {
        console.warn(`[${MODULE_NAME}] LLM returned a single object instead of array — wrapping in array`);
        safeProducts = [{ ...(products as unknown as ScannedProduct), dataSource: 'web_search' as const }];
      } else {
        console.error(`[${MODULE_NAME}] LLM returned unexpected type: ${typeof products}`);
        safeProducts = [];
      }

      if (safeProducts.length === 0 && rawContent.trim().length > 0) {
        console.error(`[${MODULE_NAME}] AI extraction failed: 0 products extracted from ${rawContent.length} chars of content`);
        throw new Error(`[SCAN_LLM_EXTRACT] AI extraction returned 0 products. Successfully fetched ${pageContents.length} Product Hunt pages (${rawContent.length} chars), but the AI could not parse any products from the content.`);
      }

      // Step 4: Save scanned products to the database
      await updateStage('SAVE_PRODUCTS');
      console.log(`[${MODULE_NAME}] Step 4: Saving ${safeProducts.length} products to database`);
      logStageStart(MODULE_NAME, 'SAVE_PRODUCTS', `${safeProducts.length} products`);
      const dbStart = Date.now();
      const { savedProducts, savedProductIds } = await saveProducts(safeProducts, originalCategory);

      if (safeProducts.length > 0 && savedProducts.length === 0) {
        throw new Error(`[SCAN_SAVE_PRODUCTS] Failed to save any of the ${safeProducts.length} extracted products to the database.`);
      }

      console.log(`[${MODULE_NAME}] Step 4 complete: saved ${savedProducts.length} products in ${Date.now() - dbStart}ms`);
      logStageEnd(MODULE_NAME, 'SAVE_PRODUCTS', `${savedProducts.length} saved`, { durationMs: Date.now() - dbStart });

      // Update scan job as completed
      await db.scanJob.update({
        where: { id: scanJobId },
        data: {
          status: 'completed',
          stage: 'COMPLETED',
          resultCount: savedProducts.length,
          productIds: JSON.stringify(savedProductIds),
        },
      });

      activeScan.status = 'completed';
      activeScan.stage = 'COMPLETED';
      activeScan.products = savedProducts;
      console.log(`[${MODULE_NAME}] Scan complete (live search): ${savedProducts.length} products saved (jobId: ${scanJobId})`);
      return; // ← SUCCESS — live search worked!
    }

    // ─────────────────────────────────────────────────────────────────
    // LAYER 4: LLM Knowledge Fallback
    // When web search was rate-limited AND no cached results available,
    // use the LLM to generate realistic product data from its training knowledge.
    // This is NOT mock data — it's knowledge-based generation with a
    // "dataSource: ai_knowledge" label for transparency.
    // ─────────────────────────────────────────────────────────────────
    if (rateLimitHit || uniqueResults.length === 0) {
      await updateStage('LLM_KNOWLEDGE_FALLBACK');
      logStageStart(MODULE_NAME, 'LLM_KNOWLEDGE_FALLBACK', `category=${category}, reason=${rateLimitHit ? 'rate_limited' : 'no_results'}`);
      const fallbackStart = Date.now();

      console.log(`[${MODULE_NAME}] Layer 4: Falling back to LLM knowledge for "${category}" products (${rateLimitHit ? 'rate-limited' : 'no search results'})`);

      try {
        const llmProducts = await retryWithBackoff(
          () => withTimeout(
            () => generateStructuredResponse<ScannedProduct[]>(
              `You are a Product Hunt product expert with deep knowledge of launched products.
Generate a list of REAL, well-known products in the "${category}" category that have been featured on Product Hunt or are prominent in this space.

IMPORTANT RULES:
1. Only include REAL products you are confident exist. Do NOT fabricate or invent products.
2. Use your training knowledge of actual Product Hunt launches, tech products, and startups.
3. If you're unsure about specific details (exact upvotes, dates), provide reasonable estimates based on the product's prominence.
4. Each product MUST have a valid URL (the product's actual website if known, or a reasonable URL).
5. Include a mix of popular and emerging products.
6. Be honest about uncertainty — it's better to provide 5 accurate products than 10 speculative ones.
7. Include products that have genuinely been launched or are well-known in the "${category}" space.

For each product, provide:
- name: Product name
- tagline: Short tagline/slogan (max 100 chars)
- description: Brief description of what the product does (max 300 chars)
- url: Product website URL if known
- category: "${category}"
- upvotes: Estimated upvotes on Product Hunt (0-5000, based on prominence)
- launchDate: Estimated launch year or date (e.g., "${CURRENT_YEAR}" or "${CURRENT_YEAR - 1}-03")
- features: Array of 3-5 key feature strings
- pricing: Pricing model (Free, Freemium, Paid, Unknown)
- comments: Array of 3-5 realistic user comment/review summary strings
- reviewScore: Estimated review score (0-10)
- sourceUrl: "ai_knowledge" (this flags the data source)
- dataSource: "ai_knowledge"

Generate 8-12 products for the "${category}" category.`,
              `List real products in the "${category}" category that have been on Product Hunt or are prominent in this space. Focus on products launched in ${CURRENT_YEAR - 2}-${CURRENT_YEAR}. Be accurate — only include products you're confident are real.`,
              `Return a JSON array of objects with fields: name, tagline, description, url, category, upvotes (number), launchDate, features (string[]), pricing, comments (string[]), reviewScore (number), sourceUrl, dataSource`
            ),
            LLM_TIMEOUT_MS,
            MODULE_NAME
          ),
          { maxRetries: 1 },
          MODULE_NAME
        );

        let safeProducts: ScannedProduct[];
        if (Array.isArray(llmProducts) && llmProducts.length > 0) {
          safeProducts = llmProducts.map(p => ({
            ...p,
            dataSource: 'ai_knowledge' as const,
            sourceUrl: p.sourceUrl || 'ai_knowledge',
            category: p.category || category,
          }));

          console.log(`[${MODULE_NAME}] Layer 4 SUCCESS: LLM generated ${safeProducts.length} products for "${category}" in ${Date.now() - fallbackStart}ms`);
          logStageEnd(MODULE_NAME, 'LLM_KNOWLEDGE_FALLBACK', `${safeProducts.length} AI-generated products`, { durationMs: Date.now() - fallbackStart });
        } else {
          safeProducts = [];
          console.warn(`[${MODULE_NAME}] Layer 4: LLM returned 0 products`);
          logStageEnd(MODULE_NAME, 'LLM_KNOWLEDGE_FALLBACK', '0 products (LLM fallback failed)');
        }

        if (safeProducts.length > 0) {
          // Save the AI-generated products
          await updateStage('SAVE_PRODUCTS');
          console.log(`[${MODULE_NAME}] Saving ${safeProducts.length} AI-generated products to database`);
          logStageStart(MODULE_NAME, 'SAVE_PRODUCTS', `${safeProducts.length} products`);
          const dbStart = Date.now();
          const { savedProducts, savedProductIds } = await saveProducts(safeProducts, originalCategory);

          console.log(`[${MODULE_NAME}] Saved ${savedProducts.length} AI-generated products in ${Date.now() - dbStart}ms`);
          logStageEnd(MODULE_NAME, 'SAVE_PRODUCTS', `${savedProducts.length} saved`, { durationMs: Date.now() - dbStart });

          // Update scan job as completed
          await db.scanJob.update({
            where: { id: scanJobId },
            data: {
              status: 'completed',
              stage: 'COMPLETED',
              resultCount: savedProducts.length,
              productIds: JSON.stringify(savedProductIds),
            },
          });

          activeScan.status = 'completed';
          activeScan.stage = 'COMPLETED';
          activeScan.products = savedProducts;
          console.log(`[${MODULE_NAME}] Scan complete (AI knowledge fallback): ${savedProducts.length} products saved (jobId: ${scanJobId})`);
          return; // ← SUCCESS — LLM fallback worked!
          // NOTE: We do NOT enter cooldown because the scan succeeded
        }
      } catch (llmError) {
        logStageError(MODULE_NAME, 'LLM_KNOWLEDGE_FALLBACK', llmError);
        console.warn(`[${MODULE_NAME}] Layer 4: LLM fallback failed: ${llmError instanceof Error ? llmError.message : String(llmError)}`);
        // Continue to rate-limit error handling below
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // ALL FALLBACKS FAILED — enter cooldown and throw error
    // BUT: Before giving up entirely, try one last DB fallback.
    // Even if forceRefresh=true, it's better to return stale data
    // than to show a blank preview.
    // ─────────────────────────────────────────────────────────────────

    // Layer 5: Emergency DB fallback (even during forceRefresh)
    try {
      const emergencyProducts = await db.product.findMany({
        where: {
          category: { contains: category },
        },
        orderBy: { upvotes: 'desc' },
        take: 30,
      });

      if (emergencyProducts.length > 0) {
        console.log(`[${MODULE_NAME}] Layer 5 EMERGENCY DB FALLBACK: Found ${emergencyProducts.length} products for "${category}" — returning stale data instead of blank`);
        const dbResults = emergencyProducts.map(dbProductToScannedProduct);

        await db.scanJob.update({
          where: { id: scanJobId },
          data: {
            status: 'completed',
            stage: 'COMPLETED',
            resultCount: dbResults.length,
            productIds: JSON.stringify(dbResults.map(p => p.id).filter(Boolean)),
          },
        });

        activeScan.status = 'completed';
        activeScan.stage = 'COMPLETED';
        activeScan.products = dbResults;

        // Still enter cooldown if rate-limited, so the frontend shows the cooldown banner
        if (rateLimitHit) {
          const cooldownEntry = enterCooldown(category, period, 'SCAN_WEB_SEARCH', firstRateLimitMessage);
          console.warn(`[${MODULE_NAME}] Rate-limited but returning ${dbResults.length} DB products. Cooldown entered for ${cooldownEntry.durationMs / 1000}s.`);
        }

        return; // ← Return DB data instead of failing
      }
    } catch (dbErr) {
      logStageError(MODULE_NAME, 'EMERGENCY_DB_FALLBACK', dbErr);
    }

    if (rateLimitHit) {
      const cooldownEntry = enterCooldown(category, period, 'SCAN_WEB_SEARCH', firstRateLimitMessage);
      const retryAfterSeconds = Math.ceil((cooldownEntry.cooldownUntil - Date.now()) / 1000);

      const rateLimitError = new Error(
        `[SCAN_WEB_SEARCH] Search API rate limit reached. The web search query returned HTTP 429. All fallback layers were tried: database check, search cache, and LLM knowledge fallback. Scanner is now in cooldown for ${retryAfterSeconds} seconds.`
      );
      (rateLimitError as any).__cooldownMeta = {
        stage: 'SCAN_WEB_SEARCH',
        endpoint: '/api/scan',
        category,
        retryAfterSeconds,
        providerMessage: firstRateLimitMessage,
        escalationCount: cooldownEntry.escalationCount,
      };
      throw rateLimitError;
    }

    // No results but no rate limit — this shouldn't normally happen with the fallback chain
    throw new Error(`[SCAN_WEB_SEARCH] Product Hunt scan could not find any results for "${category}". All fallback layers (database, cache, live search, AI knowledge) were exhausted. Try a different category like "AI Tools" or "Productivity" which have more listings.`);
  } catch (error) {
    logStageError(MODULE_NAME, 'EXECUTE_SCAN', error);
    const moduleError = classifyError(error, MODULE_NAME, '/api/scan', {
      category,
      backendMessage: error instanceof Error ? error.message : String(error),
    });

    // ─── Preserve cooldown metadata from rate-limit errors ───
    if (error instanceof Error && (error as any).__cooldownMeta) {
      const meta = (error as any).__cooldownMeta;
      moduleError.retryAfterSeconds = meta.retryAfterSeconds;
      moduleError.providerMessage = meta.providerMessage;
      moduleError.stage = meta.stage || moduleError.stage;
      moduleError.statusCode = 429;
      if (!moduleError.backendMessage) {
        moduleError.backendMessage = meta.providerMessage;
      }
    }

    // Update scan job as failed
    try {
      await db.scanJob.update({
        where: { id: scanJobId },
        data: {
          status: 'failed',
          stage: moduleError.stage || 'UNKNOWN',
          errors: JSON.stringify([moduleError]),
        },
      });
    } catch (dbErr) {
      logStageError(MODULE_NAME, 'UPDATE_FAILED_JOB', dbErr);
    }

    // Update in-memory active scan
    if (activeScan) {
      activeScan.status = 'failed';
      activeScan.stage = moduleError.stage || 'UNKNOWN';
      activeScan.error = moduleError;
    }

    logError(MODULE_NAME, error, { endpoint: '/api/scan', category });
  }
}
