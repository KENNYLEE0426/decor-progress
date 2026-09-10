import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const ADMIN_COOKIE = 'admin_session'
const CLIENT_COOKIE = 'client_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

function getSecret() {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASS
  if (!secret) {
    throw new Error('Missing SESSION_SECRET or ADMIN_PASS')
  }
  return secret
}

function sign(payload: string) {
  const sig = createHmac('sha256', getSecret()).update(payload).digest('hex')
  return `${payload}.${sig}`
}

function verify(token: string | undefined): string | null {
  if (!token) return null
  const lastDot = token.lastIndexOf('.')
  if (lastDot <= 0) return null

  const payload = token.slice(0, lastDot)
  const sig = token.slice(lastDot + 1)
  const expected = createHmac('sha256', getSecret()).update(payload).digest('hex')

  try {
    const a = Buffer.from(sig, 'utf8')
    const b = Buffer.from(expected, 'utf8')
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  } catch {
    return null
  }

  return payload
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: MAX_AGE,
    path: '/',
  }
}

export function setAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_COOKIE, sign('admin'), cookieOptions())
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_COOKIE, '', { ...cookieOptions(), maxAge: 0 })
}

export function setClientSessionCookie(response: NextResponse, projectId: string) {
  response.cookies.set(CLIENT_COOKIE, sign(projectId), cookieOptions())
}

export function clearClientSessionCookie(response: NextResponse) {
  response.cookies.set(CLIENT_COOKIE, '', { ...cookieOptions(), maxAge: 0 })
}

export async function requireAdminSession(): Promise<boolean> {
  const store = await cookies()
  return verify(store.get(ADMIN_COOKIE)?.value) === 'admin'
}

export async function requireClientProjectId(): Promise<string | null> {
  const store = await cookies()
  const projectId = verify(store.get(CLIENT_COOKIE)?.value)
  if (!projectId || projectId === 'admin') return null
  return projectId
}

export function unauthorized(message = '未授權') {
  return NextResponse.json({ error: message }, { status: 401 })
}
