import { NextResponse } from 'next/server'
import { setClientSessionCookie } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import {
  assertNotRateLimited,
  clearAuthFailures,
  getClientIp,
  recordAuthFailure,
} from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const { phone, pin } = await request.json()

    if (!phone || !pin) {
      return NextResponse.json({ error: '請輸入電話號碼與 PIN 碼' }, { status: 400 })
    }

    const ip = getClientIp(request)
    const phoneKey = `client:phone:${String(phone).trim()}`
    const ipKey = `client:ip:${ip}`

    for (const key of [phoneKey, ipKey]) {
      const gate = await assertNotRateLimited(key)
      if (!gate.ok) {
        return NextResponse.json({ error: gate.message, locked: true }, { status: 429 })
      }
    }

    const supabase = createServiceClient()

    const { data: project, error } = await supabase
      .from('projects')
      .select('id')
      .eq('client_phone', String(phone).trim())
      .eq('client_pin', String(pin).trim())
      .maybeSingle()

    if (error || !project) {
      const failPhone = await recordAuthFailure(phoneKey)
      const failIp = await recordAuthFailure(ipKey)
      const result = failPhone.locked ? failPhone : failIp
      return NextResponse.json(
        {
          error: result.locked
            ? result.message
            : `電話號碼或 PIN 碼不正確！（尚餘 ${result.remaining} 次嘗試）`,
          locked: result.locked,
        },
        { status: result.locked ? 429 : 401 }
      )
    }

    await clearAuthFailures(phoneKey)
    await clearAuthFailures(ipKey)

    const response = NextResponse.json({ success: true })
    setClientSessionCookie(response, project.id)
    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: '伺服器發生錯誤' }, { status: 500 })
  }
}
