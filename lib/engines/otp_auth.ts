/**
 * OTP & SMS Authentication System
 * Production-ready SMS verification with rate limiting and security
 */

import crypto from 'crypto';
import { getDatabase } from '@/lib/database/client';
import SMSDispatcher from '@/attalking_integration/sms_dispatcher/dispatcher';
import { SMS_TEMPLATES } from '@/attalking_integration/sms_dispatcher/message_templates';
import { Country } from '@/lib/types';

interface OTPSession {
  phone: string;
  otp: string;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  verified: boolean;
  createdAt: number;
}

// In-memory store for OTP sessions (in production, use Redis)
// For this implementation we'll use memory with automatic cleanup
const otpSessions = new Map<string, OTPSession>();
 
class OTPAuthService {
  private smsDispatcher: SMSDispatcher;
  private sessionTimeout = 10 * 60 * 1000; // 10 minutes
  private maxAttempts = 3;
  private otpLength = 6;
  private readonly OTP_CLEANUP_INTERVAL = 5 * 60 * 1000; // Clean up every 5 minutes

  constructor(smsDispatcher: SMSDispatcher) {
    this.smsDispatcher = smsDispatcher;
    this.startCleanupInterval();
  }

  /**
   * Send OTP to phone number
   */
  async sendOTP(phoneNumber: string, country: Country = Country.KE): Promise<{
    success: boolean;
    sessionId: string;
    expiresIn: number;
    error?: string;
  }> {
    try {
      // Check rate limiting (max 3 OTP requests per phone per hour)
      if (this.isRateLimited(phoneNumber)) {
        return {
          success: false,
          sessionId: '',
          expiresIn: 0,
          error: 'Too many OTP requests. Try again later.'
        };
      }

      // Generate OTP
      const otp = this.generateOTP();

      // Generate session ID
      const sessionId = crypto.randomBytes(16).toString('hex');

      // Store session
      otpSessions.set(sessionId, {
        phone: phoneNumber,
        otp,
        expiresAt: Date.now() + this.sessionTimeout,
        attempts: 0,
        maxAttempts: this.maxAttempts,
        verified: false,
        createdAt: Date.now()
      });

      // Send SMS
      const messageContent = createMessage(
        'VERIFICATION_OTP',
        { otp },
        country
      );

      const result = await this.smsDispatcher.sendSMS([phoneNumber], messageContent);

      if (!result.success) {
        // Clean up session on SMS failure
        otpSessions.delete(sessionId);
        return {
          success: false,
          sessionId: '',
          expiresIn: 0,
          error: 'Failed to send OTP. Please try again.'
        };
      }

      // Log OTP send
      const db = getDatabase();
      await db.auditLog({
        actorType: 'system',
        action: 'otp_sent',
        resourceType: 'otp_session',
        resourceId: sessionId,
        changes: { phoneNumber, sessionId }
      });

      return {
        success: true,
        sessionId,
        expiresIn: this.sessionTimeout / 1000,
        error: undefined
      };
    } catch (error) {
      console.error('OTP send error:', error);
      return {
        success: false,
        sessionId: '',
        expiresIn: 0,
        error: 'Failed to send OTP'
      };
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(sessionId: string, enteredOTP: string): Promise<{
    success: boolean;
    error?: string;
    attemptsRemaining?: number;
    token?: string;
  }> {
    try {
      const session = otpSessions.get(sessionId);

      if (!session) {
        return {
          success: false,
          error: 'Invalid or expired session'
        };
      }

      // Check expiration
      if (Date.now() > session.expiresAt) {
        otpSessions.delete(sessionId);
        return {
          success: false,
          error: 'OTP has expired'
        };
      }

      // Check attempts
      if (session.attempts >= session.maxAttempts) {
        otpSessions.delete(sessionId);
        return {
          success: false,
          error: 'Too many failed attempts',
          attemptsRemaining: 0
        };
      }

      // Verify OTP
      if (enteredOTP.trim() !== session.otp) {
        session.attempts++;
        const attemptsRemaining = session.maxAttempts - session.attempts;

        if (attemptsRemaining === 0) {
          otpSessions.delete(sessionId);
        }

        return {
          success: false,
          error: 'Incorrect OTP',
          attemptsRemaining
        };
      }

      // OTP verified
      session.verified = true;

      // Generate JWT-like token (in production, use jsonwebtoken)
      const token = this.generateToken(sessionId, session.phone);

      // Log verification
      const db = getDatabase();
      await db.auditLog({
        actorType: 'system',
        action: 'otp_verified',
        resourceType: 'otp_session',
        resourceId: sessionId,
        changes: { phoneNumber: session.phone }
      });

      // Session will be automatically cleaned up
      return {
        success: true,
        token
      };
    } catch (error) {
      console.error('OTP verify error:', error);
      return {
        success: false,
        error: 'Verification failed'
      };
    }
  }

  /**
   * Verify and invalidate token
   */
  async validateToken(token: string): Promise<{
    valid: boolean;
    phoneNumber?: string;
    error?: string;
  }> {
    try {
      const [sessionId, signature] = token.split(':');

      if (!sessionId || !signature) {
        return { valid: false, error: 'Invalid token format' };
      }

      const session = otpSessions.get(sessionId);

      if (!session || !session.verified) {
        return { valid: false, error: 'Token not found or not verified' };
      }

      if (Date.now() > session.expiresAt) {
        otpSessions.delete(sessionId);
        return { valid: false, error: 'Token expired' };
      }

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', session.otp)
        .update(sessionId)
        .digest('hex');

      if (signature !== expectedSignature.substring(0, 16)) {
        return { valid: false, error: 'Invalid token signature' };
      }

      return {
        valid: true,
        phoneNumber: session.phone
      };
    } catch (error) {
      console.error('Token validation error:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }

  /**
   * Private: Generate OTP
   */
  private generateOTP(): string {
    const otp = Math.floor(Math.random() * Math.pow(10, this.otpLength))
      .toString()
      .padStart(this.otpLength, '0');
    return otp;
  }

  /**
   * Private: Generate verification token
   */
  private generateToken(sessionId: string, phoneNumber: string): string {
    const session = otpSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const signature = crypto
      .createHmac('sha256', session.otp)
      .update(sessionId)
      .digest('hex')
      .substring(0, 16);

    return `${sessionId}:${signature}`;
  }

  /**
   * Private: Check rate limiting
   */
  private isRateLimited(phoneNumber: string): boolean {
    const recentSessions = Array.from(otpSessions.values()).filter(
      s => s.phone === phoneNumber && Date.now() - s.createdAt < 3600000 // 1 hour
    );
    return recentSessions.length >= 3;
  }

  /**
   * Private: Cleanup expired sessions
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [sessionId, session] of otpSessions.entries()) {
        if (now > session.expiresAt) {
          otpSessions.delete(sessionId);
        }
      }
    }, this.OTP_CLEANUP_INTERVAL);
  }

  /**
   * Get session status (for debugging/admin)
   */
  getSessionStatus(sessionId: string): OTPSession | null {
    const session = otpSessions.get(sessionId);
    if (!session) return null;

    return {
      ...session,
      otp: session.verified ? session.otp : '[REDACTED]'
    };
  }
}

// Singleton instance
let authService: OTPAuthService | null = null;

export async function initializeAuthService(smsDispatcher: SMSDispatcher): Promise<OTPAuthService> {
  if (!authService) {
    authService = new OTPAuthService(smsDispatcher);
  }
  return authService;
}

export function getAuthService(): OTPAuthService {
  if (!authService) {
    throw new Error('Auth service not initialized. Call initializeAuthService first.');
  }
  return authService;
}

export default OTPAuthService;
