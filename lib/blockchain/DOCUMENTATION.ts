/**
 * Blockchain Documentation
 * How the 4-digit code system works behind the blockchain
 */

export const BLOCKCHAIN_DOCUMENTATION = `
# Blockchain Authentication System for LEA Platform

## Overview
A deterministic blockchain-based authentication system where:
- **Landlords** register once and receive a unique **4-digit code**
- **Tenants** only need the 4-digit code to log in
- The 4-digit code is backed by blockchain verification
- Impossible to forge codes without valid blockchain entry

---

## How It Works

### 1. Landlord Registration
\`\`\`
POST /api/blockchain/landlord/register

{
  "landlordId": "uuid-...",
  "landlordName": "John Landlord",
  "landlordEmail": "john@example.com",
  "propertyCount": 5
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "code": "7392",
  "blockId": "a1b2c3d4e5f6g7h8",
  "certificate": {
    "code": "7392",
    "blockId": "a1b2c3d4e5f6g7h8",
    "timestamp": "2026-04-07T10:30:00Z",
    "publicKey": "abc123def456"
  }
}
\`\`\`

**What happens:**
1. Landlord data is hashed with SHA-256
2. First 4 digits extracted and validated → **7392**
3. Blockchain record created (immutable):
   - Stores code hash
   - Stores landlord ID
   - Signs with HMAC-SHA256 secret key
   - Proof of work: nonce calculated until block hash starts with 0000
4. Record linked to previous block (creates chain)
5. Stored in \`blockchain_ledger\` table
6. Code mapping stored in \`landlord_codes\` table

### 2. Tenant Login
\`\`\`
POST /api/blockchain/tenant/login

{
  "code": "7392",
  "tenantEmail": "tenant@example.com",
  "tenantName": "Jane Tenant"
}
\`\`\`

**Validation Flow:**
1. Code \`7392\` is looked up in \`landlord_codes\` table
2. If found, fetch corresponding blockchain record
3. **Verify blockchain record signature:**
   - Recompute HMAC with secret key
   - Must match stored signature
   - If mismatch → Code is **FORGED** → Reject
4. **Verify proof of work:**
   - Recompute SHA-256 with stored nonce
   - Must start with \`0000\` (4 leading zeros)
   - If invalid → Code is **TAMPERED** → Reject
5. If all checks pass → **Code is valid**
6. Create tenant and session
7. Return auth token

---

## Technical Architecture

### Blockchain Record Structure
\`\`\`
{
  blockId: "a1b2c3d4e5f6g7h8",        // First 16 chars of block hash
  timestamp: 1712485800000,             // Unix timestamp
  landlordId: "uuid-...",               // Unique landlord identifier
  landlordName: "John Landlord",        // Full name
  landlordEmail: "john@example.com",    // Email address
  propertyCount: 5,                     // Number of properties
  codeHash: "7392abc...def",            // SHA256(4digit+email+timestamp)
  publicKey: "abc123def456",            // Public key for verification
  signature: "hmacabc...def",           // HMAC-SHA256 signature
  previousBlockHash: "...prev block",   // SHA256 of previous block
  nonce: 45234                          // Proof of work value
}
\`\`\`

### Database Tables

#### \`blockchain_ledger\`
Immutable record of all landlord registrations
- \`block_id\` [PRIMARY]: Unique block identifier
- \`landlord_id\`: Reference to landlord
- \`code_hash\`: SHA256 hash of the 4-digit code
- \`signature\`: HMAC verification signature
- \`nonce\`: Proof of work value
- \`chain_position\`: Position in blockchain
- \`is_verified\`: Boolean verification status
- Indexes on: block_id, landlord_id, code_hash

#### \`landlord_codes\`
Mapping between 4-digit codes and blockchain blocks
- \`code\`: The actual 4-digit code (UNIQUE)
- \`landlord_id\`: Reference to landlord
- \`block_id\`: Reference to blockchain record
- \`is_active\`: Can be deactivated for security
- \`expires_at\`: Optional expiration (default: 1 year)
- Indexes on: code, landlord_id

#### \`tenant_code_logins\`
Audit trail of all login attempts
- \`code_used\`: The code that was attempted
- \`login_success\`: true/false result
- \`landlord_id\`: Which landlord was accessed
- \`tenant_id\`: Which tenant (if successful)
- Indexes on: code_used, landlord_id, login_success

#### \`blockchain_verification_log\`
Verification audit trail for monitoring
- \`block_id\`: Which block was verified
- \`verification_type\`: code_validation, chain_validation, or record_audit
- \`is_valid\`: Verification result
- Index on: block_id, verification_type

---

## Security Features

### 1. **Deterministic Code Generation**
The 4-digit code is generated from:
- Landlord ID (UUID)
- Email address
- Timestamp
All hashed with SHA-256 → First 4 digits

**Result:** Code can be regenerated to verify authenticity

### 2. **HMAC Signature**
Each block is signed with HMAC-SHA256 using a secret key
- If secret key is compromised → Entire blockchain compromised
- Store secret key in secure environment variable: \`BLOCKCHAIN_SECRET_KEY\`

### 3. **Proof of Work**
Each block includes a nonce calculated via iterative hashing
- Block hash must start with \`0000\` (4 leading zeros)
- Prevents easy block creation/modification
- Takes computational work to create valid block

### 4. **Linked Chain**
Each block references the previous block's hash
- Modifying middle blocks breaks chain integrity
- Verification process checks entire chain
- Detects tampering immediately

### 5. **Immutable Database**
Blockchain records in database have:
- Constraints preventing modification (UPDATE disabled via RLS)
- Deletion restricted to maintain chain
- All changes logged in \`blockchain_verification_log\`

---

## API Endpoints

### POST /api/blockchain/landlord/register
Register new landlord on blockchain
**Body:**
\`\`\`json
{
  "landlordId": "uuid",
  "landlordName": "string",
  "landlordEmail": "email@example.com",
  "propertyCount": number (optional)
}
\`\`\`

**Response:** 4-digit code + blockchain certificate

### POST /api/blockchain/tenant/login
Tenant login using 4-digit code
**Body:**
\`\`\`json
{
  "code": "7392",
  "tenantEmail": "tenant@example.com",
  "tenantName": "Jane Doe" (optional)
}
\`\`\`

**Response:** Session token + landlord details

### GET /api/blockchain/verify
Check blockchain chain integrity
**Response:** Chain validity status + statistics

### POST /api/blockchain/verify
Force chain verification audit
**Response:** Audit results

---

## Environment Variables

Add to \`.env.local\`:
\`\`\`
BLOCKCHAIN_SECRET_KEY=your-256-bit-secret-key-change-this-in-production
\`\`\`

Generate secure key:
\`\`\`bash
openssl rand -hex 32
\`\`\`

---

## Future Enhancements

1. **Smart Contracts**: Move verification logic to smart contract
2. **Public Blockchain**: Deploy to Ethereum/Polygon for full decentralization
3. **Code Rotation**: Allow landlords to rotate codes periodically
4. **Multi-Signature**: Require multiple signatures for block validation
5. **Merkle Trees**: Use Merkle tree for faster verification
6. **ZK Proofs**: Zero-knowledge proofs for privacy

---

## Testing the System

### 1. Register a Landlord
\`\`\`bash
curl -X POST http://localhost:3000/api/blockchain/landlord/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "landlordId": "123e4567-e89b-12d3-a456-426614174000",
    "landlordName": "Test Landlord",
    "landlordEmail": "test@example.com",
    "propertyCount": 3
  }'
\`\`\`

### 2. Login with Code
\`\`\`bash
curl -X POST http://localhost:3000/api/blockchain/tenant/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "code": "7392",
    "tenantEmail": "tenant@example.com",
    "tenantName": "Test Tenant"
  }'
\`\`\`

### 3. Verify Chain
\`\`\`bash
curl -X GET http://localhost:3000/api/blockchain/verify
\`\`\`

---

## Architecture Diagram

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                  LANDLORD REGISTRATION                      │
├─────────────────────────────────────────────────────────────┤
│  1. Landlord Data → SHA256 Hash → Extract 4 Digits         │
│  2. Create Blockchain Record with HMAC Signature           │
│  3. Calculate Proof of Work (nonce until hash starts 0000) │
│  4. Store in blockchain_ledger + landlord_codes            │
│  5. Return 4-digit code to landlord                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  BLOCKCHAIN LEDGER                          │
├─────────────────────────────────────────────────────────────┤
│  Block 1: Landlord A [Code: 1234, Hash: abc..., PoW: 123]  │
│  Block 2: Landlord B [Code: 5678, Hash: def..., PoW: 456]  │
│  Block 3: Landlord C [Code: 9012, Hash: ghi..., PoW: 789]  │
│  (Each block references previous block hash)               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               TENANT LOGIN (4-DIGIT CODE)                   │
├─────────────────────────────────────────────────────────────┤
│  1. Tenant Enter Code "1234"                               │
│  2. Lookup in landlord_codes → Find block                  │
│  3. Verify HMAC Signature with secret key                  │
│  4. Verify Proof of Work (hash starts with 0000)          │
│  5. If all valid → Create session + Return auth token      │
│  6. If invalid → Reject as FORGED/TAMPERED               │
└─────────────────────────────────────────────────────────────┘
\`\`\`

---

## Why This Works

**For Landlords:**
- Simple, unique 4-digit code
- No need to remember usernames/passwords
- Can share code with tenants
- Code is backed by blockchain (unforgeable)

**For Tenants:**
- Only need to remember 4 digits
- Can't accidentally log into wrong landlord
- System verifies code is legitimate
- Future-proof for rental management app

**For System:**
- Decentralized architecture (ready for blockchain migration)
- Immutable audit trail
- Cryptographic proof of ownership
- Scales to thousands of landlords
- Foundation for future smart contracts
`;
