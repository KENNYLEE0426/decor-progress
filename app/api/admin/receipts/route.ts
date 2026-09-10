import { NextResponse } from 'next/server'
import { requireAdminSession, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

async function uploadPhoto(file: File, folder: string) {
  const supabase = createServiceClient()
  const fileExt = file.name.split('.').pop() || 'jpg'
  const fileName = `${folder}_${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`
  const filePath = `${folder}/${fileName}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('progress-photos')
    .upload(filePath, buffer, { contentType: file.type || 'image/jpeg' })

  if (uploadError) throw new Error(uploadError.message)

  const { data: publicUrlData } = supabase.storage.from('progress-photos').getPublicUrl(filePath)
  return publicUrlData.publicUrl
}

export async function POST(request: Request) {
  if (!(await requireAdminSession())) return unauthorized()

  try {
    const form = await request.formData()
    const projectId = String(form.get('projectId') || '')
    const phaseId = String(form.get('phaseId') || '')
    const category = String(form.get('category') || '')
    const amount = parseFloat(String(form.get('amount') || ''))
    const description = String(form.get('description') || '')
    const file = form.get('file')

    if (!projectId || !phaseId || !category || Number.isNaN(amount)) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
    }

    let photoUrl = ''
    if (file instanceof File && file.size > 0) {
      photoUrl = await uploadPhoto(file, 'receipts')
    }

    const supabase = createServiceClient()
    const { error } = await supabase.from('receipts').insert({
      project_id: projectId,
      phase_id: phaseId,
      category,
      amount,
      description,
      photo_url: photoUrl,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '伺服器錯誤' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  if (!(await requireAdminSession())) return unauthorized()

  try {
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

    const supabase = createServiceClient()
    const { error } = await supabase.from('receipts').delete().eq('id', id)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || '伺服器錯誤' }, { status: 500 })
  }
}
