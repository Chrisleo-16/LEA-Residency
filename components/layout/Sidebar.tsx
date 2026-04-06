'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  MessageSquare, Settings, LogOut, Search,
  AlertCircle, ClipboardList, FileText, Users,
  X, Home, Building2, ChevronRight, ImageIcon, Menu
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { Receipt } from 'lucide-react'
interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setUser(session.user)

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, avatar_url')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        setRole(profile.role)
        setFullName(profile.full_name || '')
        setAvatarUrl(profile.avatar_url || null)
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
        .subscribe()
    })

    return () => {
      channel?.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const tenantTabs = [
    { id: 'chat', label: 'Messages', icon: MessageSquare },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
    { id: 'complaints', label: 'Complaints', icon: FileText },
    { id: 'requests', label: 'Requests', icon: FileText },
    { id: 'policy', label: 'Policy', icon: FileText },
    { id: 'payments', label: 'Payments', icon: Receipt },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const landlordTabs = [
    { id: 'chat', label: 'Messages', icon: MessageSquare },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'gallery', label: 'Gallery', icon: ImageIcon },
    { id: 'complaints', label: 'Issues', icon: FileText },
    { id: 'requests', label: 'Requests', icon: FileText },
    { id: 'policy', label: 'Documents', icon: FileText },
    { id: 'payments', label: 'Payments', icon: Receipt },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const tabs = role === 'landlord' ? landlordTabs : tenantTabs
  const filteredTabs = tabs.filter(t =>
    t.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      <style jsx>{`
        .sidebar-dark { background: #161616; }
        .sidebar-darker { background: #0f0f0f; }
        .text-primary { color: #f5f0e8; }
        .text-secondary { color: rgba(245,240,232,0.65); }
        .text-muted { color: rgba(245,240,232,0.45); }
        .gold-accent { color: #c9a96e; }
        .gold-bg { background: #c9a96e; }
        .border-gold { border-color: #c9a96e; }
        .border-subtle { border: 1px solid rgba(245,240,232,0.08); }
        .hover-gold:hover { background: rgba(201,169,110,0.15); color: #c9a96e; }
        .active-tab { background: rgba(201,169,110,0.15); color: #c9a96e; }
        .sidebar-transition { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
      
      <div className={`sidebar-dark h-full flex flex-col border-r border-subtle sidebar-transition ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}>
        <div className="px-5 pt-6 pb-4 shrink-0">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0 shadow-lg shadow-accent/25">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-sidebar-foreground leading-tight tracking-wide">
                LEA Executive
              </h1>
              <p className="text-[11px] text-sidebar-foreground/40 tracking-wider uppercase mt-0.5">
                Residency & Apts
              </p>
            </div>
          </div>

          {/* Role badge */}
          {role && (
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="text-xs text-sidebar-foreground/50 capitalize tracking-wide">
                {role === 'landlord' ? 'Property Manager' : 'Resident Tenant'}
              </span>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-sidebar-foreground/30" />
            <input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-sidebar-accent border border-sidebar-border rounded-lg text-sidebar-foreground placeholder:text-sidebar-foreground/30 text-xs focus:outline-none focus:ring-1 focus:ring-sidebar-primary/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-sidebar-foreground/30 hover:text-sidebar-foreground/60"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Nav label */}
        <div className="px-5 mb-2 shrink-0">
          <p className="text-[10px] font-semibold text-sidebar-foreground/30 uppercase tracking-widest">
            Navigation
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all sidebar-transition ${
                  isActive ? 'active-tab' : 'hover-gold text-secondary'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${
                  isActive ? 'gold-accent' : ''
                }`} />
                {!isCollapsed && (
                  <span className="text-sm font-medium">{tab.label}</span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Divider */}
        <div className="mx-5 border-t border-sidebar-border shrink-0" />

        {/* User footer */}
        <div className="p-4 shrink-0">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent border border-sidebar-border">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center overflow-hidden ring-2 ring-accent/30">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white">
                    {fullName.charAt(0).toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-sidebar-accent rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">
                {fullName || 'Loading...'}
              </p>
              <p className="text-[10px] text-sidebar-foreground/40 truncate mt-0.5">
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-sidebar-border text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors shrink-0"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-subtle">
          {!isCollapsed && (
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-2 rounded border-gold flex items-center justify-center">
                <Home className="w-4 h-4 gold-accent" />
              </div>
              <button
                onClick={() => window.location.href = '/'}
                className="text-xs text-secondary hover:text-primary transition-colors"
              >
                Back to Home
              </button>
            </div>
          )}
          {isCollapsed && (
            <button
              onClick={() => window.location.href = '/'}
              className="w-full flex justify-center p-2 rounded-lg hover:bg-card-bg text-secondary transition-colors"
            >
              <Home className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </>
  )
}