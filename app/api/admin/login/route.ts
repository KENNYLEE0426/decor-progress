import { NextResponse } from 'next/server'
import { setAdminSessionCookie } from '@/lib/auth'

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

    const passwordOk = password === adminPass
    const usernameOk = !adminUser || username === null || username === adminUser

    if (!passwordOk || !usernameOk) {
      return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    setAdminSessionCookie(response)
    return response
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
