// app/api/demo/status/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('lea_demo_session')?.value

  if (!raw) {
    return NextResponse.json({ active: false })
  }

  try {
    const session = JSON.parse(raw)
    return NextResponse.json({ active: true, ...session })
  } catch {
    return NextResponse.json({ active: false })
  }
}