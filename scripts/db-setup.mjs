// Runs the single bootstrap migration (supabase/init.sql) against the remote
// database and ensures the test auth accounts exist.
//
// Requires in .env:
//   SUPABASE_DB_URL           (Connection string / pooler URL, postgres role)
//   SUPABASE_SERVICE_ROLE_KEY (Auth admin key, for creating users)

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
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
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };
  const list = await fetch(`${apiUrl}/auth/v1/admin/users?email=${encodeURIComponent(user.email)}`, {
    headers,
  });
  if (list.ok) {
    const body = await list.json();
    const existing = body.users?.[0];
    if (existing) {
      const del = await fetch(`${apiUrl}/auth/v1/admin/users/${existing.id}`, { method: 'DELETE', headers });
      if (!del.ok) throw new Error(`delete ${user.email}: HTTP ${del.status} ${await del.text()}`);
    }
  }
  const create = await fetch(`${apiUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: user.email,
      password: 'password123',
      email_confirm: true,
      user_metadata: { full_name: user.full_name, role: user.role },
    }),
  });
  if (!create.ok) throw new Error(`create ${user.email}: HTTP ${create.status} ${await create.text()}`);
  const created = await create.json();
  return created.id;
}

async function main() {
  const env = loadEnv();
  const dbUrl = env.SUPABASE_DB_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const apiUrl = (env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');

  if (!dbUrl) throw new Error('SUPABASE_DB_URL is not set in .env');
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in .env');
  if (!apiUrl) throw new Error('EXPO_PUBLIC_SUPABASE_URL is not set in .env');

  console.log('Running migration (supabase/init.sql)...');
  await runSql(dbUrl);
  console.log('Migration OK.');

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