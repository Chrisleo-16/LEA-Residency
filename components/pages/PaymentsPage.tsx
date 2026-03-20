'use client'

import { useState, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  CheckCircle2, Clock, AlertTriangle, Plus,
  X, Phone, CreditCard, Building2,
  TrendingUp, Users, Calendar, Receipt,
  ChevronDown, Pencil, Trash2, Search,
  BadgeCheck, Info
} from 'lucide-react'

const TZ = 'Africa/Nairobi'
const toUTC = (s: string) => new Date(s.endsWith('Z') ? s : s + 'Z')

interface Payment {
  id: string
  tenant_id: string
  amount: number
  phone_number: string | null
  mpesa_code: string | null
  account_number: string | null
  payment_month: string
  payment_date: string
  status: string
  payment_method: string
  notes: string | null
  logged_by: string
  profiles?: { full_name: string; email: string }
}

interface RentSetting {
  tenant_id: string
  monthly_amount: number
  due_day: number
  unit_number: string | null
  profiles?: { full_name: string; email: string; avatar_url: string | null }
}

interface PaymentsPageProps {
  user: User | null
}

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date()
  d.setMonth(d.getMonth() - i)
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: TZ })
    .replace(' ', ' ') + '|' + `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})

export default function PaymentsPage({ user }: PaymentsPageProps) {
  const [role, setRole] = useState<string | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [rentSettings, setRentSettings] = useState<RentSetting[]>([])
  const [tenants, setTenants] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeMonth, setActiveMonth] = useState(MONTHS[0].split('|')[1])
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Manual log form states — landlord
  const [showLogForm, setShowLogForm] = useState(false)
  const [logTenantId, setLogTenantId] = useState('')
  const [logAmount, setLogAmount] = useState('')
  const [logMpesaCode, setLogMpesaCode] = useState('')
  const [logPhone, setLogPhone] = useState('')
  const [logMethod, setLogMethod] = useState('mpesa')
  const [logMonth, setLogMonth] = useState(MONTHS[0].split('|')[1])
  const [logNotes, setLogNotes] = useState('')
  const [isLogging, setIsLogging] = useState(false)

  // Rent settings form
  const [showSettingsForm, setShowSettingsForm] = useState(false)
  const [settingsTenantId, setSettingsTenantId] = useState('')
  const [settingsAmount, setSettingsAmount] = useState('')
  const [settingsUnit, setSettingsUnit] = useState('')
  const [isSavingSettings, setIsSavingSettings] = useState(false)

  const showFeedback = (msg: string, isError = false) => {
    if (isError) setError(msg); else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 5000)
  }

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user!.id).single()
    setRole(profile?.role || null)

    if (profile?.role === 'landlord') {
      // Fetch all payments
      const { data: pays } = await supabase
        .from('payments')
        .select('*, profiles(full_name, email)')
        .order('payment_date', { ascending: false })
      setPayments(pays || [])

      // Fetch all tenants
      const { data: tList } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('role', 'tenant')
      setTenants(tList || [])

      // Fetch rent settings
      const { data: rs } = await supabase
        .from('rent_settings')
        .select('*, profiles(full_name, email, avatar_url)')
      setRentSettings(rs || [])

    } else {
      // Tenant — own payments only
      const { data: pays } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', user!.id)
        .order('payment_date', { ascending: false })
      setPayments(pays || [])

      const { data: rs } = await supabase
        .from('rent_settings')
        .select('*')
        .eq('tenant_id', user!.id)
        .maybeSingle()
      if (rs) setRentSettings([rs])
    }

    setIsLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) return
    fetchData()

    const channel = supabase
      .channel('payments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rent_settings' }, () => fetchData())
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [user, fetchData])

  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!logTenantId || !logAmount) return
    setIsLogging(true)
    try {
      // Check for duplicate M-Pesa code
      if (logMpesaCode) {
        const { data: existing } = await supabase
          .from('payments').select('id').eq('mpesa_code', logMpesaCode.toUpperCase()).maybeSingle()
        if (existing) throw new Error('This M-Pesa code has already been recorded.')
      }

      const { error } = await supabase.from('payments').insert({
        tenant_id: logTenantId,
        landlord_id: user!.id,
        amount: parseFloat(logAmount),
        phone_number: logPhone || null,
        mpesa_code: logMpesaCode ? logMpesaCode.toUpperCase() : null,
        payment_month: logMonth,
        payment_method: logMethod,
        notes: logNotes || null,
        logged_by: 'landlord',
        status: 'confirmed',
      })
      if (error) throw error

      showFeedback('Payment logged successfully!')
      setLogTenantId(''); setLogAmount(''); setLogMpesaCode('')
      setLogPhone(''); setLogNotes(''); setShowLogForm(false)
      fetchData()
    } catch (err: any) { showFeedback(err.message, true) }
    finally { setIsLogging(false) }
  }

  const handleSaveRentSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settingsTenantId || !settingsAmount) return
    setIsSavingSettings(true)
    try {
      const { error } = await supabase
        .from('rent_settings')
        .upsert({
          tenant_id: settingsTenantId,
          monthly_amount: parseFloat(settingsAmount),
          unit_number: settingsUnit || null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'tenant_id' })
      if (error) throw error
      showFeedback('Rent settings saved!')
      setShowSettingsForm(false)
      fetchData()
    } catch (err: any) { showFeedback(err.message, true) }
    finally { setIsSavingSettings(false) }
  }

  const handleDeletePayment = async (id: string) => {
    await supabase.from('payments').delete().eq('id', id)
    showFeedback('Payment record deleted.')
    fetchData()
  }

  const formatDate = (s: string) =>
    toUTC(s).toLocaleDateString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: TZ,
    })

  const formatMoney = (n: number) =>
    `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0 })}`

  const currentMonthPayments = payments.filter(p => p.payment_month === activeMonth)

  const getStatusBadge = (paid: boolean, dueDay: number) => {
    const now = new Date()
    const day = parseInt(now.toLocaleDateString('en-GB', { day: 'numeric', timeZone: TZ }))
    if (paid) return { label: 'PAID', style: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3 h-3" /> }
    if (day > dueDay) return { label: 'OVERDUE', style: 'bg-red-100 text-red-700 border-red-200', icon: <AlertTriangle className="w-3 h-3" /> }
    return { label: 'PENDING', style: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock className="w-3 h-3" /> }
  }

  // ── Stats ────────────────────────────────────────────
  const totalCollected = currentMonthPayments.reduce((s, p) => s + Number(p.amount), 0)
  const paidTenantIds = new Set(currentMonthPayments.map(p => p.tenant_id))
  const totalTenants = tenants.length
  const paidCount = paidTenantIds.size
  const unpaidCount = totalTenants - paidCount

  // ── Tenant's own rent setting ─────────────────────────
  const myRentSetting = rentSettings.find(r => r.tenant_id === user?.id)
  const myCurrentMonthPaid = payments.some(
    p => p.tenant_id === user?.id && p.payment_month === activeMonth
  )
  const myCurrentPayment = payments.find(
    p => p.tenant_id === user?.id && p.payment_month === activeMonth
  )

  const filteredPayments = currentMonthPayments.filter(p => {
    if (!searchQuery) return true
    const name = p.profiles?.full_name?.toLowerCase() || ''
    const code = p.mpesa_code?.toLowerCase() || ''
    return name.includes(searchQuery.toLowerCase()) || code.includes(searchQuery.toLowerCase())
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="p-5 sm:p-8 space-y-6 max-w-4xl mx-auto w-full">

        {/* ── Header ──────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {role === 'landlord' ? 'Rent Ledger' : 'My Payments'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {role === 'landlord'
                ? `${paidCount}/${totalTenants} tenants paid this month`
                : myCurrentMonthPaid
                  ? <span className="text-emerald-600 font-medium">✓ Paid this month</span>
                  : <span className="text-amber-600 font-medium">⏳ Payment due this month</span>
              }
            </p>
          </div>
          {role === 'landlord' && (
            <div className="flex gap-2">
              <Button
                onClick={() => setShowSettingsForm(!showSettingsForm)}
                variant="outline"
                className="border-border rounded-xl h-10 gap-2 text-sm"
              >
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Set Rent</span>
              </Button>
              <Button
                onClick={() => setShowLogForm(!showLogForm)}
                className="bg-accent hover:bg-accent/90 text-white rounded-xl shadow-md shadow-accent/20 h-10 gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Log Payment</span>
              </Button>
            </div>
          )}
        </div>

        {/* ── Feedback ────────────────────────────────── */}
        {error && (
          <div className="p-4 bg-destructive/8 border border-destructive/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl dark:bg-emerald-950/20 dark:border-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{success}</p>
          </div>
        )}

        {/* ── LANDLORD: Stats cards ────────────────────── */}
        {role === 'landlord' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Collected', value: formatMoney(totalCollected), icon: <TrendingUp className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
              { label: 'Paid', value: `${paidCount} tenants`, icon: <CheckCircle2 className="w-4 h-4" />, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
              { label: 'Pending', value: `${unpaidCount} tenants`, icon: <Clock className="w-4 h-4" />, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20' },
              { label: 'Transactions', value: currentMonthPayments.length, icon: <Receipt className="w-4 h-4" />, color: 'text-accent', bg: 'bg-accent/5' },
            ].map(stat => (
              <div key={stat.label} className={`${stat.bg} border border-border rounded-2xl p-4`}>
                <div className={`${stat.color} mb-2`}>{stat.icon}</div>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── TENANT: Payment status card ─────────────── */}
        {role === 'tenant' && (
          <div className={`rounded-2xl border p-5 ${
            myCurrentMonthPaid
              ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800'
              : 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                myCurrentMonthPaid ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-amber-100 dark:bg-amber-900/40'
              }`}>
                {myCurrentMonthPaid
                  ? <BadgeCheck className="w-5 h-5 text-emerald-600" />
                  : <Clock className="w-5 h-5 text-amber-900" />
                }
              </div>
              <div>
                <p className={`font-bold text-base ${myCurrentMonthPaid ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-900 dark:text-amber-900'}`}>
                  {myCurrentMonthPaid ? 'Rent Paid ✅' : 'Rent Due ⏳'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {MONTHS.find(m => m.split('|')[1] === activeMonth)?.split('|')[0]}
                </p>
              </div>
              {myRentSetting && (
                <div className="ml-auto text-right">
                  <p className="font-bold text-foreground">{formatMoney(myRentSetting.monthly_amount)}</p>
                  <p className="text-xs text-muted-foreground">monthly rent</p>
                </div>
              )}
            </div>

            {myCurrentPayment && (
              <div className="bg-white/60 dark:bg-black/20 rounded-xl p-3 space-y-1">
                {myCurrentPayment.mpesa_code && (
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-xs text-foreground">
                      M-Pesa Code: <span className="font-bold font-mono">{myCurrentPayment.mpesa_code}</span>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground">
                    Amount: <span className="font-bold">{formatMoney(Number(myCurrentPayment.amount))}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">{formatDate(myCurrentPayment.payment_date)}</span>
                </div>
              </div>
            )}

            {!myCurrentMonthPaid && (
              <div className="mt-3 p-3 bg-white/60 dark:bg-black/20 rounded-xl">
                <p className="text-xs font-semibold text-foreground mb-2">How to pay:</p>
                <div className="space-y-1">
                  {[
                    '📱 Open M-Pesa on your phone',
                    '🔢 Go to Paybill → Enter 400200',
                    '🏦 Account Number: 1060544',
                    `💰 Amount: ${myRentSetting ? formatMoney(myRentSetting.monthly_amount) : 'your monthly rent'}`,
                    '✅ Enter PIN and confirm',
                  ].map(s => (
                    <p key={s} className="text-xs text-muted-foreground">{s}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Month selector ───────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {MONTHS.slice(0, 6).map(m => {
            const [label, value] = m.split('|')
            return (
              <button
                key={value}
                onClick={() => setActiveMonth(value)}
                className={`text-xs px-3.5 py-2 rounded-xl border whitespace-nowrap transition-all shrink-0 font-medium ${
                  activeMonth === value
                    ? 'bg-accent text-white border-accent shadow-sm shadow-accent/20'
                    : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        {/* ── LANDLORD: Set Rent Settings Form ────────── */}
        {role === 'landlord' && showSettingsForm && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Set Tenant Rent Amount</h3>
              <button onClick={() => setShowSettingsForm(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveRentSettings} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Tenant</label>
                <select
                  value={settingsTenantId}
                  onChange={e => {
                    setSettingsTenantId(e.target.value)
                    const existing = rentSettings.find(r => r.tenant_id === e.target.value)
                    if (existing) {
                      setSettingsAmount(String(existing.monthly_amount))
                      setSettingsUnit(existing.unit_number || '')
                    } else {
                      setSettingsAmount(''); setSettingsUnit('')
                    }
                  }}
                  required
                  className="w-full rounded-xl border border-border bg-secondary text-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">Select tenant...</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name} — {t.email}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Monthly Rent (KES)</label>
                  <Input
                    type="number" placeholder="e.g. 18000"
                    value={settingsAmount} onChange={e => setSettingsAmount(e.target.value)}
                    required className="bg-secondary border-border text-foreground rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Unit / House No.</label>
                  <Input
                    placeholder="e.g. A3, B12"
                    value={settingsUnit} onChange={e => setSettingsUnit(e.target.value)}
                    className="bg-secondary border-border text-foreground rounded-xl h-11"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setShowSettingsForm(false)} className="flex-1 rounded-xl border-border">Cancel</Button>
                <Button type="submit" disabled={isSavingSettings} className="flex-1 bg-accent hover:bg-accent/90 text-white rounded-xl shadow-sm shadow-accent/20">
                  {isSavingSettings ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── LANDLORD: Log Payment Form ───────────────── */}
        {role === 'landlord' && showLogForm && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground">Log Payment Manually</h3>
              </div>
              <button onClick={() => setShowLogForm(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogPayment} className="space-y-4">
              {/* Tenant */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Tenant</label>
                <select
                  value={logTenantId}
                  onChange={e => {
                    setLogTenantId(e.target.value)
                    const rs = rentSettings.find(r => r.tenant_id === e.target.value)
                    if (rs) setLogAmount(String(rs.monthly_amount))
                  }}
                  required
                  className="w-full rounded-xl border border-border bg-secondary text-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">Select tenant...</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name} — {t.email}</option>
                  ))}
                </select>
              </div>

              {/* Amount + Month */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Amount (KES)</label>
                  <Input
                    type="number" placeholder="e.g. 18000"
                    value={logAmount} onChange={e => setLogAmount(e.target.value)}
                    required className="bg-secondary border-border text-foreground rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Payment Month</label>
                  <select
                    value={logMonth} onChange={e => setLogMonth(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary text-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 h-11"
                  >
                    {MONTHS.map(m => {
                      const [label, value] = m.split('|')
                      return <option key={value} value={value}>{label}</option>
                    })}
                  </select>
                </div>
              </div>

              {/* Method */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-2">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'mpesa', label: 'M-Pesa', icon: '📱' },
                    { value: 'bank', label: 'Bank Transfer', icon: '🏦' },
                    { value: 'other', label: 'Other', icon: '💵' },
                  ].map(m => (
                    <button
                      key={m.value} type="button" onClick={() => setLogMethod(m.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all ${
                        logMethod === m.value
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      <span className="text-lg">{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* M-Pesa specific */}
              {logMethod === 'mpesa' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">M-Pesa Code</label>
                    <Input
                      placeholder="e.g. RGR000X1234"
                      value={logMpesaCode}
                      onChange={e => setLogMpesaCode(e.target.value.toUpperCase())}
                      className="bg-secondary border-border text-foreground rounded-xl h-11 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">Phone Number</label>
                    <Input
                      placeholder="e.g. 0712345678"
                      value={logPhone} onChange={e => setLogPhone(e.target.value)}
                      className="bg-secondary border-border text-foreground rounded-xl h-11"
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Notes <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <Input
                  placeholder="e.g. Includes water bill, partial payment..."
                  value={logNotes} onChange={e => setLogNotes(e.target.value)}
                  className="bg-secondary border-border text-foreground rounded-xl h-11"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setShowLogForm(false)} className="flex-1 rounded-xl border-border">Cancel</Button>
                <Button type="submit" disabled={isLogging} className="flex-1 bg-accent hover:bg-accent/90 text-white rounded-xl shadow-sm shadow-accent/20">
                  {isLogging ? 'Logging...' : 'Log Payment'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── LANDLORD: Tenant payment status grid ────── */}
        {role === 'landlord' && tenants.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground text-sm">
                Tenant Status — {MONTHS.find(m => m.split('|')[1] === activeMonth)?.split('|')[0]}
              </h3>
            </div>
            <div className="divide-y divide-border">
              {tenants.map(tenant => {
                const paid = currentMonthPayments.filter(p => p.tenant_id === tenant.id)
                const rs = rentSettings.find(r => r.tenant_id === tenant.id)
                const isPaid = paid.length > 0
                const totalPaid = paid.reduce((s, p) => s + Number(p.amount), 0)
                const badge = getStatusBadge(isPaid, rs?.due_day || 5)

                return (
                  <div key={tenant.id} className="p-4 flex items-center gap-3 hover:bg-secondary/20 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0 overflow-hidden border border-accent/20">
                      {tenant.avatar_url
                        ? <img src={tenant.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-sm font-bold text-accent">{tenant.full_name?.charAt(0).toUpperCase()}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{tenant.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {rs ? `${formatMoney(rs.monthly_amount)} /mo${rs.unit_number ? ` · Unit ${rs.unit_number}` : ''}` : 'Rent not set'}
                      </p>
                      {isPaid && paid[0]?.mpesa_code && (
                        <p className="text-[10px] font-mono text-accent mt-0.5">{paid[0].mpesa_code}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.style}`}>
                        {badge.icon}
                        {badge.label}
                      </span>
                      {isPaid && (
                        <span className="text-xs font-semibold text-foreground">{formatMoney(totalPaid)}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Payment history ──────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3 gap-3">
            <h3 className="font-semibold text-foreground">
              {role === 'landlord' ? 'Payment Records' : 'Payment History'}
            </h3>
            {role === 'landlord' && (
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  placeholder="Search by name or code..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/40"
                />
              </div>
            )}
          </div>

          {filteredPayments.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-2xl">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                <Receipt className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="font-semibold text-foreground">No payments this month</p>
              <p className="text-sm text-muted-foreground mt-1">
                {role === 'landlord' ? 'Log a payment above or wait for M-Pesa callback' : 'Pay via M-Pesa Paybill 400200'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPayments.map(payment => (
                <div key={payment.id} className="bg-card border border-border rounded-2xl p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-3">
                    {/* Method icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${
                      payment.payment_method === 'mpesa' ? 'bg-green-50 dark:bg-green-950/20' : 'bg-blue-50 dark:bg-blue-950/20'
                    }`}>
                      {payment.payment_method === 'mpesa' ? '📱' : payment.payment_method === 'bank' ? '🏦' : '💵'}
                    </div>

                    <div className="flex-1 min-w-0">
                      {role === 'landlord' && payment.profiles && (
                        <p className="text-xs text-muted-foreground mb-0.5">
                          <span className="font-semibold text-foreground">{payment.profiles.full_name}</span>
                          {' · '}{payment.profiles.email}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-base font-bold text-foreground">{formatMoney(Number(payment.amount))}</p>
                        {payment.mpesa_code && (
                          <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded-lg text-accent border border-accent/20">
                            {payment.mpesa_code}
                          </span>
                        )}
                        {payment.logged_by === 'landlord' && (
                          <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full border border-border">
                            manual
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {payment.phone_number && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {payment.phone_number}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(payment.payment_date)}
                        </span>
                      </div>
                      {payment.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{payment.notes}</p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        CONFIRMED
                      </span>
                      {role === 'landlord' && (
                        <button
                          onClick={() => handleDeletePayment(payment.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── TENANT: Paybill info banner ──────────────── */}
        {role === 'tenant' && (
          <div className="bg-card border border-accent/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground">Payment Details</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Paybill', value: '400200' },
                { label: 'Account', value: '1060544' },
                { label: 'Name', value: 'Leo Evans Aunga' },
              ].map(item => (
                <div key={item.label} className="bg-secondary rounded-xl p-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
                  <p className="text-sm font-bold text-foreground font-mono">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {[
                '✅ Pay between 1st and 5th of every month',
                '✅ Water bill must be paid together with rent',
                '❌ Cash and cheque payments not accepted',
                '📋 Always save your M-Pesa confirmation SMS',
                '⚠️ Late payments attract a 10% penalty',
              ].map(tip => (
                <p key={tip} className="text-xs text-muted-foreground">{tip}</p>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// RIGHT NOW — Manual Flow:
//   1. Tenant pays via M-Pesa Paybill 400200 normally
//   2. Tenant sends landlord their M-Pesa code via chat
//   3. Landlord opens app → Payments → Log Payment
//   4. Enters: tenant name, amount, M-Pesa code, month
//   5. Clicks "Log Payment"
//   6. Tenant's app INSTANTLY shows "Rent Paid ✅"
//      with their M-Pesa code + amount + date