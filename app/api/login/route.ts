import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { phone, pin } = await request.json()
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'

    if (!phone || !pin) {
      return NextResponse.json({ error: '請輸入手機號碼與 PIN 碼' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: '系統設定錯誤：缺少 Supabase 設定檔' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // 驗證手機號碼與 PIN 碼 (精準比對)
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, address')
      .eq('client_phone', phone.trim())
      .eq('client_pin', pin.trim())
      .maybeSingle()

    if (projectError || !project) {
      return NextResponse.json({ error: '電話號碼或 PIN 碼錯誤！' }, { status: 401 })
    }

    // 驗證成功，明確回傳該帳號專屬的 ID
    return NextResponse.json({ 
      success: true, 
      projectId: project.id,
      address: project.address 
    })
  } catch (err: any) {
    return NextResponse.json({ error: '伺服器內部錯誤：' + err.message }, { status: 500 })
  }
}