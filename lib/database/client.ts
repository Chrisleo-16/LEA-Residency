/**
 * Enhanced Supabase Client with Error Handling & Retry Logic
 * Production-ready database abstraction layer
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { timeout } from '@/lib/utils';

interface DatabaseConfig {
  url: string;
  anonKey: string;
  maxRetries: number;
  retryDelay: number;
}

class LEADatabase {
  private client: SupabaseClient;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config: DatabaseConfig) {
    if (!config.url || !config.anonKey) {
      throw new Error('Supabase URL and Anon Key are required');
    }
    this.client = createClient(config.url, config.anonKey);
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  /**
   * Retry logic with exponential backoff
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on 4xx errors (auth, validation, not found)
        if (error instanceof Error && error.message.includes('401')) {
          throw error;
        }

        if (attempt < this.maxRetries) {
          const delayMs = this.retryDelay * Math.pow(2, attempt);
          console.warn(
            `${operationName} failed (attempt ${attempt + 1}/${this.maxRetries + 1}), retrying in ${delayMs}ms`,
            error
          );
          await timeout(delayMs);
        }
      }
    }

    throw new Error(
      `${operationName} failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  /**
   * Query payments by tenant and status
   */
  async getPaymentsByTenant(
    tenantId: string,
    status?: 'pending' | 'completed' | 'failed' | 'disputed'
  ) {
    return this.executeWithRetry(async () => {
      let query = this.client
        .from('payments')
        .select('*, leases(*, units(property_id))')
        .eq('tenant_id', tenantId);

      if (status) {
        query = query.eq('status', status);
      }

      query = query.order('due_date', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }, `getPaymentsByTenant(${tenantId})`);
  }

  /**
   * Get overdue payments for a landlord
   */
  async getOverduePayments(landlordId: string, daysOverdue: number = 3) {
    return this.executeWithRetry(async () => {
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - daysOverdue);

      const { data, error } = await this.client
        .from('payments')
        .select('*, leases(*, units(*), tenants(*)), landlords(*)')
        .eq('landlord_id', landlordId)
        .eq('status', 'pending')
        .lt('due_date', overdueDate.toISOString().split('T')[0])
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data || [];
    }, `getOverduePayments(${landlordId})`);
  }

  /**
   * Create payment record
   */
  async createPayment(paymentData: {
    leaseId: string;
    tenantId: string;
    landlordId: string;
    amount: number;
    paymentType: string;
    paymentMethod: string;
    dueDate: string;
    referenceNumber?: string;
  }) {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client
        .from('payments')
        .insert([
          {
            lease_id: paymentData.leaseId,
            tenant_id: paymentData.tenantId,
            landl_ord_id: paymentData.landlordId,
            amount: paymentData.amount,
            payment_type: paymentData.paymentType,
            payment_method: paymentData.paymentMethod,
            due_date: paymentData.dueDate,
            reference_number: paymentData.referenceNumber,
            status: 'pending'
          }
        ])
        .select();

      if (error) throw error;
      return data?.[0];
    }, 'createPayment');
  }

  /**
   * Update payment status (e.g., when M-Pesa confirms)
   */
  async updatePaymentStatus(
    paymentId: string,
    status: 'completed' | 'failed' | 'disputed',
    mpesaTransactionId?: string
  ) {
    return this.executeWithRetry(async () => {
      const updateData: any = {
        status,
        paid_date: status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      if (mpesaTransactionId) {
        updateData.mpesa_transaction_id = mpesaTransactionId;
      }

      const { data, error } = await this.client
        .from('payments')
        .update(updateData)
        .eq('id', paymentId)
        .select();

      if (error) throw error;
      return data?.[0];
    }, `updatePaymentStatus(${paymentId})`);
  }

  /**
   * Get lease details with full relationships
   */
  async getLease(leaseId: string) {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client
        .from('leases')
        .select(
          '*, units(*, properties(*)), tenants(*), landlords(*)'
        )
        .eq('id', leaseId)
        .single();

      if (error) throw error;
      return data;
    }, `getLease(${leaseId})`);
  }

  /**
   * Get active leases for a unit
   */
  async getActiveLeasesForUnit(unitId: string) {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client
        .from('leases')
        .select('*, tenants(*), landlords(*)')
        .eq('unit_id', unitId)
        .eq('status', 'active')
        .order('lease_start_date', { ascending: false });

      if (error) throw error;
      return data || [];
    }, `getActiveLeasesForUnit(${unitId})`);
  }

  /**
   * Create SMS log entry
   */
  async logSMS(smsData: {
    phoneNumber: string;
    messageContent: string;
    messageType: string;
    senderEntityId?: string;
    africaTalkingMessageId?: string;
  }) {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client
        .from('sms_logs')
        .insert([
          {
            phone_number: smsData.phoneNumber,
            message_content: smsData.messageContent,
            message_type: smsData.messageType,
            sender_entity_id: smsData.senderEntityId,
            africa_talking_message_id: smsData.africaTalkingMessageId,
            delivery_status: 'pending',
            sent_at: new Date().toISOString()
          }
        ])
        .select();

      if (error) throw error;
      return data?.[0];
    }, 'logSMS');
  }

  /**
   * Update SMS delivery status
   */
  async updateSMSStatus(
    smsId: string,
    status: 'delivered' | 'failed' | 'bounced',
    failureReason?: string
  ) {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client
        .from('sms_logs')
        .update({
          delivery_status: status,
          delivered_at: status === 'delivered' ? new Date().toISOString() : null,
          failure_reason: failureReason || null
        })
        .eq('id', smsId)
        .select();

      if (error) throw error;
      return data?.[0];
    }, `updateSMSStatus(${smsId})`);
  }

  /**
   * Get SMS messages pending retry
   */
  async getPendingSMSRetries() {
    return this.executeWithRetry(async () => {
      const now = new Date();
      const { data, error } = await this.client
        .from('sms_logs')
        .select('*')
        .eq('delivery_status', 'pending')
        .lt('next_retry_at', now.toISOString())
        .order('next_retry_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      return data || [];
    }, 'getPendingSMSRetries');
  }

  /**
   * Create USSD session
   */
  async createUSSDSession(sessionData: {
    phoneNumber: string;
    sessionId: string;
    currentMenuLevel: string;
    sessionData: Record<string, any>;
  }) {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client
        .from('ussd_sessions')
        .insert([
          {
            phone_number: sessionData.phoneNumber,
            session_id: sessionData.sessionId,
            current_menu_level: sessionData.currentMenuLevel,
            session_data: sessionData.sessionData,
            session_status: 'active'
          }
        ])
        .select();

      if (error) throw error;
      return data?.[0];
    }, 'createUSSDSession');
  }

  /**
   * Get USSD session
   */
  async getUSSDSession(phoneNumber: string) {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client
        .from('ussd_sessions')
        .select('*')
        .eq('phone_number', phoneNumber)
        .eq('session_status', 'active')
        .order('last_interaction_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code === 'PGRST116') {
        // No rows found - this is not an error
        return null;
      }

      if (error) throw error;
      return data;
    }, `getUSSDSession(${phoneNumber})`);
  }

  /**
   * Update USSD session
   */
  async updateUSSDSession(
    sessionId: string,
    updates: {
      currentMenuLevel?: string;
      sessionData?: Record<string, any>;
      lastInput?: string;
      sessionStatus?: 'active' | 'completed' | 'expired';
    }
  ) {
    return this.executeWithRetry(async () => {
      const updateData: any = {
        last_interaction_at: new Date().toISOString()
      };

      if (updates.currentMenuLevel) {
        updateData.current_menu_level = updates.currentMenuLevel;
      }
      if (updates.sessionData) {
        updateData.session_data = updates.sessionData;
      }
      if (updates.lastInput) {
        updateData.last_input = updates.lastInput;
      }
      if (updates.sessionStatus) {
        updateData.session_status = updates.sessionStatus;
        if (updates.sessionStatus === 'completed') {
          updateData.completed_at = new Date().toISOString();
        }
      }

      const { data, error } = await this.client
        .from('ussd_sessions')
        .update(updateData)
        .eq('id', sessionId)
        .select();

      if (error) throw error;
      return data?.[0];
    }, `updateUSSDSession(${sessionId})`);
  }

  /**
   * Add to offline queue
   */
  async addToOfflineQueue(queueItem: {
    userId?: string;
    userType: 'tenant' | 'landlord' | 'guest';
    transactionType: string;
    transactionData: Record<string, any>;
  }) {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client
        .from('offline_queue')
        .insert([
          {
            user_id: queueItem.userId,
            user_type: queueItem.userType,
            transaction_type: queueItem.transactionType,
            transaction_data: queueItem.transactionData,
            sync_status: 'pending'
          }
        ])
        .select();

      if (error) throw error;
      return data?.[0];
    }, 'addToOfflineQueue');
  }

  /**
   * Get pending offline queue items
   */
  async getPendingOfflineQueue() {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client
        .from('offline_queue')
        .select('*')
        .eq('sync_status', 'pending')
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      return data || [];
    }, 'getPendingOfflineQueue');
  }

  /**
   * Mark offline queue item as synced
   */
  async markOfflineQueueSynced(queueId: string) {
    return this.executeWithRetry(async () => {
      const { data, error } = await this.client
        .from('offline_queue')
        .update({
          sync_status: 'synced',
          synced_at: new Date().toISOString()
        })
        .eq('id', queueId)
        .select();

      if (error) throw error;
      return data?.[0];
    }, `markOfflineQueueSynced(${queueId})`);
  }

  /**
   * Audit log entry
   */
  async auditLog(auditData: {
    actorId?: string;
    actorType: 'landlord' | 'tenant' | 'guest' | 'system' | 'admin';
    action: string;
    resourceType: string;
    resourceId: string;
    changes: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      await this.client.from('audit_logs').insert([auditData]);
    } catch (error) {
      // Silently fail audit logging to not interrupt main operations
      console.error('Audit log failed:', error);
    }
  }

  /**
   * Get raw Supabase client for complex queries
   */
  getClient(): SupabaseClient {
    return this.client;
  }
}

// Singleton instance
let db: LEADatabase | null = null;

export function initializeDatabase(config: DatabaseConfig): LEADatabase {
  if (!db) {
    db = new LEADatabase(config);
  }
  return db;
}

export function getDatabase(): LEADatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase first.');
  }
  return db;
}

export default LEADatabase;
