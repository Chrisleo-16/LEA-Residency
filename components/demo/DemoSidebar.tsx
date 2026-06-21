// components/demo/DemoSidebar.tsx
'use client'

import { useState } from 'react'
import {
  MessageSquare, Settings, LogOut, Search,
  AlertCircle, ClipboardList, FileText, Users,
  X, Building2, ChevronRight, Receipt
} from 'lucide-react'

interface DemoSidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  demoName: string
  demoRole: 'tenant' | 'landlord'
  onLogout: () => void
}

export default function DemoSidebar({
  activeTab, setActiveTab, demoName, demoRole, onLogout
}: DemoSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')

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
    { id: 'settings', label: 'Settings', icon: Settings, desc: 'Account preferences' },
  ]

  const tabs = demoRole === 'landlord' ? landlordTabs : tenantTabs
  const filteredTabs = tabs.filter(t =>
    t.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-72 bg-sidebar flex flex-col h-full overflow-hidden">
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

        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="text-xs text-sidebar-foreground/50 capitalize tracking-wide">
            {demoRole === 'landlord' ? 'Property Manager (Demo)' : 'Resident Tenant (Demo)'}
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-sidebar-foreground/30" />
          <input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-8 py-2 bg-sidebar-accent border border-sidebar-border rounded-lg text-sidebar-foreground placeholder:text-sidebar-foreground/30 text-xs focus:outline-none focus:ring-1 focus:ring-sidebar-primary/50"
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

      <div className="px-5 mb-2 shrink-0">
        <p className="text-[10px] font-semibold text-sidebar-foreground/30 uppercase tracking-widest">
          Navigation
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 pb-4">
        {filteredTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left
                transition-all duration-150 group relative
                ${isActive
                  ? 'bg-accent text-white shadow-md shadow-accent/20'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }
              `}
            >
              <div className={`
                w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all
                ${isActive ? 'bg-white/20' : 'bg-sidebar-accent group-hover:bg-sidebar-border'}
              `}>
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-sidebar-foreground/60'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate leading-tight ${isActive ? 'text-white' : ''}`}>
                  {tab.label}
                </p>
                <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-white/60' : 'text-sidebar-foreground/30'}`}>
                  {tab.desc}
                </p>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/60 shrink-0" />}
            </button>
          )
        })}
      </nav>

      <div className="mx-5 border-t border-sidebar-border shrink-0" />

      <div className="p-4 shrink-0">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent border border-sidebar-border">
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center ring-2 ring-accent/30">
              <span className="text-sm font-bold text-white">
                {demoName.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-sidebar-accent rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">
              {demoName}
            </p>
            <p className="text-[10px] text-sidebar-foreground/40 truncate mt-0.5">
              demo session
            </p>
          </div>
          <button
            onClick={onLogout}
            className="p-1.5 rounded-lg hover:bg-sidebar-border text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors shrink-0"
            title="End Demo"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}