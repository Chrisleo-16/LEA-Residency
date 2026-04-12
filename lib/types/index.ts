/**
 * LEA Platform - TypeScript Type Definitions
 * Production-ready types for all entities
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum Country {
  KENYA = 'KE',
  NIGERIA = 'NG',
  UGANDA = 'UG',
  TANZANIA = 'TZ',
  GHANA = 'GH'
}

export enum PropertyType {
  APARTMENT_BLOCK = 'apartment_block',
  VILLA = 'villa',
  HOUSE = 'house',
  COMMERCIAL = 'commercial',
  MIXED = 'mixed'
}

export enum UnitType {
  STUDIO = 'studio',
  ONE_BR = '1br',
  TWO_BR = '2br',
  THREE_BR = '3br',
  OFFICE = 'office'
}

export enum UnitStatus {
  VACANT = 'vacant',
  OCCUPIED = 'occupied',
  MAINTENANCE = 'maintenance'
}

export enum LeaseStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  TERMINATED = 'terminated'
}

export enum PaymentType {
  RENT = 'rent',
  DEPOSIT = 'deposit',
  UTILITIES = 'utilities',
  OTHER = 'other'
}

export enum PaymentMethod {
  MPESA = 'mpesa',
  BANK_TRANSFER = 'bank_transfer',
  CASH = 'cash',
  OTHER = 'other'
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DISPUTED = 'disputed'
}

export enum NotificationChannel {
  SMS = 'sms',
  EMAIL = 'email',
  PUSH = 'push'
}

export enum DeliveryStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  BOUNCED = 'bounced'
}

export enum BookingStatus {
  PENDING_DEPOSIT = 'pending_deposit',
  CONFIRMED = 'confirmed',
  CHECKED_IN = 'checked_in',
  CHECKED_OUT = 'checked_out',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed'
}

export enum CancellationPolicy {
  STRICT = 'strict',
  MODERATE = 'moderate',
  FLEXIBLE = 'flexible'
}

export enum MaintenanceUrgency {
  LOW = 'low',
  NORMAL = 'normal',
  URGENT = 'urgent',
  EMERGENCY = 'emergency'
}

export enum MaintenanceStatus {
  OPEN = 'open',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CLOSED = 'closed',
  REJECTED = 'rejected'
}

export enum IssueCategory {
  PLUMBING = 'plumbing',
  ELECTRICAL = 'electrical',
  APPLIANCE = 'appliance',
  STRUCTURAL = 'structural',
  CLEANING = 'cleaning',
  OTHER = 'other'
}

export enum ReportType {
  MOVE_IN = 'move_in',
  MOVE_OUT = 'move_out'
}

export enum ConditionLevel {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor'
}

export enum USSDSessionStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired'
}

export enum SyncStatus {
  PENDING = 'pending',
  SYNCED = 'synced',
  FAILED = 'failed'
}

// ============================================================================
// USER TYPES
// ============================================================================

export interface Landlord {
  id: string;
  email: string;
  phoneNumber: string;
  displayName: string;
  country: Country;
  kycVerified: boolean;
  kycDocumentUrl?: string;
  passwordHash: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Tenant {
  id: string;
  phoneNumber: string;
  email?: string;
  displayName: string;
  country: Country;
  idNumber?: string;
  nationalIdUrl?: string;
  isVerified: boolean;
  verificationDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Guest {
  id: string;
  phoneNumber: string;
  email?: string;
  displayName: string;
  country: Country;
  verificationStatus: 'unverified' | 'email_verified' | 'phone_verified' | 'fully_verified';
  profilePhotoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============================================================================
// PROPERTY & UNIT TYPES
// ============================================================================

export interface Property {
  id: string;
  landlordId: string;
  propertyName: string;
  propertyType: PropertyType;
  address: string;
  city: string;
  country: Country;
  latitude?: number;
  longitude?: number;
  totalUnits: number;
  yearBuilt?: number;
  description?: string;
  amenities: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  unitType: UnitType;
  bedrooms?: number;
  bathrooms?: number;
  squareMeters?: number;
  monthlyRent: number;
  securityDeposit?: number;
  utilitiesIncluded: boolean;
  utilitiesCost?: number;
  features: string[];
  photosUrls: string[];
  status: UnitStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============================================================================
// LEASE & TENANCY TYPES
// ============================================================================

export interface Lease {
  id: string;
  unitId: string;
  tenantId: string;
  landlordId: string;
  leaseStartDate: Date;
  leaseEndDate: Date;
  monthlyRent: number;
  securityDeposit?: number;
  leaseDocumentUrl?: string;
  status: LeaseStatus;
  autoRenewal: boolean;
  renewalNoticeDays: number;
  createdAt: Date;
  updatedAt: Date;
  terminatedAt?: Date;
  terminatedReason?: string;
  deletedAt?: Date;
}

// ============================================================================
// PAYMENT TYPES
// ============================================================================

export interface Payment {
  id: string;
  leaseId: string;
  tenantId: string;
  landlordId: string;
  amount: number;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  mpesaTransactionId?: string;
  dueDate: Date;
  paidDate?: Date;
  status: PaymentStatus;
  notes?: string;
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface PaymentNotification {
  id: string;
  paymentId?: string;
  tenantId: string;
  phoneNumber: string;
  messageType: 'payment_reminder' | 'payment_confirmation' | 'overdue_alert';
  messageContent: string;
  channel: NotificationChannel;
  deliveryStatus: DeliveryStatus;
  deliveryTimestamp?: Date;
  failureReason?: string;
  deliveryAttempts: number;
  nextRetryAt?: Date;
  createdAt: Date;
}

// ============================================================================
// MARKETPLACE TYPES
// ============================================================================

export interface Listing {
  id: string;
  unitId: string;
  landlordId: string;
  title: string;
  description: string;
  nightlyPrice: number;
  weeklyDiscount: number;
  monthlyDiscount: number;
  depositPercentage: number;
  maxGuests: number;
  minimumStayNights: number;
  listingType: 'short_term' | 'furnished' | 'serviced';
  isActive: boolean;
  photosCompressed: Array<{ base64: string; thumbnail: string }>;
  amenityTags: string[];
  houseRules?: string;
  cancellationPolicy: CancellationPolicy;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Booking {
  id: string;
  listingId: string;
  guestId: string;
  landlordId: string;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfGuests: number;
  nightlyRate: number;
  totalNights: number;
  subtotal: number;
  depositAmount?: number;
  cleaningFee?: number;
  serviceFee?: number;
  discountAmount: number;
  totalAmount: number;
  status: BookingStatus;
  depositPaymentId?: string;
  bookingReference: string;
  specialRequests?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface Review {
  id: string;
  bookingId: string;
  reviewerId: string;
  reviewerType: 'guest' | 'landlord';
  listingId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  cleanlinessRating?: 1 | 2 | 3 | 4 | 5;
  accuracyRating?: 1 | 2 | 3 | 4 | 5;
  communicationRating?: 1 | 2 | 3 | 4 | 5;
  locationRating?: 1 | 2 | 3 | 4 | 5;
  reviewText?: string;
  reviewSource: 'app' | 'sms' | 'voice';
  reviewDate: Date;
  isResponse: boolean;
  responseToReviewId?: string;
  createdAt: Date;
  deletedAt?: Date;
}

// ============================================================================
// MAINTENANCE TYPES
// ============================================================================

export interface MaintenanceRequest {
  id: string;
  unitId: string;
  tenantId: string;
  landlordId: string;
  issueTitle: string;
  issueDescription: string;
  issueCategory: IssueCategory;
  urgency: MaintenanceUrgency;
  photosUrls: string[];
  status: MaintenanceStatus;
  assignedToContractorId?: string;
  estimatedCost?: number;
  actualCost?: number;
  reportedDate: Date;
  targetCompletionDate?: Date;
  actualCompletionDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============================================================================
// INSPECTION TYPES
// ============================================================================

export interface RoomCondition {
  [roomName: string]: {
    condition: ConditionLevel;
    notes?: string;
  };
}

export interface Discrepancy {
  location: string;
  damage: string;
  severity: 'high' | 'medium' | 'low';
  estimatedRepairCost?: number;
}

export interface ConditionReport {
  id: string;
  leaseId: string;
  tenantId: string;
  landlordId: string;
  reportType: ReportType;
  inspectionDate: Date;
  inspectorName?: string;
  inspectorContact?: string;
  overallCondition?: ConditionLevel;
  roomConditions: RoomCondition;
  photoUrls: string[];
  discrepancies: Discrepancy[];
  estimatedRepairCost?: number;
  notes?: string;
  signedByTenantAt?: Date;
  signedByLandlordAt?: Date;
  pdfReportUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ============================================================================
// FINANCIAL TYPES
// ============================================================================

export interface FinancialSummary {
  id: string;
  landlordId: string;
  propertyId?: string;
  summaryMonth: Date;
  expectedRent: number;
  actualRentCollected: number;
  collectionRate: number; // percentage
  expenses: number;
  expensesBreakdown: Record<string, number>;
  netProfit?: number;
  overduePayments: number;
  overdueCount: number;
  vacancyCount?: number;
  occupancyRate?: number; // percentage
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// COMMUNICATION TYPES
// ============================================================================

export interface SMSLog {
  id: string;
  phoneNumber: string;
  messageContent: string;
  messageType: string;
  senderEntityId?: string;
  deliveryStatus: DeliveryStatus;
  failureReason?: string;
  africaTalkingMessageId?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  createdAt: Date;
}

export interface USSDSession {
  id: string;
  phoneNumber: string;
  sessionId: string;
  currentMenuLevel?: string;
  sessionData: Record<string, any>;
  lastInput?: string;
  sessionStatus: USSDSessionStatus;
  initiatedAt: Date;
  lastInteractionAt: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface VoiceCallLog {
  id: string;
  phoneNumber: string;
  callId?: string;
  callType?: 'inbound' | 'outbound';
  callPurpose?: string;
  durationSeconds?: number;
  recordingUrl?: string;
  transcription?: string;
  aiInteraction: Record<string, any>;
  callStatus?: string;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
}

// ============================================================================
// OFFLINE SYNC TYPES
// ============================================================================

export interface OfflineQueueItem {
  id: string;
  userId?: string;
  userType: 'tenant' | 'landlord' | 'guest';
  transactionType: string;
  transactionData: Record<string, any>;
  syncStatus: SyncStatus;
  lastSyncAttempt?: Date;
  syncError?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}

// ============================================================================
// AUDIT TYPES
// ============================================================================

export interface AuditLog {
  id: string;
  actorId?: string;
  actorType: 'landlord' | 'tenant' | 'guest' | 'system' | 'admin';
  action: string;
  resourceType: string;
  resourceId: string;
  changes: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
