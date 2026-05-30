'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Upload, Building2, CreditCard, FileText, Bell, Settings as SettingsIcon, Check } from 'lucide-react'

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('profile')
  const [completionPercentage, setCompletionPercentage] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  // Profile settings
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  // Property settings
  const [propertyPhotos, setPropertyPhotos] = useState<File[]>([])
  const [propertyPhotoPreviews, setPropertyPhotoPreviews] = useState<string[]>([])
  const [floorPlans, setFloorPlans] = useState<File[]>([])
  const [amenities, setAmenities] = useState<string[]>([])
  const [newAmenity, setNewAmenity] = useState('')

  // Payment settings
  const [bankName, setBankName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankBranch, setBankBranch] = useState('')

  // Business settings
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState('')
  const [taxId, setTaxId] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [smsNotifications, setSmsNotifications] = useState(true)
  const [paymentReminders, setPaymentReminders] = useState(true)
  const [maintenanceAlerts, setMaintenanceAlerts] = useState(true)

  // Penalty settings
  const [lateFeePercentage, setLateFeePercentage] = useState('')
  const [lateFeeGracePeriod, setLateFeeGracePeriod] = useState('')
  const [penaltyRules, setPenaltyRules] = useState('')

  // Invite link
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [landlordBlockId, setLandlordBlockId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        window.location.href = '/login'
        return
      }
      setUser(session.user)
      setLoading(false)
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
    if (user) {
      loadProfileData()
    }
  }, [user])

  useEffect(() => {
    calculateCompletion()
  }, [
    fullName, phoneNumber, businessName, photoPreview,
    propertyPhotos, floorPlans, amenities,
    bankName, bankAccountNumber, bankBranch,
    businessRegistrationNumber, taxId, businessAddress,
    lateFeePercentage, lateFeeGracePeriod, penaltyRules
  ])

  const loadProfileData = async () => {
    if (!user) return

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Failed to load profile:', error)
      return
    }

    if (profile) {
      setFullName(profile.full_name || '')
      setPhoneNumber(profile.phone_number || profile.phone || '')
      setBusinessName(profile.business_name || '')
      setPhotoPreview(profile.avatar_url || null)
      setLandlordBlockId(profile.landlord_block_id || null)

      if (profile.invite_link) {
        setInviteLink(profile.invite_link)
      } else {
        await generateAndSaveInviteLink(profile.landlord_block_id)
      }
    }
  }

  const generateAndSaveInviteLink = async (blockId: string | null) => {
    if (!user) return

    const baseUrl = window.location.origin
    const ref = blockId || user.id
    const link = `${baseUrl}/join?ref=${ref}`

    const { error } = await supabase
      .from('profiles')
      .update({ invite_link: link })
      .eq('id', user.id)

    if (!error) {
      setInviteLink(link)
    } else {
      console.error('Failed to save invite link:', error)
    }
  }

  const calculateCompletion = () => {
    let completed = 0
    let total = 0

    // Profile (4 items)
    total += 4
    if (fullName) completed++
    if (phoneNumber) completed++
    if (businessName) completed++
    if (photoPreview) completed++

    // Property (3 items)
    total += 3
    if (propertyPhotos.length > 0) completed++
    if (floorPlans.length > 0) completed++
    if (amenities.length > 0) completed++

    // Payment (3 items)
    total += 3
    if (bankName) completed++
    if (bankAccountNumber) completed++
    if (bankBranch) completed++

    // Business (3 items)
    total += 3
    if (businessRegistrationNumber) completed++
    if (taxId) completed++
    if (businessAddress) completed++

    // Notifications always complete
    total += 4
    completed += 4

    // Penalty (3 items)
    total += 3
    if (lateFeePercentage) completed++
    if (lateFeeGracePeriod) completed++
    if (penaltyRules) completed++

    setCompletionPercentage(Math.round((completed / total) * 100))
  }

  const handleProfilePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setProfilePhoto(file)
      const reader = new FileReader()
      reader.onloadend = () => setPhotoPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handlePropertyPhotosUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setPropertyPhotos(files)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPropertyPhotoPreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleAddAmenity = () => {
    if (newAmenity.trim()) {
      setAmenities([...amenities, newAmenity.trim()])
      setNewAmenity('')
    }
  }

  const handleRemoveAmenity = (index: number) => {
    setAmenities(amenities.filter((_, i) => i !== index))
  }

  const handleSaveProfile = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone_number: phoneNumber,
          phone: phoneNumber,
          business_name: businessName,
          avatar_url: photoPreview || null,
        })
        .eq('id', user!.id)

      if (error) throw error
      calculateCompletion()
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProperty = async () => {
    setIsLoading(true)
    try {
      calculateCompletion()
    } catch (error) {
      console.error('Failed to save property settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSavePayment = async () => {
    setIsLoading(true)
    try {
      calculateCompletion()
    } catch (error) {
      console.error('Failed to save payment settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveBusiness = async () => {
    setIsLoading(true)
    try {
      calculateCompletion()
    } catch (error) {
      console.error('Failed to save business settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveNotifications = async () => {
    setIsLoading(true)
    try {
      calculateCompletion()
    } catch (error) {
      console.error('Failed to save notification settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSavePenalty = async () => {
    setIsLoading(true)
    try {
      calculateCompletion()
    } catch (error) {
      console.error('Failed to save penalty rules:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header with completion percentage */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground mb-4">Complete your profile to unlock all features</p>

          <Card className="p-4 bg-accent/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Profile Completion</span>
              <span className="text-sm font-bold text-accent">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
            {completionPercentage < 100 ? (
              <p className="text-xs text-muted-foreground mt-2">
                Complete your profile to get the most out of LEA
              </p>
            ) : (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <p className="text-xs text-green-600 font-medium">Profile complete!</p>
              </div>
            )}
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap gap-2 mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="property">Property</TabsTrigger>
            <TabsTrigger value="payment">Payment</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="penalty">Penalty</TabsTrigger>
            <TabsTrigger value="invite">Invite Tenants</TabsTrigger>
          </TabsList>

          {/* ── Profile Tab ── */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5" />
                  Profile Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
                      onChange={handleProfilePhotoUpload}
                      className="hidden"
                      id="profile-photo-upload"
                    />
                    <label htmlFor="profile-photo-upload">
                      <Button variant="outline" size="sm" asChild>
                        <span>Upload Photo</span>
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">Recommended: 400x400px</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Phone Number</label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+254 7XX XXX XXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Business or Property Name</label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g., Sunrise Apartments"
                  />
                </div>

                <Button onClick={handleSaveProfile} disabled={isLoading} className="bg-accent hover:bg-accent/90">
                  {isLoading ? 'Saving...' : 'Save Profile'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Property Tab ── */}
          <TabsContent value="property">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Property Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Property Photos</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePropertyPhotosUpload}
                    className="hidden"
                    id="property-photos-upload"
                  />
                  <label htmlFor="property-photos-upload">
                    <Button variant="outline" size="sm" asChild>
                      <span>Upload Photos</span>
                    </Button>
                  </label>
                  {propertyPhotoPreviews.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {propertyPhotoPreviews.map((preview, index) => (
                        <div key={index} className="aspect-square rounded-lg overflow-hidden border">
                          <img src={preview} alt={`Property ${index}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Floor Plans</label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.png"
                    multiple
                    onChange={(e) => setFloorPlans(Array.from(e.target.files || []))}
                    className="hidden"
                    id="floor-plans-upload"
                  />
                  <label htmlFor="floor-plans-upload">
                    <Button variant="outline" size="sm" asChild>
                      <span>Upload Floor Plans</span>
                    </Button>
                  </label>
                  {floorPlans.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">{floorPlans.length} file(s) selected</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Amenities</label>
                  <div className="flex gap-2">
                    <Input
                      value={newAmenity}
                      onChange={(e) => setNewAmenity(e.target.value)}
                      placeholder="e.g., Swimming pool, Gym"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddAmenity()}
                    />
                    <Button onClick={handleAddAmenity} variant="outline">Add</Button>
                  </div>
                  {amenities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {amenities.map((amenity, index) => (
                        <div key={index} className="flex items-center gap-2 px-3 py-1 bg-accent/10 rounded-full text-sm">
                          {amenity}
                          <button onClick={() => handleRemoveAmenity(index)} className="text-muted-foreground hover:text-foreground">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={handleSaveProperty} disabled={isLoading} className="bg-accent hover:bg-accent/90">
                  {isLoading ? 'Saving...' : 'Save Property Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Payment Tab ── */}
          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Payment Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Bank Name</label>
                  <Input
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g., Equity Bank"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Bank Account Number</label>
                  <Input
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="Enter your account number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Bank Branch</label>
                  <Input
                    value={bankBranch}
                    onChange={(e) => setBankBranch(e.target.value)}
                    placeholder="e.g., Westlands Branch"
                  />
                </div>
                <Button onClick={handleSavePayment} disabled={isLoading} className="bg-accent hover:bg-accent/90">
                  {isLoading ? 'Saving...' : 'Save Payment Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Business Tab ── */}
          <TabsContent value="business">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Business Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Business Registration Number</label>
                  <Input
                    value={businessRegistrationNumber}
                    onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
                    placeholder="e.g., BN/2023/123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Tax ID (KRA PIN)</label>
                  <Input
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder="e.g., A001234567P"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Business Address</label>
                  <Input
                    value={businessAddress}
                    onChange={(e) => setBusinessAddress(e.target.value)}
                    placeholder="Enter your business address"
                  />
                </div>
                <Button onClick={handleSaveBusiness} disabled={isLoading} className="bg-accent hover:bg-accent/90">
                  {isLoading ? 'Saving...' : 'Save Business Details'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Notifications Tab ── */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { label: 'Email Notifications', sub: 'Receive updates via email', value: emailNotifications, set: setEmailNotifications },
                  { label: 'SMS Notifications', sub: 'Receive updates via SMS', value: smsNotifications, set: setSmsNotifications },
                  { label: 'Payment Reminders', sub: 'Get reminded about rent payments', value: paymentReminders, set: setPaymentReminders },
                  { label: 'Maintenance Alerts', sub: 'Alerts for maintenance requests', value: maintenanceAlerts, set: setMaintenanceAlerts },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.sub}</p>
                    </div>
                    <Button
                      variant={item.value ? 'default' : 'outline'}
                      onClick={() => item.set(!item.value)}
                      className={item.value ? 'bg-accent' : ''}
                    >
                      {item.value ? 'On' : 'Off'}
                    </Button>
                  </div>
                ))}
                <Button onClick={handleSaveNotifications} disabled={isLoading} className="bg-accent hover:bg-accent/90">
                  {isLoading ? 'Saving...' : 'Save Notification Preferences'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Penalty Tab ── */}
          <TabsContent value="penalty">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5" />
                  Penalty Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Late Fee Percentage (%)</label>
                  <Input
                    type="number"
                    value={lateFeePercentage}
                    onChange={(e) => setLateFeePercentage(e.target.value)}
                    placeholder="e.g., 5"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Grace Period (days)</label>
                  <Input
                    type="number"
                    value={lateFeeGracePeriod}
                    onChange={(e) => setLateFeeGracePeriod(e.target.value)}
                    placeholder="e.g., 5"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Penalty Rules Description</label>
                  <textarea
                    value={penaltyRules}
                    onChange={(e) => setPenaltyRules(e.target.value)}
                    placeholder="Describe your penalty rules..."
                    className="w-full min-h-25 px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
                  />
                </div>
                <Button onClick={handleSavePenalty} disabled={isLoading} className="bg-accent hover:bg-accent/90">
                  {isLoading ? 'Saving...' : 'Save Penalty Rules'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Invite Tenants Tab ── */}
          <TabsContent value="invite">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Invite Tenants
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {inviteLink ? (
                  <>
                    {/* Link display */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Your Invite Link</label>
                      <div className="flex gap-2">
                        <Input value={inviteLink} readOnly className="bg-muted text-sm" />
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(inviteLink)
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                          }}
                          variant="outline"
                        >
                          {copied ? '✓ Copied!' : 'Copy'}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Share this link with your tenants. They will be automatically linked to your property on signup.
                      </p>
                    </div>

                    {/* WhatsApp share */}
                    <Button
                      onClick={() => {
                        const message = `Hi! Join ${businessName || 'our property'} on LEA — the easiest way to manage your tenancy, pay rent, and stay connected. Sign up here: ${inviteLink}`
                        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      Share via WhatsApp
                    </Button>

                    {/* QR Code */}
                    <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl text-center">
                      <p className="text-sm font-semibold text-foreground mb-1">QR Code</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        Print and post this on your notice board so tenants can scan to join
                      </p>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(inviteLink)}`}
                        alt="Invite QR Code"
                        className="mx-auto rounded-lg border border-border"
                      />
                    </div>

                    {/* How it works */}
                    <div className="p-4 bg-accent/5 rounded-xl border border-accent/20">
                      <h4 className="font-medium text-foreground mb-2">How it works</h4>
                      <ul className="text-sm text-muted-foreground space-y-1.5">
                        <li>• Copy the link or scan the QR code and share it with your tenants via SMS, WhatsApp, or email</li>
                        <li>• When a tenant clicks the link they are taken directly to the LEA signup page</li>
                        <li>• After signing up they are automatically assigned to your property — no manual linking needed</li>
                        <li>• You can track all your tenants from the dashboard once they join</li>
                      </ul>
                    </div>

                    {/* Regenerate */}
                    <button
                      onClick={() => generateAndSaveInviteLink(landlordBlockId)}
                      className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
                    >
                      Regenerate invite link
                    </button>
                  </>
                ) : (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                      <Upload className="w-6 h-6 text-accent" />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">No invite link yet</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Generate a link to start inviting tenants to your property
                    </p>
                    <Button
                      onClick={() => generateAndSaveInviteLink(landlordBlockId)}
                      className="bg-accent hover:bg-accent/90 text-white"
                    >
                      Generate Invite Link
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}