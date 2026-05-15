import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let dbInitError: string | null = null;

// Initialize PrismaClient with error capture
let prismaInstance: PrismaClient;
try {
  prismaInstance = globalForPrisma.prisma ??
    new PrismaClient({
      log: [
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
  
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prismaInstance;
  console.log('[DB] PrismaClient initialized successfully');
} catch (err) {
  dbInitError = err instanceof Error ? err.message : String(err);
  console.error('[DB] PrismaClient initialization FAILED:', dbInitError);
  // Create a dummy client that will throw meaningful errors on use
  prismaInstance = null as unknown as PrismaClient;
}

export const db = prismaInstance;

/**
 * Verify the database connection is working.
 * Call this at startup or before critical operations.
 */
export async function checkDatabaseConnection(): Promise<{ ok: boolean; error?: string; latencyMs?: number }> {
  if (dbInitError) {
    return { ok: false, error: `Database initialization failed: ${dbInitError}` };
  }

  try {
    const start = Date.now();
    // Simple query to verify connection
    await db.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    console.log(`[DB] Health check passed (${latencyMs}ms)`);
    return { ok: true, latencyMs };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[DB] Health check FAILED: ${msg}`);
    return { ok: false, error: msg };
  }
}

/**
 * Execute a database operation with error wrapping.
 * Catches Prisma errors and throws with better context.
 */
export async function safeDbOp<T>(
  operation: string,
  fn: () => Promise<T>,
  fallback?: T
): Promise<T> {
  try {
    if (dbInitError) {
      throw new Error(`Database not available (initialization failed): ${dbInitError}`);
    }
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[DB] Operation "${operation}" failed: ${msg}`);
    
    // If a fallback is provided, return it instead of throwing
    if (fallback !== undefined) {
      console.warn(`[DB] Using fallback for operation "${operation}"`);
      return fallback;
    }
    
    // Wrap Prisma errors with better context
    if (msg.includes('Prisma') || msg.includes('prisma')) {
      throw new Error(`Database error in ${operation}: ${msg}`);
    }
    if (msg.includes('SQLITE_BUSY') || msg.includes('database is locked')) {
      throw new Error(`Database is locked during ${operation}. Try again in a moment.`);
    }
    if (msg.includes('does not exist') || msg.includes('no such table')) {
      throw new Error(`Database schema not initialized for ${operation}. Run 'bun run db:push' to create tables.`);
    }
    
    throw err;
  }
}
