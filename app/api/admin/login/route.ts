import { NextResponse } from 'next/server'
import { setAdminSessionCookie } from '@/lib/auth'
import {
  assertNotRateLimited,
  clearAuthFailures,
  getClientIp,
  recordAuthFailure,
} from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const password = String(body.password || '')
    const username = body.username != null ? String(body.username) : null

    const adminPass = process.env.ADMIN_PASS
    const adminUser = process.env.ADMIN_USER

    if (!adminPass) {
      return NextResponse.json({ error: '伺服器未設定管理員密碼' }, { status: 500 })
    }

    const ip = getClientIp(request)
    const key = `admin:ip:${ip}`

    const gate = await assertNotRateLimited(key)
    if (!gate.ok) {
      return NextResponse.json({ error: gate.message, locked: true }, { status: 429 })
    }

    const passwordOk = password === adminPass
    const usernameOk = !adminUser || username === null || username === adminUser

    if (!passwordOk || !usernameOk) {
      const result = await recordAuthFailure(key)
      return NextResponse.json(
        {
          error: result.locked
            ? result.message
            : `帳號或密碼錯誤（尚餘 ${result.remaining} 次嘗試）`,
          locked: result.locked,
        },
        { status: result.locked ? 429 : 401 }
      )
    }

    await clearAuthFailures(key)

    const response = NextResponse.json({ success: true })
    setAdminSessionCookie(response)
    return response
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
