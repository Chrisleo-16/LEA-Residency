/**
 * Parse Safaricom M-Pesa confirmation SMS text (send / receive / paybill / pochi).
 * Tenants paste the SMS after paying to Pochi la Biashara.
 */

export interface ParsedMpesaSms {
  mpesaCode: string | null
  amount: number | null
  phone: string | null
  recipientName: string | null
  recipientPhone: string | null
  dateText: string | null
  timeText: string | null
  raw: string
  confidence: 'high' | 'medium' | 'low'
  parseNotes: string[]
}

function normalize(text: string) {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseAmount(raw: string): number | null {
  // Ksh1,500.00 | KES 1500 | Ksh 1,500
  const m =
    raw.match(/Ksh\.?\s*([\d,]+(?:\.\d{1,2})?)/i) ||
    raw.match(/KES\.?\s*([\d,]+(?:\.\d{1,2})?)/i)
  if (!m) return null
  const n = Number(m[1].replace(/,/g, ''))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

function parseCode(raw: string): string | null {
  // Leading receipt: ABC1DE23XY Confirmed...
  const lead = raw.match(/^([A-Z0-9]{8,12})\s+Confirmed/i)
  if (lead) return lead[1].toUpperCase()
  // Fallback anywhere before Confirmed
  const mid = raw.match(/\b([A-Z0-9]{8,12})\b(?=\s+Confirmed)/i)
  if (mid) return mid[1].toUpperCase()
  // "Transaction code ABC1DE23XY" style
  const labeled = raw.match(/(?:code|receipt|ref(?:erence)?)\s*[:=]?\s*([A-Z0-9]{8,12})/i)
  if (labeled) return labeled[1].toUpperCase()
  return null
}

function parsePhones(raw: string): string[] {
  const found = raw.match(/(?:\+?254|0)\d{9}/g) || []
  return [...new Set(found.map((p) => p.replace(/^\+?254/, '0')))]
}

function parseRecipient(raw: string): { name: string | null; phone: string | null } {
  // sent to NAME 07...  |  paid to NAME.
  const sent =
    raw.match(
      /(?:sent to|paid to)\s+([A-Z][A-Z\s.'-]{1,60}?)\s+(0\d{9}|\+?254\d{9})/i
    ) ||
    raw.match(/(?:sent to|paid to)\s+([A-Z][A-Z\s.'-]{1,60}?)(?:\s+on\b|\.|$)/i)
  if (!sent) return { name: null, phone: null }
  return {
    name: sent[1].trim().replace(/\s+/g, ' '),
    phone: sent[2] ? sent[2].replace(/^\+?254/, '0') : null,
  }
}

function parseWhen(raw: string): { dateText: string | null; timeText: string | null } {
  const m = raw.match(
    /on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i
  )
  if (!m) return { dateText: null, timeText: null }
  return { dateText: m[1], timeText: m[2].trim() }
}

export function parseMpesaConfirmationSms(input: string): ParsedMpesaSms {
  const raw = normalize(input || '')
  const notes: string[] = []

  if (!raw) {
    return {
      mpesaCode: null,
      amount: null,
      phone: null,
      recipientName: null,
      recipientPhone: null,
      dateText: null,
      timeText: null,
      raw,
      confidence: 'low',
      parseNotes: ['Empty message'],
    }
  }

  const mpesaCode = parseCode(raw)
  const amount = parseAmount(raw)
  const { name, phone: recipientPhone } = parseRecipient(raw)
  const phones = parsePhones(raw)
  const { dateText, timeText } = parseWhen(raw)

  if (!/confirmed/i.test(raw)) notes.push('Missing "Confirmed" — may not be an M-Pesa SMS')
  if (!mpesaCode) notes.push('Could not find transaction code')
  if (amount == null) notes.push('Could not find amount')

  let confidence: ParsedMpesaSms['confidence'] = 'low'
  if (mpesaCode && amount != null) confidence = 'high'
  else if (mpesaCode || amount != null) confidence = 'medium'

  return {
    mpesaCode,
    amount,
    phone: recipientPhone || phones[0] || null,
    recipientName: name,
    recipientPhone: recipientPhone || phones.find((p) => p !== phones[0]) || null,
    dateText,
    timeText,
    raw,
    confidence,
    parseNotes: notes,
  }
}

/** Convert dd/mm/yy or dd/mm/yyyy + optional time into ISO if possible */
export function parsedWhenToIso(dateText: string | null, timeText: string | null): string | null {
  if (!dateText) return null
  const parts = dateText.split('/').map((p) => parseInt(p, 10))
  if (parts.length !== 3) return null
  let [d, m, y] = parts
  if (y < 100) y += 2000
  let hours = 12
  let minutes = 0
  if (timeText) {
    const tm = timeText.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
    if (tm) {
      hours = parseInt(tm[1], 10)
      minutes = parseInt(tm[2], 10)
      const ap = (tm[3] || '').toUpperCase()
      if (ap === 'PM' && hours < 12) hours += 12
      if (ap === 'AM' && hours === 12) hours = 0
    }
  }
  const dt = new Date(y, m - 1, d, hours, minutes)
  if (Number.isNaN(dt.getTime())) return null
  return dt.toISOString()
}
