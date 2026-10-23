// SuperApp Supabase client (APP Gallery project: opdotszsldcgwjqtvgul)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://opdotszsldcgwjqtvgul.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZG90c3pzbGRjZ3dqcXR2Z3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3NTMwMTgsImV4cCI6MjA4MzMyOTAxOH0.rD_bjCil2I3nYBlilYUObObR0oUkbDbBQN4mCmtwLXI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
