import { NextResponse } from 'next/server'

/** Deprecated: use POST /api/admin/login instead. */
export async function POST() {
  return NextResponse.json(
    { success: false, message: '此端點已停用，請使用 /api/admin/login' },
    { status: 410 }
  )
}
