import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { sendPushToUser } from '@/lib/pushServer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// One-time setup (in Sentry's dashboard, not here): Settings → Developer Settings
// → New Internal Integration → enable the "Issue Alerts" webhook → target URL
// https://<deployed-domain>/api/developer/sentry-webhook → copy the generated
// secret into Vercel env as SENTRY_WEBHOOK_SECRET.
function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.SENTRY_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('sentry-hook-signature')

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ success: true })
  }

  const issue = payload?.data?.issue ?? payload?.data?.event
  if (issue) {
    const title: string = issue.title || issue.metadata?.title || 'New error'
    const culprit: string = issue.culprit || issue.metadata?.function || ''
    const level: string = issue.level || 'error'

    const { data: developers } = await supabase.from('profiles').select('id').eq('role', 'developer')
    await Promise.all(
      (developers || []).map((d) =>
        sendPushToUser(
          d.id,
          level === 'fatal' ? '🔥 New fatal error' : '🐛 New error',
          culprit ? `${title} — ${culprit}` : title,
          '/developer-dashboard?tab=errors'
        )
      )
    )
  }

  return NextResponse.json({ success: true })
}

export async function GET() {
  return NextResponse.json({
    status: 'active',
    service: 'LEA Developer Dashboard — Sentry Webhook',
    configured: !!process.env.SENTRY_WEBHOOK_SECRET,
  })
}
