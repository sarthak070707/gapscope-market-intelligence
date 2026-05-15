/**
 * GapScope Error Handling Utilities
 * 
 * Provides:
 * - Retry logic with exponential backoff
 * - Timeout protection for async operations
 * - Structured error logging
 * - Data validation helpers
 * - Module-level error classification
 * - Global route handler wrapper
 */

// ─── Error Classification ─────────────────────────────────────────

export type ErrorCategory = 
  | 'api'          // External API call failed
  | 'parsing'      // JSON/response parsing failed
  | 'timeout'      // Request took too long
  | 'ai_response'  // LLM returned invalid/unparseable response
  | 'database'     // Database operation failed
  | 'validation'   // Data validation failed
  | 'rate_limit'   // Rate limited by external API
  | 'auth'         // Authentication/authorization failed
  | 'unknown';     // Unclassified error

export interface RequestContext {
  category?: string;
  payload?: string;
  backendMessage?: string;
}

export interface ModuleError {
  module: string;           // e.g., "Product Hunt Scanner", "Trend Detection"
  category: ErrorCategory;
  message: string;          // Human-readable error description
  detail: string;           // More specific detail about what went wrong
  possibleReason: string;   // Why this might have happened
  retryable: boolean;       // Whether retrying might help
  timestamp: string;        // ISO timestamp
  endpoint?: string;        // Which API endpoint failed
  statusCode?: number;      // HTTP status code if applicable
  requestCategory?: string; // The product category that was sent in the request
  requestPayload?: string;  // A short summary of the request body (e.g., "category=AI Tools, timePeriod=30d")
  backendMessage?: string;  // The original error message from the backend
}

// ─── Classify Error ──────────────────────────────────────────────

