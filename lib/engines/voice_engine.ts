/**
 * Voice Engine
 * Handles voice calls, IVR menus, and TTS (Text-To-Speech) for Africa's Talking
 */

import { getDatabase } from '@/lib/database/client';

interface VoiceCall {
  callId: string;
  phoneNumber: string;
  direction: 'inbound' | 'outbound';
  status: 'initiated' | 'ringing' | 'active' | 'completed' | 'failed';
  callData: Record<string, any>;
  recordingUrl?: string;
  initiatedAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
}

interface VoiceResponse {
  action: 'say' | 'play' | 'dial' | 'record' | 'hangup';
  message?: string;
  url?: string;
  phoneNumber?: string;
  maxRecordingDuration?: number;
  timeoutSeconds?: number;
  nextAction?: VoiceResponse;
}

export class VoiceEngine {
  private db: any;
  private readonly apiKey: string;
  private readonly apiUsername: string;
  private readonly sandboxMode: boolean;

  constructor(dbInstance: any, apiKey: string, apiUsername: string, sandboxMode = true) {
    this.db = dbInstance;
    this.apiKey = apiKey;
    this.apiUsername = apiUsername;
    this.sandboxMode = sandboxMode;
  }

  /**
   * Initiate outbound voice call for payment
   */
  async initiatePaymentCall(
    phoneNumber: string,
    tenantId: string,
    leaseId: string,
    amount: number
  ): Promise<{ callId: string; status: string }> {
    try {
      const cleanedNumber = this.normalizePhoneNumber(phoneNumber);
      const callId = `call_${tenantId}_${Date.now()}`;

      // Save call record
      await this.db.getClient()
        .from('voice_calls')
        .insert({
          call_id: callId,
          phone_number: cleanedNumber,
          direction: 'outbound',
          status: 'initiated',
          call_data: { tenantId, leaseId, amount },
          initiated_at: new Date()
        });

      // Build voice XML for payment IVR
      const voiceXml = this.buildPaymentIVR(callId, amount);

      // Send to Africa's Talking
      await this.makeVoiceCall(cleanedNumber, voiceXml);

      // Audit log
      await this.db.auditLog({
        actorType: 'system',
        action: 'voice_call_initiated',
        resourceType: 'voice_call',
        resourceId: callId,
        changes: { amount, phoneNumber: cleanedNumber }
      });

      return { callId, status: 'ringing' };
    } catch (error) {
      console.error('Voice call initiation failed:', error);
      throw error;
    }
  }

  /**
   * Initiate outbound voice call for balance inquiry
   */
  async initiateBalanceCall(phoneNumber: string, tenantId: string): Promise<{ callId: string }> {
    try {
      const cleanedNumber = this.normalizePhoneNumber(phoneNumber);
      const callId = `call_${tenantId}_${Date.now()}`;

      await this.db.getClient()
        .from('voice_calls')
        .insert({
          call_id: callId,
          phone_number: cleanedNumber,
          direction: 'outbound',
          status: 'initiated',
          call_data: { tenantId, type: 'balance_inquiry' },
          initiated_at: new Date()
        });

      const voiceXml = this.buildBalanceIVR(callId, tenantId);
      await this.makeVoiceCall(cleanedNumber, voiceXml);

      return { callId };
    } catch (error) {
      console.error('Balance call initiation failed:', error);
      throw error;
    }
  }

  /**
   * Handle inbound voice call
   */
  async handleInboundCall(
    phoneNumber: string,
    callId: string
  ): Promise<VoiceResponse> {
    try {
      const cleanedNumber = this.normalizePhoneNumber(phoneNumber);

      // Check if customer exists
      const { data: tenant } = await this.db.getClient()
        .from('tenants')
        .select('*, leases(*)')
        .eq('phone_number', cleanedNumber)
        .single();

      if (!tenant) {
        return this.buildUnregisteredUserResponse(callId, phoneNumber);
      }

      // Log incoming call
      await this.db.getClient()
        .from('voice_calls')
        .insert({
          call_id: callId,
          phone_number: cleanedNumber,
          direction: 'inbound',
          status: 'active',
          call_data: { tenantId: tenant.id },
          initiated_at: new Date(),
          started_at: new Date()
        });

      // Route to appropriate IVR
      return this.buildInboundIVR(callId, tenant);
    } catch (error) {
      console.error('Inbound call handling failed:', error);
      return {
        action: 'say',
        message: 'Service temporarily unavailable. Please try again later.',
        nextAction: { action: 'hangup' }
      };
    }
  }

