'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

interface EnhancedPaymentModalProps {
  user: User | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onError: (msg: string) => void
  baseRentAmount?: number
}

interface RepairService {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  basePrice?: number
}

const REPAIR_SERVICES: RepairService[] = [
  {
    id: 'plumbing',
    name: 'Plumbing Services',
    description: 'Pipe repairs, leaks, installations',
    icon: <Droplets className="w-4 h-4" />,
    basePrice: 1500
  },
  {
    id: 'electrical',
    name: 'Electrical Work',
    description: 'Wiring, fixtures, repairs',
    icon: <Zap className="w-4 h-4" />,
    basePrice: 2000
  },
  {
    id: 'general',
    name: 'General Repairs',
    description: 'Maintenance, fixtures, fittings',
    icon: <Wrench className="w-4 h-4" />,
    basePrice: 1000
  },
  {
    id: 'painting',
    name: 'Painting & Decorating',
    description: 'Wall painting, touch-ups',
    icon: <PaintBucket className="w-4 h-4" />,
    basePrice: 3000
  },
  {
    id: 'carpentry',
    name: 'Carpentry Work',
    description: 'Woodwork, cabinets, repairs',
    icon: <Hammer className="w-4 h-4" />,
    basePrice: 2500
  },
  {
    id: 'security',
    name: 'Security Services',
    description: 'Locks, security systems',
    icon: <Shield className="w-4 h-4" />,
    basePrice: 1800
  },
  {
    id: 'delivery',
    name: 'Package Delivery',
    description: 'Package handling, delivery',
    icon: <Package className="w-4 h-4" />,
    basePrice: 500
  },
  {
    id: 'custom',
    name: 'Custom Service',
    description: 'Other specialized services',
    icon: <AlertCircle className="w-4 h-4" />,
    basePrice: 0
  }
]

