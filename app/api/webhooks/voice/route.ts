/**
 * Voice Call Webhook Handler
 * Handles voice call callbacks and DTMF input from Africa's Talking
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withErrorHandling,
  successResponse,
  errorResponse
} from '@/lib/middleware/api';
import { getDatabase } from '@/lib/database/client';
import VoiceEngine from '@/lib/engines/voice_engine';

const sandboxMode = process.env.NODE_ENV === 'development';

/**
 * POST /api/webhooks/voice
 * Africa's Talking voice call webhook
 * 
 * Inbound call format:
 * {
 *   callId: "call_123",
 *   phoneNumber: "+254712345678",
 *   direction: "inbound",
 *   status: "active"
 * }
 * 
 * Call completion format:
 * {
 *   callId: "call_123",
 *   status: "completed",
 *   duration: 120
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  return withErrorHandling(async (req) => {
    try {
      const body = await req.json();
      const { callId, phoneNumber, status, duration, sessionId } = body;

      const db = getDatabase();
      const voiceEngine = new VoiceEngine(
        db,
        process.env.AFRICASTALKING_API_KEY || '',
        process.env.AFRICASTALKING_USERNAME || '',
        sandboxMode
      );

      let voiceResponse;

      // Route based on event type
      if (status === 'ringing' || status === 'active') {
        // Inbound call - handle with IVR
        voiceResponse = await voiceEngine.handleInboundCall(phoneNumber, callId);
      } else if (status === 'completed') {
        // Call ended
        await voiceEngine.logCallCompletion(
          callId,
          'normal_completion',
          duration
        );

        return successResponse({
          status: 'ok',
          callId,
          message: 'Call logged'
        });
      } else {
        // Unknown status
        return errorResponse(
          new Error('Unknown call status'),
          request.headers.get('x-request-id') || undefined
        );
      }

      // Return voice response as XML
      return new NextResponse(
        buildVoiceXML(voiceResponse),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/xml'
          }
        }
      );
    } catch (error) {
      console.error('Voice webhook error:', error);
      return new NextResponse(
        buildVoiceXML({
          action: 'say',
          message: 'Service error. Please try again later.',
          nextAction: { action: 'hangup' }
        }),
        { status: 200, headers: { 'Content-Type': 'application/xml' } }
      );
    }
  }, request);
}

/**
 * Handle DTMF input from voice call (POST /api/voice/dtmf)
 */
async function handleDTMFRequest(request: NextRequest): Promise<NextResponse> {
  return withErrorHandling(async (req) => {
    try {
      const url = new URL(req.url);
      const callId = url.searchParams.get('callId');
      const dtmfDigits = url.searchParams.get('dtmfDigits');

      if (!callId || !dtmfDigits) {
        throw new Error('Missing callId or dtmfDigits');
      }

      const db = getDatabase();
      const voiceEngine = new VoiceEngine(
        db,
        process.env.AFRICASTALKING_API_KEY || '',
        process.env.AFRICASTALKING_USERNAME || '',
        sandboxMode
      );

      const voiceResponse = await voiceEngine.handleDTMFInput(callId, dtmfDigits);

      return new NextResponse(buildVoiceXML(voiceResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      });
    } catch (error) {
      console.error('DTMF handling error:', error);
      return errorResponse(error);
    }
  }, request);
}

/**
 * Handle voice recording from call (POST /api/voice/recording)
 */
async function handleRecordingRequest(request: NextRequest): Promise<NextResponse> {
  return withErrorHandling(async (req) => {
    try {
      const url = new URL(req.url);
      const callId = url.searchParams.get('callId');
      const recordingUrl = url.searchParams.get('recordingUrl');

      if (!callId || !recordingUrl) {
        throw new Error('Missing callId or recordingUrl');
      }

      const db = getDatabase();
      const voiceEngine = new VoiceEngine(
        db,
        process.env.AFRICASTALKING_API_KEY || '',
        process.env.AFRICASTALKING_USERNAME || '',
        sandboxMode
      );

      await voiceEngine.handleRecording(callId, recordingUrl);

      return successResponse({
        status: 'ok',
        message: 'Recording received'
      });
    } catch (error) {
      return errorResponse(error);
    }
  }, request);
}

