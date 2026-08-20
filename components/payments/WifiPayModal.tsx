'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Wifi } from 'lucide-react'

interface WifiPayModalProps {
  open: boolean
  onClose: () => void
  amount: number
  tenantId: string
  month: string
  channelId: string | number | null
  defaultPhone?: string
  onSuccess: () => void
  onError: (msg: string) => void
}

export default function WifiPayModal({
  open,
  onClose,
  amount,
  tenantId,
  month,
  channelId,
  defaultPhone = '',
  onSuccess,
  onError,
}: WifiPayModalProps) {
  const [phone, setPhone] = useState(defaultPhone)
  const [isPaying, setIsPaying] = useState(false)

  if (!open) return null

  const formatMoney = (n: number) =>
    `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`

  const handlePay = async () => {
    if (!phone || phone.length < 9) {
      onError('Please enter a valid M-Pesa phone number')
      return
    }
    if (!channelId) {
      onError('Your landlord has not set up a Wi-Fi payment channel yet.')
      return
    }
    setIsPaying(true)
    try {
      const res = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          phone,
          tenantId,
          month,
          paymentType: 'wifi',
          channelId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'STK push failed')
      onSuccess()
      onClose()
    } catch (err: any) {
      onError(err.message)
    } finally {
      setIsPaying(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950/40 flex items-center justify-center">
              <Wifi className="w-4.5 h-4.5 text-sky-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Pay for Wi-Fi</h3>
              <p className="text-xs text-muted-foreground">Monthly Wi-Fi subscription</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 p-4 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total to Pay</span>
          <span className="text-lg font-bold text-foreground">{formatMoney(amount)}</span>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-foreground block mb-1.5">
            Confirm M-Pesa Number
          </label>
          <input
            type="tel"
            placeholder="e.g. 0712345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-border p-3 bg-secondary text-foreground"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            An STK Push prompt will be sent to this number.
          </p>
        </div>

        <div className="flex gap-2 mt-5">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-destructive rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handlePay}
            disabled={isPaying}
            className="flex-1 bg-sky-600 hover:bg-sky-700 text-white rounded-xl"
          >
            {isPaying ? 'Sending...' : 'Send STK Push'}
          </Button>
        </div>
      </div>
    </div>
  )
}