/**
 * API Middleware & Error Handling
 * Production-ready request/response handling
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// ERROR TYPES
// ============================================================================

export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  SMS_DELIVERY_FAILED = 'SMS_DELIVERY_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

interface APIErrorDetail {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
  retryable: boolean;
}

export class APIError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: Record<string, any>;
  retryable: boolean;

  constructor(code: ErrorCode, message: string, statusCode: number, retryable = false) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.name = 'APIError';
  }

  toJSON(): APIErrorDetail {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      retryable: this.retryable
    };
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface ValidationRule {
  field: string;
  rule: (value: any) => boolean;
  message: string;
}

export class RequestValidator {
  /**
   * Validate required field
   */
  static required(value: any): boolean {
    return value !== null && value !== undefined && value !== '';
  }

  /**
   * Validate phone number (E.164 format)
   */
  static phoneNumber(value: string): boolean {
    if (typeof value !== 'string') return false;
    // Accept +254XXXXXXXXX or 254XXXXXXXXX or 07XXXXXXXXX or 2547XXXXXXXXX
    return /^(\+)?254\d{9}$|^07\d{8}$/.test(value.replace(/\s/g, ''));
  }

  /**
   * Validate amount (positive number, reasonable max)
   */
  static amount(value: any): boolean {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return typeof num === 'number' && num > 0 && num <= 10000000;
  }

  /**
   * Validate UUID
   */
  static uuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  /**
   * Validate email
   */
  static email(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  /**
   * Validate integer range
   */
  static range(min: number, max: number) {
    return (value: any): boolean => {
      const num = parseInt(value, 10);
      return num >= min && num <= max;
    };
  }

  /**
   * Validate string length
   */
  static stringLength(min: number, max: number) {
    return (value: string): boolean => {
      return typeof value === 'string' && value.length >= min && value.length <= max;
    };
  }

  /**
   * Validate against multiple rules
   */
  static validate(data: Record<string, any>, rules: ValidationRule[]): void {
    const errors: Record<string, string> = {};

    for (const rule of rules) {
      if (!rule.rule(data[rule.field])) {
        errors[rule.field] = rule.message;
      }
    }

    if (Object.keys(errors).length > 0) {
      const error = new APIError(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed',
        400
      );
      error.details = errors;
      throw error;
    }
  }
}

// ============================================================================
// RATE LIMITING
// ============================================================================

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

export class RateLimiter {
  private store: RateLimitStore = {};
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 60, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.store[key];

    if (!entry || now > entry.resetAt) {
      this.store[key] = {
        count: 1,
        resetAt: now + this.windowMs
      };
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: this.store[key].resetAt
      };
    }

    entry.count++;

    return {
      allowed: entry.count <= this.maxRequests,
      remaining: Math.max(0, this.maxRequests - entry.count),
      resetAt: entry.resetAt
    };
  }

  /**
   * Private: Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of Object.entries(this.store)) {
      if (now > entry.resetAt) {
        delete this.store[key];
      }
    }
  }
}

// ============================================================================
// ERROR RESPONSE FORMATTER
// ============================================================================

export function errorResponse(error: unknown, requestId?: string): NextResponse {
  console.error('API Error:', error);

  let apiError: APIError;

  if (error instanceof APIError) {
    apiError = error;
  } else if (error instanceof SyntaxError) {
    apiError = new APIError(
      ErrorCode.VALIDATION_ERROR,
      'Invalid JSON in request body',
      400
    );
  } else if (error instanceof Error) {
    // Generic error - don't expose internals
    apiError = new APIError(
      ErrorCode.INTERNAL_ERROR,
      'An unexpected error occurred. Please try again later.',
      500,
      true
    );
    console.error('Unhandled error:', error);
  } else {
    apiError = new APIError(
      ErrorCode.INTERNAL_ERROR,
      'Unknown error',
      500,
      true
    );
  }

  const response = {
    success: false,
    error: apiError.toJSON(),
    requestId: requestId || generateRequestId(),
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(response, { status: apiError.statusCode });
}

/**
 * Success response formatter
 */
export function successResponse<T>(data: T, statusCode = 200, requestId?: string): NextResponse {
  const response = {
    success: true,
    data,
    requestId: requestId || generateRequestId(),
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(response, { status: statusCode });
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Generate unique request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract and validate authorization token
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new APIError(
      ErrorCode.AUTHENTICATION_ERROR,
      'Invalid Authorization header format',
      401
    );
  }

  return parts[1];
}

/**
 * Extract client IP for rate limiting
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Sanitize input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .slice(0, 1000) // Prevent extremely long inputs
    .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
    .replace(/\0/g, ''); // Remove null bytes
}

/**
 * Sanitize phone number to E.164 format
 */
export function sanitizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('254') && cleaned.length === 12) {
    return `+${cleaned}`;
  }

  if (cleaned.startsWith('07') && cleaned.length === 10) {
    return `+254${cleaned.substring(1)}`;
  }

  if (cleaned.length === 9) {
    return `+254${cleaned}`;
  }

  if (cleaned.length >= 10) {
    return `+254${cleaned.slice(-9)}`;
  }

  throw new APIError(
    ErrorCode.VALIDATION_ERROR,
    'Invalid phone number format',
    400
  );
}

// ============================================================================
// MIDDLEWARE COMPOSABILITY
// ============================================================================

/*
 * Combine multiple middleware functions
 */
export function compose(
  ...middlewares: Array<(req: NextRequest) => Promise<void>>
): (request: NextRequest) => Promise<void> {
  return async (request: NextRequest): Promise<void> => {
    for (const middleware of middlewares) {
      await middleware(request);
    }
  };
}

/**
 * Log request start and end
 */
export function loggingMiddleware(request: NextRequest): void {
  const requestId = generateRequestId();
  const startTime = Date.now();

  console.log(`[${requestId}] ${request.method} ${request.nextUrl.pathname}`);

  // Note: Due to Next.js limitations, we can't hook response here
  // Use try-catch in route handlers instead
}

/**
 * Wrap handler with error handling
 */
export async function withErrorHandling<T>(
  handler: (req: NextRequest) => Promise<NextResponse<T>>,
  request: NextRequest
): Promise<NextResponse> {
  try {
    const requestId = generateRequestId();
    const response = await handler(request);

    // Add request ID header
    response.headers.set('x-request-id', requestId);

    return response;
  } catch (error) {
    return errorResponse(error, request.headers.get('x-request-id') || undefined);
  }
}

export default {
  ErrorCode,
  APIError,
  RequestValidator,
  RateLimiter,
  errorResponse,
  successResponse,
  extractToken,
  getClientIP,
  sanitizeInput,
  sanitizePhone,
  generateRequestId,
  withErrorHandling
};