  /**
   * Handle DTMF input from call
   */
  async handleDTMFInput(
    callId: string,
    dtmfDigits: string
  ): Promise<VoiceResponse> {
    try {
      // Get call session
      const { data: callSession } = await this.db.getClient()
        .from('voice_calls')
        .select('*')
        .eq('call_id', callId)
        .single();

      if (!callSession) {
        return { action: 'hangup' };
      }

      const callData = callSession.call_data;

      // Route based on digit and call type
      if (callData.type === 'balance_inquiry') {
        return this.handleBalanceMenuInput(callId, dtmfDigits, callData);
      } else {
        return this.handlePaymentMenuInput(callId, dtmfDigits, callData);
      }
    } catch (error) {
      console.error('DTMF handling failed:', error);
      return {
        action: 'say',
        message: 'Invalid input. Please try again.'
      };
    }
  }

  /**
   * Handle recording from voice call (for feedback/complaints)
   */
  async handleRecording(
    callId: string,
    recordingUrl: string
  ): Promise<void> {
    try {
      // Update call with recording
      await this.db.getClient()
        .from('voice_calls')
        .update({ recording_url: recordingUrl })
        .eq('call_id', callId);

      // Create feedback ticket (if applicable)
      const { data: call } = await this.db.getClient()
        .from('voice_calls')
        .select('*')
        .eq('call_id', callId)
        .single();

      if (call.call_data.type === 'complaint') {
        // Create maintenance request from recording
        await this.db.getClient()
          .from('maintenance_requests')
          .insert({
            tenant_id: call.call_data.tenantId,
            issue_type: 'voice_complaint',
            description: `Voice recording: ${recordingUrl}`,
            status: 'open',
            created_at: new Date()
          });
      }

      console.log(`[Voice] Recording saved: ${recordingUrl}`);
    } catch (error) {
      console.error('Recording handling failed:', error);
    }
  }

  /**
   * Build payment IVR XML
   */
  private buildPaymentIVR(callId: string, amount: number): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman">
    Welcome to LEA Property Management.
    You have an outstanding balance of ${amount} shillings.
    
    Press 1 to make a payment confirmation
    Press 2 to hear balance details
    Press 3 to speak with support
  </Say>
  
  <Gather timeout="30" numDigits="1" callbackUrl="/api/voice/dtmf?callId=${callId}">
    <Say voice="woman">Please enter your choice now.</Say>
  </Gather>
  
