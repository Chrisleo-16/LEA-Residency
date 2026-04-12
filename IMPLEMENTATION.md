# LEA PLATFORM - COMPLETE IMPLEMENTATION GUIDE

## Architecture Overview

LEA is built as a production-ready African property management platform with three core domains:

1. **Tenant Management** - Rent payment, lease tracking, maintenance
2. **Landlord Analytics** - Financial dashboards, collection rates, occupancy
3. **Guest Marketplace** - Short-term rentals (Airbnb-style)

All components are designed to work offline-first with automatic sync when connectivity returns.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACES                          │
│  ┌──────────────┬──────────────┬──────────────────────────┐ │
│  │   Tenant App │ Landlord App │ Guest Marketplace        │ │
│  └──────┬───────┴──────┬───────┴──────────┬───────────────┘ │
└─────────┼──────────────┼──────────────────┼─────────────────┘
          │              │                  │
┌─────────┼──────────────┼──────────────────┼─────────────────┐
│         ▼              ▼                  ▼                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           API LAYER (Next.js Routes)                │   │
│  │  ┌────────────┬────────────┬───────────────────┐    │   │
│  │  │ Payments   │ Financial  │ Maintenance/Lease │    │   │
│  │  └───────┬────┴─────┬──────┴─────────┬────────┘    │   │
│  └─────────┼──────────┼────────────────┼─────────────┘   │
│            │          │                │                 │
│  ┌─────────┼──────────┼────────────────┼─────────────┐   │
│  │ ENGINES │          │                │             │   │
│  │ ┌──────▼──────┬───▼────────┬──────▼────┐          │   │
│  │ │ Payment     │ Financial  │ Offline   │ OTP Auth  │   │
│  │ │ (M-Pesa)    │ Analytics  │ Queue     │          │   │
│  │ └──────┬──────┴──┬─────────┴─────┬────┘          │   │
│  └────────┼────────┼───────────────┼───────────────┘   │
│           │        │               │                   │
│  ┌────────┼────────┼───────────────┼──────────────┐   │
│  │ INTEGRATIONS                    │              │   │
│  │ ┌────────▼──────┐  ┌──────────▼───────┐       │   │
│  │ │  Africa's     │  │   Supabase       │       │   │
│  │ │  Talking      │  │   PostgreSQL     │       │   │
│  │ │  ├ SMS        │  │   ├ Tenants      │       │   │
│  │ │  ├ USSD       │  │   ├ Payments     │       │   │
│  │ │  └ Voice      │  │   ├ Leases       │       │   │
│  │ │               │  │   └ Bookings     │       │   │
│  │ └───────────────┘  └──────────────────┘       │   │
│  │                                                │   │
│  │  ┌──────────────────────────────┐            │   │
│  │  │  Client-Side Services        │            │   │
│  │  │  ├ IndexedDB (Offline Queue) │            │   │
│  │  │  ├ Service Worker            │            │   │
│  │  │  └ Deep Linking              │            │   │
│  │  └──────────────────────────────┘            │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Core Data Model

### Entities & Relationships

```
┌──────────────┐
│  Landlords   │
└──────┬───────┘
       │ 1:M
       │
┌──────┴─────────────┐
│   Properties       │
└──────┬─────────────┘
       │ 1:M
┌──────┴─────────────┐
│      Units         │
└──────┬──────────────────┐
       │ 1:M              │ 1:M
       │                  │
┌──────┴────────┐  ┌──────┴──────────┐
│    Leases      │  │   Listings      │
└──────┬────────┘  └──────┬──────────┘
       │ 1:M               │ 1:M
       │                   │
    ┌──┴──────────┐    ┌───┴──────────┐
    │ Tenants     │    │   Bookings   │
    │             │    │   (Guests)   │
    └─────┬───────┘    └───┬──────────┘
          │ 1:M             │ 1:M
          │                 │
    ┌─────┴──────────┐  ┌───┴────────┐
    │  Payments  │  Reviews
    │            │
    └────────────┘
```

### Key Tables

1. **landlords** - Account, KYC, verification
2. **tenants** - Phone, verification status
3. **guests** - Marketplace users
4. **properties** - Buildings/compounds
5. **units** - Individual apartments/offices
6. **leases** - Rental agreements
7. **payments** - Rent, deposits, utilities
8. **listings** - Airbnb-style short-term rentals
9. **bookings** - Guest reservations
10. **maintenance_requests** - Issue tracking
11. **sms_logs** - Communication history
12. **offline_queue** - Offline transactions
13. **financial_summaries** - Denormalized metrics

---

## Payment Flow

### STK Push (M-Pesa)

```
1. Tenant clicks "Pay Rent"
   ↓
2. Backend creates Payment record (status: pending)
   ↓
3. M-Pesa STK push sent to phone
   ↓
4. Tenant enters PIN on phone
   ↓
5a. Success → Webhook callback
    ├─ Update payment status to completed
    ├─ Send confirmation SMS
    └─ Update unit occupancy
    
5b. Failure → Offline queue
    ├─ Add to IndexedDB queue
    └─ Retry with exponential backoff
```

