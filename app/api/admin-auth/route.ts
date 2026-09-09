import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { password } = await request.json()
    const envPassword = process.env.ADMIN_PASS || '64203981'

    if (password === envPassword) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, message: '密碼錯誤' }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ success: false, message: '伺服器錯誤' }, { status: 500 })
  }
}
