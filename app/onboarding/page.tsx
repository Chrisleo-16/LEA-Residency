'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  AlertCircle, 
  ExternalLink, 
  RefreshCcw, 
  Trash2,
  Smartphone,
  Building2,
  ChevronDown
} from 'lucide-react'

export default function OnboardingPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  const [totalSteps] = useState(4)
  const [isLoading, setIsLoading] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [networkError, setNetworkError] = useState<string | null>(null)

  // Step 1: Identity
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Step 2: Property & Units
  const [totalUnits, setTotalUnits] = useState('')
  const [namingConvention, setNamingConvention] = useState('Unit')
  const [defaultRent, setDefaultRent] = useState('')
  const [defaultDeposit, setDefaultDeposit] = useState('')
  const [units, setUnits] = useState<Array<{ id: number; name: string; rent: string; deposit: string; complete: boolean }>>([])

  // Step 3: Payment
  const [paybillNumber, setPaybillNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [paybillAccountNumber, setPaybillAccountNumber] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankShortcode, setBankShortcode] = useState('')
  const [paymentType, setPaymentType] = useState<'paybill' | 'till' | 'bank'>('paybill')
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'verified' | 'error'>('idle')
  const [verificationError, setVerificationError] = useState<{
    message: string;
    explanation: string;
    resolution: string[];
    action?: { label: string; url: string };
    code?: string;
  } | null>(null)
  const [paymentChannels, setPaymentChannels] = useState<any[]>([])

  // Step 4: Invite
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)

  // Celebration
  const [showCelebration, setShowCelebration] = useState(false)

  const checkOnboardingStatus = async () => {
    if (!user) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single()
    
    if (profile?.onboarding_completed) {
      // Redirect to dashboard
      window.location.href = '/dashboard'
    }
  }

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        window.location.href = '/login'
        return
      }
      setUser(session.user)
      setLoading(false)
      
      // Check onboarding status after user is set
      await checkOnboardingStatus()
    }

    fetchUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        window.location.href = '/login'
      } else {
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    // Check if user has already completed onboarding
    checkOnboardingStatus()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfilePhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}
    
    if (!fullName.trim()) newErrors.fullName = 'Full name is required'
    if (!phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required'
    if (!/^\+?\d{10,15}$/.test(phoneNumber.replace(/\s/g, ''))) {
      newErrors.phoneNumber = 'Invalid phone number format'
    }
    if (!businessName.trim()) newErrors.businessName = 'Business or property name is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleStep1Next = async () => {
    if (!validateStep1()) return
    if (!user) {
      setNetworkError('You must be logged in to continue.')
      return
    }
    
    setIsLoading(true)
    try {
      // Save to profiles table
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone_number: phoneNumber,
          business_name: businessName,
          avatar_url: photoPreview || null,
        })
        .eq('id', user.id)
      
      if (error) throw error
      
      setCurrentStep(2)
    } catch (error) {
      setNetworkError('Failed to save your information. Your progress is saved locally.')
      console.error('Step 1 error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnitsChange = (value: string) => {
    const num = parseInt(value) || 0
    setTotalUnits(value)
    
    // Dynamically generate unit cards
    const newUnits = Array.from({ length: num }, (_, i) => ({
      id: i + 1,
      name: `${namingConvention} ${i + 1}`,
      rent: defaultRent,
      deposit: defaultDeposit,
      complete: false,
    }))
    setUnits(newUnits)
  }

  const handleUnitUpdate = (id: number, field: string, value: string) => {
    setUnits(prev => prev.map(unit => 
      unit.id === id ? { ...unit, [field]: value, complete: !!(unit.name && unit.rent && unit.deposit) } : unit
    ))
  }

  const handleBulkFill = () => {
    setUnits(prev => prev.map(unit => ({
      id: unit.id,
      name: unit.name,
      rent: defaultRent,
      deposit: defaultDeposit,
      complete: !!(unit.name && defaultRent && defaultDeposit),
    })))
  }

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {}
    
    if (!totalUnits || parseInt(totalUnits) < 1) {
      newErrors.totalUnits = 'At least 1 unit is required'
    }
    if (!defaultRent || parseFloat(defaultRent) < 0) {
      newErrors.defaultRent = 'Valid rent amount is required'
    }
    if (!defaultDeposit || parseFloat(defaultDeposit) < 0) {
      newErrors.defaultDeposit = 'Valid deposit amount is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

 const handleStep2Next = async () => {
  if (!validateStep2()) return
  if (!user) {
    setNetworkError('You must be logged in to continue.')
    return
  }
  
  setIsLoading(true)
  try {
    // Save units to database
    const { error } = await supabase
      .from('units')
      .insert(
        units.map(unit => ({
          landlord_id: user.id,
          unit_number: unit.name,
          rent_amount: parseFloat(unit.rent),
          deposit_amount: parseFloat(unit.deposit),
        }))
      )
    
    if (error) throw error

    // ✅ THIS WAS MISSING — update property_capacity on landlord_blocks
    // so the join page knows how many tenants are allowed
    const { data: profile } = await supabase
      .from('profiles')
      .select('landlord_block_id')
      .eq('id', user.id)
      .single()

    if (profile?.landlord_block_id) {
      await supabase
        .from('landlord_blocks')
        .update({ property_capacity: parseInt(totalUnits) })
        .eq('id', profile.landlord_block_id)
    }
    
    setCurrentStep(3)
  } catch (error) {
    setNetworkError('Failed to save your units. Your progress is saved locally.')
    console.error('Step 2 error:', error)
  } finally {
    setIsLoading(false)
  }
}

  const handlePaymentVerification = async () => {
    if (!paybillNumber.trim()) {
      setErrors({ ...errors, paybillNumber: 'Paybill/Till number is required' })
      return
    }
    
    if (paymentType === 'bank' && !bankAccountNumber.trim()) {
      setErrors({ ...errors, bankAccountNumber: 'Bank account number is required' })
      return
    }

    setVerificationStatus('loading')
    setVerificationError(null)
    
    try {
      const res = await fetch('/api/payments/verify-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentType,
          shortCode: paymentType === 'bank' ? bankShortcode : paybillNumber,
          accountName: accountName,
          accountNumber: paymentType === 'paybill' ? paybillAccountNumber : bankAccountNumber,
          bankName: bankName
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setVerificationStatus('error')
        setVerificationError({
          message: data.message || 'Verification failed',
          explanation: data.explanation || 'An unknown error occurred.',
          resolution: data.resolution || ['Please check your details and try again.'],
          action: data.action,
          code: data.code
        })
      } else {
        setVerificationStatus('verified')
        // Add to the list of channels
        const newChannel = {
          type: paymentType,
          number: paybillNumber,
          account: accountName || bankName,
          bankAccount: bankAccountNumber,
          id: data.channel?.id
        }
        setPaymentChannels(prev => [...prev, newChannel])
      }
    } catch (err) {
      setVerificationStatus('error')
      setVerificationError({
        message: 'Network Error',
        explanation: 'Could not connect to the verification server.',
        resolution: ['Check your internet connection.', 'Try again in a few moments.']
      })
    }
  }

  const handleRemoveChannel = (index: number) => {
    setPaymentChannels(prev => prev.filter((_, i) => i !== index))
  }

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {}
    
    if (paymentType === 'bank') {
      if (!bankShortcode.trim()) newErrors.bankShortcode = 'Bank shortcode is required'
      if (!bankAccountNumber.trim()) newErrors.bankAccountNumber = 'Bank account number is required'
      if (!bankName.trim()) newErrors.bankName = 'Bank name is required'
    } else if (paymentType === 'paybill') {
      if (!paybillNumber.trim()) newErrors.paybillNumber = 'Paybill number is required'
      if (!paybillAccountNumber.trim()) newErrors.paybillAccountNumber = 'Account number is required'
      if (!accountName.trim()) newErrors.accountName = 'Beneficiary name is required'
    } else {
      if (!paybillNumber.trim()) newErrors.paybillNumber = 'Till number is required'
      if (!accountName.trim()) newErrors.accountName = 'Beneficiary name is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleStep3Next = async () => {
    if (paymentChannels.length === 0) {
      setNetworkError('Please add and verify at least one payment channel.')
      return
    }
    if (!user) {
      setNetworkError('You must be logged in to continue.')
      return
    }
    
    setIsLoading(true)
    try {
      // paymentChannels are already saved to DB via the verify-channel API 
      // (verified by the fact that they are in the list)
      // We just need to make sure the landlord has at least one channel.

      // Generate invite link
      const { data: profile } = await supabase
        .from('profiles')
        .select('landlord_block_id')
        .eq('id', user.id)
        .single()
      
      if (profile?.landlord_block_id) {
        setInviteLink(`${window.location.origin}/invite/${profile.landlord_block_id}`)
      }
      
      setCurrentStep(4)
    } catch (error) {
      setNetworkError('Failed to proceed. Please try again.')
      console.error('Step 3 error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsAppShare = () => {
    const message = `Join my property management platform! ${inviteLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  const handleCompleteOnboarding = async () => {
    if (!user) {
      setNetworkError('You must be logged in to continue.')
      return
    }
    
    setIsLoading(true)
    try {
      // Save invite link to profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('landlord_block_id')
        .eq('id', user.id)
        .single()
      
      const inviteLink = profile?.landlord_block_id 
        ? `${window.location.origin}/invite/${profile.landlord_block_id}`
        : ''
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          onboarding_completed: true,
          invite_link: inviteLink
        })
        .eq('id', user.id)
      
      if (error) throw error
      
      // Auto-generate welcome announcement
      await supabase
        .from('policies')
        .insert({
          landlord_id: user.id,
          title: 'Welcome to Your Property Management Portal',
          content: `Welcome to ${businessName || 'your property'}! We're excited to have you on board. This portal will help you manage your property, track rent payments, and communicate with your tenants. Feel free to explore the features and let us know if you need any assistance.`,
          category: 'announcement',
          created_by: user.id,
        })
      
      setShowCelebration(true)
      
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 3000)
    } catch (error) {
      setNetworkError('Failed to complete onboarding. Please try again.')
      console.error('Complete error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleLeave = () => {
    setShowLeaveConfirm(false)
    window.location.href = '/dashboard'
  }

  const progress = (currentStep / totalSteps) * 100

  if (showCelebration) {
    return (
      <div className="min-h-screen bg-linear-to-br from-accent/10 to-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6 animate-bounce">
            <Check className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Welcome to LEA!</h2>
          <p className="text-muted-foreground mb-6">
            Your property is all set up. Here's what you configured:
          </p>
          <div className="text-left space-y-2 mb-6">
            <p className="text-sm"><strong>Business:</strong> {businessName}</p>
            <p className="text-sm"><strong>Units:</strong> {totalUnits}</p>
            <p className="text-sm"><strong>Payment:</strong> {paymentType} - {paybillNumber}</p>
          </div>
          <Button 
            onClick={() => window.location.href = '/dashboard'}
            className="w-full bg-accent hover:bg-accent/90"
          >
            Go to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-accent/10 to-background">
      {/* Network error banner */}
      {networkError && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white p-3 z-50 flex items-center justify-between">
          <p className="text-sm">{networkError}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setNetworkError(null)}
            className="text-white hover:bg-white/20"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Leave confirmation dialog */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-foreground mb-2">Leave Onboarding?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Your progress is saved locally. You can continue later.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowLeaveConfirm(false)}>
                Continue Onboarding
              </Button>
              <Button variant="destructive" onClick={handleLeave}>
                Leave
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step 1: Identity */}
        {currentStep === 1 && (
          <Card className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Let's set up your property</h2>
            <p className="text-muted-foreground mb-8">First, tell us about yourself</p>

            <div className="space-y-6">
              {/* Profile photo upload */}
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden border-2 border-dashed border-accent/30">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-8 h-8 text-accent" />
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload">
                    <Button variant="outline" size="sm" asChild>
                      <span>Upload Photo</span>
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">Optional</p>
                </div>
              </div>

              {/* Full name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Full Name *</label>
                <Input
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value)
                    if (errors.fullName) setErrors({ ...errors, fullName: '' })
                  }}
                  placeholder="Enter your full name"
                  className={errors.fullName ? 'border-red-500' : ''}
                />
                {errors.fullName && <p className="text-xs text-red-500 mt-1">{errors.fullName}</p>}
              </div>

              {/* Phone number */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone Number *</label>
                <Input
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value)
                    if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: '' })
                  }}
                  placeholder="+254 7XX XXX XXX"
                  className={errors.phoneNumber ? 'border-red-500' : ''}
                />
                {errors.phoneNumber && <p className="text-xs text-red-500 mt-1">{errors.phoneNumber}</p>}
              </div>

              {/* Business name */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Business or Property Name *</label>
                <Input
                  value={businessName}
                  onChange={(e) => {
                    setBusinessName(e.target.value)
                    if (errors.businessName) setErrors({ ...errors, businessName: '' })
                  }}
                  placeholder="e.g., Sunrise Apartments"
                  className={errors.businessName ? 'border-red-500' : ''}
                />
                {errors.businessName && <p className="text-xs text-red-500 mt-1">{errors.businessName}</p>}
              </div>
            </div>

            <div className="flex justify-end mt-8">
              <Button 
                onClick={handleStep1Next}
                disabled={isLoading}
                className="bg-accent hover:bg-accent/90"
              >
                {isLoading ? 'Saving...' : 'Continue'}
                {!isLoading && <ChevronRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Property & Units */}
        {currentStep === 2 && (
          <Card className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Configure Your Property</h2>
            <p className="text-muted-foreground mb-8">Set up your units and pricing</p>

            <div className="space-y-6">
              {/* Total units */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Total Number of Units *</label>
                <Input
                  type="number"
                  value={totalUnits}
                  onChange={(e) => {
                    handleUnitsChange(e.target.value)
                    if (errors.totalUnits) setErrors({ ...errors, totalUnits: '' })
                  }}
                  placeholder="e.g., 10"
                  min="1"
                  className={errors.totalUnits ? 'border-red-500' : ''}
                />
                {errors.totalUnits && <p className="text-xs text-red-500 mt-1">{errors.totalUnits}</p>}
              </div>

              {/* Naming convention */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Unit Naming Convention</label>
                <Input
                  value={namingConvention}
                  onChange={(e) => setNamingConvention(e.target.value)}
                  placeholder="e.g., Unit, Apartment, Room"
                />
              </div>

              {/* Default rent */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Default Rent Amount (KES) *</label>
                <Input
                  type="number"
                  value={defaultRent}
                  onChange={(e) => {
                    setDefaultRent(e.target.value)
                    if (errors.defaultRent) setErrors({ ...errors, defaultRent: '' })
                  }}
                  placeholder="e.g., 15000"
                  min="0"
                  className={errors.defaultRent ? 'border-red-500' : ''}
                />
                {errors.defaultRent && <p className="text-xs text-red-500 mt-1">{errors.defaultRent}</p>}
              </div>

              {/* Default deposit */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Default Deposit Amount (KES) *</label>
                <Input
                  type="number"
                  value={defaultDeposit}
                  onChange={(e) => {
                    setDefaultDeposit(e.target.value)
                    if (errors.defaultDeposit) setErrors({ ...errors, defaultDeposit: '' })
                  }}
                  placeholder="e.g., 30000"
                  min="0"
                  className={errors.defaultDeposit ? 'border-red-500' : ''}
                />
                {errors.defaultDeposit && <p className="text-xs text-red-500 mt-1">{errors.defaultDeposit}</p>}
              </div>

              {/* Bulk fill button */}
              {units.length > 0 && (
                <Button variant="outline" onClick={handleBulkFill} className="w-full">
                  Apply Default Values to All Units
                </Button>
              )}

              {/* Dynamic unit cards */}
              {units.length > 0 && (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {units.map((unit) => (
                    <Card key={unit.id} className={`p-4 ${!unit.complete ? 'border-amber-500' : ''}`}>
                      <div className="flex items-start gap-4">
                        {!unit.complete && (
                          <div className="w-3 h-3 rounded-full bg-amber-500 mt-2" title="Incomplete" />
                        )}
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">Unit Name</label>
                            <Input
                              value={unit.name}
                              onChange={(e) => handleUnitUpdate(unit.id, 'name', e.target.value)}
                              placeholder="Unit name"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Rent (KES)</label>
                              <Input
                                type="number"
                                value={unit.rent}
                                onChange={(e) => handleUnitUpdate(unit.id, 'rent', e.target.value)}
                                placeholder="Rent"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground mb-1">Deposit (KES)</label>
                              <Input
                                type="number"
                                value={unit.deposit}
                                onChange={(e) => handleUnitUpdate(unit.id, 'deposit', e.target.value)}
                                placeholder="Deposit"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleStep2Next}
                disabled={isLoading}
                className="bg-accent hover:bg-accent/90"
              >
                {isLoading ? 'Saving...' : 'Continue'}
                {!isLoading && <ChevronRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </Card>
        )}

        {/* Step 3: Payment Setup */}
        {currentStep === 3 && (
          <Card className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-2xl font-bold text-foreground">Set Up Payments</h2>
              <div className="px-3 py-1 bg-accent/10 rounded-full flex items-center gap-2">
                <RefreshCcw className={`w-3 h-3 text-accent ${verificationStatus === 'loading' ? 'animate-spin' : ''}`} />
                <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Live PayHero Verification</span>
              </div>
            </div>
            <p className="text-muted-foreground mb-8">Configure one or more channels to receive rent. Our system will programmatically register these with PayHero for instant automated reconciliation.</p>

            <div className="space-y-6">
              {/* Payment type selector */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">Add a Payment Channel</label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={paymentType === 'paybill' ? 'default' : 'outline'}
                    onClick={() => { setPaymentType('paybill'); setVerificationStatus('idle'); }}
                    className={`h-16 flex-col gap-1 rounded-xl transition-all ${paymentType === 'paybill' ? 'bg-accent shadow-md shadow-accent/20' : 'hover:border-accent/50'}`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="text-xs">Paybill</span>
                  </Button>
                  <Button
                    variant={paymentType === 'till' ? 'default' : 'outline'}
                    onClick={() => { setPaymentType('till'); setVerificationStatus('idle'); }}
                    className={`h-16 flex-col gap-1 rounded-xl transition-all ${paymentType === 'till' ? 'bg-accent shadow-md shadow-accent/20' : 'hover:border-accent/50'}`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="text-xs">Till Number</span>
                  </Button>
                  <Button
                    variant={paymentType === 'bank' ? 'default' : 'outline'}
                    onClick={() => { setPaymentType('bank'); setVerificationStatus('idle'); }}
                    className={`h-16 flex-col gap-1 rounded-xl transition-all ${paymentType === 'bank' ? 'bg-accent shadow-md shadow-accent/20' : 'hover:border-accent/50'}`}
                  >
                    <Building2 className="w-5 h-5" />
                    <span className="text-xs">Bank Account</span>
                  </Button>
                </div>
              </div>

              {/* Dynamic Form */}
              <Card className="p-4 border-accent/20 bg-accent/5">
                <div className="space-y-4">
                  {paymentType === 'bank' ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-tight">Bank Name</label>
                          <Input
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            placeholder="e.g., KCB Bank"
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-tight">Bank Shortcode</label>
                          <Input
                            value={bankShortcode}
                            onChange={(e) => setBankShortcode(e.target.value)}
                            placeholder="e.g., 522522"
                            className="bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-tight">Account Number</label>
                        <Input
                          value={bankAccountNumber}
                          onChange={(e) => setBankAccountNumber(e.target.value)}
                          placeholder="Enter 12-16 digit account number"
                          className={`bg-white ${errors.bankAccountNumber ? 'border-red-500' : ''}`}
                        />
                        {errors.bankAccountNumber && <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.bankAccountNumber}</p>}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-tight">
                            {paymentType === 'paybill' ? 'Paybill Number' : 'Till Number'}
                          </label>
                          <Input
                            value={paybillNumber}
                            onChange={(e) => {
                              setPaybillNumber(e.target.value);
                              if (errors.paybillNumber) setErrors({ ...errors, paybillNumber: '' });
                            }}
                            placeholder={paymentType === 'paybill' ? 'e.g., 123456' : 'e.g., 123456'}
                            className={`bg-white ${errors.paybillNumber ? 'border-red-500' : ''}`}
                          />
                          {errors.paybillNumber && <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.paybillNumber}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-tight">
                            {paymentType === 'paybill' ? 'Account Number' : 'Beneficiary Name'}
                          </label>
                          <Input
                            value={paymentType === 'paybill' ? paybillAccountNumber : accountName}
                            onChange={(e) => {
                              if (paymentType === 'paybill') {
                                setPaybillAccountNumber(e.target.value);
                              } else {
                                setAccountName(e.target.value);
                              }
                              if (errors.accountName) setErrors({ ...errors, accountName: '' });
                            }}
                            placeholder={paymentType === 'paybill' ? 'e.g., 123456' : 'e.g., Sunrise Apartments'}
                            className={`bg-white ${errors.accountName ? 'border-red-500' : ''}`}
                          />
                          {errors.accountName && <p className="text-[10px] text-red-500 mt-1 font-medium">{errors.accountName}</p>}
                        </div>
                      </div>
                      {paymentType === 'paybill' && (
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-tight">Beneficiary Name</label>
                          <Input
                            value={accountName}
                            onChange={(e) => setAccountName(e.target.value)}
                            placeholder="e.g., Sunrise Apartments"
                            className="bg-white"
                          />
                        </div>
                      )}
                    </>
                  )}

                  <Button
                    onClick={handlePaymentVerification}
                    disabled={verificationStatus === 'loading'}
                    className="w-full bg-accent hover:bg-accent/90 mt-2 font-bold shadow-lg shadow-accent/20"
                  >
                    {verificationStatus === 'loading' ? (
                      <>
                        <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
                        Verifying details with PayHero...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Verify & Add Channel
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              {/* Rich Error Card */}
              {verificationStatus === 'error' && verificationError && (
                <Card className="border-red-500/30 bg-red-50/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="p-4 flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="space-y-3 flex-1">
                      <div>
                        <h4 className="text-sm font-bold text-red-900">{verificationError.message}</h4>
                        <p className="text-xs text-red-700/80 mt-1 font-medium leading-relaxed">{verificationError.explanation}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-bold text-red-900 uppercase tracking-wider">How to resolve:</h5>
                        <div className="space-y-1.5">
                          {verificationError.resolution.map((step, i) => (
                            <div key={i} className="flex gap-2">
                              <span className="text-[10px] font-bold text-red-700 w-4 h-4 rounded-full bg-red-100 flex items-center justify-center shrink-0">{i + 1}</span>
                              <p className="text-xs text-red-800/90 leading-tight">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-[11px] border-red-200 hover:bg-red-100 text-red-800"
                          onClick={handlePaymentVerification}
                        >
                          <RefreshCcw className="w-3 h-3 mr-1.5" />
                          Retry Verification
                        </Button>
                        {verificationError.action && (
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="h-8 text-[11px] text-red-900 p-0"
                            asChild
                          >
                            <a href={verificationError.action.url} target="_blank" rel="noopener noreferrer">
                              {verificationError.action.label}
                              <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </Button>
                        )}
                        {verificationError.code === 'NETWORK_ERROR' && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-[11px] text-red-700 ml-auto"
                            onClick={() => setCurrentStep(4)}
                          >
                            Skip for Now
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Verified Channels List */}
              {paymentChannels.length > 0 && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Your Active Payment Channels</label>
                  {paymentChannels.map((channel, i) => (
                    <Card key={i} className="p-4 border-green-500/20 bg-green-50/20 shadow-sm transition-all hover:bg-green-50/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            {channel.type === 'bank' ? <Building2 className="w-4 h-4 text-green-600" /> : <Smartphone className="w-4 h-4 text-green-600" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground leading-none">{channel.account}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-tight font-medium">
                              {channel.type} · {channel.number} {channel.bankAccount ? `· Acc: ${channel.bankAccount}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 rounded-full">
                            <Check className="w-2.5 h-2.5 text-green-700" />
                            <span className="text-[9px] font-bold text-green-700 uppercase tracking-wider">Verified</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="w-8 h-8 text-muted-foreground hover:text-red-500"
                            onClick={() => handleRemoveChannel(i)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                  <p className="text-[10px] text-muted-foreground italic text-center">You can add multiple channels. Tenants will choose their preferred method at checkout.</p>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-10 pt-6 border-t">
              <Button variant="ghost" onClick={handleBack} className="rounded-xl px-6">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleStep3Next}
                disabled={isLoading || paymentChannels.length === 0}
                className="bg-accent hover:bg-accent/90 rounded-xl px-8 font-bold shadow-lg shadow-accent/20"
              >
                {isLoading ? 'Processing...' : 'Continue to Final Step'}
                {!isLoading && <ChevronRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </Card>
        )}

        {/* Step 4: Invite Link */}
        {currentStep === 4 && (
          <Card className="p-6 md:p-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Invite Your Tenants</h2>
            <p className="text-muted-foreground mb-8">Share your unique invite link</p>

            <div className="space-y-6">
              {/* Invite link card */}
              <Card className="p-4 bg-accent/5">
                <label className="block text-sm font-medium text-foreground mb-2">Your Unique Invite Link</label>
                <div className="flex gap-2">
                  <Input
                    value={inviteLink}
                    readOnly
                    className="flex-1 bg-white"
                  />
                  <Button onClick={handleCopyLink} variant="outline">
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </Card>

              {/* WhatsApp share */}
              <Button onClick={handleWhatsAppShare} className="w-full bg-green-500 hover:bg-green-600">
                Share via WhatsApp
              </Button>

              {/* QR code placeholder */}
              <Card className="p-6 text-center">
                <p className="text-sm font-medium text-foreground mb-4">QR Code for Notice Board</p>
                <div className="w-48 h-48 bg-white rounded-lg mx-auto flex items-center justify-center border">
                  <p className="text-xs text-muted-foreground">QR Code</p>
                </div>
                <Button variant="outline" className="mt-4">
                  Print QR Code
                </Button>
              </Card>
            </div>

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button 
                onClick={handleCompleteOnboarding}
                disabled={isLoading}
                className="bg-accent hover:bg-accent/90"
              >
                {isLoading ? 'Completing...' : 'Complete Setup'}
                {!isLoading && <ChevronRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
