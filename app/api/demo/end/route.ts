// app/api/demo/end/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete('lea_demo_session')
  return NextResponse.json({ success: true })
}