export default function EnhancedPaymentModal({
  user,
  isOpen,
  onClose,
  onSuccess,
  onError,
  baseRentAmount = 0
}: EnhancedPaymentModalProps) {
  // Payment type state
  const [paymentType, setPaymentType] = useState<'rent' | 'repairs'>('rent')
  
  // Rent payment states
  const [rentAmount, setRentAmount] = useState(baseRentAmount)
  const [waterBill, setWaterBill] = useState(0)
  
  // Repair payment states
  const [selectedService, setSelectedService] = useState<string>('')
  const [customServiceAmount, setCustomServiceAmount] = useState('')
  const [serviceDescription, setServiceDescription] = useState('')
  
  // Common states
  const [phone, setPhone] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Calculate total amount
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

  const formatMoney = (n: number) => `KES ${n.toLocaleString('en-KE')}`

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
        month: new Date().toISOString().slice(0, 7), // Current month
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
        handleClose()
      }, 4000)
    } catch (err: any) {
      onError(err.message)
    } finally {
      setIsSending(false)
    }
  }

  const handleClose = () => {
    onClose()
    // Reset form
    setPaymentType('rent')
    setRentAmount(baseRentAmount)
    setWaterBill(0)
    setSelectedService('')
    setCustomServiceAmount('')
    setServiceDescription('')
    setPhone('')
    setSent(false)
  }

  useEffect(() => {
    if (isOpen && user) {
      // Fetch user's phone number
      supabase
        .from('profiles')
        .select('phone_number')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.phone_number) setPhone(data.phone_number)
        })
    }
  }, [isOpen, user])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {sent ? (
          <div className="text-center py-8 px-6">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-accent" />
            </div>
            <p className="font-bold text-foreground text-lg">STK Push Sent! 📱</p>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Check your phone for the M-Pesa prompt. Enter your PIN to complete
              payment of{' '}
              <span className="font-bold text-foreground">{formatMoney(getTotalAmount())}</span>.
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              This window will close automatically...
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div>
                <h3 className="font-bold text-foreground text-xl">Make Payment</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose payment type and enter details
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Payment Type Toggle */}
            <div className="p-6 border-b border-border">
              <Label className="text-sm font-medium text-foreground block mb-3">
                Payment Type
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={paymentType === 'rent' ? 'default' : 'outline'}
                  onClick={() => setPaymentType('rent')}
                  className={`h-12 gap-2 rounded-xl transition-all ${
                    paymentType === 'rent' 
                      ? 'bg-accent text-accent-foreground shadow-sm shadow-accent/20' 
                      : 'border-border hover:bg-secondary'
                  }`}
                >
                  <Home className="w-4 h-4" />
                  Rent & Fees
                </Button>
                <Button
                  variant={paymentType === 'repairs' ? 'default' : 'outline'}
                  onClick={() => setPaymentType('repairs')}
                  className={`h-12 gap-2 rounded-xl transition-all ${
                    paymentType === 'repairs' 
                      ? 'bg-accent text-accent-foreground hover:text-accent shadow-sm shadow-accent/20' 
                      : 'border-border hover:bg-secondary'
                  }`}
                >
                  <Wrench className="w-4 h-4" />
                  Repairs & Services
                </Button>
              </div>
            </div>

            {/* Payment Details */}
            <div className="p-6">
              {paymentType === 'rent' ? (
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-foreground block mb-3">
                      Monthly Rent
                    </Label>
                    <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
                      <Input
                        type="number"
                        value={rentAmount}
                        onChange={(e) => setRentAmount(parseFloat(e.target.value) || 0)}
                        className="bg-transparent border-0 text-2xl font-bold text-accent text-center focus:ring-0 p-0"
                        placeholder="0"
                      />
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Base monthly rent amount
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-foreground block mb-3">
                      Water Bill
                    </Label>
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Droplets className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                          Water Charges
                        </span>
                      </div>
                      <Input
                        type="number"
                        value={waterBill}
                        onChange={(e) => setWaterBill(parseFloat(e.target.value) || 0)}
                        className="bg-transparent border-0 text-lg font-semibold text-blue-600 text-center focus:ring-0 p-0"
                        placeholder="0"
                      />
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Additional water charges (if any)
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-foreground block mb-3">
                      Select Service
                    </Label>
                    <RadioGroup value={selectedService} onValueChange={setSelectedService}>
                      <div className="grid gap-3">
                        {REPAIR_SERVICES.map((service) => (
                          <Card key={service.id} className="cursor-pointer transition-all hover:shadow-sm">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <RadioGroupItem value={service.id} id={service.id} className="mt-1" />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="text-muted-foreground">{service.icon}</div>
                                    <Label htmlFor={service.id} className="font-medium text-foreground cursor-pointer">
                                      {service.name}
                                    </Label>
                                  </div>
                                  <p className="text-xs text-muted-foreground mb-2">
                                    {service.description}
                                  </p>
                                  {service.basePrice && service.basePrice > 0 && (
                                    <p className="text-sm font-semibold text-accent">
                                      Base: {formatMoney(service.basePrice)}
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
                      <Label className="text-sm font-medium text-foreground block mb-3">
                        Additional Amount (Optional)
                      </Label>
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                        <Input
                          type="number"
                          value={customServiceAmount}
                          onChange={(e) => setCustomServiceAmount(e.target.value)}
                          className="bg-transparent border-0 text-lg font-semibold text-amber-600 text-center focus:ring-0 p-0"
                          placeholder="0"
                        />
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                          Additional charges for this service
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedService && (
                    <div>
                      <Label className="text-sm font-medium text-foreground block mb-3">
                        Service Description
                      </Label>
                      <Input
                        value={serviceDescription}
                        onChange={(e) => setServiceDescription(e.target.value)}
                        placeholder="Brief description of the service needed..."
                        className="bg-secondary border-border text-foreground rounded-xl"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Payment Summary */}
              <div className="mt-6 p-4 bg-muted/50 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                  <span className="text-xl font-bold text-accent">
                    {formatMoney(getTotalAmount())}
                  </span>
                </div>
                <Separator className="my-3" />
                <div className="text-xs text-muted-foreground text-center">
                  Paybill: 400200 · Account: 1060544
                </div>
              </div>

              {/* Phone Number */}
              <div className="mt-6">
                <Label className="text-sm font-medium text-foreground block mb-1.5">
                  M-Pesa Phone Number
                </Label>
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
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-border bg-muted/30">
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 rounded-xl border-border h-12"
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
            </div>
          </>
        )}
      </div>
    </div>
  )
}
