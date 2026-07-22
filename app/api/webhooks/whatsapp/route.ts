import { NextRequest, NextResponse } from 'next/server'

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN

/**
 * GET /api/webhooks/whatsapp
 * Meta calls this once, synchronously, when you save the callback URL in the
 * App Dashboard (WhatsApp → Configuration → Webhook), to prove you control
 * this endpoint. Must echo back hub.challenge as plain text if hub.verify_token
 * matches WHATSAPP_WEBHOOK_VERIFY_TOKEN, or Meta refuses to save the webhook.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && challenge && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

/**
 * POST /api/webhooks/whatsapp
 * Delivery status updates (sent/delivered/read/failed) and inbound messages
 * from WhatsApp users. Logged for now — no automated reply logic yet, since
 * outbound template notifications (see lib/notify.ts) don't need one.
 * Meta requires a fast 2xx response regardless of processing outcome, or it
 * will retry and eventually disable the webhook — so this never surfaces
 * processing errors to Meta as a failure.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const value = body?.entry?.[0]?.changes?.[0]?.value

    for (const status of value?.statuses || []) {
      console.log('[WhatsApp Webhook] Status update:', {
        messageId: status.id,
        status: status.status,
        recipient: status.recipient_id,
      })
    }

    for (const message of value?.messages || []) {
      console.log('[WhatsApp Webhook] Inbound message:', {
        from: message.from,
        type: message.type,
        text: message.text?.body,
      })
    }
  } catch (error) {
    console.error('[WhatsApp Webhook] Error processing payload:', error)
  }

  return NextResponse.json({ success: true })
}
