'use client'

import { useState, useEffect } from 'react'
import { Receipt, CheckCircle2, Clock, Building2, Smartphone, BadgeCheck } from 'lucide-react'
import { generateDemoPayments, DemoPayment } from '@/lib/demo/demoData'

interface DemoPaymentsPageProps {
  demoName: string
  demoRole: 'tenant' | 'landlord'
}

const MONTHS = [
  { label: 'June 2026', value: '2026-06' },
  { label: 'May 2026', value: '2026-05' },
  { label: 'April 2026', value: '2026-04' },
]

export default function DemoPaymentsPage({ demoName, demoRole }: DemoPaymentsPageProps) {
  const [payments, setPayments] = useState<DemoPayment[]>([])
  const [activeMonth, setActiveMonth] = useState(MONTHS[0].value)
  const [showPayModal, setShowPayModal] = useState(false)
  const [paying, setPaying] = useState(false)
  const [paid, setPaid] = useState(false)

  useEffect(() => {
    setPayments(generateDemoPayments(demoRole, demoName))
  }, [demoRole, demoName])

  const formatMoney = (n: number) => `KES ${n.toLocaleString('en-KE')}`
  const monthPayments = payments.filter(p => p.payment_month === activeMonth)
  const totalCollected = monthPayments.reduce((s, p) => s + p.amount, 0)
  const myPayment = payments.find(p => p.tenant_name === demoName && p.payment_month === activeMonth)
  const rentAmount = 18000

  const handleDemoPay = () => {
    setPaying(true)
    setTimeout(() => {
      const newPayment: DemoPayment = {
        id: `demo-payment-paid-${Date.now()}`,
        amount: rentAmount,
        mpesa_code: `R${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        payment_month: activeMonth,
        payment_date: new Date().toISOString(),
        status: 'confirmed',
        payment_method: 'mpesa',
        tenant_name: demoName,
      }
      setPayments(prev => [...prev, newPayment])
      setPaying(false)
      setPaid(true)
      setTimeout(() => {
        setShowPayModal(false)
        setPaid(false)
      }, 2500)
    }, 2000)
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="p-5 sm:p-8 space-y-6 max-w-4xl mx-auto w-full">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {demoRole === 'landlord' ? 'Rent Ledger' : 'My Payments'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {demoRole === 'landlord'
              ? `${monthPayments.length} payments this month`
              : myPayment ? '✓ Paid this month' : '⏳ Payment due this month'}
          </p>
        </div>

        {demoRole === 'landlord' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-emerald-50 border border-border rounded-2xl p-4">
              <Building2 className="w-4 h-4 text-emerald-600 mb-2" />
              <p className="text-lg font-bold text-foreground">{formatMoney(totalCollected)}</p>
              <p className="text-xs text-muted-foreground">Collected</p>
            </div>
            <div className="bg-blue-50 border border-border rounded-2xl p-4">
              <Receipt className="w-4 h-4 text-blue-600 mb-2" />
              <p className="text-lg font-bold text-foreground">{monthPayments.length}</p>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </div>
          </div>
        )}

        {demoRole === 'tenant' && (
          <div className={`rounded-2xl border p-5 ${myPayment ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${myPayment ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                {myPayment ? <BadgeCheck className="w-5 h-5 text-emerald-600" /> : <Clock className="w-5 h-5 text-amber-900" />}
              </div>
              <div>
                <p className={`font-bold ${myPayment ? 'text-emerald-700' : 'text-amber-900'}`}>
                  {myPayment ? 'Rent Paid ✅' : 'Rent Due ⏳'}
                </p>
                <p className="text-xs text-muted-foreground">{MONTHS.find(m => m.value === activeMonth)?.label}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="font-bold text-foreground">{formatMoney(rentAmount)}</p>
                <p className="text-xs text-muted-foreground">monthly rent</p>
              </div>
            </div>

            {myPayment && (
              <div className="bg-white/60 rounded-xl p-3 space-y-1">
                <p className="text-xs text-foreground">M-Pesa Code: <span className="font-bold font-mono">{myPayment.mpesa_code}</span></p>
              </div>
            )}

            {!myPayment && (
              <button
                onClick={() => setShowPayModal(true)}
                className="w-full mt-3 bg-accent hover:bg-accent/90 text-white rounded-xl h-12 gap-2 font-semibold flex items-center justify-center shadow-md shadow-accent/20"
              >
                <Smartphone className="w-4 h-4" />
                Complete Payment
              </button>
            )}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1">
          {MONTHS.map(m => (
            <button
              key={m.value}
              onClick={() => setActiveMonth(m.value)}
              className={`text-xs px-3.5 py-2 rounded-xl border whitespace-nowrap font-medium ${
                activeMonth === m.value ? 'bg-accent text-white border-accent' : 'border-border text-muted-foreground'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">Payment Records</h3>
          </div>
          {monthPayments.length === 0 ? (
            <div className="text-center py-16">
              <Receipt className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-semibold text-foreground">No payments this month</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {monthPayments.map(p => (
                <div key={p.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0 text-lg">📱</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{formatMoney(p.amount)}</p>
                      <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded-lg text-accent">{p.mpesa_code}</span>
                    </div>
                    {demoRole === 'landlord' && (
                      <p className="text-xs text-muted-foreground mt-0.5">{p.tenant_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(p.payment_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> CONFIRMED
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-2xl p-6 max-w-sm w-full">
            {paid ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-accent" />
                </div>
                <p className="font-bold text-foreground text-lg">Payment Confirmed! 🎉</p>
                <p className="text-sm text-muted-foreground mt-2">This is a demo — no real payment was made.</p>
              </div>
            ) : (
              <>
                <h3 className="font-bold text-foreground mb-2">Demo M-Pesa Payment</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This simulates an STK push for {formatMoney(rentAmount)}. No real charge occurs.
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setShowPayModal(false)} className="flex-1 border border-border rounded-xl py-2.5 text-sm">
                    Cancel
                  </button>
                  <button
                    onClick={handleDemoPay}
                    disabled={paying}
                    className="flex-1 bg-accent text-white rounded-xl py-2.5 text-sm font-medium"
                  >
                    {paying ? 'Sending...' : 'Simulate Pay'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}