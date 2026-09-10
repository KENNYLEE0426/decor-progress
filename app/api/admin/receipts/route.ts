import { NextResponse } from 'next/server'
import { requireAdminSession, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  if (!(await requireAdminSession())) return unauthorized()

  try {
    const contentType = request.headers.get('content-type') || ''
    let projectId = ''
    let phaseId = ''
    let category = ''
    let amount = NaN
    let description = ''
    let photoUrl = ''

    if (contentType.includes('application/json')) {
      const body = await request.json()
      projectId = String(body.projectId || '')
      phaseId = String(body.phaseId || '')
      category = String(body.category || '')
      amount = parseFloat(String(body.amount || ''))
      description = String(body.description || '')
      photoUrl = String(body.photoUrl || '')
    } else {
      const form = await request.formData()
      projectId = String(form.get('projectId') || '')
      phaseId = String(form.get('phaseId') || '')
      category = String(form.get('category') || '')
      amount = parseFloat(String(form.get('amount') || ''))
      description = String(form.get('description') || '')
      photoUrl = String(form.get('photoUrl') || '')
    }

    if (!projectId || !phaseId || !category || Number.isNaN(amount)) {
      return NextResponse.json({ error: '缺少必要欄位' }, { status: 400 })
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
