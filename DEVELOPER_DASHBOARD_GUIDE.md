# Developer Dashboard - System Architecture & Monitoring Guide

## Overview

This document provides a comprehensive analysis of the LEA Platform's system architecture, multi-tenancy implementation, infrastructure components, and monitoring integrations.

---

## 1. Multi-Tenancy/Landlord Architecture ✅

### Status: **FULLY IMPLEMENTED**

The LEA Platform has a robust multi-tenancy architecture ensuring complete isolation between landlords.

### Implementation Details

#### Database Schema
- **`landlord_blocks` table**: Each landlord gets their own blockchain block with:
  - Unique `landlord_id` (UUID)
  - Unique `landlord_code` (format: LEA-XYZ123-ABC)
  - SHA-256 `block_hash` for blockchain integrity
  - `property_capacity` and `property_used` for slot management
  - `is_active` flag for block status

- **`tenant_slots` table**: Tenant slots tied to specific landlord blocks:
  - `landlord_block_id` foreign key to landlord_blocks
  - Unique `tenant_code` per slot
  - `is_occupied` status tracking
  - Tenant information when occupied

- **`blockchain_transactions` table**: Audit trail for all operations:
  - Transaction types: landlord_register, tenant_assign, tenant_vacate, capacity_update
  - SHA-256 transaction hashes
  - Timestamps and confirmation tracking

#### Row-Level Security (RLS)
```sql
-- Landlords can only view their own blocks
CREATE POLICY "Landlords can view their own blocks"
  ON landlord_blocks FOR SELECT
  USING (landlord_id = current_user_id());

-- Landlords can only manage their tenant slots
CREATE POLICY "Landlords can manage their tenant slots"
  ON tenant_slots FOR ALL
  USING (landlord_block_id IN (
    SELECT id FROM landlord_blocks WHERE landlord_id = current_user_id()
  ));
```

#### Service Layer
- **`MultiLandlordBlockchainService`** in `lib/blockchain/multi_landlord_service.ts`:
  - `registerLandlord()` - Creates new landlord block with tenant slots
  - `assignTenantToSlot()` - Assigns tenant to specific landlord's slot
  - `validateTenantCode()` - Validates tenant belongs to correct landlord
  - `vacateTenantSlot()` - Removes tenant from landlord's slot
  - `updatePropertyCapacity()` - Updates landlord's capacity

#### Isolation Guarantees
✅ **Database-Level Isolation**: Foreign key constraints prevent cross-landlord data access
✅ **Application-Level Isolation**: RLS policies enforce data separation
✅ **Blockchain-Level Isolation**: Each landlord has separate block in chain
✅ **Tenant Slot Isolation**: Slots are tied to specific landlord blocks
✅ **Transaction Audit**: All operations logged with blockchain integrity

### Verification
Landlord A cannot:
- Access Landlord B's tenant slots
- View Landlord B's blockchain transactions
- Modify Landlord B's property capacity
- Assign tenants to Landlord B's blocks

---

## 2. Rate Limiting ✅

### Status: **IMPLEMENTED**

Rate limiting is implemented in `lib/middleware/api.ts`.

### Implementation

```typescript
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

  isAllowed(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    // Rate limiting logic with sliding window
  }
}
```

### Configuration
- **Default**: 60 requests per minute per IP
- **OTP Auth**: 3 requests per hour per phone number
- **Storage**: In-memory with automatic cleanup
- **Key Generation**: Based on client IP address

### Usage
```typescript
const rateLimiter = new RateLimiter(60, 60000);
const { allowed, remaining } = rateLimiter.isAllowed(clientIP);
if (!allowed) {
  throw new APIError(ErrorCode.RATE_LIMITED, 'Too many requests', 429);
}
```

---

## 3. Caching Strategy ✅

### Status: **IMPLEMENTED**

PWA Service Worker caching configured in `next.config.ts`.

### Cache Configuration

