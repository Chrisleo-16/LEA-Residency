export function generateCoupon(landlordId: string, billingPeriod: string): string {
  const short = landlordId.slice(0, 6).toUpperCase()
  const period = billingPeriod.replace('-', '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `LEA-${period}-${short}-${rand}`
}