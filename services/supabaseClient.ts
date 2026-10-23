// SuperApp Supabase client (APP Gallery project: opdotszsldcgwjqtvgul)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://opdotszsldcgwjqtvgul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZG90c3pzbGRjZ3dqcXR2Z3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTMwMTgsImV4cCI6MjA4MzMyOTAxOH0.rD_bjCil2I3nYBlilYUObObR0oUkbDbBQN4mCmtwLXI';

/**
 * The shared pet package re-reads `inventory_pet` very often: fetchStats()
 * runs 4x (now, +0.5s, +2s, +5s) every time the pet owner id / auth status
 * changes, and the sleep-sync hook adds another read on mount and on every
 * focus/visibility change. We can't edit the package, so identical reads of
 * these tables are collapsed here:
 *  - same URL + same auth token within READ_COALESCE_TTL_MS share one request
 *  - any write (POST/PATCH/PUT/DELETE) to the same table drops its cache
 *  - failed responses are never cached
 * A different token (e.g. auth finishing hydrating) is a different key, so
 * it still refetches.
 */
const COALESCED_TABLES = ['inventory_pet'];
const READ_COALESCE_TTL_MS = 3000;

const coalescedReads = new Map<string, { at: number; promise: Promise<Response> }>();

const tableOf = (url: string): string | null => {
  const match = /\/rest\/v1\/([^/?#]+)/.exec(url);
  return match ? match[1] : null;
};

const coalescingFetch: typeof fetch = (input, init) => {
  const url =
    typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (
    init?.method || (typeof input === 'object' && 'method' in input ? input.method : 'GET')
  ).toUpperCase();
  const table = tableOf(url);

  if (!table || !COALESCED_TABLES.includes(table)) {
    return fetch(input, init);
  }

  if (method !== 'GET') {
    // A write to this table: drop cached reads so the next read is fresh.
    for (const key of coalescedReads.keys()) {
      if (tableOf(key.split('|')[1] ?? '') === table) coalescedReads.delete(key);
    }
    return fetch(input, init);
  }

  const auth = new Headers(
    init?.headers ?? (typeof input === 'object' && 'headers' in input ? input.headers : undefined)
  ).get('authorization');
  const key = `${auth ?? ''}|${url}`;
  const now = Date.now();
  const hit = coalescedReads.get(key);

  if (hit && now - hit.at < READ_COALESCE_TTL_MS) {
    return hit.promise.then((res) => res.clone());
  }

  const promise = fetch(input, init).then((res) => {
    if (!res.ok) coalescedReads.delete(key);
    return res;
  });
  promise.catch(() => coalescedReads.delete(key));
  coalescedReads.set(key, { at: now, promise });
  return promise.then((res) => res.clone());
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { fetch: coalescingFetch },
});

/**
 * supabase.auth.getUser() always makes a network request to /auth/v1/user.
 * The shared pet package (@mrburdeveloperteam/pet-function) calls it from
 * every pet repository's loadCatalog(), so a single page load fired it many
 * times. We can't edit the package, so we de-duplicate here:
 *  - concurrent calls share one in-flight request
 *  - the result is reused for USER_CACHE_TTL_MS
 *  - the cache is dropped on any auth state change (sign in/out, refresh,
 *    user update) so it never serves a stale identity
 * Calls that pass an explicit JWT are not cached.
 */
const USER_CACHE_TTL_MS = 5 * 60 * 1000;

type GetUserResult = Awaited<ReturnType<typeof supabase.auth.getUser>>;

let cachedUser: GetUserResult | null = null;
let cachedAt = 0;
let inflightUser: Promise<GetUserResult> | null = null;

const originalGetUser = supabase.auth.getUser.bind(supabase.auth);

const resetUserCache = () => {
  cachedUser = null;
  cachedAt = 0;
  inflightUser = null;
};

supabase.auth.getUser = (async (jwt?: string) => {
  if (jwt) return originalGetUser(jwt);

  if (cachedUser && Date.now() - cachedAt < USER_CACHE_TTL_MS) {
    return cachedUser;
  }
  if (inflightUser) return inflightUser;

  inflightUser = originalGetUser()
    .then((result) => {
      // Only cache a successful lookup; errors (e.g. signed out) must retry.
      if (!result.error && result.data?.user) {
        cachedUser = result;
        cachedAt = Date.now();
      }
      return result;
    })
    .finally(() => {
      inflightUser = null;
    });

  return inflightUser;
}) as typeof supabase.auth.getUser;

supabase.auth.onAuthStateChange(() => {
  resetUserCache();
});
