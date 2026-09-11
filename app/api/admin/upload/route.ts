import { NextResponse } from 'next/server'
import { requireAdminSession, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  if (!(await requireAdminSession())) return unauthorized()

  try {
    const body = await request.json()
    const folder = String(body.folder || 'logs')
    const contentType = String(body.contentType || 'image/jpeg')
    const originalName = String(body.fileName || 'photo.jpg')
    const fileExt = originalName.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'jpg'
    const allowed = new Set(['logs', 'receipts', 'reports'])
    const safeFolder = allowed.has(folder) ? folder : 'logs'
    const filePath = `${safeFolder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`

    const supabase = createServiceClient()
    const { data, error } = await supabase.storage
      .from('progress-photos')
      .createSignedUploadUrl(filePath)

    if (error || !data) {
      return NextResponse.json({ error: error?.message || '無法建立上傳連結' }, { status: 500 })
    }

    const { data: publicUrlData } = supabase.storage.from('progress-photos').getPublicUrl(filePath)

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: data.path || filePath,
      publicUrl: publicUrlData.publicUrl,
      contentType,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '伺服器錯誤' }, { status: 500 })
  }
}
