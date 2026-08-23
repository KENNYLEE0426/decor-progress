import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { phone, pin } = await request.json()

    if (!phone || !pin) {
      return NextResponse.json({ error: '請輸入電話號碼與 PIN 碼' }, { status: 400 })
    }

    const supabase = createClient()

    // 🎯 關鍵修復：必須精準比對 client_phone 與 client_pin
    const { data: project, error } = await supabase
      .from('projects')
      .select('id, client_phone, client_pin')
      .eq('client_phone', phone.trim())
      .eq('client_pin', pin.trim())
      .maybeSingle()

    if (error || !project) {
      return NextResponse.json({ error: '電話號碼或 PIN 碼不正確！' }, { status: 401 })
    }

    // 驗證成功，回傳對應單位的專屬 ID
    return NextResponse.json({
      success: true,
      projectId: project.id
    })

  } catch (err) {
    console.error('Login error:', err)
    return NextResponse.json({ error: '伺服器發生錯誤' }, { status: 500 })
  }
}
