'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  MessageSquare, Settings, LogOut, Search,
  AlertCircle, ClipboardList, FileText, Users, X
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

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

  useEffect(() => {
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
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const tenantTabs = [
    { id: 'chat',       label: 'Chat with Landlord', icon: MessageSquare },
    { id: 'community',  label: 'Community',           icon: Users         },
    { id: 'complaints', label: 'My Complaints',       icon: AlertCircle   },
    { id: 'requests',   label: 'My Requests',         icon: ClipboardList },
    { id: 'policy',     label: 'Policy & Docs',       icon: FileText      },
    { id: 'settings',   label: 'Settings',            icon: Settings      },
  ]

  const landlordTabs = [
    { id: 'chat',       label: 'Conversations',       icon: MessageSquare },
    { id: 'community',  label: 'Community',           icon: Users         },
    { id: 'complaints', label: 'Complaints',          icon: AlertCircle   },
    { id: 'requests',   label: 'Requests',            icon: ClipboardList },
    { id: 'policy',     label: 'Manage Policies',     icon: FileText      },
    { id: 'settings',   label: 'Settings',            icon: Settings      },
  ]

  const tabs = role === 'landlord' ? landlordTabs : tenantTabs

  const filteredTabs = tabs.filter(t =>
    t.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-72 bg-sidebar border-r border-sidebar-border flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="p-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-bold text-sidebar-foreground leading-tight">
              LEA Executive
            </h1>
            <p className="text-xs text-sidebar-foreground/50">Residency & Apartments</p>
          </div>
          {role && (
            <span className="text-xs capitalize bg-accent text-accent-foreground px-2 py-0.5 rounded-full shrink-0">
              {role}
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-sidebar-foreground/40" />
          <Input
            placeholder="Search menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40 h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-sidebar-foreground/40 hover:text-sidebar-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {filteredTabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-150 ${
                activeTab === tab.id
                  ? 'bg-sidebar-accent text-sidebar-primary border-r-2 border-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${activeTab === tab.id ? 'text-sidebar-primary' : ''}`} />
              <span className="truncate">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* User Footer */}
      <div className="border-t border-sidebar-border p-4 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center shrink-0 overflow-hidden">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-accent-foreground">
                {fullName.charAt(0).toUpperCase() || '?'}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {fullName || 'Loading...'}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">
              {user?.email}
            </p>
          </div>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/50 justify-center gap-2 h-9 text-sm"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}
