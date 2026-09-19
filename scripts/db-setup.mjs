// Runs the single bootstrap migration (supabase/init.sql) against the remote
// database and, by default, ensures the test auth accounts exist.
//
// Usage:
//   node scripts/db-setup.mjs            # migration + seed test users
//   node scripts/db-setup.mjs --schema-only  # run the migration only (prod-safe)
//
// Requires in .env:
//   SUPABASE_DB_URL           (Connection string / pooler URL, postgres role)
//   SUPABASE_SERVICE_ROLE_KEY (Auth admin key, for creating users; skipped with --schema-only)

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  const envPath = resolve(root, '.env');
  const parsed = {};
  if (existsSync(envPath)) {
    for (const raw of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#') || !line.includes('=')) continue;
      const eq = line.indexOf('=');
      parsed[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    }
  }
  return { ...parsed, ...process.env };
}

const TEST_USERS = [
  { email: 'admin@gowritoys.com', full_name: 'Admin', role: 'admin' },
  { email: 'supervisor@gowritoys.com', full_name: 'Supervisor', role: 'supervisor' },
];

async function runSql(url) {
  const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  const sql = readFileSync(resolve(root, 'supabase', 'init.sql'), 'utf8');
  const res = await client.query(sql);
  await client.end();
  return res;
}

async function upsertAuthUser(apiUrl, serviceKey, user) {
  const admin = createClient(apiUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = data?.users?.find((u) => u.email === user.email);
  const metadata = { full_name: user.full_name, role: user.role };

  if (existing) {
    // Reuse the account when it already exists (it may own attendance data via
    // profiles/attendance). Keep the display metadata in sync without
    // recreating it, so existing sessions and marked_by references survive.
    await admin.auth.admin.updateUserById(existing.id, { user_metadata: metadata });
    return existing.id;
  }

  const created = await admin.auth.admin.createUser({
    email: user.email,
    password: 'password123',
    email_confirm: true,
    user_metadata: metadata,
  });
  return created.data.user.id;
}

async function main() {
  const env = loadEnv();
  const dbUrl = env.SUPABASE_DB_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const apiUrl = (env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const schemaOnly = process.argv.includes('--schema-only');

  if (!dbUrl) throw new Error('SUPABASE_DB_URL is not set in .env');

  const host = dbUrl.replace(/^postgres(ql)?:\/\//, '').split('@').pop()?.split(':')[0] ?? 'unknown';
  console.log(
    `Running migration (supabase/init.sql) against ${host}${schemaOnly ? ' (schema only)' : ''}...`
  );
  await runSql(dbUrl);
  console.log('Migration OK.');

  if (schemaOnly) {
    console.log('Schema is up to date.');
    return;
  }

  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in .env');
  if (!apiUrl) throw new Error('EXPO_PUBLIC_SUPABASE_URL is not set in .env');

  console.log('Applying test users...');
  for (const user of TEST_USERS) {
    const id = await upsertAuthUser(apiUrl, serviceKey, user);
    console.log(`  OK ${user.email} (${user.role}) -> ${id}`);
  }
  console.log('Database is up to date.');
}

main().catch((err) => {
  console.error(`\ndb-setup failed: ${err.message}`);
  process.exit(1);
});