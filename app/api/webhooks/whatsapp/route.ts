import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { sendWhatsAppText, toWhatsAppNumber } from '@/lib/whatsapp'
import { sendSMS, formatPhoneNumber } from '@/lib/sms'

const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

type PendingRequest = {
  id: string
  first_name: string
  last_name: string
  phone: string
  preferred_date: string
  preferred_time: string
  listing_id: string
  listings: { title: string; created_by: string } | { title: string; created_by: string }[]
}

function listingTitleOf(row: PendingRequest): string {
  const listing = Array.isArray(row.listings) ? row.listings[0] : row.listings
  return listing?.title || 'the property'
}

/**
 * A landlord's reply to our "New viewing request" notification. We only
 * recognize plain CONFIRM/CANCEL (plus a few synonyms), optionally followed
 * by the tenant's first name to disambiguate when more than one request is
 * pending. This intentionally works with the templates already in place —
 * no new Meta template submission needed, since a reply inside the 24h
 * session the landlord just opened doesn't require one.
 */
function parseIntent(text: string): { action: 'confirm' | 'cancel'; nameHint: string | null } | null {
  const trimmed = text.trim()
  const upper = trimmed.toUpperCase()

  const confirmMatch = upper.match(/^(CONFIRM|YES|Y|OK|1)\b\s*(.*)$/)
  if (confirmMatch) return { action: 'confirm', nameHint: confirmMatch[2].trim() || null }

  const cancelMatch = upper.match(/^(CANCEL|DECLINE|NO|N|2)\b\s*(.*)$/)
  if (cancelMatch) return { action: 'cancel', nameHint: cancelMatch[2].trim() || null }

  return null
}

async function handleLandlordReply(from: string, text: string) {
  const intent = parseIntent(text)
  if (!intent) return // not a recognized command — leave silently, already logged by caller

  // Match the sender to a landlord profile by phone, tolerant of +/0/254
  // formatting differences: compare on the last 9 digits (Kenyan subscriber
  // number without country code or leading 0).
  const normalized = toWhatsAppNumber(from)
  const last9 = normalized.slice(-9)

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .ilike('phone_number', `%${last9}`)
    .maybeSingle()

  if (!profile) {
    await sendWhatsAppText(from, "We couldn't match this number to a LEA landlord account. If you need help, contact support.")
    return
  }

  const { data: pending } = await supabase
    .from('viewing_requests')
    .select('id, first_name, last_name, phone, preferred_date, preferred_time, listing_id, listings!inner(title, created_by)')
    .eq('status', 'pending')
    .eq('listings.created_by', profile.id)
    .order('created_at', { ascending: false })
    .returns<PendingRequest[]>()

  const candidates = pending || []
  if (candidates.length === 0) {
    await sendWhatsAppText(from, 'You have no pending viewing requests right now.')
    return
  }

  let target = candidates[0]
  if (intent.nameHint) {
    const matches = candidates.filter((r) => r.first_name.toUpperCase().includes(intent.nameHint!))
    if (matches.length === 1) {
      target = matches[0]
    } else if (candidates.length > 1) {
      await sendWhatsAppText(
        from,
        `Couldn't find a single match for "${intent.nameHint}". Pending requests:\n` +
          candidates.map((r, i) => `${i + 1}. ${r.first_name} — ${listingTitleOf(r)} (${r.preferred_date}, ${r.preferred_time})`).join('\n') +
          '\nReply CONFIRM <name> or CANCEL <name> to pick one.'
      )
      return
    }
  } else if (candidates.length > 1) {
    await sendWhatsAppText(
      from,
      'You have multiple pending requests:\n' +
        candidates.map((r, i) => `${i + 1}. ${r.first_name} — ${listingTitleOf(r)} (${r.preferred_date}, ${r.preferred_time})`).join('\n') +
        '\nReply CONFIRM <name> or CANCEL <name> to pick one.'
    )
    return
  }

  const newStatus = intent.action === 'confirm' ? 'confirmed' : 'cancelled'
  const timestampField = intent.action === 'confirm' ? { confirmed_at: new Date().toISOString() } : {}

  const { error: updateError } = await supabase
    .from('viewing_requests')
    .update({ status: newStatus, ...timestampField })
    .eq('id', target.id)

  if (updateError) {
    console.error('[WhatsApp Webhook] Failed to update viewing request:', updateError)
    await sendWhatsAppText(from, 'Something went wrong updating that request — please try again shortly.')
    return
  }

  const listingTitle = listingTitleOf(target)

  await sendWhatsAppText(
    from,
    intent.action === 'confirm'
      ? `✅ Viewing confirmed for ${target.first_name} — "${listingTitle}" on ${target.preferred_date} (${target.preferred_time}). We've notified them.`
      : `Viewing declined for ${target.first_name} — "${listingTitle}". We've let them know.`
  )

  const tenantMessage =
    intent.action === 'confirm'
      ? `Hi ${target.first_name}, your viewing request for "${listingTitle}" on ${target.preferred_date} (${target.preferred_time}) has been CONFIRMED by the landlord. See you then! — LEA`
      : `Hi ${target.first_name}, unfortunately your viewing request for "${listingTitle}" on ${target.preferred_date} (${target.preferred_time}) could not be accommodated this time. Feel free to browse other listings on LEA. — LEA`

  try {
    await sendSMS({ to: formatPhoneNumber(target.phone), message: tenantMessage })
  } catch (smsError) {
    console.error('[WhatsApp Webhook] Failed to notify tenant of outcome:', smsError)
  }
}

/**
 * POST /api/webhooks/whatsapp
 * Delivery status updates (sent/delivered/read/failed) and inbound messages
 * from WhatsApp users. Status updates are just logged. Inbound text messages
 * are checked against handleLandlordReply — a landlord replying CONFIRM/
 * CANCEL to our "New viewing request" notification updates that request and
 * notifies the tenant, closing the loop without either side leaving WhatsApp/
 * the app. Anything that isn't a recognized command is logged and ignored.
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

      if (message.type === 'text' && message.text?.body && message.from) {
        try {
          await handleLandlordReply(message.from, message.text.body)
        } catch (handlerError) {
          console.error('[WhatsApp Webhook] Error handling landlord reply:', handlerError)
        }
      }
    }
  } catch (error) {
    console.error('[WhatsApp Webhook] Error processing payload:', error)
  }

  return NextResponse.json({ success: true })
}
