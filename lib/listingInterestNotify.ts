import { createClient as createServiceClient } from '@supabase/supabase-js'
import { formatPhoneNumber } from '@/lib/sms'
import { sendPushToUser } from '@/lib/pushServer'
import { notifyByWhatsAppOrSMS } from '@/lib/notify'
import { WHATSAPP_TEMPLATES } from '@/lib/whatsapp'

const supabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Shared by both "I'm Interested" paths (logged-in tenant and OTP-verified
 * guest) — pushes + WhatsApp/SMS-notifies the listing owner with the
 * interested party's name and phone. Failures here are logged, never
 * thrown — the interest record itself is what matters; a failed
 * notification shouldn't turn into a user-facing error.
 */
export async function notifyLandlordOfInterest({
  listingOwnerId,
  listingId,
  listingTitle,
  tenantName,
  tenantPhone,
}: {
  listingOwnerId: string
  listingId: string
  listingTitle: string
  tenantName: string
  tenantPhone: string | null
}) {
  try {
    await sendPushToUser(
      listingOwnerId,
      "🏠 Someone's interested in your property!",
      `${tenantName} (${tenantPhone || 'no phone on file'}) is interested in "${listingTitle}"`,
      '/listings',
      { type: 'listing_interest', listingId }
    )
  } catch (pushError) {
    console.error('[Listing Interest] Push notification failed:', pushError)
  }

  try {
    if (tenantPhone) {
      const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('id', listingOwnerId)
        .maybeSingle()

      if (ownerProfile?.phone_number) {
        await notifyByWhatsAppOrSMS({
          phone: ownerProfile.phone_number,
          whatsappTemplate: WHATSAPP_TEMPLATES.LISTING_INTEREST,
          whatsappParams: [tenantName, formatPhoneNumber(tenantPhone), listingTitle],
          smsMessage: `NEW LEAD\n\n${tenantName} is interested in your listing "${listingTitle}".\nContact: ${formatPhoneNumber(tenantPhone)}\n\nLEA`,
        })
      }
    }
  } catch (notifyError) {
    console.error('[Listing Interest] WhatsApp/SMS notification failed:', notifyError)
  }
}