export function classifyError(
  error: unknown,
  module: string,
  endpoint?: string,
  requestContext?: RequestContext
): ModuleError {
  const timestamp = new Date().toISOString();
  const ctx = {
    requestCategory: requestContext?.category,
    requestPayload: requestContext?.payload,
    backendMessage: requestContext?.backendMessage,
  };

  if (error instanceof TimeoutError) {
    return {
      module,
      category: 'timeout',
      message: `${module} timed out`,
      detail: `The request to ${endpoint || module} took too long and was cancelled.`,
      possibleReason: 'The server may be overloaded, or the analysis scope is too large. Try again with a narrower scope.',
      retryable: true,
      timestamp,
      endpoint,
      ...ctx,
    };
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // ── TypeError / ReferenceError classification (common JS runtime errors) ──
    // These are often caused by null/undefined DB results or malformed LLM responses
    if (error instanceof TypeError || error instanceof ReferenceError) {
      const isDbRelated = msg.includes('prisma') || msg.includes('null') || msg.includes('undefined') ||
        msg.includes('cannot read') || msg.includes('is not a function') || msg.includes('is not iterable');
      return {
        module,
        category: isDbRelated ? 'database' : 'parsing',
        message: `${module} encountered a data processing error`,
        detail: `[${error.constructor.name}] ${error.message}`,
        possibleReason: isDbRelated
          ? 'A database query returned null or an unexpected shape. This may be due to missing data or a schema mismatch. Try running a scan first.'
          : 'An error occurred while processing data. This may be caused by a malformed AI response or unexpected data format. Retrying usually resolves this.',
        retryable: true,
        timestamp,
        endpoint,
        ...ctx,
      };
    }

    // ── RangeError classification (invalid array length, etc.) ──
    if (error instanceof RangeError) {
      return {
        module,
        category: 'parsing',
        message: `${module} encountered a data range error`,
        detail: `[RangeError] ${error.message}`,
        possibleReason: 'A data processing operation received an invalid value. This may be caused by unexpected data from the AI model.',
        retryable: true,
        timestamp,
        endpoint,
        ...ctx,
      };
    }

    // ── SyntaxError classification (malformed JSON, etc.) ──
    if (error instanceof SyntaxError) {
      return {
        module,
        category: 'parsing',
        message: `${module} encountered a syntax error`,
        detail: `[SyntaxError] ${error.message}`,
        possibleReason: 'A JSON parsing or data format error occurred. This may be caused by malformed request data or an invalid AI response. Try again.',
        retryable: true,
        timestamp,
        endpoint,
        ...ctx,
      };
    }

    // ── Rate limit errors (check FIRST — most common production issue) ──
    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('throttl')) {
      return {
        module,
        category: 'rate_limit',
        message: `${module} hit a rate limit`,
        detail: error.message,
        possibleReason: 'Too many API requests were sent in a short period. The ZAI SDK enforces rate limits. Wait 30-60 seconds before retrying.',
        retryable: true,
        timestamp,
        endpoint,
        statusCode: 429,
        ...ctx,
      };
    }

    // ── Authentication / API key errors ──
    if (msg.includes('unauthorized') || msg.includes('forbidden') || 
        msg.includes('auth') || msg.includes('api key') || 
        msg.includes('zai sdk initialization') || msg.includes('check api key')) {
      const statusCode = msg.includes('forbidden') ? 403 : 401;
      return {
        module,
        category: 'auth',
        message: `${module} authentication failed`,
        detail: error.message,
        possibleReason: 'The API request lacked proper authentication. Check that ZAI_API_KEY or other required environment variables are set correctly. Restart the server after fixing.',
        retryable: false,
        timestamp,
        endpoint,
        statusCode,
        ...ctx,
      };
    }

    // ── AI response parsing errors ──
    if (msg.includes('failed to parse ai response') || 
        msg.includes('json extraction failed') ||
        msg.includes('unparseable response') ||
        msg.includes('truncated') ||
        (msg.includes('json') && msg.includes('parse'))) {
      return {
        module,
        category: 'ai_response',
        message: `${module} received an invalid AI response`,
        detail: error.message,
        possibleReason: 'The AI model returned data in an unexpected format or the response was truncated. Retrying usually resolves this.',
        retryable: true,
        timestamp,
        endpoint,
        ...ctx,
      };
    }

    // ── AI empty response ──
    if (msg.includes('empty response') || msg.includes('ai returned an empty')) {
      return {
        module,
        category: 'ai_response',
        message: `${module} received an empty AI response`,
        detail: error.message,
        possibleReason: 'The AI model returned no content. This may be due to the model being overloaded or the prompt being too long. Try again with a shorter prompt.',
        retryable: true,
        timestamp,
        endpoint,
        ...ctx,
      };
    }

    // ── AI completion failure ──
    if (msg.includes('ai chat completion failed') || msg.includes('ai generation') || msg.includes('ai server error')) {
      return {
        module,
        category: 'api',
        message: `${module} AI generation failed`,
        detail: error.message,
        possibleReason: 'The AI service encountered an error. This is usually transient — retry after a short wait.',
        retryable: true,
        timestamp,
        endpoint,
        statusCode: 500,
        ...ctx,
      };
    }

    // ── Web search / page reader failures ──
    if (msg.includes('web search failed') || msg.includes('page reading failed')) {
      return {
        module,
        category: 'api',
        message: `${module} web data fetch failed`,
        detail: error.message,
        possibleReason: 'The web search or page reading service is temporarily unavailable. Try again in a few seconds.',
        retryable: true,
        timestamp,
        endpoint,
        ...ctx,
      };
    }

    // ── Network/API errors ──
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('econnrefused') || msg.includes('enetunreach')) {
      return {
        module,
        category: 'api',
        message: `${module} failed to reach the server`,
        detail: error.message,
        possibleReason: 'Network connectivity issue or the external API is temporarily unavailable.',
        retryable: true,
        timestamp,
        endpoint,
        ...ctx,
      };
    }

    // ── Database errors ──
    if (msg.includes('prisma') || msg.includes('sqlite') || msg.includes('database') || 
        msg.includes('db query') || msg.includes('database query') || msg.includes('database returned invalid')) {
      return {
        module,
        category: 'database',
        message: `${module} encountered a database error`,
        detail: error.message,
        possibleReason: 'Database may be locked, corrupted, or returned unexpected data. Try running a scan first, or try again in a moment.',
        retryable: true,
        timestamp,
        endpoint,
        ...ctx,
      };
    }

    // ── Status code based errors ──
    if (msg.includes('404') || msg.includes('not found')) {
      return {
        module,
        category: 'api',
        message: `${module} found no data`,
        detail: error.message,
        possibleReason: 'No data exists for the selected category/time period. Try scanning first.',
        retryable: false,
        timestamp,
        endpoint,
        statusCode: 404,
        ...ctx,
      };
    }

    if (msg.includes('500') || msg.includes('internal server')) {
      return {
        module,
        category: 'api',
        message: `${module} encountered a server error`,
        detail: error.message,
        possibleReason: 'The server encountered an unexpected error. This is usually transient.',
        retryable: true,
        timestamp,
        endpoint,
        statusCode: 500,
        ...ctx,
      };
    }

    if (msg.includes('503') || msg.includes('service unavailable') || msg.includes('overloaded')) {
      return {
        module,
        category: 'api',
        message: `${module} service is unavailable`,
        detail: error.message,
        possibleReason: 'The external service is temporarily unavailable or overloaded. Try again later.',
        retryable: true,
        timestamp,
        endpoint,
        statusCode: 503,
        ...ctx,
      };
    }

    // ── Empty / no result errors ──
    if (msg.includes('empty') || msg.includes('no result') || msg.includes('no data') || msg.includes('nothing found')) {
      return {
        module,
        category: 'api',
        message: `${module} found no results`,
        detail: error.message,
        possibleReason: 'The query returned no data. Try a different category or time period.',
        retryable: true,
        timestamp,
        endpoint,
        ...ctx,
      };
    }

    // ── Invalid / malformed errors ──
    if (msg.includes('invalid') || msg.includes('malformed') || msg.includes('serialize') ||
        msg.includes('failed to prepare') || msg.includes('failed to serialize')) {
      return {
        module,
        category: 'parsing',
        message: `${module} received invalid data`,
        detail: error.message,
        possibleReason: 'The request or response data was malformed. Check the input parameters and try again.',
        retryable: true,
        timestamp,
        endpoint,
        ...ctx,
      };
    }

    // ── Missing category / category required errors ──
    if (msg.includes('missing category') || msg.includes('category is required')) {
      return {
        module,
        category: 'validation',
        message: `${module} requires a category`,
        detail: error.message,
        possibleReason: 'A product category must be specified for this operation. Select a category and try again.',
        retryable: false,
        timestamp,
        endpoint,
        ...ctx,
      };
    }

    // ── Abort / cancel errors ──
    if (msg.includes('abort') || msg.includes('cancel')) {
      return {
        module,
        category: 'timeout',
        message: `${module} request was cancelled`,
        detail: error.message,
        possibleReason: 'The request was aborted or cancelled. This may be due to a timeout or user action.',
        retryable: true,
        timestamp,
        endpoint,
        ...ctx,
      };
    }

    // ── Bad request errors ──
    if (msg.includes('bad request')) {
      return {
        module,
        category: 'validation',
        message: `${module} received a bad request`,
        detail: error.message,
        possibleReason: 'The request parameters were invalid. Check the input and try again.',
        retryable: false,
        timestamp,
        endpoint,
        statusCode: 400,
        ...ctx,
      };
    }

    // ── Generic error with message — include original error message in detail ──
    return {
      module,
      category: 'unknown',
      message: `${module} encountered an unexpected error`,
      detail: error.message,
      possibleReason: 'An unexpected error occurred. The error has been logged. Try again, and if it persists, try a different category or scope.',
      retryable: true,
      timestamp,
      endpoint,
      ...ctx,
    };
  }

  // Non-Error thrown
  return {
    module,
    category: 'unknown',
    message: `${module} encountered an unknown error`,
    detail: String(error),
    possibleReason: 'An unexpected non-Error value was thrown. Try again.',
    retryable: true,
    timestamp,
    endpoint,
    ...ctx,
  };
}

