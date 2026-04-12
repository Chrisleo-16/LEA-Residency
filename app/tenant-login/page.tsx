'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Users, Building2, ArrowRight, Home } from 'lucide-react'
import Link from 'next/link'

export default function TenantLoginPage() {
  const router = useRouter()
  const [tenantCode, setTenantCode] = useState('')
  const [tenantEmail, setTenantEmail] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [tenantPhone, setTenantPhone] = useState('')
  const [showLeaseInfo, setShowLeaseInfo] = useState(false)
  const [leaseStartDate, setLeaseStartDate] = useState('')
  const [leaseEndDate, setLeaseEndDate] = useState('')
  const [monthlyRent, setMonthlyRent] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [landlordInfo, setLandlordInfo] = useState<any>(null)

  const handleTenantLogin = async () => {
    if (!tenantCode || !tenantEmail || !tenantName) {
      setError('Please fill in all required fields')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const leaseInfo = showLeaseInfo ? {
        leaseStartDate,
        leaseEndDate,
        monthlyRent: parseFloat(monthlyRent)
      } : undefined

      const response = await fetch('/api/blockchain/multi-landlord/tenant-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantCode: tenantCode.toUpperCase(),
          tenantEmail,
          tenantName,
          tenantPhone,
          leaseInfo
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Login failed')
      }

      // Store session and redirect
      localStorage.setItem('tenantSession', JSON.stringify(result.session))
      localStorage.setItem('landlordInfo', JSON.stringify(result.landlord))
      localStorage.setItem('tenantSlot', JSON.stringify(result.tenantSlot))

      setLandlordInfo(result.landlord)
      
      // Show success and redirect after a delay
      setTimeout(() => {
        router.push('/tenant-dashboard')
      }, 2000)

    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your tenant code.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTenantCode = (value: string) => {
    // Auto-format to LEA-XXX-TENANT-X pattern
    const formatted = value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
    return formatted
  }

  return (
    <div className="min-h-screen flex">
      
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/tenant-building.jpg')" }}
        />
        <div className="absolute inset-0 bg-linear-to-br from-black/80 via-black/60 to-black/40" />
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent" />
        
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
              <Link href="/">
                <Home className="w-5 h-5 text-accent-foreground" />
              </Link>
            </div>
            <span className="text-white font-bold text-lg tracking-wide">
              LEA Executive
            </span>
          </div>

          <div>
            <div className="w-12 h-0.5 bg-accent mb-8" />
            <h1 className="text-5xl font-bold text-white leading-tight mb-6">
              Welcome to<br />
              <span className="text-accent">Your Home</span><br />
              Managed Digitally
            </h1>
            <p className="text-white/60 text-base max-w-sm leading-relaxed">
              Enter your tenant code to connect with your landlord and access your property management portal.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              'Blockchain Secured',
              'Instant Communication',
              'Digital Payments',
              'Maintenance Requests'
            ].map((item) => (
              <span
                key={item}
                className="px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-xs font-medium"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center bg-background px-6 py-12 lg:px-16">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Home className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="font-bold text-foreground text-base">LEA Executive</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Tenant Portal
            </h2>
            <p className="text-muted-foreground text-sm">
              Enter your tenant code to access your property dashboard
            </p>
          </div>

          {/* Success Message */}
          {landlordInfo && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Connected to {landlordInfo.name}
                </span>
              </div>
              <p className="text-xs text-green-600">
                Redirecting to your dashboard...
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-5 p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={(e) => { e.preventDefault(); handleTenantLogin(); }} className="space-y-4">
            
            {/* Tenant Code */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Tenant Code</label>
              <Input
                type="text"
                placeholder="LEA-ABC123-TENANT-5"
                value={tenantCode}
                onChange={(e) => setTenantCode(formatTenantCode(e.target.value))}
                disabled={isLoading}
                required
                className="h-11 bg-secondary/50 border-border text-foreground rounded-xl font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Format: LEA-{'{LANDLORD_CODE}'}-TENANT-{'{SLOT_NUMBER}'}
              </p>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email Address</label>
              <Input
                type="email"
                placeholder="your.email@example.com"
                value={tenantEmail}
                onChange={(e) => setTenantEmail(e.target.value)}
                disabled={isLoading}
                required
                className="h-11 bg-secondary/50 border-border text-foreground rounded-xl"
              />
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <Input
                type="text"
                placeholder="John Doe"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                disabled={isLoading}
                required
                className="h-11 bg-secondary/50 border-border text-foreground rounded-xl"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Phone Number (Optional)</label>
              <Input
                type="tel"
                placeholder="+254 700 123 456"
                value={tenantPhone}
                onChange={(e) => setTenantPhone(e.target.value)}
                disabled={isLoading}
                className="h-11 bg-secondary/50 border-border text-foreground rounded-xl"
              />
            </div>

            {/* Lease Information Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowLeaseInfo(!showLeaseInfo)}
                className="text-sm text-accent hover:underline"
              >
                {showLeaseInfo ? 'Hide' : 'Add'} Lease Information
              </button>
            </div>

            {/* Lease Information */}
            {showLeaseInfo && (
              <div className="space-y-4 p-4 bg-secondary/30 rounded-xl">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Lease Start Date</label>
                  <Input
                    type="date"
                    value={leaseStartDate}
                    onChange={(e) => setLeaseStartDate(e.target.value)}
                    disabled={isLoading}
                    className="h-11 bg-background border-border text-foreground rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Lease End Date</label>
                  <Input
                    type="date"
                    value={leaseEndDate}
                    onChange={(e) => setLeaseEndDate(e.target.value)}
                    disabled={isLoading}
                    className="h-11 bg-background border-border text-foreground rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Monthly Rent</label>
                  <Input
                    type="number"
                    placeholder="50000"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(e.target.value)}
                    disabled={isLoading}
                    className="h-11 bg-background border-border text-foreground rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || !!landlordInfo}
              className="w-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-xl flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  Access Tenant Portal
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

          {/* Footer */}
          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              Don't have a tenant code?{' '}
              <Link href="/" className="text-accent hover:underline">
                Contact your landlord
              </Link>
            </p>
          </div>

          {/* Back to Home */}
          <div className="text-center mt-4">
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
              <ArrowRight className="w-3 h-3 inline mr-1 rotate-180" />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