```typescript
runtimeCaching: [
  {
    // Supabase API responses
    urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
    handler: 'NetworkFirst',
    options: {
      cacheName: 'supabase-cache',
      expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 }, // 1 hour
      networkTimeoutSeconds: 10,
    },
  },
  {
    // Google Fonts
    urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'google-fonts',
      expiration: { maxEntries: 4, maxAgeSeconds: 365 * 24 * 60 * 60 }, // 1 year
    },
  },
  {
    // Static images
    urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'static-images',
      expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 }, // 30 days
    },
  },
  {
    // JS and CSS
    urlPattern: /\.(?:js|css)$/i,
    handler: 'StaleWhileRevalidate',
    options: {
      cacheName: 'static-resources',
      expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 }, // 1 day
    },
  },
]
```

### Cache Strategies
- **NetworkFirst**: Try network first, fallback to cache (API calls)
- **CacheFirst**: Serve from cache first, update in background (static assets)
- **StaleWhileRevalidate**: Serve stale cache, update in background (JS/CSS)

---

## 4. CDN ✅

### Status: **IMPLEMENTED (Vercel)**

Vercel provides automatic CDN via Edge Network.

### Implementation
- **Provider**: Vercel Edge Network
- **Coverage**: Global edge locations
- **Automatic**: No configuration required
- **Static Assets**: Served from CDN automatically
- **API Routes**: Edge functions deployed globally

### Benefits
- Low latency worldwide
- Automatic SSL/TLS
- DDoS protection
- Automatic scaling

---

## 5. Load Balancing ✅

### Status: **IMPLEMENTED (Vercel)**

Load balancing handled by Vercel's infrastructure.

### Implementation
- **Provider**: Vercel
- **Type**: Automatic load balancing
- **Algorithm**: Round-robin with health checks
- **Scaling**: Automatic based on traffic

### Configuration
No manual configuration needed. Vercel handles:
- Request distribution
- Health checks
- Failover
- Geographic routing

---

## 6. Auto Scaling ✅

### Status: **IMPLEMENTED**

Both frontend and backend scale automatically.

### Frontend Scaling (Vercel)
- **Platform**: Vercel
- **Scaling**: Automatic based on traffic
- **Limits**: Configured in Vercel dashboard
- **Zero-downtime**: Rolling deployments

### Backend Scaling (Supabase)
- **Platform**: Supabase (PostgreSQL)
- **Scaling**: Automatic based on load
- **Connection Pooling**: Managed by Supabase
- **Read Replicas**: Available in paid tiers

### Scaling Triggers
- CPU usage
- Memory usage
- Request rate
- Database connections

---

## 7. Error Tracking ❌

### Status: **NOT IMPLEMENTED**

Currently using only console.log for error tracking.

### Current State
- Basic console.error() calls
- No centralized error tracking
- No error alerting
- No error aggregation

### Recommendation: Integrate Sentry

#### Installation
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

#### Configuration
```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

#### Environment Variables
```env
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_auth_token
```

#### Benefits
- Real-time error tracking
- Stack traces with source maps
- User context
- Release tracking
- Performance monitoring

---

## 8. Log Tracking ❌

### Status: **NOT IMPLEMENTED**

Currently using only console.log for logging.

### Current State
- Basic console.log() calls
- No structured logging
- No log aggregation
- No log retention
- No log search/analysis

### Recommendation: Integrate Log Aggregation Service

#### Options
1. **Logtail** (recommended for Vercel)
2. **Datadog**
3. **LogRocket**
4. **Loki + Grafana**

#### Example: Logtail Integration
```bash
npm install @logtail/node
```

```typescript
import { Logtail } from "@logtail/node";

const logtail = new Logtail(process.env.LOGTAIL_SOURCE_TOKEN);

