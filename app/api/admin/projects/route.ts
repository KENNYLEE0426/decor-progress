import { NextResponse } from 'next/server'
import { requireAdminSession, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET() {
  if (!(await requireAdminSession())) return unauthorized()

  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('projects')
      .select('id, address, client_name, status, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      // 未加 client_name 欄位時 fallback，避免整站掛掉
      if (String(error.message || '').includes('client_name')) {
        const fallback = await supabase
          .from('projects')
          .select('id, address, status, created_at')
          .order('created_at', { ascending: false })
        if (fallback.error) {
          return NextResponse.json({ error: fallback.error.message }, { status: 500 })
        }
        return NextResponse.json({ projects: fallback.data || [] })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ projects: data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '伺服器錯誤' }, { status: 500 })
  }
}