// ─── Custom Timeout Error ────────────────────────────────────────

export class TimeoutError extends Error {
  constructor(timeoutMs: number, module: string) {
    super(`${module} timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

// ─── Retry with Exponential Backoff ──────────────────────────────

export interface RetryOptions {
  maxRetries: number;      // Default: 2
  baseDelayMs: number;     // Default: 1000
  maxDelayMs: number;      // Default: 30000
  shouldRetry?: (error: unknown) => boolean;  // Only retry certain errors
  rateLimitBaseDelayMs?: number; // Default: 5000 — longer base delay for 429 errors
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 2,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  rateLimitBaseDelayMs: 5000,
};

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('429') || msg.includes('rate limit') || msg.includes('too many') || msg.includes('throttl');
  }
  return false;
}

function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('unauthorized') || msg.includes('api key') || msg.includes('forbidden') || msg.includes('auth');
  }
  return false;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  module: string = 'Unknown'
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry auth errors — they won't fix themselves
      if (isAuthError(error)) {
        console.warn(`[${module}] Auth error detected, not retrying: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }

      // Don't retry if shouldRetry returns false
      if (opts.shouldRetry && !opts.shouldRetry(error)) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff + jitter
      // Use much longer delays for rate-limited requests
      const isRateLimited = isRateLimitError(error);
      const baseDelay = isRateLimited ? (opts.rateLimitBaseDelayMs || 5000) : opts.baseDelayMs;
      const maxDelay = isRateLimited ? 120000 : opts.maxDelayMs; // Up to 2min for rate limits
      
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );

      logError(module, error, { 
        attempt: attempt + 1, 
        maxRetries: opts.maxRetries, 
        nextRetryIn: Math.round(delay),
        isRateLimited,
      });
      
