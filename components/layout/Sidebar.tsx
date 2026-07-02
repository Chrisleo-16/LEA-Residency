'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare, Settings, LogOut, Search,
  AlertCircle, ClipboardList, FileText, Users,
  X, Building2, ChevronRight, Activity, Receipt
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { User, RealtimeChannel } from '@supabase/supabase-js'
import { useRouteLoader } from '@/components/RouteLoaderProvider'
import { Input } from '@alignui/input'
import { Avatar } from '@alignui/avatar'
import { Button } from '@alignui/button'
import { Badge } from '@alignui/badge'

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const router = useRouter()
  const supabaseRef = useRef(createClient())
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { startLoading } = useRouteLoader()

  useEffect(() => {
    let channel: RealtimeChannel | null = null
    let isMounted = true

    const supabase = supabaseRef.current

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return

      if (!session) {
        router.push('/login')
        return
      }

      setUser(session.user)

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, avatar_url')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!isMounted) return

      if (profileError) {
        console.error('Error fetching profile:', profileError)
      }

      if (profile) {
        setRole(profile.role)
        setFullName(profile.full_name || '')
        setAvatarUrl(profile.avatar_url || null)
      } else {
        console.warn('No profile found for user:', session.user.id)
      }

      channel = supabase
        .channel('sidebar-profile-realtime')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`,
        }, (payload) => {
          setFullName(payload.new.full_name || '')
          setAvatarUrl(payload.new.avatar_url || null)
          setRole(payload.new.role || null)
        })

      channel.subscribe()
    })

    return () => {
      isMounted = false
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [router])

  const handleLogout = async () => {
    await supabaseRef.current.auth.signOut()
    router.push('/login')
  }

  const tenantTabs = [
    { id: 'chat', label: 'Chat with Landlord', icon: MessageSquare, desc: 'Direct messages' },
    { id: 'community', label: 'Community', icon: Users, desc: 'Group & announcements' },
    { id: 'complaints', label: 'My Complaints', icon: AlertCircle, desc: 'Submit & track issues' },
    { id: 'requests', label: 'My Requests', icon: ClipboardList, desc: 'Service requests' },
    { id: 'payments', label: 'Payments', icon: Receipt, desc: 'Rent payment history' },
    { id: 'policy', label: 'Policy & Docs', icon: FileText, desc: 'Rules & documents' },
    { id: 'settings', label: 'Settings', icon: Settings, desc: 'Account preferences' },
  ]

  const landlordTabs = [
    { id: 'chat', label: 'Conversations', icon: MessageSquare, desc: 'Tenant messages' },
    { id: 'community', label: 'Community', icon: Users, desc: 'Group & announcements' },
    { id: 'complaints', label: 'Complaints', icon: AlertCircle, desc: 'Manage tenant issues' },
    { id: 'requests', label: 'Requests', icon: ClipboardList, desc: 'Service requests' },
    { id: 'payments', label: 'Rent Ledger', icon: Receipt, desc: 'Track all payments' },
    { id: 'policy', label: 'Manage Policies', icon: FileText, desc: 'Publish documents' },
    { id: 'billing', label: 'Subscription Billing', icon: Activity, desc: 'Manage subscription & payments' },
    { id: 'settings', label: 'Settings', icon: Settings, desc: 'Account preferences' },
  ]

  const tabs = role === 'landlord' ? landlordTabs : tenantTabs
  const filteredTabs = tabs.filter(t =>
    t.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div
      className="w-60 bg-[var(--color-fog)] flex flex-col h-full overflow-hidden"
      style={{ fontFamily: 'var(--font-sohne)' }}
    >
      {/* Brand header */}
      <div className="px-5 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[var(--color-rust)] flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-medium text-[var(--color-ink)] leading-tight tracking-tight">
              LEA Executive
            </h1>
            <p className="text-[11px] text-[var(--color-graphite)] tracking-wider uppercase mt-0.5">
              Residency & Apts
            </p>
          </div>
        </div>

        {/* Role badge — using AlignUI Badge for consistency */}
        {role && (
          <div className="flex items-center gap-2 mb-4" suppressHydrationWarning>
            <Badge
              variant="dot"
              color="rust"
              className="capitalize text-xs text-[var(--color-graphite)] bg-transparent border-0 px-0"
            >
              {role === 'landlord' ? 'Property Manager' : 'Resident Tenant'}
            </Badge>
          </div>
        )}

        {/* Search — AlignUI Input with clear button */}
        <Input
          type="search"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="h-3.5 w-3.5" />}
          clearButton={searchQuery ? true : false}
          onClear={() => setSearchQuery('')}
          className="w-full [&>div]:bg-white [&>div]:rounded-2xl [&>div]:border-[var(--color-dove)] [&>div]:text-xs [&>div]:h-9"
          wrapperClassName="[&>div:focus-within]:ring-1 [&>div:focus-within]:ring-[var(--color-rust)]/50"
        />
      </div>

      {/* Nav label */}
      <div className="px-5 mb-2 shrink-0">
        <p className="text-[10px] font-semibold text-[var(--color-graphite)] uppercase tracking-widest">
          Navigation
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 pb-4">
        {filteredTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'developer-dashboard') {
                  router.push('/developer-dashboard')
                } else {
                  setActiveTab(tab.id)
                }
              }}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left
                transition-all duration-150 group relative
                ${isActive
                  ? 'bg-white shadow-[var(--shadow-subtle)]'
                  : 'text-[var(--color-ink)]/60 hover:bg-white/50 hover:text-[var(--color-ink)]'
                }
              `}
            >
              <div
                className={`
                  w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all
                  ${isActive
                    ? 'bg-[var(--color-rust)]/10'
                    : 'bg-transparent'
                  }
                `}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-[var(--color-rust)]' : 'text-[var(--color-graphite)]'
                  }`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-tight text-[var(--color-ink)]">
                  {tab.label}
                </p>
                <p className="text-[11px] truncate mt-0.5 text-[var(--color-graphite)]">
                  {tab.desc}
                </p>
              </div>
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 text-[var(--color-rust)] shrink-0" />
              )}
            </button>
          )
        })}
      </nav>

      {/* Divider */}
      <div className="mx-5 border-t border-[var(--color-dove)] shrink-0" />

      {/* User footer — using AlignUI Avatar */}
      <div className="p-4 shrink-0" suppressHydrationWarning>
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-white shadow-[var(--shadow-subtle)]">
          <div className="relative shrink-0">
            <Avatar
              size="sm"
              src={avatarUrl || undefined}
              initials={fullName.charAt(0).toUpperCase() || '?'}
              className="ring-2 ring-[var(--color-rust)]/30 bg-[var(--color-rust)]"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[var(--color-ink)] truncate">
              {fullName || 'Loading...'}
            </p>
            <p className="text-[10px] text-[var(--color-graphite)] truncate mt-0.5">
              {user?.email}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              startLoading()
              handleLogout()
            }}
            className="text-[var(--color-graphite)] hover:text-[var(--color-ink)] hover:bg-[var(--color-fog)]"
            aria-label="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}