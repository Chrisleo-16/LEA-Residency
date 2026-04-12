#!/usr/bin/env node

/**
 * LEA Platform - Core Configuration & Initialization
 * Production setup with all required environment variables
 */

const path = require('path');
const fs = require('fs');

// ============================================================================
// ENVIRONMENT VARIABLES TEMPLATE
// ============================================================================

const ENV_TEMPLATE = `# LEA Platform - Environment Variables
# Copy this file to .env.local and fill in your actual values

# ============================================================================
# DATABASE (Supabase)
# ============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# ============================================================================
# PAYMENT PROCESSING (M-Pesa)
# ============================================================================
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_SHORT_CODE=123456
MPESA_PASSTHROUGH_KEY=your_passthrough_key
MPESA_CALLBACK_URL=https://yourdomain.com/api/webhooks/payment

# ============================================================================
# SMS & VOICE (Africa's Talking)
# ============================================================================
AFRICASTALKING_API_KEY=your_africastalking_api_key
AFRICASTALKING_USERNAME=your_africastalking_username
AFRICASTALKING_WEBHOOK_URL=https://yourdomain.com/api/webhooks/sms

# ============================================================================
# APPLICATION
# ============================================================================
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
SECRET_KEY=generate_a_random_32_char_key_here

# ============================================================================
# OPTIONAL: ANALYTICS & MONITORING
# ============================================================================
# SENTRY_DSN=https://...
# LOG_LEVEL=info
`;

// ============================================================================
// INITIALIZATION CHECKLIST
// ============================================================================

const SETUP_CHECKLIST = {
  database: {
    title: '1. DATABASE SETUP (Supabase)',
    steps: [
      'Create a new Supabase project',
      'Run SQL schema from lib/database/schema.sql in Supabase SQL editor',
      'Enable Row Level Security (RLS) policies',
      'Create API KEY with limited permissions',
      'Copy URL and Anon Key to .env.local'
    ]
  },
  mpesa: {
    title: '2. M-PESA SETUP',
    steps: [
      'Register at https://developer.safaricom.co.ke',
      'Create an app and get Consumer Key/Secret',
      'Get Business Short Code for STK push',
      'Set up webhook URL: ${CALLBACK_URL}/api/webhooks/payment',
      'Copy credentials to .env.local',
      'Test in Sandbox mode first (set MPESA_SANDBOX=true)'
    ]
  },
  sms: {
    title: '3. AFRICA\'S TALKING SMS & VOICE SETUP',
    steps: [
      'Sign up at https://africastalking.com',
      'Create API key in dashboard',
      'Verify your sender ID (e.g., "LEA")',
      'Test SMS API credentials',
      'Set up webhooks for SMS delivery status',
      'Configure USSD codes with AT if using USSD'
    ]
  },
  deployment: {
    title: '4. DEPLOYMENT SETUP',
    steps: [
      'Deploy to Vercel: \`vercel\`',
      'Set environment variables in Vercel dashboard',
      'Configure custom domain',
      'Enable function timeout increase (40s for M-Pesa)',
      'Set up error tracking (Sentry recommended)',
      'Configure backup strategy for database'
    ]
  }
};

// ============================================================================
// IMPLEMENTATION FILES MANIFEST
// ============================================================================

const FILES_CREATED = {
  database: [
    'lib/database/schema.sql - Complete PostgreSQL schema',
    'lib/database/client.ts - Supabase client with retry logic'
  ],
  types: [
    'lib/types/index.ts - Complete TypeScript type definitions'
  ],
  payment: [
    'lib/engines/mpesa_engine.ts - M-Pesa STK push & polling',
    'app/api/payments/route.ts - Payment request/confirmation APIs'
  ],
  sms: [
    'attalking_integration/sms_dispatcher/dispatcher.ts - SMS delivery engine',
    'attalking_integration/sms_dispatcher/message_templates.ts - Localized SMS templates',
    'attalking_integration/sms_dispatcher/webhook_handler.ts - Webhook handlers'
  ],
  financial: [
    'lib/engines/financial_engine.ts -Collection rate & yield calculations',
    'app/api/landlord/financial/route.ts - Dashboard metrics APIs'
  ],
  offline: [
    'lib/engines/offline_queue.ts - IndexedDB offline persistence'
  ],
  auth: [
    'lib/engines/otp_auth.ts - SMS OTP verification'
  ]
};

// ============================================================================
// CRITICAL PRODUCTION REQUIREMENTS
// ============================================================================

const PRODUCTION_CHECKLIST = [
  '✅ Database backups: Enable automated Supabase backups',
  '✅ SSL/TLS: Ensure HTTPS on all endpoints',
  '✅ API Rate Limiting: Implement rate limiting for payment APIs',
  '✅ PCI DSS: Never store card data; use M-Pesa only',
  '✅ Data Encryption: Enable column encryption for sensitive data',
  '✅ Audit Logging: All financial transactions are logged',
  '✅ Idempotency: Payment webhooks are idempotent',
  '✅ Error Handling: SMS failures are retried with exponential backoff',
  '✅ Monitoring: Set up alerts for failed payments & SMS delivery',
  '✅ Security Headers: CSP, X-Frame-Options, etc.',
  '✅ Input Validation: All API inputs are sanitized',
  '✅ Failed Payment Recovery: Offline queue ensures no lost transactions'
];

// ============================================================================
// QUICK START GUIDE
// ============================================================================

function printSetup() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║          LEA PLATFORM - PRODUCTION SETUP GUIDE                 ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log('IMPLEMENTATION COMPLETE ✅\n');
  console.log('Core components implemented:');
  for (const [category, files] of Object.entries(FILES_CREATED)) {
    console.log(`\n  ${category.toUpperCase()}:`);
    files.forEach(file => console.log(`    • ${file}`));
  }

  console.log('\n\n' + '='.repeat(65) + '\n');
  console.log('SETUP CHECKLIST:\n');

  for (const [key, section] of Object.entries(SETUP_CHECKLIST)) {
    console.log(`${section.title}`);
    section.steps.forEach((step, i) => {
      console.log(`    ${i + 1}. ${step}`);
    });
    console.log();
  }

  console.log('='.repeat(65) + '\n');
  console.log('PRODUCTION REQUIREMENTS:\n');

  PRODUCTION_CHECKLIST.forEach(item => {
    console.log(`  ${item}`);
  });

  console.log('\n' + '='.repeat(65) + '\n');
  console.log('NEXT STEPS:\n');
  console.log('  1. Create .env.local file with template above');
  console.log('  2. Follow the setup checklist in order');
  console.log('  3. Test each component in sandbox/development');
  console.log('  4. Deploy to Vercel when ready');
  console.log('  5. Monitor for 24 hours before full rollout\n');

  console.log('ENVIRONMENT FILE TEMPLATE:\n');
  console.log(ENV_TEMPLATE);
}

printSetup();

module.exports = {
  ENV_TEMPLATE,
  SETUP_CHECKLIST,
  FILES_CREATED,
  PRODUCTION_CHECKLIST
};
