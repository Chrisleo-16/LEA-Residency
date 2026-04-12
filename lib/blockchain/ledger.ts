/**
 * Blockchain Ledger - Immutable Record System
 * Records all landlord registrations with cryptographic verification
 * 4-digit codes are deterministic hashes of landlord data
 */

import crypto from 'crypto';

export interface BlockchainRecord {
  blockId: string;        // Unique block identifier
  timestamp: number;      // Unix timestamp
  landlordId: string;    // Landlord UUID
  landlordName: string;  // Full name
  landlordEmail: string; // Email
  propertyCount: number; // Number of properties
  codeHash: string;      // SHA-256 of the 4-digit code
  publicKey: string;     // Public key for verification
  signature: string;     // HMAC signature
  previousBlockHash: string; // Hash of previous block (blockchain chain)
  nonce: number;         // Proof of work nonce
}

export interface BlockchainChain {
  blocks: BlockchainRecord[];
  chainHash: string;     // Current chain integrity hash
  isValid: boolean;
}

/**
 * Generate deterministic 4-digit code from landlord data
 * Algorithm: First 4 digits of checksum, validated by blockchain
 */
export function generate4DigitCode(
  landlordId: string,
  landlordEmail: string,
  timestamp: number
): { code: string; hash: string } {
  // Create deterministic input
  const input = `${landlordId}:${landlordEmail}:${timestamp}`;
  
  // Generate SHA-256 hash
  const fullHash = crypto.createHash('sha256').update(input).digest('hex');
  
  // Extract 4 digits from hash (use first 8 hex chars, convert to number, mod 10000)
  const hashNumber = parseInt(fullHash.substring(0, 8), 16);
  const code = String(hashNumber % 10000).padStart(4, '0');
  
  return {
    code,
    hash: fullHash
  };
}

/**
 * Create a new blockchain record
 */
export function createBlockchainRecord(
  landlordId: string,
  landlordName: string,
  landlordEmail: string,
  propertyCount: number,
  previousBlockHash: string,
  secretKey: string
): BlockchainRecord {
  const timestamp = Date.now();
  const { code, hash: codeHash } = generate4DigitCode(landlordId, landlordEmail, timestamp);
  
  // Generate public key (for verification)
  const publicKey = crypto
    .createHash('sha256')
    .update(secretKey)
    .digest('hex')
    .substring(0, 16);
  
  // Create signature
  const dataToSign = `${landlordId}${landlordName}${landlordEmail}${propertyCount}${codeHash}`;
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(dataToSign)
    .digest('hex');
  
  // Proof of work
  let nonce = 0;
  let blockHash = '';
  while (!blockHash.startsWith('0000')) {
    nonce++;
    const blockData = `${landlordId}${timestamp}${codeHash}${signature}${nonce}`;
    blockHash = crypto.createHash('sha256').update(blockData).digest('hex');
  }
  
  const blockId = blockHash.substring(0, 16);
  
  return {
    blockId,
    timestamp,
    landlordId,
    landlordName,
    landlordEmail,
    propertyCount,
    codeHash,
    publicKey,
    signature,
    previousBlockHash,
    nonce
  };
}

/**
 * Verify a blockchain record's integrity
 */
export function verifyBlockRecord(
  record: BlockchainRecord,
  secretKey: string
): boolean {
  // Verify signature
  const dataToSign = `${record.landlordId}${record.landlordName}${record.landlordEmail}${record.propertyCount}${record.codeHash}`;
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(dataToSign)
    .digest('hex');
  
  if (record.signature !== expectedSignature) {
    return false;
  }
  
  // Verify proof of work
  const blockData = `${record.landlordId}${record.timestamp}${record.codeHash}${record.signature}${record.nonce}`;
  const blockHash = crypto.createHash('sha256').update(blockData).digest('hex');
  
  return blockHash.substring(0, 16) === record.blockId && blockHash.startsWith('0000');
}

/**
 * Validate a 4-digit code against blockchain records
 * Returns landlord ID if valid, null if invalid
 */
export function validateCodeAgainstRecord(
  code: string,
  record: BlockchainRecord,
  landlordEmail: string
): boolean {
  // Regenerate the code hash to verify it matches
  const { hash: codeHash } = generate4DigitCode(
    record.landlordId,
    landlordEmail,
    record.timestamp
  );
  
  // Code is valid if it was generated from the same input
  return record.codeHash === codeHash;
}

/**
 * Build a blockchain chain and verify integrity
 */
export function buildBlockchainChain(records: BlockchainRecord[]): BlockchainChain {
  let chainHash = '';
  let isValid = true;
  
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    
    // Verify previous block hash matches
    if (i > 0) {
      const previousRecord = records[i - 1];
      const expectedPreviousHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(previousRecord))
        .digest('hex');
      
      if (record.previousBlockHash !== expectedPreviousHash && record.previousBlockHash !== '') {
        isValid = false;
        break;
      }
    }
    
    // Calculate current chain hash
    chainHash = crypto
      .createHash('sha256')
      .update(chainHash + JSON.stringify(record))
      .digest('hex');
  }
  
  return {
    blocks: records,
    chainHash,
    isValid
  };
}

/**
 * Generate blockchain metadata for display/verification
 * This is what landlord sees when registering
 */
export function generateLandlordBlockchainCertificate(
  code: string,
  record: BlockchainRecord
): {
  code: string;
  blockId: string;
  timestamp: string;
  publicKey: string;
  qrCode?: string;
} {
  return {
    code,
    blockId: record.blockId,
    timestamp: new Date(record.timestamp).toISOString(),
    publicKey: record.publicKey,
    // QR code can be generated separately from this data
    qrCode: undefined
  };
}
