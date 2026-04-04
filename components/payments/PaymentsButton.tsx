'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Smartphone, Loader2, CheckCircle2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface PayButtonProps {
  user: User | null
  amount: number
  month: string
  onSuccess: () => void
  onError: (msg: string) => void
  disabled?: boolean
}

export default function PayButton({
  user,
  amount,
  month,
  onSuccess,
  onError,
  disabled = false,
}: PayButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [phone, setPhone] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)

  const formatMoney = (n: number) => `KES ${n.toLocaleString('en-KE')}`

  const handlePay = async () => {
    if (!phone || phone.length < 9) {
      onError('Enter a valid M-Pesa phone number')
      return
    }
    setIsSending(true)
    try {
      const res = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          phone,
          tenantId: user?.id,
          month,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'STK push failed')

      setSent(true)
      onSuccess()
      setTimeout(() => {
        setShowModal(false)
        setSent(false)
        setPhone('')
      }, 4000)
    } catch (err: any) {
      onError(err.message)
    } finally {
      setIsSending(false)
    }
  }

  const openModal = async () => {
    if (disabled) return
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('id', user.id)
        .single()
      if (data?.phone_number) setPhone(data.phone_number)
    }
    setShowModal(true)
  }

  return (
    <>
      <Button
        onClick={openModal}
        disabled={disabled}
        className={`w-full mt-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl h-12 gap-2 font-semibold shadow-md shadow-accent/20 transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <Smartphone className="w-4 h-4" />
        Pay {formatMoney(amount)} via M-Pesa
      </Button>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
            {sent ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-accent" />
                </div>
                <p className="font-bold text-foreground text-lg">STK Push Sent! 📱</p>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Check your phone for the M-Pesa prompt. Enter your PIN to complete
                  payment of{' '}
                  <span className="font-bold text-foreground">{formatMoney(amount)}</span>.
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  This window will close automatically...
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-foreground text-xl">Pay via M-Pesa</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      An STK push will be sent to your phone
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowModal(false)
                      setPhone('')
                    }}
                    className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mb-5 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Amount to pay</p>
                  <p className="text-2xl font-bold text-accent">
                    {formatMoney(amount)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Paybill: 400200 · Account: 1060544
                  </p>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    M-Pesa Phone Number
                  </label>
                  <Input
                    type="tel"
                    placeholder="e.g. 0712345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-background border-border text-foreground rounded-xl h-12 text-base focus:ring-2 focus:ring-accent/50"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Must be the M-Pesa number you want to pay from
                  </p>
                </div>

                <div className="bg-muted/50 rounded-xl p-3 mb-5 space-y-1 text-sm">
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    How it works:
                  </p>
                  {[
                    '1. Click "Send STK Push" below',
                    '2. M-Pesa prompt appears on your phone',
                    '3. Enter your M-Pesa PIN',
                    '4. Payment confirmed automatically ✅',
                  ].map((step) => (
                    <p key={step} className="text-xs text-muted-foreground">
                      {step}
                    </p>
                  ))}
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false)
                      setPhone('')
                    }}
                    className="flex-1 rounded-xl border-border h-12"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePay}
                    disabled={isSending || !phone}
                    className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl h-12 gap-2 shadow-sm shadow-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4" />
                        Send STK Push
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}