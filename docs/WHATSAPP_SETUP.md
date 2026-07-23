# WhatsApp Business Platform Setup

This is the walkthrough for connecting LEA's automated notifications (listing
"Interested" alerts, viewing confirmations) to WhatsApp. The code side is
already built and live — it currently falls back to SMS for everything
because these credentials aren't set yet. Nothing breaks while you work
through this; each step below just gets you closer to flipping WhatsApp on.

**You do this part yourself** — it's tied to your real business identity and
eventually a payment method on your Meta Business Account, so I won't (and
shouldn't) click through it for you. Give me the values called out at each
step and I'll wire them in.

---

## 0. Before you start

You need a phone number that has **never been active on regular WhatsApp or
WhatsApp Business app**. Meta rejects numbers that are currently registered
elsewhere. Two easy options:
- A spare SIM card you're not using for anything else.
- A landline number (Meta can verify these by voice call instead of SMS).

If your current number is on personal WhatsApp and you don't want to lose it,
get a second number now before continuing.

---

## 1. Create/select your Meta Business Account

Go to [business.facebook.com](https://business.facebook.com) and either
create a new Business Account or use an existing one for your company.

## 2. Create a Meta App

Go to [developers.facebook.com/apps](https://developers.facebook.com/apps) →
**Create App** → choose type **"Business"** → link it to the Business Account
from step 1.

## 3. Add the WhatsApp product

Inside your new app's dashboard, find **WhatsApp** in the product list and
click **Set up**.

## 4. "Customize your business" step

This is the step that was confusing — it's just filling in display info, not
anything technical:

| Field | What to enter |
|---|---|
| Business name | Your real trade name — this is what recipients see as the sender (e.g. "LEA" or "LEA Executive") |
| Category | Real Estate |
| Business email | Any working email |
| Website | Optional at this stage |
| Timezone | Africa/Nairobi |

## 5. Add and verify your WhatsApp phone number

- Enter the number from Step 0.
- Meta sends a verification code by SMS or voice call — enter it in the wizard.
- Once verified, you'll land on the **API Setup** page showing:
  - A **temporary access token** (valid 24 hours — fine for testing, not for production)
  - Your **Phone Number ID** (a long numeric string)
  - Your **WhatsApp Business Account ID**

**Copy the Phone Number ID down now** — you'll need it in Step 8.

## 6. The Callback URL / Webhook step — what to actually enter

This is the part you asked about. Under **WhatsApp → Configuration →
Webhook**, Meta asks for two fields:

| Field | Value |
|---|---|
| Callback URL | `https://lea-residency.vercel.app/api/webhooks/whatsapp` |
| Verify Token | Any random string you make up yourself — e.g. generate one at random and reuse it in Step 9 |

The endpoint above already exists in the codebase
(`app/api/webhooks/whatsapp/route.ts`) and knows how to answer Meta's
verification handshake — so as soon as you deploy with the matching
`WHATSAPP_WEBHOOK_VERIFY_TOKEN` env var (Step 9), clicking **Verify and Save**
in Meta's dashboard will succeed immediately.

**Do you actually need this step?** Not for the notifications already built —
those only *send* messages, they don't need to *receive* anything. The
webhook exists for delivery-status updates (sent/delivered/read/failed) and
any future "reply to this WhatsApp message" feature. If you want to skip it
for now and come back later, that's fine — sending will still work. If you
do set it up, also subscribe to the **`messages`** webhook field in the same
Configuration screen (checkbox next to it) so status updates actually flow.

## 7. Get a permanent access token (required before this goes live)

The temporary token from Step 5 expires in 24 hours — don't use it for
production. Instead:

1. Go to **Business Settings** (business.facebook.com/settings) → **Users** → **System Users**.
2. Create a new System User (e.g. "LEA WhatsApp API").
3. Assign it your WhatsApp app with these permissions: `whatsapp_business_messaging` and `whatsapp_business_management`.
4. Click **Generate New Token**, select the app, check both permissions above, and set expiration to **Never**.
5. Copy the generated token immediately — Meta only shows it once.

## 8. Create and submit the message templates

Go to **WhatsApp → Message Templates** → **Create Template**, and submit
these three (category: **Utility**, language: **English**):

**Template 1 — `lea_listing_interest`**
```
New lead: {{1}} ({{2}}) is interested in your listing "{{3}}".
```

**Template 2 — `lea_viewing_confirmation`**
```
Hi {{1}}, your viewing request for {{2}} at {{3}} is received. We'll confirm within 24 hours.
```

**Template 3 — `lea_viewing_notification`**
```
Hi! You have a new viewing request from {{1}} for your listing "{{2}}". They'd like to view it on {{3}}. Reply CONFIRM to accept or CANCEL to decline this request.
```
(Originally had 5 variables — Meta rejects that as too many for the message
length. This version combines name+phone into {{1}} and date+time into {{3}},
down to 3 variables, and doubles as the prompt for the CONFIRM/CANCEL
reply flow.)

Approval is usually a few minutes to a few hours. You'll see each template's
status change to **Approved** in the Message Templates list.

(If you'd rather use different names or wording, that's fine — just tell me
what you used and I'll update the code's template names to match.)

## 9. What to send me when you're done

Once you have these four values, hand them to me and I'll set them as
environment variables (never hardcoded, never logged) and confirm the
integration is live:

- [ ] **Phone Number ID** (from Step 5)
- [ ] **Permanent access token** (from Step 7)
- [ ] **Webhook verify token** — the random string you picked in Step 6 (only if you set up the webhook)
- [ ] Confirmation that all three templates in Step 8 show **Approved**

## 10. After it's live

Once the credentials are set, nothing else changes on your end — the same
"Interested" and "Schedule Viewing" flows you already use will automatically
send via WhatsApp first, falling back to SMS only if WhatsApp fails or a
recipient's number isn't reachable there.