/**
 * Fetch and read balance to caller (GET /api/voice/balance)
 */
async function getBalanceRequest(request: NextRequest): Promise<NextResponse> {
  return withErrorHandling(async (req) => {
    try {
      const url = new URL(req.url);
      const callId = url.searchParams.get('callId');
      const tenantId = url.searchParams.get('tenantId');

      if (!callId || !tenantId) {
        throw new Error('Missing parameters');
      }

      const db = getDatabase();

      // Get tenant and balance info
      const { data: tenant } = await db.getClient()
        .from('tenants')
        .select('*, leases(monthly_rent, payments(amount, status))')
        .eq('id', tenantId)
        .single();

      if (!tenant?.leases) {
        return new NextResponse(
          buildVoiceXML({
            action: 'say',
            message: 'No lease found on your account.',
            nextAction: { action: 'hangup' }
          }),
          { status: 200, headers: { 'Content-Type': 'application/xml' } }
        );
      }

      const lease = tenant.leases[0];
      const overdueAmount =
        lease.payments
          ?.filter((p: any) => p.status === 'overdue')
          .reduce((sum: number, p: any) => sum + p.amount, 0) || 0;

      return new NextResponse(
        buildVoiceXML({
          action: 'say',
          message: `Your monthly rent is ${lease.monthly_rent} shillings. 
          Outstanding balance is ${overdueAmount} shillings.`,
          nextAction: { action: 'hangup' }
        }),
        { status: 200, headers: { 'Content-Type': 'application/xml' } }
      );
    } catch (error) {
      console.error('Balance fetch error:', error);
      return new NextResponse(
        buildVoiceXML({
          action: 'say',
          message: 'Unable to fetch balance.',
          nextAction: { action: 'hangup' }
        }),
        { status: 200, headers: { 'Content-Type': 'application/xml' } }
      );
    }
  }, request);
}

/**
 * GET /api/webhooks/voice
 * Health check
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  return successResponse({
    status: 'ok',
    endpoint: '/api/webhooks/voice',
    method: 'POST',
    description: 'Africa\'s Talking voice call webhook',
    relatedEndpoints: [
      '/api/voice/dtmf - Handle DTMF input',
      '/api/voice/recording - Receive voice recording',
      '/api/voice/balance - Fetch balance'
    ]
  });
}

/**
 * Build voice response as Africa's Talking XML
 */
function buildVoiceXML(response: any): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n';

  // Build main action
  if (response.action === 'say') {
    xml += `  <Say voice="woman">${escapeXml(response.message)}</Say>\n`;

    // Add next action if provided
    if (response.nextAction?.action === 'gather') {
      xml += `  <Gather timeout="30" numDigits="1" finishOnKey="#">
    <Say voice="woman">Enter your choice</Say>
  </Gather>\n`;
    } else if (response.nextAction?.action === 'hangup') {
      xml += '  <Hangup/>\n';
    }
  } else if (response.action === 'gather') {
    xml += `  <Gather timeout="${response.timeoutSeconds || 30}" 
    numDigits="${response.maxRecordingDuration ? 0 : 1}"
    finishOnKey="#">\n`;
    xml += `    <Say voice="woman">${escapeXml(response.message)}</Say>\n`;
    xml += '  </Gather>\n';

    if (response.nextAction?.action === 'hangup') {
      xml += '  <Hangup/>\n';
    }
  } else if (response.action === 'record') {
    xml += `  <Record timeout="30" maxLength="${response.maxRecordingDuration || 60}"
    transcribe="false"
    playBeep="true"/>\n`;
    if (response.nextAction?.action === 'hangup') {
      xml += '  <Hangup/>\n';
    }
  } else if (response.action === 'dial') {
    xml += `  <Dial phoneNumbers="${escapeXml(response.phoneNumber)}" />\n`;
  } else if (response.action === 'hangup') {
    xml += '  <Hangup/>\n';
  }

  xml += '</Response>';

  return xml;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default { POST, GET };
export const dtmfHandler = handleDTMFRequest;
export const recordingHandler = handleRecordingRequest;
export const balanceHandler = getBalanceRequest;
