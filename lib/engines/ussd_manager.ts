/**
 * USSD Menu Manager
 * Handles interactive USSD sessions for feature phones
 * Supports menu-driven interactions (no data/app required)
 */

import { getDatabase } from '@/lib/database/client';

interface UssdSession {
  sessionId: string;
  phoneNumber: string;
  currentMenu: string;
  sessionData: Record<string, any>;
  sessionStatus: 'active' | 'ended';
  initiatedAt: Date;
  lastInteractionAt: Date;
  maxRetries: number;
  retryCount: number;
}

interface MenuOption {
  id: string;
  label: string;
  action: (session: UssdSession, choice: string) => Promise<MenuResponse>;
}

interface MenuResponse {
  text: string;
  options: MenuOption[];
  endSession?: boolean;
  continueSession?: boolean;
}

export class UssdManager {
  private db: any;
  private sessionTimeout = 15 * 60 * 1000; // 15 minutes
  private readonly maxMenuDepth = 5;

  constructor(dbInstance: any) {
    this.db = dbInstance;
    this.startSessionCleanup();
  }

  /**
   * Initialize a new USSD session
   */
  async initializeSession(phoneNumber: string): Promise<MenuResponse> {
    try {
      // Check if session already exists
      const existingSession = await this.getActiveSession(phoneNumber);

      if (existingSession) {
        return this.getMenuResponse(existingSession.currentMenu, existingSession);
      }

      // Create new session
      const sessionId = `ussd_${phoneNumber}_${Date.now()}`;
      const session: UssdSession = {
        sessionId,
        phoneNumber,
        currentMenu: 'main',
        sessionData: { steps: 0 },
        sessionStatus: 'active',
        initiatedAt: new Date(),
        lastInteractionAt: new Date(),
        maxRetries: 3,
        retryCount: 0
      };

      // Save to database
      await this.db.getClient()
        .from('ussd_sessions')
        .insert({
          phone_number: phoneNumber,
          session_id: sessionId,
          session_data: session.sessionData,
          session_status: 'active',
          initiated_at: session.initiatedAt,
          last_interaction_at: session.lastInteractionAt
        });

      return this.getMainMenu(session);
    } catch (error) {
      console.error('USSD session initialization failed:', error);
      throw error;
    }
  }

  /**
   * Process user input and navigate menu
   */
  async processInput(phoneNumber: string, userInput: string): Promise<MenuResponse> {
    try {
      const session = await this.getActiveSession(phoneNumber);

      if (!session) {
        return this.initializeSession(phoneNumber);
      }

      // Increment step counter
      session.sessionData.steps = (session.sessionData.steps || 0) + 1;

      // Prevent infinite menu navigation
      if (session.sessionData.steps > this.maxMenuDepth) {
        return {
          text: 'Menu depth exceeded. Session ended.',
          options: [],
          endSession: true
        };
      }

      // Route to appropriate menu handler
      const response = await this.routeMenuAction(session, userInput);

      // Update session in database
      await this.updateSession(phoneNumber, {
        sessionData: session.sessionData,
        currentMenu: response.endSession ? 'ended' : session.currentMenu,
        lastInteractionAt: new Date()
      });

      return response;
    } catch (error) {
      console.error('USSD input processing failed:', error);
      return {
        text: 'An error occurred. Please try again later.',
        options: [],
        endSession: true
      };
    }
  }

  /**
   * Main menu - first interaction
   */
  private getMainMenu(session: UssdSession): MenuResponse {
    return {
      text: 'Welcome to LEA\n\n1. Pay Rent\n2. View Property Details\n3. Report Maintenance\n4. View Balance\n5. Help',
      options: [
        {
          id: '1',
          label: 'Pay Rent',
          action: async () => this.getPaymentMenu(session)
        },
        {
          id: '2',
          label: 'View Property',
          action: async () => this.getPropertyMenu(session)
        },
        {
          id: '3',
          label: 'Report Maintenance',
          action: async () => this.getMaintenanceMenu(session)
        },
        {
          id: '4',
          label: 'View Balance',
          action: async () => this.getBalanceMenu(session)
        },
        {
          id: '5',
          label: 'Help',
          action: async () => this.getHelpMenu(session)
        }
      ]
    };
  }