### Failure Recovery

```
Network Error → Add to Offline Queue
   ↓
Service Worker caches request
   ↓
When online → Sync Manager retries
   ↓
If still fails → Manual retry via API
   ↓
Max retries → User notified, escalated
```

---

## SMS Integration

### Message Types

1. **Payment Confirmation** - "Payment of KES X received"
2. **Overdue Alert** - "Rent is X days overdue"
3. **Maintenance Update** - "Issue assigned to contractor"
4. **Booking Confirmation** - "Guest checking in"
5. **Review Request** - "Rate your stay: RATE 5"
6. **Verification OTP** - "Code: XXXXXX"

### Localization

All SMS templates are country-specific:
- **KE** (Kenya) - KES currency, swahili context
- **NG** (Nigeria) - NGN currency, style
- **UG** (Uganda), **TZ** (Tanzania), **GH** (Ghana)

### Retry Strategy

```
Failed SMS
   ↓
Queue for retry
   ↓
Delay: 2^attempt seconds
   ↓
Max 5 retries
   ↓
After max retries → Log and alert
```

---

## Financial Engine

### Collection Rate Calculation

```
Collection Rate = (Actual Collected / Expected Rent) × 100

Expected Rent = Sum of active lease monthly_rent for the period
Actual Collected = Sum of completed payments for the period
```

### Net Yield

```
Net Yield = ((Annual Income - Annual Expenses) / Annual Expected Rent) × 100

Annual Income = Monthly Collected × 12 (actual)
Annual Expenses = Average Monthly Expenses × 12
```

### Occupancy Rate

```
Occupancy Rate = (Occupied Units / Total Units) × 100

Where occupied = active leases during the period
```

### Dashboard Metrics

1. **Collection Rate** - % of expected rent collected
2. **Occupancy Rate** - % of units with active tenants
3. **Overdue Payments** - Amount & count past due
4. **Net Profit** - Monthly: Income - Expenses
5. **Top Property** - Highest collection rate
6. **Cash Flow Projection** - 6 months forecast

---

## Offline-First Architecture

### IndexedDB Structure

```
Database: LEA_OFFLINE
├─ transactions (objectStore)
│  ├─ Key: id
│  ├─ Index: synced (boolean)
│  ├─ Index: transactionType (string)
│  └─ Index: timestamp (number)
```

### Sync Flow

```
User Action (online) → Direct API → Success
                       ↓
                    Database

User Action (offline) → IndexedDB → Service Worker

Connection restored → Service Worker detects
                      ↓
                   Sync Manager
                      ↓
                   Retry pending items
                      ↓
                   Update IndexedDB status
```

### Transaction Types

- `payment` - Rent payment (STK push)
- `maintenance_report` - Issue submission
- `review_submit` - Guest review
- `booking_confirm` - Reservation

---

## Authentication

### SMS OTP Flow

```
1. Tenant enters phone number
   ↓
2. OTP sent to phone (6 digits, 10 min TTL)
   ↓
3. Tenant enters OTP
   ↓
4a. Correct → Generate token
    └─ Token = HMAC(sessionId, otp)[0:16]
    
4b. Wrong → 3 retries, then locked out
```

### Rate Limiting

- Max 3 OTP requests per phone per hour
- Max 3 verification attempts per session
- Session expires in 10 minutes

### Token Structure

```
Token = sessionId:signature

Where:
  sessionId = random 128-bit hex
  signature = HMAC-SHA256(sessionId, otp)[0:16]
```

---

## Error Handling Strategy

### Payment Errors

| Error | Status Code | Handling |
|-------|-------------|----------|
| Network timeout | 503 | Retry with backoff |
| Invalid credentials | 401 | Request new OTP |
| Insufficient funds | 402 | Show error, allow retry |
| Duplicate transaction | 409 | Return existing payment |
| Server error | 500 | Queue for retry later |

### SMS Errors

| Error | Handling |
|-------|----------|
| 401 (Invalid phone) | Mark as bounced |
| 402 (Blacklisted) | Skip, don't retry |
| 500 (Gateway error) | Retry up to 5 times |
| No response | Timeout after 30 tries |

---

## Security Considerations

### Data Protection

- ✅ HTTPS only (TLS 1.3)
- ✅ Row-level security (Supabase RLS)
- ✅ No payment card storage (M-Pesa only)
- ✅ Audit logging for all transactions
- ✅ API rate limiting (60 req/min per IP)

### API Security

- ✅ Input validation (sanitize all fields)
- ✅ CSRF tokens on state-changing operations
- ✅ Idempotency keys for payments
- ✅ Webhook signature verification
- ✅ Session timeout (1 hour)

### Deployment

- ✅ Environment variables (never commit secrets)
- ✅ Database encryption in transit
- ✅ Automated backups (daily)
- ✅ Web Application Firewall (WAF)
- ✅ DDoS protection

---

## Monitoring & Alerts

### Key Metrics to Monitor

