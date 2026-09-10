import { NextResponse } from 'next/server'
import { clearClientSessionCookie } from '@/lib/auth'

export async function POST() {
  const response = NextResponse.json({ success: true })
  clearClientSessionCookie(response)
  return response
}
