'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Smartphone, 
  Loader2, 
  CheckCircle2, 
  X, 
  Droplets, 
  Home, 
  Wrench, 
  Hammer, 
  PaintBucket, 
  Zap, 
  Shield,
  Package,
  AlertCircle,
  Building2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ChargePlanItem {
  charge_type: string
  label: string
  amount: number | null
  is_variable: boolean
  is_active: boolean
  priority: number
  tenant_can_enter: boolean
  pay_separately?: boolean
}

interface PayButtonProps {
  user: User | null
  amount: number
  month: string
  onSuccess: () => void
  onError: (msg: string) => void
  disabled?: boolean
  /** Called after tenant acknowledges Pochi manual pay — parent should show SMS paste card */
  onManualAwaitingCode?: (payment: { id: string; amount: number; month: string }) => void
  /** Pay only these charge types (separate water/garbage/electricity) */
  focusChargeTypes?: string[]
  buttonLabel?: string
}

const REPAIR_SERVICES = [
  { id: 'plumbing', name: 'Plumbing Services', description: 'Pipe repairs, leaks, installations', icon: <Droplets className="w-4 h-4" />, basePrice: 1500 },
  { id: 'electrical', name: 'Electrical Work', description: 'Wiring, fixtures, repairs', icon: <Zap className="w-4 h-4" />, basePrice: 2000 },
  { id: 'general', name: 'General Repairs', description: 'Maintenance, fixtures, fittings', icon: <Wrench className="w-4 h-4" />, basePrice: 1000 },
  { id: 'painting', name: 'Painting & Decorating', description: 'Wall painting, touch-ups', icon: <PaintBucket className="w-4 h-4" />, basePrice: 3000 },
  { id: 'carpentry', name: 'Carpentry Work', description: 'Woodwork, cabinets, repairs', icon: <Hammer className="w-4 h-4" />, basePrice: 2500 },
  { id: 'security', name: 'Security Services', description: 'Locks, security systems', icon: <Shield className="w-4 h-4" />, basePrice: 1800 },
  { id: 'delivery', name: 'Package Delivery', description: 'Package handling, delivery', icon: <Package className="w-4 h-4" />, basePrice: 500 },
  { id: 'custom', name: 'Custom Service', description: 'Other specialized services', icon: <AlertCircle className="w-4 h-4" />, basePrice: 0 }
]

