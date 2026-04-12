import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Promise-based timeout utility
 */
export function timeout(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxRetries) {
        const delayMs = initialDelayMs * Math.pow(2, attempt)
        await timeout(delayMs)
      }
    }
  }

  throw lastError
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delayMs)
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'KES'): string {
  const symbols: Record<string, string> = {
    KES: 'Ksh',
    NGN: '₦',
    UGX: 'USh',
    TZS: 'TSh',
    GHS: 'GH₵'
  }
  const symbol = symbols[currency] || currency
  return `${symbol} ${amount.toLocaleString()}`
}

/**
 * Parse phone number to E.164 format
 */
export function formatPhoneNumber(phone: string, countryCode: string = 'KE'): string {
  const cleaned = phone.replace(/\D/g, '')

  const countryDialCodes: Record<string, string> = {
    KE: '254',
    NG: '234',
    UG: '256',
    TZ: '255',
    GH: '233'
  }

  const code = countryDialCodes[countryCode] || '254'

  if (cleaned.startsWith(code)) {
    return `+${cleaned}`
  }

  if (cleaned.startsWith('0') && cleaned.length === 10) {
    return `+${code}${cleaned.substring(1)}`
  }

  return `+${code}${cleaned.slice(-9)}`
}
