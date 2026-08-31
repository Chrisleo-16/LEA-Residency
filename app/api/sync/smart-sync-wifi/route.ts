import { NextRequest, NextResponse } from 'next/server'
import { POST as handleSmartSync } from '../smart-sync/route'

export async function POST(req: NextRequest) {
  return handleSmartSync(req)
}
