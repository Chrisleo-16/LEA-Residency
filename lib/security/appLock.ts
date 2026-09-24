/**
 * Device-bound App Lock PIN (PBKDF2) + session unlock stamp.
 * PIN hash lives in localStorage per user.id — not on the server.
 */

const UNLOCK_KEY = 'lea_app_unlocked'
const PIN_PREFIX = 'lea_app_pin_'
const BIO_PREFIX = 'lea_app_bio_'

export const IDLE_LOCK_MS = 2 * 60 * 1000 // 2 minutes (bank-style)

function pinStorageKey(userId: string) {
  return `${PIN_PREFIX}${userId}`
}

function bioStorageKey(userId: string) {
  return `${BIO_PREFIX}${userId}`
}

function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function deriveKey(pin: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 120_000,
      hash: 'SHA-256',
    },
    baseKey,
    256
  )
}

export function hasPinEnrolled(userId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    return !!localStorage.getItem(pinStorageKey(userId))
  } catch {
    return false
  }
}

export async function enrollPin(userId: string, pin: string): Promise<void> {
  const cleaned = String(pin).replace(/\D/g, '')
  if (cleaned.length < 4 || cleaned.length > 6) {
    throw new Error('PIN must be 4–6 digits')
  }
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await deriveKey(cleaned, salt)
  const payload = JSON.stringify({
    salt: toB64(salt.buffer),
    hash: toB64(hash),
    createdAt: Date.now(),
  })
  localStorage.setItem(pinStorageKey(userId), payload)
}

export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const raw = localStorage.getItem(pinStorageKey(userId))
  if (!raw) return false
  try {
    const { salt, hash } = JSON.parse(raw) as { salt: string; hash: string }
    const derived = await deriveKey(String(pin).replace(/\D/g, ''), fromB64(salt))
    return toB64(derived) === hash
  } catch {
    return false
  }
}

export function clearPin(userId: string) {
  localStorage.removeItem(pinStorageKey(userId))
  localStorage.removeItem(bioStorageKey(userId))
  clearUnlock()
}

export function markUnlocked(userId: string) {
  sessionStorage.setItem(UNLOCK_KEY, JSON.stringify({ userId, at: Date.now() }))
}

export function clearUnlock() {
  try {
    sessionStorage.removeItem(UNLOCK_KEY)
  } catch {
    /* ignore */
  }
}

export function isUnlocked(userId: string): boolean {
  try {
    const raw = sessionStorage.getItem(UNLOCK_KEY)
    if (!raw) return false
    const { userId: uid } = JSON.parse(raw) as { userId: string; at: number }
    return uid === userId
  } catch {
    return false
  }
}

export function setBiometricCredentialId(userId: string, credentialId: string) {
  localStorage.setItem(bioStorageKey(userId), credentialId)
}

export function getBiometricCredentialId(userId: string): string | null {
  try {
    return localStorage.getItem(bioStorageKey(userId))
  } catch {
    return null
  }
}

export function hasBiometricEnrolled(userId: string): boolean {
  return !!getBiometricCredentialId(userId)
}
