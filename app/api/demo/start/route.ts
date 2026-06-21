// app/api/demo/start/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { name, role } = await req.json()

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (role !== 'tenant' && role !== 'landlord') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const demoSession = {
      name: name.trim(),
      role,
      startedAt: Date.now(),
    }

    const cookieStore = await cookies()
    cookieStore.set('lea_demo_session', JSON.stringify(demoSession), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 2, // 2 hour hard ceiling regardless of logout
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Demo Start] Error:', err)
    return NextResponse.json({ error: 'Failed to start demo' }, { status: 500 })
  }
}