logtail.info("User login", { userId: "123", ip: "1.2.3.4" });
logtail.error("Payment failed", { error: "Insufficient funds", amount: 50000 });
```

#### Benefits
- Structured logging
- Log aggregation
- Search and filter
- Alerting on log patterns
- Log retention

---

## 9. Availability & Recovery ✅

### Status: **IMPLEMENTED**

Offline-first architecture with automatic recovery.

### Implementation

#### Offline Support
- **IndexedDB**: Client-side data persistence
- **Service Worker**: Background sync
- **Offline Queue**: Failed operations queued
- **Auto Sync**: Retry when connection restored

#### Recovery Mechanisms
```typescript
// Offline queue for failed payments
await offlineQueue.enqueue('payment', tenantId, {...});

// Automatic sync when connection returns
offlineQueue.syncQueue(async (item) => {
  await mpesaEngine.requestPayment(...);
});
```

#### Conflict Resolution
- Last-write-wins strategy
- Audit trail for conflicts
- Manual resolution interface

### Missing Components
- **Disaster Recovery Plan**: Not documented
- **Backup Procedures**: Not tested
- **Failover Testing**: Not performed

### Recommendations
1. Document disaster recovery procedures
2. Test backup/restore regularly
3. Implement database backup verification
4. Add failover testing to CI/CD

---

## 10. Idempotency ⚠️

### Status: **PARTIALLY IMPLEMENTED**

Idempotency implemented for payment webhooks only.

### Implementation

#### Payment Webhooks
```typescript
// M-Pesa transaction IDs are unique
const { data: existingPayment } = await supabase
  .from('payments')
  .select('*')
  .eq('mpesa_code', mpesaTransactionId)
  .single();

