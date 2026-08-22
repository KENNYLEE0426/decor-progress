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

    const now = new Date()
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString()
    const oneMinAgo = new Date(now.getTime() - 1 * 60 * 1000).toISOString()

    // 1. 防 DDOS 檢查 (1 分鐘上限 15 次)
    const { data: ipAttempts } = await supabase
      .from('login_attempts')
      .select('id')
      .eq('ip_address', ip)
      .gte('attempted_at', oneMinAgo)

    if (ipAttempts && ipAttempts.length >= 15) {
      return NextResponse.json(
        { error: '系統偵測到異常請求，請稍後再試 (Anti-DDOS 保護)。' },
        { status: 429 }
      )
    }

    // 2. 防白撞檢查 (30 分鐘內錯 5 次鎖定)
    const { data: recentFailures } = await supabase
      .from('login_attempts')
      .select('id, attempted_at')
      .eq('phone', phone)
      .eq('is_success', false)
      .gte('attempted_at', thirtyMinsAgo)
      .order('attempted_at', { ascending: false })

    if (recentFailures && recentFailures.length >= 5) {
      const lastFailureTime = new Date(recentFailures[0].attempted_at).getTime()
      const unlockTime = new Date(lastFailureTime + 30 * 60 * 1000)
      const remainingMins = Math.ceil((unlockTime.getTime() - now.getTime()) / (1000 * 60))

      return NextResponse.json(
        { error: `密碼錯誤次數過多！帳號已鎖定，請等待 ${remainingMins > 0 ? remainingMins : 1} 分鐘後再試。` },
        { status: 429 }
      )
    }

    // 3. 驗證手機號碼與 PIN 碼
    const { data: project } = await supabase
      .from('projects')
      .select('id, address')
      .eq('client_phone', phone)
      .eq('client_pin', pin)
      .maybeSingle()

    if (!project) {
      // 紀錄失敗
      await supabase.from('login_attempts').insert({
        ip_address: ip,
        phone,
        is_success: false,
      })

      const remainingAttempts = 5 - ((recentFailures?.length || 0) + 1)
      const warningMsg =
        remainingAttempts > 0
          ? `電話號碼或 PIN 碼錯誤！仲可以嘗試 ${remainingAttempts} 次。`
          : '密碼錯誤次數過多！帳號已鎖定 30 分鐘。'

      return NextResponse.json({ error: warningMsg }, { status: 401 })
    }

    // 4. 驗證成功
    await supabase.from('login_attempts').insert({
      ip_address: ip,
      phone,
      is_success: true,
    })

    return NextResponse.json({ success: true, projectId: project.id })
  } catch (err: any) {
    return NextResponse.json({ error: '伺服器內部錯誤：' + err.message }, { status: 500 })
  }
}
