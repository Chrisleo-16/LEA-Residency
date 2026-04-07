'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Menu, Building2 } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import ChatArea from '@/components/chat/ChatArea'
import SettingsPanel from '@/components/settings/SettingsPanel'
import InstallPrompt from '@/components/pwa/InstallPrompt'
import ComplaintsPage from '@/components/pages/ComplaintsPage'
import RequestsPage from '@/components/pages/RequestsPage'
import PolicyPage from '@/components/pages/PolicyPage'
import CommunityPage from '@/components/pages/CommunityPage'
import PaymentsPage from '@/components/pages/PaymentsPage'
interface DashboardLayoutProps {
  user: User | null
}

export default function DashboardLayout({ user }: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setSidebarOpen(false)
  }

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      chat: 'Messages',
      community: 'Community',
      complaints: 'Complaints',
      requests: 'Requests',
      policy: 'Policy & Docs',
      payments: 'Payments',
      settings: 'Settings',
    }
    return titles[activeTab] || 'LEA Executive'
  }

  const getPageSubtitle = () => {
    const subtitles: Record<string, string> = {
      chat: 'Your private conversations',
      community: 'Group chat & announcements',
      complaints: 'Submit and track your issues',
      requests: 'Service & maintenance requests',
      policy: 'Rules, documents & guidelines',
      payments: 'Track rent payments and receipts',
      settings: 'Account & preferences',
    }
    return subtitles[activeTab] || ''
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':       return <ChatArea user={user} />
      case 'community':  return <CommunityPage user={user} />
      case 'complaints': return <ComplaintsPage user={user} />
      case 'requests':   return <RequestsPage user={user} />
      case 'policy':     return <PolicyPage user={user} />
      case 'payments':   return <PaymentsPage user={user} />
      case 'settings':   return <SettingsPanel user={user} />
      default:           return <ChatArea user={user} />
    }
  }

  return (
    <>
      <div className="flex h-dvh bg-background overflow-hidden">

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed md:relative inset-y-0 left-0 z-30 h-full
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:flex md:shrink-0
        `}>
          <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Desktop top bar */}
          <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
            <div>
              <h1 className="text-lg font-bold text-foreground">{getPageTitle()}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{getPageSubtitle()}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-xs text-muted-foreground">LEA Executive Residency</span>
            </div>
          </div>

          {/* Mobile top navbar */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-secondary text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-accent" />
              <h1 className="font-bold text-foreground text-sm">{getPageTitle()}</h1>
            </div>
            <div className="w-9" />
          </div>

          {/* Page content */}
          <div className="flex-1 overflow-hidden">
            {renderContent()}
          </div>
        </div>
      </div>

      <InstallPrompt />
    </>
  )
}