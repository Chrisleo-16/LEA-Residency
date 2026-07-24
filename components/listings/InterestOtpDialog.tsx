'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface InterestOtpDialogProps {
  listingId: string | null
  onOpenChange: (open: boolean) => void
  onVerified: (listingId: string) => void
}

/**
 * No-account path for "I'm Interested": prove phone ownership with an SMS
 * code instead of requiring a login. See app/api/listings/interest/
 * request-code and verify-code for the two-step server side of this.
 */
export default function InterestOtpDialog({ listingId, onOpenChange, onVerified }: InterestOtpDialogProps) {
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const reset = () => {
    setStep('phone')
    setName('')
    setPhone('')
    setCode('')
  }

  const handleClose = (open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }

  const requestCode = async () => {
    if (!listingId) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/listings/interest/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, phone }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Failed to send code')

      toast.success('Code sent — check your SMS')
      setStep('code')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send code')
    } finally {
      setIsSubmitting(false)
    }
  }

  const verifyCode = async () => {
    if (!listingId) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/listings/interest/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, phone, code, name }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Incorrect code')

      toast.success('Owner notified — they have your name and number')
      onVerified(listingId)
      handleClose(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Incorrect code')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={!!listingId} onOpenChange={handleClose}>
      <DialogContent className="bg-white border border-neutral-200 max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-neutral-900">
            {step === 'phone' ? "Show you're interested" : 'Enter the code'}
          </DialogTitle>
          <DialogDescription className="text-neutral-500">
            {step === 'phone'
              ? 'No account needed — verify your number and the owner gets your name and contact directly.'
              : `We texted a 6-digit code to ${phone}.`}
          </DialogDescription>
        </DialogHeader>

        {step === 'phone' ? (
          <div className="space-y-4">
            <div>
              <Label className="text-neutral-900 mb-2 block">Your name</Label>
              <Input
                placeholder="e.g., Jane Wanjiru"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-neutral-900 mb-2 block">Phone number</Label>
              <Input
                placeholder="e.g., 0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-white border-neutral-200 text-neutral-900 rounded-xl"
              />
            </div>
            <Button
              onClick={requestCode}
              disabled={isSubmitting || !phone.trim()}
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Code
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label className="text-neutral-900 mb-2 block">6-digit code</Label>
              <Input
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="bg-white border-neutral-200 text-neutral-900 rounded-xl tracking-widest text-center text-lg"
              />
            </div>
            <Button
              onClick={verifyCode}
              disabled={isSubmitting || code.length !== 6}
              className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Verify &amp; Send Interest
            </Button>
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full text-xs text-neutral-500 hover:text-neutral-700"
            >
              Wrong number? Go back
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