```
1. Payment Processing
   - STK push success rate (target: >95%)
   - Webhook processing latency (target: <100ms)
   - Failed payment retry success (target: >80%)

2. SMS Delivery
   - SMS delivery rate (target: >98%)
   - Average retry attempts (target: <1.5)
   - Undeliverable rate (target: <0.5%)

3. Financial Health
   - Collection rate by property (track >85%)
   - Overdue payment count (alert if >5% of leases)
   - Cash flow forecast accuracy

4. System Health
   - API response time (target: <200ms p95)
   - Database connection pool usage
   - Offline queue pending items
   - Error rate (target: <0.1%)
```

### Alert Rules

```
⚠️ WARNING
- Collection rate drops below 80%
- Offline queue > 100 items
- Payment API response time > 500ms

🔴 CRITICAL
- Payment webhook not responding
- SMS delivery rate < 95%
- Database connection down
- M-Pesa API unavailable
```

---

## Deployment Checklist

### Pre-Production

- [ ] Test all payment scenarios (success, failure, timeout)
- [ ] Test all SMS templates in target countries
- [ ] Verify offline queue sync working
- [ ] Load test with 1000 concurrent users
- [ ] Test database backup & restore
- [ ] Security review of API endpoints
- [ ] Test M-Pesa in sandbox mode

### Production Deployment

- [ ] Set environment variables in Vercel
- [ ] Enable automated Supabase backups
- [ ] Configure monitoring & alerts
- [ ] Set up error tracking (Sentry)
- [ ] Enable WAF & DDoS protection
- [ ] Run smoke tests against production
- [ ] Monitor for 24 hours before full rollout
- [ ] Have incident response plan ready

---

## File Manifest

```
lib/
├── database/
│   ├── schema.sql                  # Complete PostgreSQL schema
│   └── client.ts                   # Supabase client + retry logic
├── types/
│   └── index.ts                    # TypeScript definitions
├── engines/
│   ├── mpesa_engine.ts             # M-Pesa STK push
│   ├── financial_engine.ts         # Analytics calculations
│   ├── offline_queue.ts            # IndexedDB persistence
│   └── otp_auth.ts                 # SMS verification
├── supabase.ts                     # (existing client)
└── utils.ts                        # (existing utilities)

attalking_integration/
├── sms_dispatcher/
│   ├── dispatcher.ts               # SMS delivery engine
│   ├── message_templates.ts        # Localized templates
│   └── webhook_handler.ts          # Webhook handlers
├── ussd_manager/                   # (for future USSD)
├── voice_engine/                   # (for future voice)
└── ai_clerk/                       # (for future AI clerk)

app/api/
├── payments/
│   └── route.ts                    # Payment APIs
├── webhooks/
│   ├── payment/route.ts            # M-Pesa webhook
│   └── sms/route.ts                # SMS webhooks
└── landlord/
    └── financial/route.ts          # Dashboard APIs
```

---

## Testing Strategy

### Unit Tests

```typescript
// Test OTP generation
- Correct length (6 digits)
- No duplicates in 10s
- Proper TTL enforcement

// Test Financial Engine
- Collection rate calculation
- Net yield accuracy
- Occupancy rate with edge cases

// Test Offline Queue
- Enqueue transaction
- Sync with network
- Retry with exponential backoff
```

### Integration Tests

```typescript
// Test Payment Flow
- Send STK push
- Simulate M-Pesa callback
- Verify balance update
- Check SMS sent

// Test SMS Delivery
- Send bulk SMS
- Verify rate limiting
- Test retry logic
- Check delivery status
```

### Manual Testing

```
1. Payment Flow
   - STK push appears on phone
   - Confirmation SMS received
   - Balance updated immediately

2. Offline Scenario
   - Go offline, submit payment
   - Payment queued in IndexedDB
   - Come back online, sync
   - Payment completes

3. Financial Dashboard
   - Collection rate reflects recent payments
   - Occupancy rate matches active leases
   - Overdue alert triggers for 3+ days late
```

---

## Support & Troubleshooting

### Common Issues

**1. STK Push Not Appearing**
- Check consumer key/secret
- Verify phone format (add country code)
- Check M-Pesa account balance
- Test in sandbox first

**2. SMS Not Delivering**
- Verify API key is valid
- Check sender ID is registered
- Validate phone numbers (E.164 format)
- Check quota limits

**3. Offline Queue Stuck**
- Check IndexedDB is enabled in browser
- Verify network connectivity
- Check browser console for errors
- Manual retry via /api/payments/retry

**4. High Payment Latency**
- Check M-Pesa API response time
- Verify database connection pool
- Scale backend if needed
- Check for timeout issues

---

## Next Steps

1. **Set up environment variables** (.env.local from template)
2. **Deploy database schema** to Supabase
3. **Test payment flow** in M-Pesa sandbox
4. **Verify SMS delivery** with test numbers
5. **Deploy to Vercel** and monitor
6. **Gradual rollout** to real users

---

## Contact & Support

For issues or questions:
- Email: dev@lea.platform
- GitHub: https://github.com/Chrisleo-16/LEA-Residency
- Documentation: https://docs.lea.platform
