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
  | 'auth';        // Authentication/authorization failed
// NOTE: 'unknown' category removed — all errors MUST be classified as one of the above

export interface RequestContext {
  category?: string;
  payload?: string;
  backendMessage?: string;
}

export interface ModuleError {
  module: string;           // e.g., "Product Hunt Scanner", "Trend Detection"
  category: ErrorCategory;
  message: string;          // Human-readable error description (includes stage tag)
  detail: string;           // More specific detail about what went wrong
  possibleReason: string;   // Why this might have happened
  retryable: boolean;       // Whether retrying might help
  timestamp: string;        // ISO timestamp
  endpoint?: string;        // Which API endpoint failed
  statusCode?: number;      // HTTP status code if applicable
  requestCategory?: string; // The product category that was sent in the request
  requestPayload?: string;  // A short summary of the request body (e.g., "category=AI Tools, timePeriod=30d")
  backendMessage?: string;  // The original error message from the backend
  stage?: string;           // The stage where the error occurred (e.g., "SCAN_WEB_SEARCH", "ANALYZE_GAPS_LLM")
  originalStack?: string;   // The original error's stack trace (for debugging)
  originalName?: string;    // The original error's constructor name (e.g., "TypeError", "RangeError")
  retryAfterSeconds?: number; // For rate_limit errors: seconds until the cooldown expires
  providerMessage?: string;   // The original message from the rate-limited provider (e.g., "Too many requests, please try again later")
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

  // Extract stage tag and stack from Error instances — used by ALL branches
  const errorIsError = error instanceof Error;
  const stageMatch = errorIsError ? error.message.match(/^\[([A-Z_]+)\]/) : null;
  const extractedStage = stageMatch ? stageMatch[1] : undefined;
  const errorOrigin: Pick<ModuleError, 'stage' | 'originalStack' | 'originalName'> = {
    stage: extractedStage,
    originalStack: errorIsError ? error.stack || undefined : undefined,
    originalName: errorIsError ? error.constructor.name : undefined,
  };

