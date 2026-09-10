import { NextResponse } from 'next/server'
import { setClientSessionCookie } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { phone, pin } = await request.json()

    if (!phone || !pin) {
      return NextResponse.json({ error: '請輸入電話號碼與 PIN 碼' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: project, error } = await supabase
      .from('projects')
      .select('id')
      .eq('client_phone', String(phone).trim())
      .eq('client_pin', String(pin).trim())
      .maybeSingle()

    if (error || !project) {
      return NextResponse.json({ error: '電話號碼或 PIN 碼不正確！' }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    setClientSessionCookie(response, project.id)
    return response
  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: '伺服器發生錯誤' }, { status: 500 })
  }
}