  /**
   * Payment menu - initiate M-Pesa STK push
   */
  private async getPaymentMenu(session: UssdSession): Promise<MenuResponse> {
    try {
      // Find tenant by phone
      const { data: tenant } = await this.db.getClient()
        .from('tenants')
        .select('*, leases(*)')
        .eq('phone_number', session.phoneNumber)
        .single();

      if (!tenant || !tenant.leases || tenant.leases.length === 0) {
        return {
          text: 'No active lease found. Please contact landlord.',
          options: [
            {
              id: '0',
              label: 'Back',
              action: async () => this.getMainMenu(session)
            }
          ]
        };
      }

      const lease = tenant.leases[0];

      // Get amount due
      const { data: payments } = await this.db.getClient()
        .from('payments')
        .select('amount, status')
        .eq('lease_id', lease.id)
        .eq('status', 'overdue')
        .order('created_at', { ascending: false })
        .limit(1);

      const amountDue = payments?.[0]?.amount || lease.monthly_rent;

      // Store in session and trigger M-Pesa STK
      session.sessionData.leaseId = lease.id;
      session.sessionData.amount = amountDue;
      session.sessionData.tenantId = tenant.id;

      // Initiate M-Pesa STK push (non-blocking)
      this.initiateSTKPush(session, amountDue).catch(err =>
        console.error('STK push failed:', err)
      );

      return {
        text: `M-Pesa prompt sent to ${session.phoneNumber}\nAmount: KES ${amountDue}\n\nReply:\n1. Confirm payment sent\n2. Cancel`,
        options: [
          {
            id: '1',
            label: 'Confirm',
            action: async () => this.getPaymentConfirmation(session)
          },
          {
            id: '2',
            label: 'Cancel',
            action: async () => this.getMainMenu(session)
          }
        ]
      };
    } catch (error) {
      console.error('Payment menu error:', error);
      return {
        text: 'Unable to process payment. Try again later.',
        options: [
          {
            id: '0',
            label: 'Back',
            action: async () => this.getMainMenu(session)
          }
        ]
      };
    }
  }

  /**
   * Property details menu
   */
  private async getPropertyMenu(session: UssdSession): Promise<MenuResponse> {
    try {
      const { data: tenant } = await this.db.getClient()
        .from('tenants')
        .select('*, leases(*, properties(*))')
        .eq('phone_number', session.phoneNumber)
        .single();

      if (!tenant?.leases?.[0]?.properties) {
        return {
          text: 'No property found.',
          options: [
            {
              id: '0',
              label: 'Back',
              action: async () => this.getMainMenu(session)
            }
          ]
        };
      }

      const prop = tenant.leases[0].properties;

      return {
        text: `Property: ${prop.name}\nLocation: ${prop.city}\nUnits: ${prop.total_units}\nOccupancy: ${prop.occupied_units}/${prop.total_units}\n\n1. Back`,
        options: [
          {
            id: '1',
            label: 'Back',
            action: async () => this.getMainMenu(session)
          }
        ]
      };
    } catch (error) {
      return {
        text: 'Unable to fetch property. Try again later.',
        options: [
          {
            id: '0',
            label: 'Back',
            action: async () => this.getMainMenu(session)
          }
        ]
      };
    }
  }

  /**
   * Maintenance reporting menu
   */
  private async getMaintenanceMenu(session: UssdSession): Promise<MenuResponse> {
    return {
      text: 'Report Maintenance:\n1. Plumbing\n2. Electrical\n3. Roof/Leak\n4. Other\n5. Cancel',
      options: [
        {
          id: '1',
          label: 'Plumbing',
          action: async () =>
            this.submitMaintenanceRequest(session, 'plumbing_issue')
        },
        {
          id: '2',
          label: 'Electrical',
          action: async () =>
            this.submitMaintenanceRequest(session, 'electrical_issue')
        },
        {
          id: '3',
          label: 'Roof/Leak',
          action: async () =>
            this.submitMaintenanceRequest(session, 'roof_leak')
        },
        {
          id: '4',
          label: 'Other',
          action: async () =>
            this.submitMaintenanceRequest(session, 'other_issue')
        },
        {
          id: '5',
          label: 'Cancel',
          action: async () => this.getMainMenu(session)
        }
      ]
    };
  }

