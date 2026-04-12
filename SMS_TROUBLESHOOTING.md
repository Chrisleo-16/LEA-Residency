# SMS Integration Troubleshooting Guide

## Error: "The suppli..." is not valid JSON

This error occurs when Africa's Talking returns an HTML error page instead of JSON, typically due to authentication issues.

## Quick Debug Steps

### 1. Check Environment Variables
```bash
curl "http://localhost:3000/api/sms/test?debug=true"
```

### 2. Verify Credentials
- Check your Africa's Talking dashboard
- Ensure you're using the correct API key
- Verify the username matches your account

### 3. Test with Correct Format
```bash
curl http://localhost:3000/api/sms/test
```

## Common Issues & Solutions

### Issue 1: Missing Environment Variables
**Error**: `AFRICAS_TALKING_USERNAME` or `AFRICAS_TALKING_API_KEY` missing

**Solution**: Add to `.env.local`:
```env
AFRICAS_TALKING_USERNAME=your_username
AFRICAS_TALKING_API_KEY=your_api_key
AFRICAS_TALKING_SENDER_ID=LEAExecutive
LANDLORD_PHONE_NUMBER=+254700123456
```

### Issue 2: Wrong API Key Format
**Error**: API key from wrong environment (sandbox vs production)

**Solution**: 
- For development: Use sandbox credentials
- For production: Use live credentials
- Check Africa's Talking dashboard for correct keys

### Issue 3: Incorrect Username
**Error**: Username doesn't match account

**Solution**: 
- Username is case-sensitive
- Use exact username from Africa's Talking dashboard
- Usually your account username or app name

### Issue 4: Endpoint Issues
**Error**: Wrong API endpoint

**Solution**: The library auto-switches between:
- Sandbox: `https://api.sandbox.africastalking.com/version1/messaging`
- Production: `https://api.africastalking.com/version1/messaging`

## Getting Africa's Talking Credentials

### 1. Sign Up/Login
- Go to [africastalking.com](https://africastalking.com)
- Create account or login

### 2. Get API Credentials
- Navigate to Dashboard
- Go to "API Settings" or "Developers"
- Copy your username and API key

### 3. Sandbox vs Production
- **Sandbox**: For testing, free credits
- **Production**: For live SMS, requires payment

### 4. Request Sender ID
- Go to "SMS" section
- Request custom sender ID (e.g., "LEAExecutive")
- Takes 1-2 business days for approval

## Testing Process

### 1. Environment Check
```bash
curl "http://localhost:3000/api/sms/test?debug=true"
```

### 2. Credential Validation
```bash
curl http://localhost:3000/api/sms/test
```

### 3. Send Test SMS
```bash
curl -X POST http://localhost:3000/api/sms/test \
  -H "Content-Type: application/json" \
  -d '{"to": "+254700123456", "message": "Test message"}'
```

## Expected Successful Response
```json
{
  "success": true,
  "credentials": {
    "valid": true,
    "message": "Credentials are valid"
  },
  "balance": {
    "balance": "1000",
    "currency": "KES"
  },
  "test": {
    "success": true,
    "messageId": "ATXid_123456789",
    "cost": "1.20",
    "status": "Success"
  }
}
```

## Error Response Examples

### Authentication Error
```json
{
  "success": false,
  "credentials": {
    "valid": false,
    "message": "Invalid credentials"
  },
  "error": "Authentication failed - check API credentials and endpoint"
}
```

### Missing Environment Variables
```json
{
  "success": false,
  "env_check": {
    "username": "Missing",
    "apiKey": "Missing",
    "senderId": "LEAExecutive",
    "landlordPhone": "Missing"
  }
}
```

## Phone Number Format

### Valid Formats
- `+254700123456` (international)
- `0712345678` (Kenyan local)
- `0112345678` (Kenyan local)

### Invalid Formats
- `254700123456` (missing +)
- `0712-345-678` (contains dashes)
- `+254 700 123 456` (contains spaces)

## Production Deployment

### 1. Set Production Environment
```env
NODE_ENV=production
```

### 2. Use Production Credentials
```env
AFRICAS_TALKING_USERNAME=your_production_username
AFRICAS_TALKING_API_KEY=your_production_api_key
```

### 3. Configure Vercel
- Add environment variables to Vercel dashboard
- Ensure `NODE_ENV=production` is set

## Monitoring & Maintenance

### Check Balance Regularly
```bash
curl http://yourdomain.com/api/sms/test
```

### Monitor Logs
- Check Vercel logs for SMS errors
- Monitor Africa's Talking dashboard
- Track SMS costs and usage

### Common Status Codes
- `101`: Success
- `100`: Processing
- `401`: Authentication failed
- `404`: Invalid phone number
- `500`: Server error

## Support

### Africa's Talking Support
- Email: support@africastalking.com
- Documentation: developers.africastalking.com
- Dashboard: account.africastalking.com

### Common Issues
1. **"The supplier..." error**: Check API credentials
2. **"Invalid phone number"**: Check phone format
3. **"Insufficient balance"**: Add credits to account
4. **"Sender ID not approved"**: Request sender ID approval

## Quick Fix Checklist

- [ ] Environment variables set correctly
- [ ] Using correct API key (sandbox vs production)
- [ ] Username matches Africa's Talking account
- [ ] Phone numbers in correct format
- [ ] Sender ID approved (if using custom)
- [ ] Sufficient SMS balance
- [ ] NODE_ENV set correctly
- [ ] API endpoint accessible