export default function PayButton({
  user,
  amount,
  month,
  onSuccess,
  onError,
  disabled = false,
  onManualAwaitingCode,
  focusChargeTypes,
  buttonLabel,
}: PayButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [phone, setPhone] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)
  
  // Enhanced payment states
  const [paymentType, setPaymentType] = useState<'rent' | 'repairs'>('rent')
  const [rentAmount, setRentAmount] = useState(amount)
  const [waterBill, setWaterBill] = useState(0)
  const [selectedService, setSelectedService] = useState('')
  const [customServiceAmount, setCustomServiceAmount] = useState('')
  const [serviceDescription, setServiceDescription] = useState('')
  const [chargePlan, setChargePlan] = useState<ChargePlanItem[]>([])
  const [allowAdvanceMonths, setAllowAdvanceMonths] = useState(0)
  const [advanceExtra, setAdvanceExtra] = useState(0) // additional months beyond current (0..allow)
  const [variableAmounts, setVariableAmounts] = useState<Record<string, number>>({})
  const [openDue, setOpenDue] = useState(amount)

  // Multi-channel states
  const [landlordChannels, setLandlordChannels] = useState<any[]>([])
  const [selectedMethod, setSelectedMethod] = useState<'mpesa' | 'bank'>('mpesa')
  const [selectedChannel, setSelectedChannel] = useState<any>(null)
  const [isLoadingChannels, setIsLoadingChannels] = useState(true)

  const formatMoney = (n: number) => `KES ${n.toLocaleString('en-KE')}`

  const fixedMonthlyTotal = () => {
    const focus = (focusChargeTypes || []).map((t) => t.toLowerCase())
    return chargePlan
      .filter((c) => {
        if (c.pay_separately && focus.length === 0) return false
        if (focus.length && !focus.includes(c.charge_type.toLowerCase()))
          return false
        return !c.is_variable && Number(c.amount) > 0
      })
      .reduce((s, c) => s + Number(c.amount || 0), 0)
  }

  const variableEnteredTotal = () => {
    const focus = (focusChargeTypes || []).map((t) => t.toLowerCase())
    return chargePlan
      .filter((c) => {
        if (c.pay_separately && focus.length === 0) return false
        if (focus.length && !focus.includes(c.charge_type.toLowerCase()))
          return false
        return c.is_variable && c.tenant_can_enter
      })
      .reduce((s, c) => s + Math.max(0, Number(variableAmounts[c.charge_type]) || 0), 0)
  }

  const visiblePlan = () => {
    const focus = (focusChargeTypes || []).map((t) => t.toLowerCase())
    return chargePlan.filter((c) => {
      if (focus.length) return focus.includes(c.charge_type.toLowerCase())
      return !c.pay_separately
    })
  }

  const getTotalAmount = () => {
    if (paymentType === 'rent') {
      if (focusChargeTypes?.length) {
        const base = Math.max(0, Number(amount) || 0)
        return Math.max(0, Math.round((base + variableEnteredTotal()) * 100) / 100)
      }
      if (visiblePlan().length > 0 || chargePlan.length > 0) {
        const baseCurrent =
          openDue > 0
            ? openDue + variableEnteredTotal()
            : fixedMonthlyTotal() + variableEnteredTotal()
        const advancePortion = advanceExtra * fixedMonthlyTotal()
        return Math.max(0, Math.round((baseCurrent + advancePortion) * 100) / 100)
      }
      return Math.max(0, rentAmount) + Math.max(0, waterBill)
    }
    const service = REPAIR_SERVICES.find((s) => s.id === selectedService)
    const baseAmount = service?.basePrice ?? 0
    const customAmount = Math.max(0, parseFloat(customServiceAmount) || 0)
    return Math.max(0, baseAmount + customAmount)
  }

  const buildVariablePayload = () => {
    const out: Record<string, number> = {}
    for (const c of chargePlan) {
      if (!c.is_variable || !c.tenant_can_enter) continue
      const v = Math.max(0, Number(variableAmounts[c.charge_type]) || 0)
      if (v > 0) out[c.charge_type] = v
    }
    // legacy waterBill fallback
    if (!out.water && waterBill > 0) out.water = waterBill
    return out
  }

  /** Pochi la Biashara / unverified tills cannot receive STK — tenants pay manually. */
  const isManualMpesaChannel = (channel: any | null) =>
    !!channel &&
    channel.payment_type !== 'bank' &&
    !channel.payhero_channel_id

  const channelMethodLabel = (channel: any) => {
    if (channel.payment_type === 'bank') return 'PesaLink Bank Transfer'
    if (isManualMpesaChannel(channel)) return 'Pochi la Biashara (manual)'
    return `M-Pesa ${channel.payment_type}`
  }

  const channelDestinationLabel = (channel: any) => {
    if (channel.payment_type === 'bank') {
      return `${channel.bank_name} · Acc: ${channel.bank_account_number}`
    }
    if (isManualMpesaChannel(channel)) {
      return `Pochi la Biashara: ${channel.paybill_number}`
    }
    return `${channel.payment_type.toUpperCase()}: ${channel.paybill_number} · Acc: ${channel.account_name}`
  }

  const handlePay = async () => {
    const totalAmount = getTotalAmount()
    if (totalAmount <= 0) {
      onError('Payment amount must be greater than 0')
      return
    }

    if (isManualMpesaChannel(selectedChannel)) {
      onError(
        `This landlord uses Pochi la Biashara (${selectedChannel.paybill_number}). Pay manually via M-Pesa → Pochi la Biashara, then share your M-Pesa code with your landlord.`,
      )
      return
    }

    if (selectedMethod === 'mpesa') {
      if (!phone || phone.length < 9) {
        onError('Enter a valid M-Pesa phone number')
        return
      }
    } else {
      if (!selectedChannel) {
        onError('Please select a bank account to pay to.')
        return
      }
    }

    setIsSending(true)
    try {
      const vars = buildVariablePayload()
      const paymentData = {
        amount: totalAmount,
        phone,
        tenantId: user?.id,
        month,
        paymentType,
        channelId: selectedChannel?.payhero_channel_id,
        reference: `${paymentType.toUpperCase()}-${user?.id}-${month}`,
        ...(paymentType === 'rent' && {
          rentAmount: fixedMonthlyTotal() || rentAmount,
          waterBill: vars.water || 0,
          variableAmounts: vars,
          advanceMonths: focusChargeTypes?.length ? 0 : advanceExtra,
          onlyChargeTypes: focusChargeTypes || undefined,
        }),
        ...(paymentType === 'repairs' && { 
          serviceId: selectedService,
          serviceDescription,
          customAmount: parseFloat(customServiceAmount) || 0
        }),
        ...(selectedMethod === 'bank' && {
          bankAccount: selectedChannel.bank_account_number,
          bankCode: selectedChannel.bank_shortcode
        })
      }

      const endpoint = selectedMethod === 'mpesa' ? '/api/mpesa/stkpush' : '/api/payments/pesalink'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Payment failed')

      setSent(true)
      onSuccess()
      setTimeout(() => {
        setShowModal(false)
        setSent(false)
        setPhone('')
        setPaymentType('rent')
        setRentAmount(amount)
        setWaterBill(0)
        setSelectedService('')
        setCustomServiceAmount('')
        setServiceDescription('')
      }, 4000)
    } catch (err: any) {
      onError(err.message)
    } finally {
      setIsSending(false)
    }
  }

 const openModal = async () => {
  if (disabled) return
  setShowModal(true)
  setIsLoadingChannels(true)
  setLandlordChannels([])
  setSelectedChannel(null)
  setAdvanceExtra(0)
  setVariableAmounts({})

  try {
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone_number')
        .eq('id', user.id)
        .single()
      if (profile?.phone_number) setPhone(profile.phone_number)

      // Load charge plan + open due for bill-driven pay
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        const accRes = await fetch('/api/tenancy/account?generate=1', {
          credentials: 'include',
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {},
        })
        if (accRes.ok) {
          const acc = await accRes.json()
          setChargePlan(acc.chargePlan || [])
          setAllowAdvanceMonths(
            focusChargeTypes?.length
              ? 0
              : Math.min(3, Math.max(0, Number(acc.paymentRules?.allowAdvanceMonths) || 0))
          )
          setOpenDue(
            focusChargeTypes?.length
              ? Number(amount) || 0
              : Number(acc.rentDue ?? acc.totalDue) || amount
          )
          const rentLine = (acc.chargePlan || []).find(
            (c: ChargePlanItem) => c.charge_type === 'rent'
          )
          if (rentLine?.amount) setRentAmount(Number(rentLine.amount))
        }
      } catch (e) {
        console.warn('charge plan load', e)
        setOpenDue(amount)
      }
    }

    const { data: slot } = await supabase
      .from('tenant_slots')
      .select('landlord_block_id')
      .eq('tenant_id', user?.id)
      .maybeSingle()

    if (slot?.landlord_block_id) {
      const { data: landlord } = await supabase
        .from('profiles')
        .select('id')
        .eq('landlord_block_id', slot.landlord_block_id)
        .eq('role', 'landlord')
        .maybeSingle()

      if (landlord?.id) {
        const { data: channels } = await supabase
          .from('landlord_payment_settings')
          .select('*')
          .eq('landlord_id', landlord.id)
          .eq('verified', true)

        if (channels && channels.length > 0) {
          const rentChannels = channels.filter((c: any) => {
            if (c.is_wifi) return false
            const name = String(c.account_name || '').toLowerCase()
            return !name.includes('wifi') && !name.includes('wi-fi')
          })
          setLandlordChannels(rentChannels)
          const mpesa = rentChannels.find(
            (c: any) => c.payment_type === 'paybill' || c.payment_type === 'till'
          )
          if (mpesa) {
            setSelectedChannel(mpesa)
            setSelectedMethod('mpesa')
          } else if (rentChannels[0]) {
            setSelectedChannel(rentChannels[0])
            setSelectedMethod(
              rentChannels[0].payment_type === 'bank' ? 'bank' : 'mpesa'
            )
          }
        }
      }
    }
  } catch (err) {
    console.error('Error fetching landlord channels:', err)
  } finally {
    setIsLoadingChannels(false)
  }
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
        {buttonLabel || (focusChargeTypes?.length ? 'Pay this fee' : 'Complete Payment')}
      </Button>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl w-full max-w-md sm:max-w-lg p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
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
                    <h3 className="font-bold text-foreground text-xl">Enhanced Payment</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Choose payment type and enter details
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

                {/* Payment Type Toggle */}
                <div className="mb-5">
                  <Label className="text-sm font-medium text-foreground block mb-3">
                    Payment Type
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={paymentType === 'rent' ? 'default' : 'outline'}
                      onClick={() => setPaymentType('rent')}
                      className={`h-10 gap-2 rounded-xl text-xs ${
                        paymentType === 'rent' 
                          ? 'bg-accent text-accent-foreground' 
                          : 'border-border hover:bg-secondary hover:text-accent'
                      }`}
                    >
                      <Home className="w-3 h-3" />
                      Rent & Fees
                    </Button>
                    <Button
                      variant={paymentType === 'repairs' ? 'default' : 'outline'}
                      onClick={() => setPaymentType('repairs')}
                      className={`h-10 gap-2 rounded-xl text-xs ${
                        paymentType === 'repairs' 
                          ? 'bg-accent text-accent-foreground' 
                          : 'border-border hover:bg-secondary hover:text-accent'
                      }`}
                    >
                      <Wrench className="w-3 h-3" />
                      Repairs & Services
                    </Button>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="mb-5 space-y-4">
                  {paymentType === 'rent' ? (
                    <div className="space-y-3">
                      {visiblePlan().length > 0 ? (
                        <>
                          {visiblePlan().map((c) => (
                            <div key={c.charge_type}>
                              <Label className="text-xs font-medium text-foreground block mb-1.5">
                                {c.label}
                                {c.is_variable ? ' (variable)' : ''}
                              </Label>
                              {c.is_variable && c.tenant_can_enter ? (
                                <Input
                                  type="number"
                                  min={0}
                                  step="1"
                                  inputMode="decimal"
                                  value={
                                    variableAmounts[c.charge_type]
                                      ? variableAmounts[c.charge_type]
                                      : ''
                                  }
                                  onChange={(e) => {
                                    const raw = e.target.value
                                    const n =
                                      raw === '' ? 0 : Math.max(0, Number(raw) || 0)
                                    setVariableAmounts((prev) => ({
                                      ...prev,
                                      [c.charge_type]: Math.round(n * 100) / 100,
                                    }))
                                  }}
                                  placeholder="Enter amount"
                                  className="bg-amber-50 border-amber-200 text-center font-semibold"
                                />
                              ) : c.is_variable && !c.tenant_can_enter ? (
                                <p className="text-xs text-muted-foreground rounded-xl border border-dashed border-border p-3">
                                  Awaiting landlord to set this amount
                                </p>
                              ) : (
                                <Input
                                  type="number"
                                  disabled
                                  value={Number(c.amount) || 0}
                                  className="bg-accent/5 border-accent/20 text-center font-bold text-accent"
                                />
                              )}
                            </div>
                          ))}
                          {allowAdvanceMonths > 0 && !focusChargeTypes?.length && (
                            <div>
                              <Label className="text-xs font-medium block mb-1.5">
                                Also pay ahead
                              </Label>
                              <select
                                value={advanceExtra}
                                onChange={(e) =>
                                  setAdvanceExtra(Number(e.target.value))
                                }
                                className="w-full rounded-xl border border-border bg-secondary text-sm p-2.5"
                              >
                                <option value={0}>This month only</option>
                                {Array.from(
                                  { length: allowAdvanceMonths },
                                  (_, i) => i + 1,
                                ).map((n) => (
                                  <option key={n} value={n}>
                                    This month + next {n}
                                  </option>
                                ))}
                              </select>
                              <p className="text-[11px] text-muted-foreground mt-1">
                                Advance covers fixed charges only; variable meters stay
                                per month.
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div>
                            <Label className="text-xs font-medium text-foreground block mb-2">
                              Monthly Rent
                            </Label>
                            <Input
                              type="number"
                              disabled
                              value={rentAmount}
                              className="bg-accent/5 border-accent/20 text-center font-bold text-accent"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-medium text-foreground block mb-2">
                              Water Bill (Optional)
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              value={waterBill === 0 ? '' : waterBill}
                              onChange={(e) => {
                                const n = Number(e.target.value)
                                setWaterBill(
                                  !Number.isFinite(n) || n < 0
                                    ? 0
                                    : Math.round(n * 100) / 100,
                                )
                              }}
                              className="bg-amber-50 border-amber-200 text-center font-semibold"
                              placeholder="0"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium text-foreground block mb-2">
                          Select Service
                        </Label>
                        <RadioGroup value={selectedService} onValueChange={setSelectedService}>
                          <div className="grid gap-2 max-h-32 overflow-y-auto">
                            {REPAIR_SERVICES.slice(0, 4).map((service) => (
                              <Card key={service.id} className="cursor-pointer">
                                <CardContent className="p-3">
                                  <div className="flex items-center gap-2">
                                    <RadioGroupItem value={service.id} id={service.id} className="scale-75" />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-1">
                                        <div className="text-muted-foreground">{service.icon}</div>
                                        <Label htmlFor={service.id} className="text-xs font-medium cursor-pointer">
                                          {service.name}
                                        </Label>
                                      </div>
                                      {service.basePrice && service.basePrice > 0 && (
                                        <p className="text-xs font-semibold text-accent">
                                          {formatMoney(service.basePrice)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </RadioGroup>
                      </div>
                      {selectedService && (
                        <div>
                          <Label className="text-xs font-medium text-foreground block mb-2">
                            Additional Amount (Optional)
                          </Label>
                          <Input
                            type="number"
                            value={customServiceAmount}
                            onChange={(e) => setCustomServiceAmount(e.target.value)}
                            className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                            placeholder="0"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Payment Method Selector */}
                <div className="mb-5">
                  <Label className="text-sm font-medium text-foreground block mb-3">
                    Choose Payment Method
                  </Label>
                  <div className="space-y-2">
                    {isLoadingChannels ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-accent" />
                      </div>
                    ) : landlordChannels.length > 0 ? (
                      landlordChannels.map((channel) => (
                        <Card 
                          key={channel.id} 
                          onClick={() => {
                            setSelectedChannel(channel);
                            setSelectedMethod(channel.payment_type === 'bank' ? 'bank' : 'mpesa');
                          }}
                          className={`cursor-pointer transition-all border-2 ${
                            selectedChannel?.id === channel.id 
                              ? 'border-accent bg-accent/5' 
                              : 'border-border hover:border-accent/30'
                          }`}
                        >
                          <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                channel.payment_type === 'bank' ? 'bg-blue-100' : 'bg-green-100'
                              }`}>
                                {channel.payment_type === 'bank' ? (
                                  <Building2 className={`w-5 h-5 ${channel.payment_type === 'bank' ? 'text-blue-600' : 'text-green-600'}`} />
                                ) : (
                                  <Smartphone className="w-5 h-5 text-green-600" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground leading-none">{channel.account_name}</p>
                                <p className="text-[10px] text-muted-foreground mt-1 uppercase font-medium">
                                  {channelMethodLabel(channel)}
                                </p>
                              </div>
                            </div>
                            {selectedChannel?.id === channel.id && (
                              <CheckCircle2 className="w-5 h-5 text-accent" />
                            )}
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
                        <p className="text-xs text-amber-800">Your landlord hasn't configured payment details yet.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mb-5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-muted-foreground">Total to Pay</span>
                    <span className="text-xl font-bold text-accent">
                      {formatMoney(getTotalAmount())}
                    </span>
                  </div>
                  {selectedChannel && (
                    <div className="pt-2 border-t border-accent/10">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Target Destination</p>
                      <p className="text-xs font-medium text-foreground mt-1">
                        {channelDestinationLabel(selectedChannel)}
                      </p>
                    </div>
                  )}
                </div>

                {selectedMethod === 'mpesa' && isManualMpesaChannel(selectedChannel) ? (
                  <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl space-y-2">
                      <p className="text-sm font-bold text-amber-900">Pay manually via Pochi la Biashara</p>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        STK push is not available for this payment method. On your phone: M-Pesa → Pochi la Biashara → enter{' '}
                        <span className="font-bold">{selectedChannel.paybill_number}</span> → amount{' '}
                        <span className="font-bold">{formatMoney(getTotalAmount())}</span>.
                      </p>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        After paying, come back here and paste your M-Pesa confirmation
                        SMS — LEA will read the code, amount and time. No STK push for Pochi.
                      </p>
                    </div>
                  </div>
                ) : selectedMethod === 'mpesa' ? (
                  <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      Confirm M-Pesa Number
                    </label>
                    <Input
                      type="tel"
                      placeholder="e.g. 0712345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-background border-border text-foreground rounded-xl h-12 text-base focus:ring-2 focus:ring-accent/50"
                    />
                    <p className="text-[10px] text-muted-foreground mt-2 px-1">
                      An STK Push prompt will be sent to this number.
                    </p>
                  </div>
                ) : (
                  <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <p className="text-xs text-blue-800 leading-relaxed font-medium">
                        You selected Bank Transfer. Once you click "Initiate Transfer", we will use PesaLink to link your account to the landlord's {selectedChannel?.bank_name} account.
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-muted/50 rounded-xl p-4 mb-6 space-y-1.5">
                  <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                    {isManualMpesaChannel(selectedChannel)
                      ? 'How Pochi la Biashara works:'
                      : selectedMethod === 'mpesa'
                        ? 'How M-Pesa STK works:'
                        : 'How PesaLink works:'}
                  </p>
                  {(isManualMpesaChannel(selectedChannel)
                    ? [
                        '1. Open M-Pesa on your phone',
                        `2. Choose Pochi la Biashara → ${selectedChannel?.paybill_number}`,
                        `3. Enter ${formatMoney(getTotalAmount())} and your PIN`,
                        '4. Enter the M-Pesa receipt code on your dashboard',
                      ]
                    : selectedMethod === 'mpesa' ? [
                    '1. Click "Send STK Push" below',
                    '2. M-Pesa prompt appears on your phone',
                    '3. Enter your M-Pesa PIN',
                    '4. Payment confirmed automatically ✅',
                  ] : [
                    '1. Click "Initiate Transfer" below',
                    '2. Follow instructions on the next screen',
                    '3. Securely authorize through your bank app',
                    '4. Instant interbank settlement ✅',
                  ]).map((step) => (
                    <p key={step} className="text-xs text-muted-foreground font-medium">
                      {step}
                    </p>
                  ))}
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false)
                      setPhone('')
                    }}
                    className="flex-1 rounded-xl border-border h-12 font-bold hover:text-accent"
                  >
                    Cancel
                  </Button>
                  {isManualMpesaChannel(selectedChannel) ? (
                    <Button
                      onClick={async () => {
                        setIsSending(true)
                        try {
                          const total = getTotalAmount()
                          const {
                            data: { session },
                          } = await supabase.auth.getSession()
                          const res = await fetch('/api/payments/confirm-mpesa', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(session?.access_token
                                ? { Authorization: `Bearer ${session.access_token}` }
                                : {}),
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                              action: 'start',
                              amount: total,
                              month,
                              waterBill: Math.max(
                                0,
                                buildVariablePayload().water || waterBill || 0,
                              ),
                              variableAmounts: buildVariablePayload(),
                              advanceMonths: focusChargeTypes?.length ? 0 : advanceExtra,
                              onlyChargeTypes: focusChargeTypes || undefined,
                            }),
                          })
                          const data = await res.json()
                          if (!res.ok) throw new Error(data.error || 'Could not start confirmation')
                          setShowModal(false)
                          setPhone('')
                          onManualAwaitingCode?.({
                            id: data.payment.id,
                            amount: total,
                            month,
                          })
                        } catch (err: any) {
                          onError(err.message || 'Failed')
                        } finally {
                          setIsSending(false)
                        }
                      }}
                      disabled={isSending || getTotalAmount() <= 0}
                      className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl h-12 gap-2 font-bold shadow-lg shadow-accent/20 disabled:opacity-50"
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      Got it — I&apos;ll enter my code
                    </Button>
                  ) : (
                  <Button
                    onClick={handlePay}
                    disabled={isSending || (selectedMethod === 'mpesa' && !phone) || getTotalAmount() <= 0 || (paymentType === 'repairs' && !selectedService) || (landlordChannels.length > 0 && !selectedChannel)}
                    className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl h-12 gap-2 font-bold shadow-lg shadow-accent/20 disabled:opacity-50"
                  >
                    {isSending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {selectedMethod === 'mpesa' ? <Smartphone className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                        {selectedMethod === 'mpesa' ? 'Send STK Push' : 'Initiate Transfer'}
                      </>
                    )}
                  </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}