import { NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/auth'

export async function GET() {
  try {
    const ok = await requireAdminSession()
    if (!ok) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
    return NextResponse.json({ authenticated: true })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 500 })
  }
}
