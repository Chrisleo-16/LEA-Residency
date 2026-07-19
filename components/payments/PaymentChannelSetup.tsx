'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Smartphone, Building2, RefreshCcw, Check, AlertCircle, ExternalLink, Trash2,
} from 'lucide-react'

export interface PaymentChannel {
  type: 'paybill' | 'till' | 'bank'
  number: string
  account: string
  bankAccount?: string
  id?: string
}

interface VerificationError {
  message: string
  explanation: string
  resolution: string[]
  action?: { label: string; url: string }
  code?: string
}

interface PaymentChannelSetupProps {
  channels: PaymentChannel[]
  onAdd: (channel: PaymentChannel) => void
  onRemove?: (index: number) => void
}

export default function PaymentChannelSetup({ channels, onAdd, onRemove }: PaymentChannelSetupProps) {
  const [paymentType, setPaymentType] = useState<'paybill' | 'till' | 'bank'>('paybill')
  const [paybillNumber, setPaybillNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [paybillAccountNumber, setPaybillAccountNumber] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankShortcode, setBankShortcode] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [verificationError, setVerificationError] = useState<VerificationError | null>(null)

  const resetFields = () => {
    setPaybillNumber(''); setAccountName(''); setPaybillAccountNumber('')
    setBankAccountNumber(''); setBankName(''); setBankShortcode('')
  }

  const handleVerify = async () => {
    const newErrors: Record<string, string> = {}
    if (!paybillNumber.trim() && paymentType !== 'bank') newErrors.paybillNumber = `${paymentType === 'paybill' ? 'Paybill' : 'Till'} number is required`
    if (paymentType === 'bank' && !bankShortcode.trim()) newErrors.bankShortcode = 'Bank shortcode is required'
    if (paymentType === 'bank' && !bankAccountNumber.trim()) newErrors.bankAccountNumber = 'Bank account number is required'
    if (!accountName.trim() && paymentType !== 'paybill') newErrors.accountName = 'Beneficiary name is required'
    if (paymentType === 'paybill' && !paybillAccountNumber.trim()) newErrors.paybillAccountNumber = 'Account number is required'
    if (paymentType === 'paybill' && !accountName.trim()) newErrors.accountName = 'Beneficiary name is required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setStatus('loading')
    setVerificationError(null)
    try {
      const res = await fetch('/api/payments/verify-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentType,
          shortCode: paymentType === 'bank' ? bankShortcode : paybillNumber,
          accountName,
          accountNumber: paymentType === 'paybill' ? paybillAccountNumber : bankAccountNumber,
          bankName,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setVerificationError({
          message: data.message || 'Verification failed',
          explanation: data.explanation || 'An unknown error occurred.',
          resolution: data.resolution || ['Please check your details and try again.'],
          action: data.action,
          code: data.code,
        })
        return
      }

      setStatus('idle')
      onAdd({
        type: paymentType,
        number: paybillNumber,
        account: accountName || bankName,
        bankAccount: bankAccountNumber,
        id: data.channel?.id,
      })
      resetFields()
      setErrors({})
    } catch {
      setStatus('error')
      setVerificationError({
        message: 'Network Error',
        explanation: 'Could not connect to the verification server.',
        resolution: ['Check your internet connection.', 'Try again in a few moments.'],
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5">
        {(['paybill', 'till', 'bank'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => { setPaymentType(type); setStatus('idle'); setVerificationError(null) }}
            className={`h-16 flex flex-col items-center justify-center gap-1 rounded-xl border text-xs font-medium transition-all ${
              paymentType === type
                ? 'border-accent bg-accent/10 text-accent shadow-sm shadow-accent/10'
                : 'border-border text-muted-foreground hover:border-accent/40'
            }`}
          >
            {type === 'bank' ? <Building2 className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            {type === 'paybill' ? 'Paybill' : type === 'till' ? 'Till Number' : 'Bank Account'}
          </button>
        ))}
      </div>

      <div className="p-4 rounded-2xl border border-border bg-secondary/40 space-y-3">
        {paymentType === 'bank' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Bank Name</label>
                <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. KCB Bank" className="bg-background h-11 rounded-xl" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Bank Shortcode</label>
                <Input
                  value={bankShortcode}
                  onChange={(e) => setBankShortcode(e.target.value)}
                  placeholder="e.g. 522522"
                  className={`bg-background h-11 rounded-xl ${errors.bankShortcode ? 'border-destructive' : ''}`}
                />
                {errors.bankShortcode && <p className="text-xs text-destructive mt-1">{errors.bankShortcode}</p>}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Account Number</label>
              <Input
                value={bankAccountNumber}
                onChange={(e) => setBankAccountNumber(e.target.value)}
                placeholder="12-16 digit account number"
                className={`bg-background h-11 rounded-xl ${errors.bankAccountNumber ? 'border-destructive' : ''}`}
              />
              {errors.bankAccountNumber && <p className="text-xs text-destructive mt-1">{errors.bankAccountNumber}</p>}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  {paymentType === 'paybill' ? 'Paybill Number' : 'Till Number'}
                </label>
                <Input
                  value={paybillNumber}
                  onChange={(e) => setPaybillNumber(e.target.value)}
                  placeholder="e.g. 123456"
                  className={`bg-background h-11 rounded-xl ${errors.paybillNumber ? 'border-destructive' : ''}`}
                />
                {errors.paybillNumber && <p className="text-xs text-destructive mt-1">{errors.paybillNumber}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  {paymentType === 'paybill' ? 'Account Number' : 'Beneficiary Name'}
                </label>
                <Input
                  value={paymentType === 'paybill' ? paybillAccountNumber : accountName}
                  onChange={(e) =>
                    paymentType === 'paybill' ? setPaybillAccountNumber(e.target.value) : setAccountName(e.target.value)
                  }
                  placeholder={paymentType === 'paybill' ? 'e.g. 123456' : 'e.g. Sunrise Apartments'}
                  className={`bg-background h-11 rounded-xl ${errors.accountName || errors.paybillAccountNumber ? 'border-destructive' : ''}`}
                />
              </div>
            </div>
            {paymentType === 'paybill' && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Beneficiary Name</label>
                <Input
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. Sunrise Apartments"
                  className={`bg-background h-11 rounded-xl ${errors.accountName ? 'border-destructive' : ''}`}
                />
                {errors.accountName && <p className="text-xs text-destructive mt-1">{errors.accountName}</p>}
              </div>
            )}
          </>
        )}

        <Button
          type="button"
          onClick={handleVerify}
          disabled={status === 'loading'}
          className="w-full bg-accent hover:bg-accent/90 text-white rounded-xl h-11 font-semibold"
        >
          {status === 'loading' ? (
            <>
              <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> Verifying...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" /> Verify & Add Channel
            </>
          )}
        </Button>
      </div>

      {status === 'error' && verificationError && (
        <div className="p-4 rounded-2xl border border-destructive/25 bg-destructive/8 space-y-3">
          <div className="flex gap-3">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-destructive">{verificationError.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{verificationError.explanation}</p>
            </div>
          </div>
          <ul className="space-y-1 pl-7">
            {verificationError.resolution.map((step, i) => (
              <li key={i} className="text-xs text-muted-foreground list-disc">{step}</li>
            ))}
          </ul>
          {verificationError.action && (
            <a
              href={verificationError.action.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent pl-7"
            >
              {verificationError.action.label} <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {channels.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active channels</p>
          {channels.map((channel, i) => (
            <div key={i} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/10">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  {channel.type === 'bank' ? <Building2 className="w-3.5 h-3.5 text-emerald-600" /> : <Smartphone className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{channel.account}</p>
                  <p className="text-xs text-muted-foreground uppercase truncate">{channel.type} · {channel.number}</p>
                </div>
              </div>
              {onRemove && (
                <button onClick={() => onRemove(i)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
