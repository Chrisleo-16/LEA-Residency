'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  ChevronRight, ChevronLeft, Check, Minus, Plus, PartyPopper, Building2,
} from 'lucide-react'
import FocusAreaPicker from '@/components/onboarding/FocusAreaPicker'
import PaymentChannelSetup, { PaymentChannel } from '@/components/payments/PaymentChannelSetup'

interface ProfileData {
  role?: string
  full_name?: string | null
  landlord_code?: string | null
  landlord_block_id?: string | null
  property_setup_complete?: boolean | null
}

const STEPS = ['property', 'units', 'focus', 'payment'] as const
type Step = (typeof STEPS)[number]

export default function CompleteSetupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [done, setDone] = useState(false)

  const [propertyName, setPropertyName] = useState('')
  const [propertyAddress, setPropertyAddress] = useState('')
  const [totalUnits, setTotalUnits] = useState(1)
  const [focusAreas, setFocusAreas] = useState<string[]>([])
  const [paymentChannels, setPaymentChannels] = useState<PaymentChannel[]>([])

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session) {
        router.push('/login')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, landlord_code, landlord_block_id, property_setup_complete')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profileError || !profileData) {
        setError(profileError?.message || 'Profile not found. Please log in again.')
        setIsLoading(false)
        return
      }

      if (profileData.role === 'developer') {
        router.push('/developer-dashboard')
        return
      }

      const needsCompletion =
        profileData.role === 'landlord' &&
        (!profileData.landlord_code || !profileData.landlord_block_id || !profileData.property_setup_complete)

      if (!needsCompletion) {
        router.push('/dashboard')
        return
      }

      setProfile(profileData)
      setPropertyName(profileData.full_name ? `${profileData.full_name}'s Property` : '')
      setIsLoading(false)
    }

    loadProfile()
  }, [])

  const step: Step = STEPS[stepIndex]
  const progress = ((stepIndex + 1) / STEPS.length) * 100

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1))
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0))

  const canContinue = () => {
    if (step === 'property') return propertyName.trim().length > 0
    if (step === 'units') return totalUnits >= 1
    return true
  }

  const handleFinish = async () => {
    setError(null)
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/landlord/complete-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyName,
          propertyAddress: propertyAddress || 'Not provided',
          totalUnits: String(totalUnits),
          focusAreas: focusAreas.length > 0 ? focusAreas : null,
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Unable to complete property setup')
      }

      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2200)
    } catch (err: any) {
      setError(err.message || 'Unable to complete setup. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-sm w-full p-8 text-center border-border">
          <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <PartyPopper className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">You&apos;re all set!</h2>
          <p className="text-sm text-muted-foreground">
            Taking you to your dashboard — find your tenant invite link anytime in Settings.
          </p>
        </Card>
      </div>
    )
  }

  if (!profile || profile.role !== 'landlord') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center border-border">
          <p className="text-base font-semibold text-foreground">Waiting for verification</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Your account still requires verification before the dashboard can be accessed. If you
            believe this is an error, reach out to support.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white dark:text-neutral-900" />
          </div>
          <span className="font-semibold text-foreground">LEA Executive</span>
        </div>

        <div className="mb-6">
          <Progress value={progress} className="h-1.5" />
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card className="p-6 sm:p-8 border-border">
          {step === 'property' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-foreground">What should we call your property?</h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  This is what your tenants will see.
                </p>
              </div>
              <Input
                autoFocus
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="e.g. Sunrise Apartments"
                className="h-13 rounded-xl text-base"
              />
              <Input
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                placeholder="Address (optional)"
                className="h-12 rounded-xl"
              />
            </div>
          )}

          {step === 'units' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-foreground">How many units do you manage?</h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  We&apos;ll set up a tenant slot for each one.
                </p>
              </div>
              <div className="flex items-center justify-center gap-6 py-4">
                <button
                  type="button"
                  onClick={() => setTotalUnits((n) => Math.max(1, n - 1))}
                  className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-4xl font-bold text-foreground w-20 text-center tabular-nums">
                  {totalUnits}
                </span>
                <button
                  type="button"
                  onClick={() => setTotalUnits((n) => n + 1)}
                  className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {[1, 5, 10, 20].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setTotalUnits(n)}
                    className={`px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                      totalUnits === n ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:border-accent/40'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'focus' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-foreground">What do you want LEA to help you with?</h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Pick as many as you like — your dashboard will only show what you need. You can change this later in Settings.
                </p>
              </div>
              <FocusAreaPicker selected={focusAreas} onChange={setFocusAreas} />
            </div>
          )}

          {step === 'payment' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Set up a payment channel</h2>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Optional — add this now or skip and set it up later from Settings.
                </p>
              </div>
              <PaymentChannelSetup
                channels={paymentChannels}
                onAdd={(c) => setPaymentChannels((prev) => [...prev, c])}
                onRemove={(i) => setPaymentChannels((prev) => prev.filter((_, idx) => idx !== i))}
              />
            </div>
          )}

          <div className="flex justify-between mt-8 pt-2">
            {stepIndex > 0 ? (
              <Button type="button" variant="outline" onClick={goBack} className="rounded-xl">
                <ChevronLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
            ) : <span />}

            {step === 'payment' ? (
              <Button
                type="button"
                onClick={handleFinish}
                disabled={isSubmitting}
                className="bg-accent hover:bg-accent/90 text-white rounded-xl px-6 font-semibold"
              >
                {isSubmitting ? 'Finishing up...' : paymentChannels.length > 0 ? 'Finish setup' : 'Skip & finish setup'}
                {!isSubmitting && <Check className="w-4 h-4 ml-1.5" />}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={goNext}
                disabled={!canContinue()}
                className="bg-accent hover:bg-accent/90 text-white rounded-xl px-6 font-semibold"
              >
                Continue <ChevronRight className="w-4 h-4 ml-1.5" />
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
