'use client'

import { useState, useEffect, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import {
  User as UserIcon, Lock, Bell, Camera,
  Info, Sun, Moon, AlertCircle, CheckCircle,
  Eye, EyeOff, Trash2, X, Clock, CheckCircle2,
  XCircle, Users
} from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

interface SettingsPanelProps {
  user: User | null
}

interface DeletionRequest {
  id: string
  user_id: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  profiles?: { full_name: string; email: string }
}

export default function SettingsPanel({ user }: SettingsPanelProps) {
  const router = useRouter()
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

  // Deletion request states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false)
  const [myDeletionRequest, setMyDeletionRequest] = useState<DeletionRequest | null>(null)
  const [allDeletionRequests, setAllDeletionRequests] = useState<DeletionRequest[]>([])
  const [showConfirmDelete, setShowConfirmDelete] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const { subscribe, unsubscribe } = usePushNotifications()

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

      // Fetch deletion requests based on role
      if (profile.role === 'landlord') {
        const { data } = await supabase
          .from('account_deletion_requests')
          .select('*, profiles(full_name, email)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
        setAllDeletionRequests(data || [])
      } else {
        const { data } = await supabase
          .from('account_deletion_requests')
          .select('*')
          .eq('user_id', user!.id)
          .maybeSingle()
        setMyDeletionRequest(data || null)
      }
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
    if (newDark) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  // ✅ Tenant submits deletion request
  const handleRequestDeletion = async () => {
    if (!deleteReason.trim()) return
    setIsSubmittingDelete(true)
    try {
      const { error } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: user!.id,
          reason: deleteReason.trim(),
          status: 'pending',
        })
      if (error) throw error
      setShowDeleteModal(false)
      setDeleteReason('')
      showFeedback('Deletion request submitted. Your landlord will review it.')
      fetchProfile()
    } catch (err: any) {
      showFeedback(err.message, true)
    } finally {
      setIsSubmittingDelete(false)
    }
  }

  // ✅ Tenant cancels their request
  const handleCancelRequest = async () => {
    if (!myDeletionRequest) return
    await supabase
      .from('account_deletion_requests')
      .delete()
      .eq('id', myDeletionRequest.id)
    setMyDeletionRequest(null)
    showFeedback('Deletion request cancelled.')
  }

  // ✅ Landlord approves and deletes the account
  const handleApproveAndDelete = async (requestId: string, targetUserId: string) => {
    try {
      // 1. Mark request as approved
      await supabase
        .from('account_deletion_requests')
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user!.id })
        .eq('id', requestId)

      // 2. Delete all user data in order
      await supabase.from('message_reads').delete().eq('user_id', targetUserId)
      await supabase.from('message_reactions').delete().eq('user_id', targetUserId)
      await supabase.from('messages').delete().eq('sender_id', targetUserId)
      await supabase.from('conversation_participants').delete().eq('user_id', targetUserId)
      await supabase.from('complaints').delete().eq('tenant_id', targetUserId)
      await supabase.from('requests').delete().eq('tenant_id', targetUserId)
      await supabase.from('account_deletion_requests').delete().eq('user_id', targetUserId)
      await supabase.from('profiles').delete().eq('id', targetUserId)

      // 3. Delete auth user via admin (requires service role)
      // Note: For full auth deletion, call a Supabase Edge Function
      // For now, profile deletion removes access
      setShowConfirmDelete(null)
      showFeedback('Tenant account and all data removed successfully.')
      fetchProfile()
    } catch (err: any) {
      showFeedback(err.message, true)
    }
  }

  // ✅ Landlord rejects the request
  const handleRejectRequest = async (requestId: string) => {
    await supabase
      .from('account_deletion_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user!.id })
      .eq('id', requestId)
    showFeedback('Request rejected. Tenant has been notified.')
    fetchProfile()
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':  return { icon: <Clock className="w-4 h-4 text-yellow-500" />,      label: 'Pending Review',  style: 'bg-yellow-100 text-yellow-700 border-yellow-200' }
      case 'approved': return { icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, label: 'Approved',         style: 'bg-green-100 text-green-700 border-green-200'   }
      case 'rejected': return { icon: <XCircle className="w-4 h-4 text-red-500" />,        label: 'Rejected',         style: 'bg-red-100 text-red-700 border-red-200'         }
      default: return { icon: null, label: status, style: '' }
    }
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

        {/* ── LANDLORD: Pending Deletion Requests ─────────────────── */}
        {role === 'landlord' && allDeletionRequests.length > 0 && (
          <Card className="p-4 sm:p-5 border border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-destructive" />
              <h3 className="font-semibold text-foreground text-sm">
                Account Deletion Requests
              </h3>
              <span className="ml-auto text-xs bg-destructive text-white px-2 py-0.5 rounded-full font-bold">
                {allDeletionRequests.length}
              </span>
            </div>
            <div className="space-y-3">
              {allDeletionRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 bg-background rounded-xl border border-border space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {req.profiles?.full_name || 'Unknown Tenant'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {req.profiles?.email}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(req.created_at).toLocaleDateString(undefined, {
                        day: 'numeric', month: 'short', year: 'numeric',
                        timeZone: 'Africa/Nairobi'
                      })}
                    </span>
                  </div>
                  {req.reason && (
                    <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2">
                      <span className="font-medium">Reason:</span> {req.reason}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => setShowConfirmDelete(req.id)}
                      className="flex-1 bg-destructive hover:bg-destructive/90 text-white h-8 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Approve & Delete
                    </Button>
                    <Button
                      onClick={() => handleRejectRequest(req.id)}
                      variant="outline"
                      className="flex-1 border-border h-8 text-xs"
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" />
                      Reject
                    </Button>
                  </div>

                  {/* Confirm delete dialog */}
                  {showConfirmDelete === req.id && (
                    <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3 space-y-3">
                      <p className="text-sm font-semibold text-destructive">
                        ⚠️ This action is irreversible
                      </p>
                      <p className="text-xs text-muted-foreground">
                        All messages, complaints, requests and account data for{' '}
                        <span className="font-semibold">{req.profiles?.full_name}</span> will be
                        permanently deleted.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleApproveAndDelete(req.id, req.user_id)}
                          className="flex-1 bg-destructive hover:bg-destructive/90 text-white h-8 text-xs"
                        >
                          Yes, Delete Everything
                        </Button>
                        <Button
                          onClick={() => setShowConfirmDelete(null)}
                          variant="outline"
                          className="flex-1 border-border h-8 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── TENANT: Account Deletion Section ────────────────────── */}
        {role === 'tenant' && (
          <Card className="p-4 sm:p-5 border border-destructive/30">
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-4 h-4 text-destructive" />
              <h3 className="font-semibold text-foreground text-sm">Delete Account</h3>
            </div>

            {/* No request yet */}
            {!myDeletionRequest && (
              <>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  Request your landlord to delete your account. All your messages,
                  complaints, requests and personal data will be permanently removed.
                </p>
                <Button
                  onClick={() => setShowDeleteModal(true)}
                  variant="outline"
                  className="w-full border-destructive text-destructive hover:bg-destructive/10 h-10 gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Request Account Deletion
                </Button>
              </>
            )}

            {/* Request already submitted */}
            {myDeletionRequest && (
              <div className="space-y-3">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                  getStatusConfig(myDeletionRequest.status).style
                }`}>
                  {getStatusConfig(myDeletionRequest.status).icon}
                  <span className="font-medium">
                    {getStatusConfig(myDeletionRequest.status).label}
                  </span>
                </div>

                {myDeletionRequest.status === 'pending' && (
                  <p className="text-xs text-muted-foreground">
                    Your request is awaiting review by the landlord. You will be notified once it's processed.
                  </p>
                )}

                {myDeletionRequest.status === 'rejected' && (
                  <p className="text-xs text-muted-foreground">
                    Your deletion request was rejected. Contact your landlord for more information.
                  </p>
                )}

                {myDeletionRequest.reason && (
                  <div className="text-xs text-muted-foreground bg-secondary/50 rounded-lg p-2">
                    <span className="font-medium">Your reason:</span> {myDeletionRequest.reason}
                  </div>
                )}

                {myDeletionRequest.status === 'pending' && (
                  <Button
                    onClick={handleCancelRequest}
                    variant="outline"
                    className="w-full border-border h-9 text-xs"
                  >
                    Cancel Request
                  </Button>
                )}
              </div>
            )}
          </Card>
        )}

        <div className="h-4" />
      </div>

      {/* ── Delete Request Modal ─────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl border border-border w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground text-lg">Request Account Deletion</h3>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteReason('') }}
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              Your request will be sent to the landlord for review. Once approved,
              all your data will be permanently deleted and you will lose access.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Reason for deletion <span className="text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="e.g. Moving out, no longer a tenant..."
                  rows={3}
                  className="w-full rounded-md border border-border bg-input text-foreground placeholder:text-muted-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </div>

              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-xs text-destructive font-medium">
                  ⚠️ This will permanently delete:
                </p>
                <ul className="text-xs text-destructive/80 mt-1 space-y-0.5 list-disc list-inside">
                  <li>All your messages and chat history</li>
                  <li>All your complaints and requests</li>
                  <li>Your profile and account data</li>
                </ul>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowDeleteModal(false); setDeleteReason('') }}
                  className="flex-1 border-border"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestDeletion}
                  disabled={isSubmittingDelete}
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
                >
                  {isSubmittingDelete ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
// ```

// ---

// **How the full flow works:**
// ```
// TENANT                              LANDLORD
// ──────────────────                  ──────────────────
// Settings → Delete Account           Settings → sees pending requests
// → fills reason (optional)           → sees tenant name, email, reason
// → submits request                   → can Approve & Delete or Reject
// → sees pending status               → Approve triggers full data wipe:
// → can cancel if pending               ✅ message_reads deleted
//                                       ✅ message_reactions deleted
//                                       ✅ messages deleted
//                                       ✅ conversation_participants deleted
//                                       ✅ complaints deleted
//                                       ✅ requests deleted
//                                       ✅ deletion_requests deleted
//                                       ✅ profiles deleted
//                                       ✅ confirmation shown