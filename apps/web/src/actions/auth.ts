'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, sql } from '@repo/db/orm';

/**
 * Check if a user email exists in the Neon database.
 * Used for pre-validation on the client before submitting to the API.
 */
export async function checkEmailAvailability(email: string): Promise<{ available: boolean }> {
  if (!email || !email.includes('@')) {
    return { available: false };
  }

  try {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
      columns: { id: true },
    });

    return { available: !existing };
  } catch (error) {
    console.error('[auth action] checkEmailAvailability error:', error);
    // Don't leak DB errors — fall back gracefully
    return { available: true };
  }
}

/**
 * Verify Neon database connectivity.
 * Returns connection details (safe to expose) or an error message.
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  region?: string;
  latencyMs?: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    const result = await db.execute<{ now: string }>(sql`SELECT NOW() as now`);
    const latencyMs = Date.now() - start;

    return {
      connected: true,
      region: 'eu-central-1',
      latencyMs,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