  <Say voice="woman">Thank you for calling. Goodbye.</Say>
  <Hangup/>
</Response>`;
  }

  /**
   * Build balance inquiry IVR XML
   */
  private buildBalanceIVR(callId: string, tenantId: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman">
    Welcome to LEA. Checking your account balance.
  </Say>
  
  <Say voice="woman">
    You have a balance inquiry. Our system is checking your latest information.
    This call will be processed shortly.
  </Say>
  
  <Redirect>/api/voice/balance?callId=${callId}&tenantId=${tenantId}</Redirect>
</Response>`;
  }

  /**
   * Build inbound IVR menu
   */
  private buildInboundIVR(callId: string, tenant: any): VoiceResponse {
    const lease = tenant.leases?.[0];
    const status = lease ? `You have an outstanding balance on file.` : `Thank you for calling.`;

    return {
      action: 'say',
      message: `Welcome to LEA. ${status} 
      
Press 1 to confirm a payment
Press 2 to hear your balance
Press 3 to report a maintenance issue
Press 4 to speak with support`,
      nextAction: {
        action: 'say',
        timeoutSeconds: 30,
        maxRecordingDuration: 0,
        nextAction: {
          action: 'hangup'
        }
      }
    };
  }

  /**
   * Handle payment menu input
   */
  private async handlePaymentMenuInput(
    callId: string,
    digit: string,
    callData: any
  ): Promise<VoiceResponse> {
    switch (digit) {
      case '1':
        // Confirm payment
        return {
          action: 'say',
          message: `Thank you. We will send an M-Pesa prompt to your phone. 
Please respond to the prompt to complete payment.`,
          nextAction: { action: 'hangup' }
        };

      case '2':
        // Balance details
        return {
          action: 'say',
          message: `Your outstanding balance is ${callData.amount} shillings. 
Please arrange payment at your earliest convenience.`,
          nextAction: { action: 'hangup' }
        };

      case '3':
        // Support
        return {
          action: 'dial',
          phoneNumber: '+254700000000',
          nextAction: { action: 'hangup' }
        };

      default:
        return {
          action: 'say',
          message: 'Invalid selection. Ending call.',
          nextAction: { action: 'hangup' }
        };
    }
  }

  /**
   * Handle balance menu input
   */
  private async handleBalanceMenuInput(
    callId: string,
    digit: string,
    callData: any
  ): Promise<VoiceResponse> {
    try {
      const { data: tenant } = await this.db.getClient()
        .from('tenants')
        .select('*, leases(*, payments(*))')
        .eq('id', callData.tenantId)
        .single();

      if (!tenant?.leases) {
        return {
          action: 'say',
          message: 'No lease found on your account.',
          nextAction: { action: 'hangup' }
        };
      }

      const lease = tenant.leases[0];
      const overduePayments =
        lease.payments
          ?.filter((p: any) => p.status === 'overdue')
          .reduce((sum: number, p: any) => sum + p.amount, 0) || 0;

      switch (digit) {
        case '1':
          return {
            action: 'say',
            message: `Your monthly rent is ${lease.monthly_rent} shillings.
Outstanding balance is ${overduePayments} shillings.
Please arrange payment immediately.`,
            nextAction: { action: 'hangup' }
          };

        case '2':
          return {
            action: 'say',
            message: `To make a payment, press 1 and we will send you an M-Pesa prompt.`,
            nextAction: { action: 'hangup' }
          };

        case '3':
          return {
            action: 'record',
            message: `Please leave your message after the beep. Press hash when done.`,
            maxRecordingDuration: 60,
            nextAction: { action: 'hangup' }
          };

        default:
          return {
            action: 'say',
            message: 'Invalid selection.',
            nextAction: { action: 'hangup' }
          };
      }
    } catch (error) {
      console.error('Balance menu error:', error);
      return {
        action: 'say',
        message: 'Error processing your request.',
        nextAction: { action: 'hangup' }
      };
    }
  }

  /**
   * Build response for unregistered users
   */
  private buildUnregisteredUserResponse(
    callId: string,
    phoneNumber: string
  ): VoiceResponse {
    return {
      action: 'say',
      message: `We could not find an account associated with ${phoneNumber}. 
Please ensure you are calling with your registered phone number.
For assistance, contact support at plus two five four seven zero zero zero zero zero zero zero.`,
      nextAction: { action: 'hangup' }
    };
  }

  /**
   * Make voice call via Africa's Talking
   */
  private async makeVoiceCall(phoneNumber: string, xmlPayload: string): Promise<void> {
    try {
      // In sandbox mode, just log
      if (this.sandboxMode) {
        console.log(`[Voice] Sandbox: Would call ${phoneNumber} with XML:\n${xmlPayload}`);
        return;
      }

      // Production: Call Africa's Talking API
      const response = await fetch('https://api.africastalking.com/voice/call', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'ApiKey': this.apiKey
        },
        body: new URLSearchParams({
          username: this.apiUsername,
          phoneNumbers: phoneNumber,
          callStartModuleUrl: `data:text/xml,${encodeURIComponent(xmlPayload)}`
        })
      });

      if (!response.ok) {
        throw new Error(`Africa's Talking API error: ${response.statusText}`);
      }

      console.log(`[Voice] Call initiated to ${phoneNumber}`);
    } catch (error) {
      console.error('[Voice] Call initiation failed:', error);
      throw error;
    }
  }

  /**
   * Normalize phone number to format Africa's Talking expects
   */
  private normalizePhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Ensure +254 format
    if (cleaned.startsWith('254')) {
      return `+${cleaned}`;
    }

    if (cleaned.startsWith('07')) {
      return `+254${cleaned.substring(1)}`;
    }

    if (cleaned.length === 9) {
      return `+254${cleaned}`;
    }

    // Default: assume Kenya
    return `+254${cleaned.slice(-9)}`;
  }

  /**
   * Log call completion
   */
  async logCallCompletion(
    callId: string,
    endReason: string,
    durationSeconds?: number
  ): Promise<void> {
    try {
      await this.db.getClient()
        .from('voice_calls')
        .update({
          status: 'completed',
          ended_at: new Date(),
          duration: durationSeconds,
          call_data: {
            endReason,
            completedAt: new Date().toISOString()
          }
        })
        .eq('call_id', callId);

      console.log(`[Voice] Call ${callId} completed. Reason: ${endReason}`);
    } catch (error) {
      console.error('Call completion logging failed:', error);
    }
  }

  /**
   * Get call status
   */
  async getCallStatus(callId: string): Promise<VoiceCall | null> {
    try {
      const { data } = await this.db.getClient()
        .from('voice_calls')
        .select('*')
        .eq('call_id', callId)
        .single();

      if (!data) return null;

      return {
        callId: data.call_id,
        phoneNumber: data.phone_number,
        direction: data.direction,
        status: data.status,
        callData: data.call_data,
        recordingUrl: data.recording_url,
        initiatedAt: new Date(data.initiated_at),
        startedAt: data.started_at ? new Date(data.started_at) : undefined,
        endedAt: data.ended_at ? new Date(data.ended_at) : undefined,
        duration: data.duration
      };
    } catch (error) {
      console.error('Get call status failed:', error);
      return null;
    }
  }
}

export default VoiceEngine;
