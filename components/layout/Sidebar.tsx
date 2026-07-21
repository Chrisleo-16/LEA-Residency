'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Inter } from 'next/font/google'
import {
  MessageSquare, Settings, LogOut, Search,
  AlertCircle, ClipboardList, FileText, Users,
  Building2, Activity, Sparkles,
  Receipt, HelpCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { User, RealtimeChannel } from '@supabase/supabase-js'
import { useRouteLoader } from '@/components/RouteLoaderProvider'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import ThemeToggle from '@/components/theme-toggle'
import { getVisibleMenuIds } from '@/lib/focusAreas'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

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
  const [focusAreas, setFocusAreas] = useState<string[] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { startLoading } = useRouteLoader();

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
        .select('role, full_name, avatar_url, focus_areas')
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
        setFocusAreas(profile.focus_areas || null)
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
          setFocusAreas(payload.new.focus_areas || null)
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

  const tenantMenu = [
    { id: 'chat',       label: 'Chat with Landlord', icon: MessageSquare },
    { id: 'community',  label: 'Community',          icon: Users },
    { id: 'complaints', label: 'My Complaints',      icon: AlertCircle },
    { id: 'requests',   label: 'My Requests',        icon: ClipboardList },
    { id: 'payments',   label: 'Payments',           icon: Receipt },
    // { id: 'listings',   label: 'Listings',           icon: Grid3x3 },
    { id: 'policy',     label: 'Policy & Docs',      icon: FileText },
  ]

  const landlordMenu = [
    { id: 'chat',       label: 'Conversations',       icon: MessageSquare },
    { id: 'leads',      label: 'Tenant Leads',         icon: Sparkles },
    { id: 'community',  label: 'Community',           icon: Users },
    { id: 'complaints', label: 'Complaints',           icon: AlertCircle },
    { id: 'requests',   label: 'Requests',             icon: ClipboardList },
    { id: 'payments',   label: 'Rent Ledger',          icon: Receipt },
    { id: 'policy',     label: 'Manage Policies',      icon: FileText },
    { id: 'billing',    label: 'Subscription Billing', icon: Activity },
  ]

  const menu = role === 'landlord' ? landlordMenu : tenantMenu

  // null visibleIds = show everything (legacy landlords / setup skipped personalization)
  const visibleIds = role === 'landlord' ? getVisibleMenuIds(focusAreas) : null
  const scopedMenu = visibleIds ? menu.filter((t) => visibleIds.has(t.id)) : menu

  const filteredMenu = scopedMenu.filter(t =>
    t.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleNav = (id: string) => {
    setActiveTab(id)
  }

  return (
    <div className={`${inter.className} w-64 bg-sidebar flex flex-col h-full overflow-hidden border-r border-sidebar-border`}>
      {/* Header */}
      <div className="px-5 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-md bg-neutral-900 dark:bg-white flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-white dark:text-neutral-900" strokeWidth={2} />
          </div>
          <span className="font-semibold text-sidebar-foreground truncate">LEA Executive</span>
          <div className="ml-auto"><ThemeToggle /></div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-secondary border border-border rounded-md text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-neutral-400 transition-all"
          />
        </div>
      </div>

      {/* Quick Actions label */}
      <p className="px-5 pt-2 pb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide shrink-0">
        Menu
      </p>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 scrollbar-hide">
        {filteredMenu.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              data-tour={`nav-${tab.id}`}
              onClick={() => handleNav(tab.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm
                transition-colors
                ${isActive
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-secondary hover:text-sidebar-foreground'
                }
              `}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Help & Support */}
      <div className="px-3 pt-3 pb-1 shrink-0 border-t border-sidebar-border">
        <p className="px-3 pt-3 pb-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          Help &amp; Support
        </p>
        <button
          onClick={() => router.push('/contact')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm text-sidebar-foreground/70 hover:bg-secondary hover:text-sidebar-foreground transition-colors"
        >
          <HelpCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          Contact Support
        </button>
        <button
          data-tour="nav-settings"
          onClick={() => handleNav('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm transition-colors ${
            activeTab === 'settings'
              ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-medium'
              : 'text-sidebar-foreground/70 hover:bg-secondary hover:text-sidebar-foreground'
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          Settings
        </button>
      </div>

      {/* User footer */}
      <div className="p-3 shrink-0 border-t border-sidebar-border" suppressHydrationWarning>
        <div className="flex items-center gap-2.5 p-2 rounded-md hover:bg-secondary transition-colors group">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarImage src={avatarUrl || ''} />
            <AvatarFallback className="bg-neutral-200 dark:bg-neutral-700 text-sidebar-foreground font-medium text-xs">
              {fullName.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {fullName || 'Loading...'}
            </p>
            <p className="text-[11px] text-muted-foreground truncate capitalize">
              {role || user?.email}
            </p>
          </div>

          <button
            onClick={() => {
              startLoading('/login');
              handleLogout();
            }}
            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}
