'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'

interface ProfileData {
  role?: string
  full_name?: string | null
  email?: string | null
  kyc_verified?: boolean | null
  landlord_code?: string | null
  landlord_block_id?: string | null
  property_setup_complete?: boolean | null
}

export default function CompleteSetupPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [propertyName, setPropertyName] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [totalUnits, setTotalUnits] = useState('1')
  const [landlordCode, setLandlordCode] = useState('')
  const [referralLink, setReferralLink] = useState('')
  const [copySuccess, setCopySuccess] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        router.push('/login')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, email, kyc_verified, landlord_code, landlord_block_id, property_setup_complete')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profileError) {
        setError(profileError.message)
        setIsLoading(false)
        return
      }

      if (!profileData) {
        setError('Profile not found. Please log in again.')
        setIsLoading(false)
        return
      }

      if (profileData.role === 'developer') {
        router.push('/developer-dashboard')
        return
      }

      const needsCompletion =
        profileData.role === 'landlord' &&
        (!profileData.landlord_code ||
          !profileData.landlord_block_id ||
          !profileData.property_setup_complete)

      if (!needsCompletion) {
        router.push('/dashboard')
        return
      }

      setProfile(profileData)
      const generatedCode = profileData.landlord_code || ''
      setLandlordCode(generatedCode)
      if (generatedCode && typeof window !== 'undefined') {
        setReferralLink(`${window.location.origin}/tenant-login?landlordCode=${encodeURIComponent(generatedCode)}`)
      }
      if (profileData.role === 'landlord') {
        setPropertyName(profileData.full_name ? `${profileData.full_name}'s Property` : 'Main Property')
        setPropertyAddress('123 Main St, Nairobi, Kenya')
      }
      setIsLoading(false)
    }

    loadProfile()
  }, [router])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (!profile) {
        throw new Error('Unable to complete setup because profile data is missing.')
      }

      const response = await fetch('/api/landlord/complete-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyName,
          propertyAddress,
          totalUnits,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Unable to complete property setup')
      }

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Unable to complete setup. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
      </div>
    )
  }

  const isLandlord = profile?.role === 'landlord'
  const needsLandlordSetup =
    isLandlord &&
    (!profile?.landlord_code || !profile?.landlord_block_id || !profile?.property_setup_complete)

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl rounded-4xl border border-border bg-popover p-8 shadow-xl">
        <div className="mb-8">
          <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">Account setup required</p>
          <h1 className="mt-3 text-3xl font-semibold text-foreground">Complete your LEA setup</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
            Finish your landlord account onboarding before you can access the dashboard.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {needsLandlordSetup ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Your Unique Landlord Code</label>
                <Input
                  type="text"
                  readOnly
                  value={landlordCode || 'A landlord code will be generated automatically'}
                  className="h-12 bg-secondary/80 border-border text-foreground rounded-2xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Total Units / Rentals</label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={totalUnits}
                  onChange={(event) => setTotalUnits(event.target.value)}
                  required
                  className="h-12 bg-secondary/80 border-border text-foreground rounded-2xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Property Name</label>
              <Input
                type="text"
                value={propertyName}
                onChange={(event) => setPropertyName(event.target.value)}
                required
                className="h-12 bg-secondary/80 border-border text-foreground rounded-2xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Property Address</label>
              <Input
                type="text"
                value={propertyAddress}
                onChange={(event) => setPropertyAddress(event.target.value)}
                required
                className="h-12 bg-secondary/80 border-border text-foreground rounded-2xl"
              />
            </div>

            {referralLink && (
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Tenant referral link</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Share this link with tenants so they can connect to your property safely.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(referralLink)
                      setCopySuccess('Referral link copied!')
                      setTimeout(() => setCopySuccess(''), 2500)
                    }}
                    className="h-11 rounded-2xl"
                  >
                    Copy link
                  </Button>
                </div>
                <p className="mt-3 break-all text-sm text-muted-foreground">{referralLink}</p>
                {copySuccess && <p className="mt-2 text-xs text-green-600">{copySuccess}</p>}
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                This information completes your landlord onboarding and creates tenant slots for your property.
              </p>
              <Button type="submit" disabled={isSubmitting} className="h-12 rounded-2xl">
                {isSubmitting ? 'Completing setup…' : 'Complete setup'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="rounded-3xl border border-border px-6 py-8 bg-secondary">
            <p className="text-base font-semibold text-foreground">Waiting for verification</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Your account still requires verification before the dashboard can be accessed. If you believe this is an error, reach out to support.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
