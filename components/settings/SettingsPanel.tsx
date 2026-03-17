'use client'

import { useState, useEffect, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  User as UserIcon, Lock, Bell, Camera,
  Info, Sun, Moon, AlertCircle, CheckCircle,
  Eye, EyeOff
} from 'lucide-react'

interface SettingsPanelProps {
  user: User | null
}
// Replace the notification toggle handler with this
import { usePushNotifications } from '@/hooks/usePushNotifications'

// Inside your component

export default function SettingsPanel({ user }: SettingsPanelProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [notifications, setNotifications] = useState(false)
  const [isDark, setIsDark] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const { subscribe, unsubscribe, isSubscribed, requestPermission } = usePushNotifications()

const handleToggleNotifications = async () => {
  if (notifications) {
    await unsubscribe()
    setNotifications(false)
    localStorage.setItem('notifications', 'false')
  } else {
    const success = await subscribe()
    setNotifications(success)
    localStorage.setItem('notifications', String(success))
  }
}
  useEffect(() => {
    if (!user) return
    fetchProfile()
    const saved = localStorage.getItem('theme')
    if (saved === 'dark') { setIsDark(true); document.documentElement.classList.add('dark') }
    const notifPref = localStorage.getItem('notifications')
    setNotifications(notifPref === 'true')
  }, [user])

  const fetchProfile = async () => {
    setIsLoading(true)
    const { data: profile } = await supabase
      .from('profiles').select('full_name, email, role, avatar_url')
      .eq('id', user!.id).single()
    if (profile) {
      setFullName(profile.full_name || '')
      setEmail(profile.email || '')
      setRole(profile.role || '')
      setAvatarUrl(profile.avatar_url || null)
    }
    setIsLoading(false)
  }

  const showFeedback = (msg: string, isError = false) => {
    if (isError) setError(msg)
    else setSuccess(msg)
    setTimeout(() => { setError(''); setSuccess('') }, 4000)
  }

  const handleUpdateProfile = async () => {
    setIsSavingProfile(true)
    try {
      const { error } = await supabase
        .from('profiles').update({ full_name: fullName }).eq('id', user!.id)
      if (error) throw error
      showFeedback('Profile updated successfully!')
    } catch (err: any) {
      showFeedback(err.message, true)
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      showFeedback('Passwords do not match.', true); return
    }
    const strong = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/
    if (!strong.test(newPassword)) {
      showFeedback('Password must be 8+ characters with a number and special character.', true); return
    }
    setIsSavingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      showFeedback('Password changed successfully!')
      setNewPassword(''); setConfirmPassword('')
    } catch (err: any) {
      showFeedback(err.message, true)
    } finally {
      setIsSavingPassword(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const fileName = `${user!.id}-${Date.now()}`
      const { data, error } = await supabase.storage
        .from('avatars').upload(fileName, file, { upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(data.path)
      await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user!.id)
      setAvatarUrl(urlData.publicUrl)
      showFeedback('Profile photo updated!')
    } catch (err: any) {
      showFeedback(err.message, true)
    }
  }


  const handleToggleTheme = () => {
    const newDark = !isDark
    setIsDark(newDark)
    if (newDark) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark') }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light') }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 max-w-2xl mx-auto w-full">

        {/* Header */}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Settings</h2>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Manage your account and preferences
          </p>
        </div>

        {/* Feedback */}
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {success && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-md flex items-start gap-3">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        {/* Account Info */}
        <Card className="p-4 sm:p-5 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-accent" />
            <h3 className="font-semibold text-foreground text-sm">Account Info</h3>
          </div>
          <div className="space-y-2.5">
            {[
              { label: 'Email', value: email },
              { label: 'Role', value: role, capitalize: true },
              { label: 'User ID', value: user?.id, mono: true, truncate: true },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4">
                <span className="text-xs sm:text-sm text-muted-foreground shrink-0">{item.label}</span>
                <span className={`text-xs sm:text-sm text-foreground font-medium text-right truncate ${
                  item.capitalize ? 'capitalize' : ''
                } ${item.mono ? 'font-mono text-xs' : ''}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Profile Photo */}
        <Card className="p-4 sm:p-5 border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="w-4 h-4 text-accent" />
            <h3 className="font-semibold text-foreground text-sm">Profile Photo</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-accent flex items-center justify-center overflow-hidden shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-accent-foreground">
                  {fullName.charAt(0).toUpperCase() || '?'}
                </span>
              )}
            </div>
            <div>
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="border-border text-foreground hover:bg-secondary h-9 text-sm gap-2"
              >
                <Camera className="w-4 h-4" />
                Change Photo
              </Button>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG up to 2MB</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
        </Card>

        {/* Update Full Name */}
        <Card className="p-4 sm:p-5 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <UserIcon className="w-4 h-4 text-accent" />
            <h3 className="font-semibold text-foreground text-sm">Update Full Name</h3>
          </div>
          <div className="space-y-3">
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="bg-input border-border text-foreground"
            />
            <Button
              onClick={handleUpdateProfile}
              disabled={isSavingProfile}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-10"
            >
              {isSavingProfile ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </Card>

        {/* Change Password */}
        <Card className="p-4 sm:p-5 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-accent" />
            <h3 className="font-semibold text-foreground text-sm">Change Password</h3>
          </div>
          <div className="space-y-3">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="bg-input border-border text-foreground pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="bg-input border-border text-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Min 8 characters with a number and special character
            </p>
            <Button
              onClick={handleChangePassword}
              disabled={isSavingPassword || !newPassword}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground h-10"
            >
              {isSavingPassword ? 'Updating...' : 'Change Password'}
            </Button>
          </div>
        </Card>

        {/* Toggle cards */}
        {[
          {
            icon: <Bell className="w-4 h-4 text-accent" />,
            title: 'Push Notifications',
            subtitle: 'Get notified about messages and updates',
            checked: notifications,
            onToggle: handleToggleNotifications,
          },
          {
            icon: isDark
              ? <Moon className="w-4 h-4 text-accent" />
              : <Sun className="w-4 h-4 text-accent" />,
            title: isDark ? 'Dark Mode' : 'Light Mode',
            subtitle: 'Toggle app appearance',
            checked: isDark,
            onToggle: handleToggleTheme,
          },
        ].map((item) => (
          <Card key={item.title} className="p-4 sm:p-5 border border-border">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {item.icon}
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.subtitle}</p>
                </div>
              </div>
              <button
                onClick={item.onToggle}
                className={`relative w-10 h-5 sm:w-11 sm:h-6 rounded-full transition-colors shrink-0 ${
                  item.checked ? 'bg-accent' : 'bg-border'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-white rounded-full shadow transition-transform ${
                  item.checked ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </Card>
        ))}

        {/* Bottom padding for mobile */}
        <div className="h-4" />
      </div>
    </div>
  )
}
