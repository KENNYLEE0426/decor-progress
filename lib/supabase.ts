/**
 * Browser Supabase client removed from app data paths.
 * All sensitive reads/writes go through server APIs with service role.
 * This file is kept only so accidental imports fail loudly.
 */
export function createClient(): never {
  throw new Error('Browser Supabase client disabled. Use server APIs instead.')
}
