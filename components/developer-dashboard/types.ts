export interface SentryEvent {
  id: string
  title: string
  level: 'fatal' | 'error' | 'warning' | 'info'
  count: number
  lastSeen: string
  firstSeen: string
  culprit: string
  project: string
  isResolved: boolean
  tags: Record<string, string>
}

export interface LogEntry {
  id: string
  timestamp: string
  timestampMs?: number
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
  source: string
  meta?: Record<string, any>
}

export interface SchemaTableConfig {
  name: string
  cols: string[]
  rls: boolean
  realtime: boolean
}

export interface SchemaTableDef extends SchemaTableConfig {
  count: number
}

export interface MonitoringStatus {
  sentry: { connected: boolean; errors: number; lastError?: string }
  posthog: { connected: boolean; events: number; users: number }
  betterstack: { connected: boolean; uptime: number; incidents: number }
  getnoise: { connected: boolean; noiseLevel: number; alerts: number }
  sideshift: { connected: boolean; transactions: number; volume: number }
}

export interface LandlordProfile {
  full_name: string | null
  email: string | null
  phone_number: string | null
  landlord_code: string | null
}

export interface LandlordSubscription {
  id: string
  landlord_id: string
  tier: string
  status: string
  monthly_fee: number
  unit_count: number
  setup_fee_paid: boolean
  current_period_start: string | null
  current_period_end: string | null
  free_access_until: string | null
  landlord: LandlordProfile | null
}

export interface SubscriptionPayment {
  id: string
  subscription_id: string
  landlord_id: string
  amount: number
  status: 'pending' | 'complete' | 'failed'
  payment_type: 'setup' | 'monthly'
  billing_period: string
  mpesa_code: string | null
  payment_date: string | null
  created_at: string
  landlord_name: string
}

export interface SubscriptionsSummary {
  mrr: number
  activeCount: number
  overdueCount: number
  freeAccessCount: number
  totalCollected: number
  pendingCount: number
}

export type TabId =
  | 'overview'
  | 'errors'
  | 'logs'
  | 'infra'
  | 'users'
  | 'payments'
  | 'subscriptions'
  | 'activity'
  | 'database'
