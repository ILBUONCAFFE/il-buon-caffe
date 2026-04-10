/**
 * Create Admin Account Script
 * Run with: npx tsx scripts/create-admin.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { users } from '../src/db/schema';
import { hashPassword, validatePasswordStrength } from '../src/lib/auth/password';

// Load env from apps/web/.env
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sql });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  console.log('\n🔐 Il Buon Caffe — Tworzenie konta administratora\n');

  const email = await ask('Email: ');
  if (!email || !email.includes('@')) {
    console.error('❌ Nieprawidłowy email');
    process.exit(1);
  }

  // Check if email already exists
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase()));
  if (existing.length > 0) {
    console.error(`❌ Użytkownik z emailem ${email} już istnieje`);
    process.exit(1);
  }

  const password = await ask('Hasło (min 10 znaków, wielka litera + cyfra): ');
  const validation = validatePasswordStrength(password);
  if (!validation.valid) {
    console.error('❌ Hasło nie spełnia wymagań:');
    validation.errors.forEach((e) => console.error(`   - ${e}`));
    process.exit(1);
  }

  const name = await ask('Imię i nazwisko: ');

  console.log('\nTworzenie konta...');

  const passwordHash = await hashPassword(password);

  await db.insert(users).values({
    email: email.toLowerCase(),
    passwordHash,
    name: name || null,
    role: 'admin',
    emailVerified: true,
    emailVerifiedAt: new Date(),
    gdprConsentDate: new Date(),
    termsVersion: '1.0',
    privacyVersion: '1.0',
  });

  console.log(`\n✅ Admin utworzony: ${email}`);
  console.log('   Możesz się zalogować na /admin/login\n');

  rl.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Błąd:', err.message);
  rl.close();
  process.exit(1);
});
