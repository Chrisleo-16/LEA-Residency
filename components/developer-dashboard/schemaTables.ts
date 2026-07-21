import type { SchemaTableConfig } from './types'

// Static config for the Database tab. Row counts are fetched live by
// DatabaseTab.tsx and merged in at render time — this file only tracks
// what doesn't change: columns, RLS enforcement, and realtime publication.
export const SCHEMA_TABLES: SchemaTableConfig[] = [
  {
    name: 'profiles',
    cols: ['id', 'full_name', 'email', 'role', 'phone_number', 'avatar_url', 'landlord_code', 'landlord_block_id', 'blockchain_verified', 'kyc_verified', 'property_setup_complete', 'created_at'],
    rls: true, realtime: true,
  },
  {
    name: 'payments',
    cols: ['id', 'tenant_id', 'landlord_id', 'amount', 'payment_month', 'mpesa_code', 'phone_number', 'status', 'payment_method', 'notes', 'payment_date'],
    rls: true, realtime: true,
  },
  {
    name: 'landlord_subscriptions',
    cols: ['id', 'landlord_id', 'tier', 'status', 'monthly_fee', 'unit_count', 'setup_fee_paid', 'current_period_start', 'current_period_end', 'free_access_until'],
    rls: false, realtime: false,
  },
  {
    name: 'subscription_payments',
    cols: ['id', 'subscription_id', 'landlord_id', 'amount', 'status', 'payment_type', 'billing_period', 'mpesa_code', 'payment_date', 'created_at'],
    rls: false, realtime: false,
  },
  {
    name: 'messages',
    cols: ['id', 'conversation_id', 'sender_id', 'content', 'is_edited', 'edited_at', 'reply_to_id', 'read', 'created_at'],
    rls: true, realtime: true,
  },
  {
    name: 'conversations',
    cols: ['id', 'type', 'created_at'],
    rls: true, realtime: true,
  },
  {
    name: 'complaints',
    cols: ['id', 'tenant_id', 'title', 'description', 'status', 'created_at'],
    rls: true, realtime: true,
  },
  {
    name: 'requests',
    cols: ['id', 'tenant_id', 'title', 'description', 'category', 'status', 'created_at'],
    rls: true, realtime: true,
  },
  {
    name: 'policies',
    cols: ['id', 'title', 'content', 'category', 'file_url', 'created_by', 'created_at'],
    rls: true, realtime: false,
  },
  {
    name: 'rent_settings',
    cols: ['id', 'tenant_id', 'monthly_amount', 'due_day', 'unit_number', 'created_at'],
    rls: true, realtime: true,
  },
  {
    name: 'landlord_blocks',
    cols: ['id', 'landlord_id', 'landlord_name', 'landlord_code', 'block_hash', 'block_number', 'property_capacity', 'property_used', 'is_active'],
    rls: true, realtime: false,
  },
  {
    name: 'tenant_slots',
    cols: ['id', 'landlord_block_id', 'slot_number', 'tenant_code', 'tenant_id', 'is_occupied', 'monthly_rent', 'lease_start_date', 'lease_end_date'],
    rls: true, realtime: false,
  },
  {
    name: 'blockchain_transactions',
    cols: ['id', 'block_hash', 'transaction_type', 'transaction_hash', 'from_entity', 'to_entity', 'confirmed', 'confirmations', 'timestamp'],
    rls: false, realtime: false,
  },
  {
    name: 'contact_submissions',
    cols: ['id', 'first_name', 'last_name', 'email', 'phone', 'inquiry_type', 'subject', 'message', 'status', 'created_at'],
    rls: false, realtime: false,
  },
  {
    name: 'viewing_requests',
    cols: ['id', 'first_name', 'last_name', 'email', 'phone', 'property_type', 'preferred_date', 'preferred_time', 'status', 'created_at'],
    rls: false, realtime: false,
  },
  {
    name: 'push_subscriptions',
    cols: ['id', 'user_id', 'endpoint', 'p256dh_key', 'auth_key', 'is_active', 'created_at'],
    rls: false, realtime: false,
  },
  {
    name: 'photos',
    cols: ['id', 'user_id', 'file_name', 'file_url', 'category', 'title', 'description', 'tags', 'is_public', 'uploaded_at'],
    rls: true, realtime: false,
  },
  {
    name: 'staff',
    cols: ['id', 'first_name', 'last_name', 'email', 'phone', 'specialty', 'availability', 'hourly_rate', 'rating', 'is_active'],
    rls: false, realtime: false,
  },
  {
    name: 'staff_assignments',
    cols: ['id', 'staff_id', 'tenant_id', 'property_id', 'status', 'assigned_at', 'completed_at'],
    rls: false, realtime: false,
  },
  {
    name: 'properties',
    cols: ['id', 'landlord_block_id', 'property_name', 'property_address', 'created_at'],
    rls: false, realtime: false,
  },
  {
    name: 'account_deletion_requests',
    cols: ['id', 'user_id', 'reason', 'status', 'reviewed_by', 'reviewed_at', 'created_at'],
    rls: false, realtime: false,
  },
  {
    name: 'message_reactions',
    cols: ['id', 'message_id', 'user_id', 'emoji', 'created_at'],
    rls: true, realtime: true,
  },
  {
    name: 'message_reads',
    cols: ['id', 'message_id', 'user_id', 'seen_at'],
    rls: true, realtime: true,
  },
  {
    name: 'conversation_participants',
    cols: ['id', 'conversation_id', 'user_id'],
    rls: true, realtime: true,
  },
]