if (existingPayment) {
  // Return existing payment, don't create duplicate
  return { success: true, payment: existingPayment };
}
```

### Coverage
✅ Payment webhooks (M-Pesa)
❌ API routes (most endpoints)
❌ SMS sending
❌ Database writes
❌ External API calls

### Recommendation: Extend Idempotency

#### Implementation Pattern
```typescript
// Add idempotency key to all critical operations
async function createPayment(data: PaymentData, idempotencyKey: string) {
  // Check if operation already performed
  const existing = await cache.get(idempotencyKey);
  if (existing) {
    return existing;
  }

  // Perform operation
  const result = await performPayment(data);

  // Cache result
  await cache.set(idempotencyKey, result, { ttl: 3600 });

  return result;
}
```

#### Endpoints to Add
- `/api/payments/request-payment`
- `/api/sms/send`
- `/api/maintenance/create`
- `/api/notifications/send`

---

## 11. Monitoring Integrations

### Sentry (Error Tracking) ❌
**Status**: Not configured

**Setup Instructions**:
1. Create account at https://sentry.io
2. Run: `npm install @sentry/nextjs`
3. Run: `npx @sentry/wizard@latest -i nextjs`
4. Add `NEXT_PUBLIC_SENTRY_DSN` to environment variables
5. Configure error alerts and release tracking

**Dashboard Integration**: Shows error count, last error, connection status

---

### PostHog (Analytics) ❌
**Status**: Not configured

**Setup Instructions**:
1. Create account at https://posthog.com
2. Run: `npm install posthog-js`
3. Initialize in `app/layout.tsx`:
```typescript
import posthog from 'posthog-js'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'
  })
}
```
4. Add `NEXT_PUBLIC_POSTHOG_KEY` to environment variables
5. Track events: `posthog.capture('user_action', { property: 'value' })`

**Dashboard Integration**: Shows event count, active users, connection status

---

### BetterStack (Uptime Monitoring) ❌
**Status**: Not configured

**Setup Instructions**:
1. Create account at https://betterstack.com
2. Add your website URL as a monitor
3. Configure alert channels (email, Slack, SMS)
4. Set up status page for public visibility
5. Configure response time thresholds

**Dashboard Integration**: Shows uptime percentage, incident count, connection status

---

### Getnoise (Noise Monitoring) ❌
**Status**: Not configured

**Setup Instructions**:
1. Create account at https://getnoise.com
2. Deploy noise sensors if needed
3. Configure API endpoints for data ingestion
4. Set up alert thresholds
5. Integrate with property management system

**Dashboard Integration**: Shows noise level, alert count, connection status

---

### Sideshift (Transaction Monitoring) ❌
**Status**: Not configured

**Setup Instructions**:
1. Create account at https://sideshift.ai
2. Generate API keys for transaction tracking
3. Integrate with payment webhooks
4. Configure real-time alerts
5. Set up transaction monitoring rules

**Dashboard Integration**: Shows transaction count, volume, connection status

---

## 12. Developer Dashboard

### Access
Navigate to `/developer-dashboard` to view the dashboard.

### Features
- **System Health Overview**: Status, uptime, response time, error rate
- **Multi-Tenancy Tab**: Landlord count, tenant count, isolation status
- **Infrastructure Tab**: Rate limiting, caching, CDN, load balancing, scaling
- **Monitoring Tab**: Integration status for all monitoring services
- **Integrations Tab**: Architecture summary and recommendations

### API Endpoints
- `GET /api/developer/multi-tenancy-status` - Fetch multi-tenancy metrics
- `GET /api/developer/monitoring-status` - Fetch monitoring integration status

---

## 13. Summary & Recommendations

### ✅ What's Working Well
1. **Multi-Tenancy**: Robust landlord isolation with blockchain and RLS
2. **Rate Limiting**: Configurable and properly implemented
3. **Caching**: Comprehensive PWA service worker caching
4. **CDN**: Vercel Edge Network provides global CDN
5. **Load Balancing**: Automatic via Vercel
6. **Auto Scaling**: Both frontend and backend scale automatically
7. **Offline Support**: IndexedDB with automatic sync
8. **Idempotency**: Implemented for critical payment operations

### ⚠️ Areas for Improvement
1. **Error Tracking**: Integrate Sentry for centralized error monitoring
2. **Log Tracking**: Replace console.log with structured logging service
3. **Extended Idempotency**: Add to all critical API operations
4. **Disaster Recovery**: Document and test backup/restore procedures
5. **Analytics**: Integrate PostHog for user behavior tracking
6. **Uptime Monitoring**: Set up BetterStack for real-time alerts

### 🚨 Critical Issues
1. **No Error Tracking**: Production errors may go unnoticed
2. **No Centralized Logging**: Difficult to debug distributed issues
3. **No Uptime Monitoring**: No alerts when system goes down
4. **No Analytics**: No visibility into user behavior

### 📋 Implementation Priority
1. **HIGH**: Integrate Sentry (error tracking)
2. **HIGH**: Integrate BetterStack (uptime monitoring)
3. **HIGH**: Integrate PostHog (analytics)
4. **MEDIUM**: Implement structured logging
5. **MEDIUM**: Extend idempotency to all endpoints
6. **LOW**: Document disaster recovery procedures

---

## 14. Environment Variables Template

Add these to your `.env.local` file:

```env
# Sentry (Error Tracking)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_auth_token

# PostHog (Analytics)
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# BetterStack (Uptime Monitoring)
BETTERSTACK_API_KEY=your_betterstack_api_key
BETTERSTACK_MONITOR_ID=your_monitor_id

# Getnoise (Noise Monitoring)
GETNOISE_API_KEY=your_getnoise_api_key

# Sideshift (Transaction Monitoring)
SIDESHIFT_API_KEY=your_sideshift_api_key
SIDESHIFT_API_SECRET=your_sideshift_secret

# Log Aggregation (e.g., Logtail)
LOGTAIL_SOURCE_TOKEN=your_logtail_token
```

---

## 15. Testing Checklist

Before going to production with monitoring:

- [ ] Sentry configured and receiving errors
- [ ] PostHog tracking user events
- [ ] BetterStack monitoring uptime
- [ ] Error alerts configured (email, Slack)
- [ ] Log aggregation service integrated
- [ ] Idempotency keys added to all endpoints
- [ ] Disaster recovery documented
- [ ] Backup/restore procedures tested
- [ ] Dashboard accessible and functional
- [ ] API endpoints returning correct data

---

**Last Updated**: May 19, 2026
**System Version**: LEA Platform v2.0
