/**
 * PayHero transaction-status lookup (PayHero-linked channels only).
 * Pochi la Biashara is NOT on PayHero — those codes use landlord confirm/decline.
 */

const PAYHERO_API = 'https://backend.payhero.co.ke/api/v2'

export type PayHeroTxStatus = {
  success?: boolean
  status?: string
  merchant?: string
  provider_reference?: string
  third_party_reference?: string
  reference?: string
  payment_reference?: string
  amount?: number | string
  phone?: string
  phone_number?: string
  customer_name?: string
  transaction_date?: string
  raw: Record<string, unknown>
}

function payheroAuth(): string | null {
  const u = process.env.PAYHERO_USERNAME
  const p = process.env.PAYHERO_PASSWORD
  if (!u || !p) return null
  return Buffer.from(`${u}:${p}`).toString('base64')
}

/** Normalize tenant-entered code: UIJ3U7MV3D */
export function normalizeMpesaCode(input: string): string | null {
  const cleaned = String(input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  // Typical Safaricom receipts are 10 chars; allow 8–12
  if (cleaned.length < 8 || cleaned.length > 12) return null
  if (!/^[A-Z0-9]+$/.test(cleaned)) return null
  return cleaned
}

function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** True if merchant/payee looks like one of the expected landlord names. */
export function recipientMatchesLandlord(
  merchantOrPayee: string | null | undefined,
  expectedNames: (string | null | undefined)[],
): boolean {
  const merchant = normName(merchantOrPayee || '')
  if (!merchant) return false

  for (const raw of expectedNames) {
    const expected = normName(raw || '')
    if (!expected || expected.length < 2) continue
    if (merchant === expected) return true
    if (merchant.includes(expected) || expected.includes(merchant)) return true

    const mTokens = merchant.split(' ').filter((t) => t.length > 2)
    const eTokens = expected.split(' ').filter((t) => t.length > 2)
    if (!eTokens.length) continue
    const overlap = eTokens.filter((t) =>
      mTokens.some((mt) => mt === t || mt.includes(t) || t.includes(mt)),
    )
    if (eTokens.length === 1 && overlap.length === 1) return true
    if (overlap.length >= Math.min(2, eTokens.length)) return true
  }
  return false
}

export async function lookupPayHeroByMpesaCode(
  mpesaCode: string,
): Promise<{ ok: true; tx: PayHeroTxStatus } | { ok: false; error: string }> {
  const auth = payheroAuth()
  if (!auth) {
    return { ok: false, error: 'Payment verification is not configured' }
  }

  const url = `${PAYHERO_API}/transaction-status?reference=${encodeURIComponent(mpesaCode)}`
  let res: Response
  try {
    res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
      cache: 'no-store',
    })
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Could not reach payment provider' }
  }

  const text = await res.text()
  let data: any = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }

  if (!res.ok) {
    return {
      ok: false,
      error:
        data?.message ||
        data?.error ||
        `M-Pesa code not found (${res.status}). Check the code and try again.`,
    }
  }

  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Unexpected response from payment provider' }
  }

  const tx: PayHeroTxStatus = { ...data, raw: data }
  const status = String(tx.status || '').toUpperCase()
  if (status && status !== 'SUCCESS' && status !== 'COMPLETE' && status !== 'COMPLETED') {
    return {
      ok: false,
      error: `This payment is not successful yet (status: ${tx.status}).`,
    }
  }
  if (tx.success === false) {
    return { ok: false, error: 'Payment provider reported this transaction as unsuccessful.' }
  }

  return { ok: true, tx }
}

export function extractAmountFromTx(tx: PayHeroTxStatus): number | null {
  const n = Number(tx.amount)
  if (Number.isFinite(n) && n > 0) return Math.round(n * 100) / 100
  return null
}

export function extractMerchantFromTx(tx: PayHeroTxStatus): string | null {
  const m = String(tx.merchant || '').trim()
  return m || null
}
