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
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface PayButtonProps {
  user: User | null
  amount: number
  month: string
  onSuccess: () => void
  onError: (msg: string) => void
  disabled?: boolean
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

  const formatMoney = (n: number) => `KES ${n.toLocaleString('en-KE')}`

  const getTotalAmount = () => {
    if (paymentType === 'rent') {
      return rentAmount + waterBill
    } else {
      const service = REPAIR_SERVICES.find(s => s.id === selectedService)
      const baseAmount = service?.basePrice ?? 0
      const customAmount = parseFloat(customServiceAmount) || 0
      return baseAmount + customAmount
    }
  }

  const handlePay = async () => {
    if (!phone || phone.length < 9) {
      onError('Enter a valid M-Pesa phone number')
      return
    }

    const totalAmount = getTotalAmount()
    if (totalAmount <= 0) {
      onError('Payment amount must be greater than 0')
      return
    }

    setIsSending(true)
    try {
      const paymentData = {
        amount: totalAmount,
        phone,
        tenantId: user?.id,
        month,
        paymentType,
        ...(paymentType === 'rent' && { rentAmount, waterBill }),
        ...(paymentType === 'repairs' && { 
          serviceId: selectedService,
          serviceDescription,
          customAmount: parseFloat(customServiceAmount) || 0
        })
      }

      const res = await fetch('/api/mpesa/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'STK push failed')

      setSent(true)
      onSuccess()
      setTimeout(() => {
        setShowModal(false)
        setSent(false)
        setPhone('')
        // Reset enhanced payment states
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
                      <div>
                        <Label className="text-xs font-medium text-foreground block mb-2">
                          Monthly Rent
                        </Label>
                        <Input
                          type="number"
                          disabled
                          value={rentAmount}
                          onChange={(e) => setRentAmount(parseFloat(e.target.value) || 0)}
                          className="bg-accent/5 border-accent/20 text-center font-bold text-accent"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-foreground block mb-2">
                          Water Bill (Optional)
                        </Label>
                        <div className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 rounded-xl p-3">
                          <Input
                            type="number"
                            value={waterBill === 0 ? '' : waterBill}
                            onChange={(e) => {
                              const value = e.target.value;
                              setWaterBill(value === '' ? 0 : parseFloat(value) || 0);
                            }}
                            className="bg-transparent border-0 text-center font-semibold text-accent"
                            placeholder="0"
                          />
                        </div>
                      </div>
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

                {/* Payment Summary */}
                <div className="bg-accent/5 border border-accent/20 rounded-xl p-3 mb-5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Total Amount</span>
                    <span className="text-lg font-bold text-accent">
                      {formatMoney(getTotalAmount())}
                    </span>
                  </div>
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
                    className="flex-1 rounded-xl border-border h-12 hover:text-accent"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handlePay}
                    disabled={isSending || !phone || getTotalAmount() <= 0 || (paymentType === 'repairs' && !selectedService)}
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