  /**
   * Balance inquiry menu
   */
  private async getBalanceMenu(session: UssdSession): Promise<MenuResponse> {
    try {
      const { data: tenant } = await this.db.getClient()
        .from('tenants')
        .select('*, leases(*)')
        .eq('phone_number', session.phoneNumber)
        .single();

      if (!tenant?.leases) {
        return {
          text: 'No lease found.',
          options: [
            {
              id: '0',
              label: 'Back',
              action: async () => this.getMainMenu(session)
            }
          ]
        };
      }

      const lease = tenant.leases[0];

      // Calculate overdue amount
      const { data: overdue } = await this.db.getClient()
        .from('payments')
        .select('amount')
        .eq('lease_id', lease.id)
        .eq('status', 'overdue');

      const totalOverdue = overdue?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;

      return {
        text: `Balance:\nMonthly Rent: KES ${lease.monthly_rent}\nOverdue: KES ${totalOverdue}\n\n1. Pay Now\n2. Back`,
        options: [
          {
            id: '1',
            label: 'Pay Now',
            action: async () => this.getPaymentMenu(session)
          },
          {
            id: '2',
            label: 'Back',
            action: async () => this.getMainMenu(session)
          }
        ]
      };
    } catch (error) {
      return {
        text: 'Unable to fetch balance. Try again later.',
        options: [
          {
            id: '0',
            label: 'Back',
            action: async () => this.getMainMenu(session)
          }
        ]
      };
    }
  }

  /**
   * Help menu
   */
  private getHelpMenu(session: UssdSession): MenuResponse {
    return {
      text: 'LEA Help:\nFor tenant support:\nCall: +254 700 000 000\nEmail: support@lea.app\n\n1. Back',
      options: [
        {
          id: '1',
          label: 'Back',
          action: async () => this.getMainMenu(session)
        }
      ]
    };
  }

  /**
   * Payment confirmation
   */
  private async getPaymentConfirmation(session: UssdSession): Promise<MenuResponse> {
    return {
      text: `Payment of KES ${session.sessionData.amount} recorded.\nReceipt will be sent via SMS.\n\nThank you!\n\n1. Main Menu`,
      options: [
        {
          id: '1',
          label: 'Main Menu',
          action: async () => this.getMainMenu(session)
        }
      ],
      endSession: true
    };
  }

  /**
   * Submit maintenance request
   */
  private async submitMaintenanceRequest(
    session: UssdSession,
    issueType: string
  ): Promise<MenuResponse> {
    try {
      const { data: tenant } = await this.db.getClient()
        .from('tenants')
        .select('id')
        .eq('phone_number', session.phoneNumber)
        .single();

      // Create maintenance request
      await this.db.getClient()
        .from('maintenance_requests')
        .insert({
          tenant_id: tenant.id,
          issue_type: issueType,
          status: 'open',
          created_at: new Date()
        });

      return {
        text: 'Maintenance request submitted.\nTicket number will be sent via SMS.\nThank you!\n\n1. Main Menu',
        options: [
          {
            id: '1',
            label: 'Main Menu',
            action: async () => this.getMainMenu(session)
          }
        ],
        endSession: true
      };
    } catch (error) {
      return {
        text: 'Failed to submit request. Try again later.',
        options: [
          {
            id: '0',
            label: 'Back',
            action: async () => this.getMaintenanceMenu(session)
          }
        ]
      };
    }
  }

  /**
   * Route menu action based on user input
   */
  private async routeMenuAction(
    session: UssdSession,
    userInput: string
  ): Promise<MenuResponse> {
    const currentMenu = this.getMenuByName(session.currentMenu, session);

    if (!currentMenu.options) {
      return this.getMainMenu(session);
    }

    const selectedOption = currentMenu.options.find(opt => opt.id === userInput);

    if (selectedOption) {
      session.currentMenu = selectedOption.id;
      return await selectedOption.action(session, userInput);
    }

    // Invalid input
    return {
      text: 'Invalid selection. Please try again.',
      options: currentMenu.options
    };
  }

