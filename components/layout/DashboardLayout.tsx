'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Menu } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import ChatArea from '@/components/chat/ChatArea'
import SettingsPanel from '@/components/settings/SettingsPanel'
import InstallPrompt from '@/components/pwa/InstallPrompt'
import ComplaintsPage from '@/components/pages/ComplaintsPage'
import RequestsPage from '@/components/pages/RequestsPage'
import PolicyPage from '@/components/pages/PolicyPage'
import CommunityPage from '@/components/pages/CommunityPage'

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
      chat: 'Chat',
      community: 'Community',
      complaints: 'Complaints',
      requests: 'Requests',
      policy: 'Policy & Docs',
      settings: 'Settings',
    }
    return titles[activeTab] || 'LEA Executive'
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':       return <ChatArea user={user} />
      case 'community':  return <CommunityPage user={user} />
      case 'complaints': return <ComplaintsPage user={user} />
      case 'requests':   return <RequestsPage user={user} />
      case 'policy':     return <PolicyPage user={user} />
      case 'settings':   return <SettingsPanel user={user} />
      default:           return <ChatArea user={user} />
    }
  }

  return (
    <>
      <div className="flex h-dvh bg-background overflow-hidden">

        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
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

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* Mobile top navbar */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0 shadow-sm">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md hover:bg-secondary text-foreground transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-foreground text-sm">{getPageTitle()}</h1>
            {/* Spacer to center the title */}
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
