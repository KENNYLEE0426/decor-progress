import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const adminAuth = cookieStore.get('admin_auth')

    if (adminAuth && adminAuth.value === 'true') {
      return NextResponse.json({ authenticated: true })
    }

    return NextResponse.json({ authenticated: false }, { status: 401 })
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 })
  }
}