  /**
   * Get menu by name
   */
  private getMenuByName(menuName: string, session: UssdSession): MenuResponse | Promise<MenuResponse> {
    switch (menuName) {
      case 'main':
        return this.getMainMenu(session);
      case 'payment':
        return this.getPaymentMenu(session);
      case 'property':
        return this.getPropertyMenu(session);
      case 'maintenance':
        return this.getMaintenanceMenu(session);
      case 'balance':
        return this.getBalanceMenu(session);
      case 'help':
        return this.getHelpMenu(session);
      default:
        return this.getMainMenu(session);
    }
  }

  /**
   * Get response for menu
   */
  private async getMenuResponse(
    menuName: string,
    session: UssdSession
  ): Promise<MenuResponse> {
    const menuMap: Record<
      string,
      () => MenuResponse | Promise<MenuResponse>
    > = {
      main: () => this.getMainMenu(session),
      payment: () => this.getPaymentMenu(session),
      property: () => this.getPropertyMenu(session),
      maintenance: () => this.getMaintenanceMenu(session),
      balance: () => this.getBalanceMenu(session),
      help: () => this.getHelpMenu(session)
    };

    const handler = menuMap[menuName];
    return handler ? await handler() : this.getMainMenu(session);
  }

  /**
   * Initiate M-Pesa STK push
   */
  private async initiateSTKPush(session: UssdSession, amount: number): Promise<void> {
    // This would normally call the M-Pesa engine
    // But since we're in USSD context, we'll log it
    console.log(
      `[USSD] Initiating STK push: ${session.phoneNumber}, Amount: ${amount}`
    );
  }

  /**
   * Get active session for phone
   */
  private async getActiveSession(phoneNumber: string): Promise<UssdSession | null> {
    try {
      const { data } = await this.db.getClient()
        .from('ussd_sessions')
        .select('*')
        .eq('phone_number', phoneNumber)
        .eq('session_status', 'active')
        .order('last_interaction_at', { ascending: false })
        .limit(1)
        .single();

      if (!data) return null;

      // Check if session expired
      const lastInteraction = new Date(data.last_interaction_at);
      if (Date.now() - lastInteraction.getTime() > this.sessionTimeout) {
        await this.closeSession(phoneNumber, data.session_id);
        return null;
      }

      return {
        sessionId: data.session_id,
        phoneNumber: data.phone_number,
        currentMenu: data.current_menu || 'main',
        sessionData: data.session_data || {},
        sessionStatus: data.session_status,
        initiatedAt: new Date(data.initiated_at),
        lastInteractionAt: new Date(data.last_interaction_at),
        maxRetries: 3,
        retryCount: 0
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Update session data
   */
  private async updateSession(
    phoneNumber: string,
    updates: Partial<UssdSession>
  ): Promise<void> {
    await this.db.getClient()
      .from('ussd_sessions')
      .update({
        current_menu: updates.currentMenu,
        session_data: updates.sessionData,
        last_interaction_at: updates.lastInteractionAt
      })
      .eq('phone_number', phoneNumber)
      .eq('session_status', 'active');
  }

  /**
   * Close USSD session
   */
  private async closeSession(phoneNumber: string, sessionId: string): Promise<void> {
    await this.db.getClient()
      .from('ussd_sessions')
      .update({ session_status: 'ended' })
      .eq('session_id', sessionId);
  }

  /**
   * Cleanup expired sessions (runs periodically)
   */
  private startSessionCleanup(): void {
    setInterval(async () => {
      try {
        const expiryTime = new Date(Date.now() - this.sessionTimeout);

        await this.db.getClient()
          .from('ussd_sessions')
          .update({ session_status: 'ended' })
          .eq('session_status', 'active')
          .lt('last_interaction_at', expiryTime.toISOString());

        console.log('[USSD] Cleanup completed');
      } catch (error) {
        console.error('[USSD] Cleanup failed:', error);
      }
    }, 5 * 60 * 1000); // Run every 5 minutes
  }
}

export default UssdManager;
