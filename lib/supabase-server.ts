import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null

/**
 * Server-only Supabase client.
 * Prefer SUPABASE_SERVICE_ROLE_KEY (required before enabling RLS).
 * Falls back to anon key only so deploys keep working until the service role is configured.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const key = serviceKey || anonKey

  if (!url || !key) {
    throw new Error('Missing Supabase URL or key')
  }

  if (!serviceKey) {
    console.warn(
      '[security] SUPABASE_SERVICE_ROLE_KEY missing — server is using anon key. Add service role before running rls-lockdown.sql.'
    )
  }

  if (cached) return cached

  cached = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return cached
}