  if (error instanceof TimeoutError) {
    return {
      module,
      category: 'timeout',
      message: `[TIMEOUT] ${error.message}`,
      detail: `The request to ${endpoint || module} took too long and was cancelled.`,
      possibleReason: 'The server may be overloaded, or the analysis scope is too large. Try again with a narrower scope.',
      retryable: true,
      timestamp,
      endpoint,
      ...errorOrigin,
      ...ctx,
    };
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // ── CRITICAL: Prevent double-prefixing ──
    // If the error message already starts with a classification prefix like [BAD_GATEWAY],
    // [RATE_LIMIT], [TIMEOUT], etc., do NOT add another prefix.
    // This prevents the bug where classifyError is called twice on the same error
    // (e.g., in mutationFn + onError) and produces [BAD_GATEWAY] [BAD_GATEWAY] HTTP 502.
    const alreadyClassified = /^\[([A-Z_]+)\]/.test(error.message);
    if (alreadyClassified) {
      // The message already has a classification prefix — return it as-is without re-wrapping.
      // We still classify the category based on the content for the ModuleError object.
      const prefixMatch = error.message.match(/^\[([A-Z_]+)\]/);
      const existingPrefix = prefixMatch ? prefixMatch[1] : undefined;

      // Determine category from the existing prefix or message content
      let category: ErrorCategory = 'api';
      if (existingPrefix === 'RATE_LIMIT' || msg.includes('429') || msg.includes('rate limit')) category = 'rate_limit';
      else if (existingPrefix === 'TIMEOUT' || msg.includes('timeout') || msg.includes('timed out')) category = 'timeout';
      else if (existingPrefix === 'AUTH' || msg.includes('unauthorized') || msg.includes('forbidden')) category = 'auth';
      else if (existingPrefix === 'DATABASE' || existingPrefix === 'DATABASE_CONSTRAINT' || existingPrefix === 'DATABASE_SCHEMA') category = 'database';
      else if (existingPrefix === 'PARSING' || existingPrefix === 'VALIDATION') category = 'parsing';
      else if (existingPrefix === 'AI_RESPONSE') category = 'ai_response';
      else if (existingPrefix === 'NOT_FOUND') category = 'api';
      else if (existingPrefix === 'BAD_GATEWAY' || existingPrefix === 'SERVER_ERROR' || existingPrefix === 'SERVICE_UNAVAILABLE' || existingPrefix === 'NETWORK') category = 'api';

      return {
        module,
        category,
        message: error.message, // Preserve original — no re-wrapping
        detail: error.message,
        possibleReason: `Error at stage ${extractedStage || existingPrefix || 'unknown'}: ${error.message.substring(0, 150)}. Check Debug Info for full stack trace.`,
        retryable: category !== 'auth' && category !== 'validation',
        timestamp,
        endpoint,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── TypeError / ReferenceError classification (common JS runtime errors) ──
    // These are often caused by null/undefined DB results or malformed LLM responses
    if (error instanceof TypeError || error instanceof ReferenceError) {
      const isDbRelated = msg.includes('prisma') || msg.includes('null') || msg.includes('undefined') ||
        msg.includes('cannot read') || msg.includes('is not a function') || msg.includes('is not iterable');
      const categoryTag = isDbRelated ? 'DATABASE' : 'PARSING';
      return {
        module,
        category: isDbRelated ? 'database' : 'parsing',
        message: `[${categoryTag}] ${error.message}`,
        detail: `[${error.constructor.name}] ${error.message}`,
        possibleReason: isDbRelated
          ? `Database error at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. Try running a scan first.`
          : `Parse error at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. This may be caused by a malformed AI response. Retrying usually resolves this.`,
        retryable: true,
        timestamp,
        endpoint,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── RangeError classification (invalid array length, etc.) ──
    if (error instanceof RangeError) {
      return {
        module,
        category: 'parsing',
        message: `[PARSING] ${error.message}`,
        detail: `[RangeError] ${error.message}`,
        possibleReason: `Range error at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. This may be caused by unexpected data from the AI model.`,
        retryable: true,
        timestamp,
        endpoint,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── SyntaxError classification (malformed JSON, etc.) ──
    if (error instanceof SyntaxError) {
      return {
        module,
        category: 'parsing',
        message: `[PARSING] ${error.message}`,
        detail: `[SyntaxError] ${error.message}`,
        possibleReason: `JSON parse error at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. This may be caused by malformed request data or an invalid AI response.`,
        retryable: true,
        timestamp,
        endpoint,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── Rate limit errors (check FIRST — most common production issue) ──
    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('throttl')) {
      return {
        module,
        category: 'rate_limit',
        message: `[RATE_LIMIT] ${error.message}`,
        detail: error.message,
        possibleReason: `Rate limited at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. Wait 30-60 seconds before retrying.`,
        retryable: true,
        timestamp,
        endpoint,
        statusCode: 429,
        ...errorOrigin,
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
        message: `[AUTH] ${error.message}`,
        detail: error.message,
        possibleReason: `Auth error at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. Check ZAI_API_KEY environment variable.`,
        retryable: false,
        timestamp,
        endpoint,
        statusCode,
        ...errorOrigin,
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
        message: `[AI_RESPONSE] ${error.message}`,
        detail: error.message,
        possibleReason: `AI parse error at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. Retrying usually resolves this.`,
        retryable: true,
        timestamp,
        endpoint,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── AI empty response ──
    if (msg.includes('empty response') || msg.includes('ai returned an empty')) {
      return {
        module,
        category: 'ai_response',
        message: `[AI_RESPONSE] ${error.message}`,
        detail: error.message,
        possibleReason: `AI empty response at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. The model may be overloaded. Try again.`,
        retryable: true,
        timestamp,
        endpoint,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── AI completion failure ──
    if (msg.includes('ai chat completion failed') || msg.includes('ai generation') || msg.includes('ai server error')) {
      return {
        module,
        category: 'api',
        message: `[API] ${error.message}`,
        detail: error.message,
        possibleReason: `AI API error at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. Usually transient — retry after a short wait.`,
        retryable: true,
        timestamp,
        endpoint,
        statusCode: 500,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── Web search / page reader failures ──
    if (msg.includes('web search failed') || msg.includes('page reading failed')) {
      return {
        module,
        category: 'api',
        message: `[API] ${error.message}`,
        detail: error.message,
        possibleReason: `Web API error at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. The search/page service may be temporarily unavailable.`,
        retryable: true,
        timestamp,
        endpoint,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── Network/API errors ──
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('econnrefused') || msg.includes('enetunreach')) {
      return {
        module,
        category: 'api',
        message: `[NETWORK] ${error.message}`,
        detail: error.message,
        possibleReason: `Network error at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. Check connectivity.`,
        retryable: true,
        timestamp,
        endpoint,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── Database errors ──
    if (msg.includes('prisma') || msg.includes('sqlite') || msg.includes('database') || 
        msg.includes('db query') || msg.includes('database query') || msg.includes('database returned invalid')) {
      return {
        module,
        category: 'database',
        message: `[DATABASE] ${error.message}`,
        detail: error.message,
        possibleReason: `Database error at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. Try running a scan first.`,
        retryable: true,
        timestamp,
        endpoint,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── Status code based errors ──
    if (msg.includes('404') || msg.includes('not found')) {
      return {
        module,
        category: 'api',
        message: `[NOT_FOUND] ${error.message}`,
        detail: error.message,
        possibleReason: `Not found at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. Try scanning first.`,
        retryable: false,
        timestamp,
        endpoint,
        statusCode: 404,
        ...errorOrigin,
        ...ctx,
      };
    }

    if (msg.includes('500') || msg.includes('internal server')) {
      return {
        module,
        category: 'api',
        message: `[SERVER_ERROR] ${error.message}`,
        detail: error.message,
        possibleReason: `Server error (500) at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. Usually transient — retry.`,
        retryable: true,
        timestamp,
        endpoint,
        statusCode: 500,
        ...errorOrigin,
        ...ctx,
      };
    }

    if (msg.includes('502') || msg.includes('bad gateway')) {
      return {
        module,
        category: 'api',
        message: `[BAD_GATEWAY] ${error.message}`,
        detail: error.message,
        possibleReason: `Bad Gateway (502) at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. The gateway/proxy could not reach the backend. This usually means the backend server was too slow or temporarily unavailable. Wait a moment and try again.`,
        retryable: true,
        timestamp,
        endpoint,
        statusCode: 502,
        ...errorOrigin,
        ...ctx,
      };
    }

    if (msg.includes('503') || msg.includes('service unavailable') || msg.includes('overloaded')) {
      return {
        module,
        category: 'api',
        message: `[SERVICE_UNAVAILABLE] ${error.message}`,
        detail: error.message,
        possibleReason: `Service unavailable at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. Try again later.`,
        retryable: true,
        timestamp,
        endpoint,
        statusCode: 503,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── Empty / no result errors ──
    if (msg.includes('empty') || msg.includes('no result') || msg.includes('no data') || msg.includes('nothing found')) {
      return {
        module,
        category: 'api',
        message: `[NO_RESULTS] ${error.message}`,
        detail: error.message,
        possibleReason: `No results at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. Try a different category or time period.`,
        retryable: true,
        timestamp,
        endpoint,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── Invalid / malformed errors ──
    if (msg.includes('invalid') || msg.includes('malformed') || msg.includes('serialize') ||
        msg.includes('failed to prepare') || msg.includes('failed to serialize')) {
      return {
        module,
        category: 'parsing',
        message: `[VALIDATION] ${error.message}`,
        detail: error.message,
        possibleReason: `Validation error at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. Check input parameters.`,
        retryable: true,
        timestamp,
        endpoint,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── Missing category / category required errors ──
    if (msg.includes('missing category') || msg.includes('category is required')) {
      return {
        module,
        category: 'validation',
        message: `[VALIDATION] ${error.message}`,
        detail: error.message,
        possibleReason: `Missing category at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. Select a category and try again.`,
        retryable: false,
        timestamp,
        endpoint,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── Abort / cancel errors ──
    if (msg.includes('abort') || msg.includes('cancel')) {
      return {
        module,
        category: 'timeout',
        message: `[TIMEOUT] ${error.message}`,
        detail: error.message,
        possibleReason: `Request aborted at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. May be due to timeout.`,
        retryable: true,
        timestamp,
        endpoint,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── Bad request errors ──
    if (msg.includes('bad request')) {
      return {
        module,
        category: 'validation',
        message: `[VALIDATION] ${error.message}`,
        detail: error.message,
        possibleReason: `Bad request at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. Check input parameters.`,
        retryable: false,
        timestamp,
        endpoint,
        statusCode: 400,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── Constraint / foreign key / Prisma-specific errors ──
    if (msg.includes('constraint') || msg.includes('foreign key') || msg.includes('unique') ||
        msg.includes('violate') || msg.includes('duplicate') || msg.includes('already exists') ||
        msg.includes('record to update not found') || msg.includes('record to delete not found')) {
      return {
        module,
        category: 'database',
        message: `[DATABASE_CONSTRAINT] ${error.message}`,
        detail: error.message,
        possibleReason: `DB constraint error at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. Try running a fresh scan.`,
        retryable: true,
        timestamp,
        endpoint,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── Schema / migration errors ──
    if (msg.includes('migration') || msg.includes('schema') || msg.includes('column') ||
        msg.includes('table') || msg.includes('does not exist') || msg.includes('no such')) {
      return {
        module,
        category: 'database',
        message: `[DATABASE_SCHEMA] ${error.message}`,
        detail: error.message,
        possibleReason: `Schema error at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. Run "bun run db:push" to update.`,
        retryable: false,
        timestamp,
        endpoint,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── Timeout-like errors that aren't TimeoutError instances ──
    if (msg.includes('timed out') || msg.includes('timeout') || msg.includes('deadline exceeded') ||
        msg.includes('took too long') || msg.includes('expired')) {
      return {
        module,
        category: 'timeout',
        message: `[TIMEOUT] ${error.message}`,
        detail: error.message,
        possibleReason: `Timeout at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. Try with a narrower scope.`,
        retryable: true,
        timestamp,
        endpoint,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── Rate-limit-like errors with unusual phrasing ──
    if (msg.includes('slow down') || msg.includes('wait before') || msg.includes('try again later') ||
        msg.includes('quota') || msg.includes('limit exceeded') || msg.includes('capacity')) {
      return {
        module,
        category: 'rate_limit',
        message: `[RATE_LIMIT] ${error.message}`,
        detail: error.message,
        possibleReason: `Rate limit at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. Wait 60 seconds before retrying.`,
        retryable: true,
        timestamp,
        endpoint,
        statusCode: 429,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── AI/LLM generation errors with unusual phrasing ──
    if (msg.includes('completion') || msg.includes('generation') || msg.includes('model') ||
        msg.includes('token') || msg.includes('context length') || msg.includes('context window') ||
        msg.includes('content policy') || msg.includes('safety')) {
      return {
        module,
        category: 'ai_response',
        message: `[AI_RESPONSE] ${error.message}`,
        detail: error.message,
        possibleReason: `AI error at stage ${extractedStage || 'unknown'}: ${error.message.substring(0, 100)}. Input may be too long or triggered content policy.`,
        retryable: true,
        timestamp,
        endpoint,
        ...errorOrigin,
        ...ctx,
      };
    }

    // ── Generic error with message — fallback to 'api' instead of 'unknown' ──
    // NEVER replace original error message with generic text
    // Note: Already-classified errors are caught at the top of this function.
    return {
      module,
      category: 'api',
      message: `[API_ERROR] ${error.message}`,
      detail: `[${error.constructor.name}] ${error.message}`,
      possibleReason: `Error at stage ${extractedStage || 'unknown'} (${error.constructor.name}): ${error.message.substring(0, 150)}. Check Debug Info for full stack trace.`,
      retryable: true,
      timestamp,
      endpoint,
      ...errorOrigin,
      ...ctx,
    };
  }

  // Non-Error thrown — classify as 'api' (never 'unknown')
  const errorStr = String(error).substring(0, 500);
  const nonErrorStageMatch = errorStr.match(/^\[([A-Z_]+)\]/);
  const nonErrorStage = nonErrorStageMatch ? nonErrorStageMatch[1] : undefined;

  return {
    module,
    category: 'api',
    message: `[UNCLASSIFIED] ${errorStr}`,
    detail: `Non-Error value thrown: ${errorStr}`,
    possibleReason: `Non-Error at stage ${nonErrorStage || 'unknown'}: ${errorStr.substring(0, 100)}. Check server logs.`,
    retryable: true,
    timestamp,
    endpoint,
    stage: nonErrorStage,
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

// ─── Stage-Level Error Logger ────────────────────────────────────

/**
 * Logs a STAGE-LEVEL error with FULL STACK TRACE.
 * This is the PRIMARY tool for debugging backend failures.
 * Every catch block in every route should use this.
 *
 * Usage:
 *   catch (error) {
 *     logStageError('SCAN', 'webSearch', error);
 *     throw error; // NEVER swallow the original error
 *   }
 */
export function logStageError(
  module: string,
  stage: string,
  error: unknown,
  extra?: Record<string, unknown>
): void {
  const errorObj = error instanceof Error ? error : undefined;
  console.error(`[STAGE ERROR] ${module} [${stage}]`, {
    stage,
    module,
    message: errorObj?.message || String(error),
    stack: errorObj?.stack || 'NO_STACK_AVAILABLE',
    name: errorObj?.name || typeof error,
    cause: errorObj?.cause || undefined,
    raw: error,
    ...extra,
  });
}

/**
 * Logs a stage START marker for tracing execution flow.
 */
export function logStageStart(module: string, stage: string, detail?: string): void {
  console.log(`[${module}] ▶ [${stage}]${detail ? ` ${detail}` : ''}`);
}

/**
 * Logs a stage END marker for tracing execution flow.
 */
export function logStageEnd(module: string, stage: string, detail?: string, data?: Record<string, unknown>): void {
  const msg = `[${module}] ✔ [${stage}]${detail ? ` ${detail}` : ''}`;
  if (data) {
    console.log(msg, JSON.stringify(data));
  } else {
    console.log(msg);
  }
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

// ─── createErrorResponse: Build Structured Error Response ─────────

/**
 * Creates a structured NextResponse.json error that PRESERVES:
 * - The original error message (never replaces with generic text)
 * - The original error stack trace
 * - The stage name where the error occurred
 * - The classified error category
 *
 * Usage:
 *   catch (error) {
 *     logStageError(MODULE, 'STAGE_NAME', error);
 *     return createErrorResponse(error, MODULE, '/api/endpoint', {
 *       stage: 'STAGE_NAME',
 *       category: body?.category,
 *       payload: `category=${body?.category}`,
 *     });
 *   }
 */
export function createErrorResponse(
  error: unknown,
  module: string,
  endpoint: string,
  context?: {
    stage?: string;
    category?: string;
    payload?: string;
    statusCode?: number;
  }
): Response {
  const moduleError = classifyError(error, module, endpoint, {
    category: context?.category,
    payload: context?.payload,
    backendMessage: error instanceof Error ? error.message : String(error),
  });

  // Enrich with stage if provided and not already extracted
  if (context?.stage && !moduleError.stage) {
    moduleError.stage = context.stage;
  }

  // Enrich with original stack if not already present
  if (!moduleError.originalStack && error instanceof Error && error.stack) {
    moduleError.originalStack = error.stack;
  }

  // Enrich with original constructor name
  if (!moduleError.originalName && error instanceof Error) {
    moduleError.originalName = error.constructor.name;
  }

  const debug = {
    stage: moduleError.stage || context?.stage,
    errorCategory: moduleError.category,
    originalError: error instanceof Error ? error.message : String(error),
    originalStack: error instanceof Error ? error.stack : undefined,
    originalName: error instanceof Error ? error.constructor.name : typeof error,
    receivedCategory: context?.category,
    requestPayload: context?.payload,
    caughtBy: 'createErrorResponse',
  };

  const status = context?.statusCode || moduleError.statusCode || 500;

  return new Response(
    JSON.stringify({
      error: moduleError.message,
      moduleError,
      debug,
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
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

      // Build debug info with full original error details
      const originalError = error instanceof Error ? error : undefined;
      const debugData = {
        ...debugInfo,
        originalError: originalError?.message || String(error),
        originalStack: originalError?.stack || undefined,
        originalName: originalError?.constructor.name || typeof error,
        errorType: originalError?.constructor.name || typeof error,
        caughtBy: 'global_error_handler',
        duration,
      };

      // Enrich moduleError with original stack if not already present
      if (!moduleError.originalStack && originalError?.stack) {
        moduleError.originalStack = originalError.stack;
      }
      if (!moduleError.stage) {
        const stageMatch = moduleError.message.match(/^\[([A-Z_]+)\]/);
        if (stageMatch) moduleError.stage = stageMatch[1];
      }
      if (!moduleError.originalName && originalError) {
        moduleError.originalName = originalError.constructor.name;
      }

      return new Response(
        JSON.stringify({
          error: moduleError.message,
          moduleError,
          debug: debugData,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}
