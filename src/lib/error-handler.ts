/**
 * GapScope Error Handling Utilities
 * 
 * Provides:
 * - Retry logic with exponential backoff
 * - Timeout protection for async operations
 * - Structured error logging
 * - Data validation helpers
 * - Module-level error classification
 */

// ─── Error Classification ─────────────────────────────────────────

export type ErrorCategory = 
  | 'api'          // External API call failed
  | 'parsing'      // JSON/response parsing failed
  | 'timeout'      // Request took too long
  | 'ai_response'  // LLM returned invalid/unparseable response
  | 'database'     // Database operation failed
  | 'validation'   // Data validation failed
  | 'unknown';     // Unclassified error

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
}

// ─── Classify Error ──────────────────────────────────────────────

export function classifyError(error: unknown, module: string, endpoint?: string): ModuleError {
  const timestamp = new Date().toISOString();
  
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
    };
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    
    // AI response parsing errors
    if (msg.includes('failed to parse ai response') || msg.includes('json')) {
      return {
        module,
        category: 'ai_response',
        message: `${module} received an invalid AI response`,
        detail: error.message,
        possibleReason: 'The AI model returned data in an unexpected format. Retrying usually resolves this.',
        retryable: true,
        timestamp,
        endpoint,
      };
    }

    // Network/API errors
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
      };
    }

    // Database errors
    if (msg.includes('prisma') || msg.includes('sqlite') || msg.includes('database')) {
      return {
        module,
        category: 'database',
        message: `${module} encountered a database error`,
        detail: error.message,
        possibleReason: 'Database may be locked or corrupted. This is usually temporary.',
        retryable: true,
        timestamp,
        endpoint,
      };
    }

    // Status code based errors
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
      };
    }

    if (msg.includes('429') || msg.includes('rate limit') || msg.includes('too many')) {
      return {
        module,
        category: 'api',
        message: `${module} hit a rate limit`,
        detail: error.message,
        possibleReason: 'Too many requests were sent. Wait a moment before retrying.',
        retryable: true,
        timestamp,
        endpoint,
        statusCode: 429,
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
      };
    }

    // Generic error with message
    return {
      module,
      category: 'unknown',
      message: `${module} failed`,
      detail: error.message,
      possibleReason: 'An unexpected error occurred. Try again, and if it persists, try a different category or scope.',
      retryable: true,
      timestamp,
      endpoint,
    };
  }

  // Non-Error thrown
  return {
    module,
    category: 'unknown',
    message: `${module} encountered an unknown error`,
    detail: String(error),
    possibleReason: 'An unexpected error occurred. Try again.',
    retryable: true,
    timestamp,
    endpoint,
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
    return msg.includes('429') || msg.includes('rate limit') || msg.includes('too many');
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
      const maxDelay = isRateLimited ? 60000 : opts.maxDelayMs;
      
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

export function logError(module: string, error: unknown, context?: LogContext): void {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    module,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorType: error instanceof Error ? error.constructor.name : typeof error,
    ...context,
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
