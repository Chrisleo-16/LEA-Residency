/**
 * Platform WebAuthn (fingerprint / Face ID / Windows Hello) for App Lock.
 * Works on phones and laptops when the OS exposes a platform authenticator.
 * PIN is always available; biometrics are optional when sensed.
 */

import {
  getBiometricCredentialId,
  setBiometricCredentialId,
} from '@/lib/security/appLock'

export type PlatformAuthCapability = {
  /** WebAuthn APIs exist in this browser */
  webauthn: boolean
  /** OS reports a built-in verifier (fingerprint, Face ID, Windows Hello, Touch ID) */
  available: boolean
  /** Short label for UI, e.g. "Windows Hello", "Touch ID" */
  label: string
  /** Why biometrics are unavailable (for Settings help text) */
  reason: string | null
}

function bufferToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlToBuffer(s: string): ArrayBuffer {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out.buffer
}

function guessLabel(): string {
  if (typeof navigator === 'undefined') return 'Biometrics'
  const ua = navigator.userAgent || ''
  const platform = (navigator.platform || '').toLowerCase()

  if (/Windows/i.test(ua)) return 'Windows Hello'
  if (/Mac/i.test(ua) || platform.includes('mac')) return 'Touch ID / Face ID'
  if (/iPhone|iPad/i.test(ua)) return 'Face ID / Touch ID'
  if (/Android/i.test(ua)) return 'Fingerprint'
  return 'Device biometrics'
}

export function biometricsAvailable(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window.PublicKeyCredential && navigator.credentials)
}

/**
 * Ask the browser/OS whether this device can verify the user locally
 * (laptop fingerprint reader, Windows Hello PIN+face, MacBook Touch ID, phone biometrics).
 */
export async function detectPlatformAuth(): Promise<PlatformAuthCapability> {
  const label = guessLabel()

  if (typeof window === 'undefined') {
    return {
      webauthn: false,
      available: false,
      label,
      reason: 'Not available during server render',
    }
  }

  if (!window.isSecureContext) {
    return {
      webauthn: false,
      available: false,
      label,
      reason: 'Biometrics need HTTPS (or localhost). PIN still works.',
    }
  }

  if (!biometricsAvailable()) {
    return {
      webauthn: false,
      available: false,
      label,
      reason: 'This browser does not support WebAuthn. Use your App PIN.',
    }
  }

  try {
    let platformOk = false
    if (
      typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable ===
      'function'
    ) {
      platformOk =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    }

    // Some Chromium builds report conditional mediation even when the
    // platform check is flaky — treat either as "worth offering".
    let conditionalOk = false
    if (
      typeof (PublicKeyCredential as any).isConditionalMediationAvailable ===
      'function'
    ) {
      try {
        conditionalOk =
          await (PublicKeyCredential as any).isConditionalMediationAvailable()
      } catch {
        conditionalOk = false
      }
    }

    const available = platformOk || conditionalOk

    return {
      webauthn: true,
      available,
      label,
      reason: available
        ? null
        : `No ${label} (or similar) found on this device. Your App PIN still works.`,
    }
  } catch {
    return {
      webauthn: true,
      available: false,
      label,
      reason: 'Could not detect biometrics. Your App PIN still works.',
    }
  }
}

/** @deprecated Prefer detectPlatformAuth() for richer laptop/phone sensing */
export async function platformAuthenticatorAvailable(): Promise<boolean> {
  const cap = await detectPlatformAuth()
  return cap.available
}

export async function enrollBiometric(userId: string, displayName: string) {
  const cap = await detectPlatformAuth()
  if (!cap.webauthn) {
    throw new Error(cap.reason || 'Biometrics not supported on this device/browser')
  }
  if (!cap.available) {
    throw new Error(
      cap.reason ||
        `${cap.label} is not set up on this laptop/phone. Use your App PIN, or enable ${cap.label} in system settings.`
    )
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const userIdBytes = new TextEncoder().encode(userId)

  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'LEA Executive',
        // Omit id on localhost / IP so browsers accept the origin
        ...(window.location.hostname === 'localhost' ||
        /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname)
          ? {}
          : { id: window.location.hostname }),
      },
      user: {
        id: userIdBytes,
        name: displayName || userId,
        displayName: displayName || 'LEA user',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 90_000,
    },
  })) as PublicKeyCredential | null

  if (!cred) throw new Error('Biometric enrollment cancelled')
  const id = bufferToB64url(cred.rawId)
  setBiometricCredentialId(userId, id)
  return id
}

export async function verifyBiometric(userId: string): Promise<boolean> {
  const stored = getBiometricCredentialId(userId)
  if (!stored || !biometricsAvailable()) return false

  const challenge = crypto.getRandomValues(new Uint8Array(32))
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 90_000,
        userVerification: 'required',
        rpId:
          window.location.hostname === 'localhost' ||
          /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname)
            ? undefined
            : window.location.hostname,
        allowCredentials: [
          {
            id: b64urlToBuffer(stored),
            type: 'public-key',
            transports: ['internal'],
          },
        ],
      },
    })
    return !!assertion
  } catch {
    return false
  }
}
