import { createServiceClient } from '@/lib/supabase-server'

const MAX_FAILS = 10
const LOCK_MS = 30 * 60 * 1000 // 30 minutes

type MemoryEntry = {
  fails: number
  lockedUntil: number
}

const memoryStore: Map<string, MemoryEntry> =
  (globalThis as any).__authRateLimitStore || new Map()
;(globalThis as any).__authRateLimitStore = memoryStore

export function getClientIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}

function formatRemain(ms: number) {
  const mins = Math.max(1, Math.ceil(ms / 60000))
  return mins
}

function memoryCheck(key: string) {
  const now = Date.now()
  const entry = memoryStore.get(key)
  if (!entry) return { ok: true as const }
  if (entry.lockedUntil > now) {
    return {
      ok: false as const,
      retryAfterMs: entry.lockedUntil - now,
      message: `嘗試次數過多，請 ${formatRemain(entry.lockedUntil - now)} 分鐘後再試`,
    }
  }
  return { ok: true as const }
}

function memoryFail(key: string) {
  const now = Date.now()
  const entry = memoryStore.get(key) || { fails: 0, lockedUntil: 0 }
  if (entry.lockedUntil > now) {
    return {
      locked: true,
      retryAfterMs: entry.lockedUntil - now,
      message: `嘗試次數過多，請 ${formatRemain(entry.lockedUntil - now)} 分鐘後再試`,
    }
  }

  entry.fails += 1
  if (entry.fails >= MAX_FAILS) {
    entry.lockedUntil = now + LOCK_MS
    entry.fails = 0
    memoryStore.set(key, entry)
    return {
      locked: true,
      retryAfterMs: LOCK_MS,
      message: `嘗試次數過多，請 30 分鐘後再試`,
    }
  }

  memoryStore.set(key, entry)
  return {
    locked: false,
    remaining: MAX_FAILS - entry.fails,
    message: `電話號碼或密碼不正確（尚餘 ${MAX_FAILS - entry.fails} 次嘗試）`,
  }
}

function memoryReset(key: string) {
  memoryStore.delete(key)
}

async function dbCheck(key: string) {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('auth_rate_limits')
    .select('fails, locked_until')
    .eq('key', key)
    .maybeSingle()

  if (error) throw error
  if (!data) return { ok: true as const }

  const lockedUntil = data.locked_until ? new Date(data.locked_until).getTime() : 0
  const now = Date.now()
  if (lockedUntil > now) {
    return {
      ok: false as const,
      retryAfterMs: lockedUntil - now,
      message: `嘗試次數過多，請 ${formatRemain(lockedUntil - now)} 分鐘後再試`,
    }
  }
  return { ok: true as const }
}

async function dbFail(key: string) {
  const supabase = createServiceClient()
  const now = Date.now()

  const { data: existing } = await supabase
    .from('auth_rate_limits')
    .select('fails, locked_until')
    .eq('key', key)
    .maybeSingle()

  const lockedUntil = existing?.locked_until ? new Date(existing.locked_until).getTime() : 0
  if (lockedUntil > now) {
    return {
      locked: true,
      retryAfterMs: lockedUntil - now,
      message: `嘗試次數過多，請 ${formatRemain(lockedUntil - now)} 分鐘後再試`,
    }
  }

  const fails = (existing?.fails || 0) + 1
  if (fails >= MAX_FAILS) {
    const until = new Date(now + LOCK_MS).toISOString()
    const { error } = await supabase.from('auth_rate_limits').upsert({
      key,
      fails: 0,
      locked_until: until,
      updated_at: new Date().toISOString(),
    })
    if (error) throw error
    return {
      locked: true,
      retryAfterMs: LOCK_MS,
      message: `嘗試次數過多，請 30 分鐘後再試`,
    }
  }

  const { error } = await supabase.from('auth_rate_limits').upsert({
    key,
    fails,
    locked_until: null,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error

  return {
    locked: false,
    remaining: MAX_FAILS - fails,
    message: `輸入不正確（尚餘 ${MAX_FAILS - fails} 次嘗試）`,
  }
}

async function dbReset(key: string) {
  const supabase = createServiceClient()
  await supabase.from('auth_rate_limits').delete().eq('key', key)
}

export async function assertNotRateLimited(key: string) {
  try {
    return await dbCheck(key)
  } catch {
    return memoryCheck(key)
  }
}

export async function recordAuthFailure(key: string) {
  try {
    return await dbFail(key)
  } catch {
    return memoryFail(key)
  }
}

export async function clearAuthFailures(key: string) {
  try {
    await dbReset(key)
  } catch {
    memoryReset(key)
  }
  memoryReset(key)
}