      console.log(`[${module}] Retry ${attempt + 1}/${opts.maxRetries} in ${Math.round(delay)}ms${isRateLimited ? ' (rate limited)' : ''}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ─── Timeout Wrapper ─────────────────────────────────────────────

export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 30000,
  module: string = 'Unknown'
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(timeoutMs, module));
    }, timeoutMs);
  });

  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Structured Error Logging ────────────────────────────────────

export interface LogContext {
  [key: string]: string | number | boolean | undefined;
}

export function logError(
  module: string,
  error: unknown,
  context?: LogContext,
  requestContext?: RequestContext
): void {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    module,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    errorStack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join(' | ') : undefined,
    ...context,
    ...(requestContext ? {
      requestCategory: requestContext.category,
      requestPayload: requestContext.payload,
      backendMessage: requestContext.backendMessage,
    } : {}),
  };
  
  // In production, you'd send this to a monitoring service
  // For now, log to console with structured format
  console.error(`[GapScope Error] ${module}:`, JSON.stringify(errorInfo, null, 2));
}

export function logInfo(module: string, message: string, context?: LogContext): void {
  const timestamp = new Date().toISOString();
  const info = {
    timestamp,
    module,
    message,
    ...context,
  };
  console.log(`[GapScope Info] ${module}:`, JSON.stringify(info));
}

// ─── Data Validation Helpers ─────────────────────────────────────

/**
 * Validates that data is not null, undefined, or empty.
 * Returns the data if valid, or a fallback.
 */
export function validateArray<T>(data: unknown, fallback: T[] = []): T[] {
  if (!data) return fallback;
  if (!Array.isArray(data)) return fallback;
  return data;
}

/**
 * Validates that an object has required keys with non-null values.
 */
export function validateObject<T extends Record<string, unknown>>(
  data: unknown,
  requiredKeys: string[],
  fallback: T
): T {
  if (!data || typeof data !== 'object') return fallback;
  const obj = data as Record<string, unknown>;
  for (const key of requiredKeys) {
    if (obj[key] === undefined || obj[key] === null) {
      return fallback;
    }
  }
  return obj as T;
}

/**
 * Safely access a nested property of an object.
 */
export function safeGet<T>(obj: unknown, path: string, fallback: T): T {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return fallback;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return (current !== undefined && current !== null) ? (current as T) : fallback;
}

/**
 * Validates dashboard stats response to ensure critical fields exist.
 */
export function validateDashboardStats(data: unknown): {
  isValid: boolean;
  missingFields: string[];
} {
  if (!data || typeof data !== 'object') {
    return { isValid: false, missingFields: ['all'] };
  }

  const obj = data as Record<string, unknown>;
  const requiredFields = [
    'totalProducts',
    'totalGaps', 
    'totalOpportunities',
    'avgSaturation',
    'topCategories',
    'trendingGaps',
    'saturatedMarkets',
    'complaintTrends',
    'marketMetrics',
  ];

  const missingFields = requiredFields.filter(
    (field) => obj[field] === undefined || obj[field] === null
  );

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

// ─── Global Route Handler Wrapper ─────────────────────────────────

/**
 * Wraps an async route handler with global error catching.
 * Ensures ALL errors (including uncaught ones from shared services)
 * are converted into structured ModuleError responses instead of
 * generic 500 errors.
 * 
 * Usage:
 *   export const POST = withErrorHandler('Module Name', '/api/endpoint', async (request) => {
 *     // ... handler logic
 *   });
 */
export function withErrorHandler(
  moduleName: string,
  endpoint: string,
  handler: (request: Request) => Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const startTime = Date.now();
    console.log(`[${moduleName}] >>> ${request.method} ${endpoint} request started`);
    
    try {
      const response = await handler(request);
      const duration = Date.now() - startTime;
      console.log(`[${moduleName}] <<< ${request.method} ${endpoint} completed in ${duration}ms (status: ${response.status})`);
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[${moduleName}] !!! ${request.method} ${endpoint} UNHANDLED ERROR after ${duration}ms:`, error);
      
      // This catch handles errors that escaped the handler's own try/catch
      // (e.g., module-level import errors, shared service initialization failures)
      const moduleError = classifyError(error, moduleName, endpoint, {
        backendMessage: error instanceof Error ? error.message : String(error),
      });

      logError(moduleName, error, { 
        endpoint, 
        method: request.method,
        duration,
        context: 'UNHANDLED_ERROR_CAUGHT_BY_GLOBAL_HANDLER',
      });

      // Try to parse request body for debug info (best effort)
      let debugInfo: Record<string, unknown> = {};
      try {
        const clonedRequest = request.clone();
        const body = await clonedRequest.json();
        debugInfo = {
          receivedCategory: body?.category,
          receivedTimePeriod: body?.timePeriod,
          receivedAction: body?.action,
        };
      } catch {
        debugInfo = { note: 'Could not parse request body for debug info' };
      }

      return new Response(
        JSON.stringify({
          error: moduleError.message,
          moduleError,
          debug: {
            ...debugInfo,
            originalError: error instanceof Error ? error.message : String(error),
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            caughtBy: 'global_error_handler',
            duration,
          },
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}
