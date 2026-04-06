'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Menu, Building2, ArrowUpRight } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import ChatArea from '@/components/chat/ChatArea'
import SettingsPanel from '@/components/settings/SettingsPanel'
import InstallPrompt from '@/components/pwa/InstallPrompt'
import ComplaintsPage from '@/components/pages/ComplaintsPage'
import RequestsPage from '@/components/pages/RequestsPage'
import PolicyPage from '@/components/pages/PolicyPage'
import CommunityPage from '@/components/pages/CommunityPage'
import PaymentsPage from '@/components/pages/PaymentsPage'
import PhotoGallery from '@/components/pages/PhotoGallery'
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
      gallery: 'Photo Gallery',
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
      gallery: 'View and manage property photos',
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
      case 'gallery':    return <PhotoGallery user={user} />
      case 'settings':   return <SettingsPanel user={user} />
      default:           return <ChatArea user={user} />
    }
  }

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        .gold-accent { color: #c9a96e; }
        .gold-bg { background: #c9a96e; }
        .gold-border { border-color: #c9a96e; }
        .dark-bg { background: #0f0f0f; }
        .card-bg { background: #161616; }
        .text-primary { color: #f5f0e8; }
        .text-secondary { color: rgba(245,240,232,0.65); }
        .text-muted { color: rgba(245,240,232,0.45); }
        .border-gold { border: 1px solid rgba(201,169,110,0.25); }
        .border-subtle { border: 1px solid rgba(245,240,232,0.08); }
        .hover-gold:hover { border-color: #c9a96e; color: #c9a96e; }
        .btn-gold {
          background: #c9a96e;
          color: #0f0f0f;
          border: none;
          padding: 8px 20px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.3s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn-gold:hover {
          background: #b8914f;
          transform: translateY(-1px);
        }
      `}</style>
      
      <div className="dark-bg min-h-screen" style={{ fontFamily: "'DM Sans', sans-serif", color: '#f5f0e8' }}>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-20 md:hidden"
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
          <div className="hidden md:flex items-center justify-between px-6 py-4 border-subtle card-bg/90 backdrop-blur-sm shrink-0">
            <div>
              <h1 className="text-lg font-bold text-primary" style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: '0.06em' }}>{getPageTitle()}</h1>
              <p className="text-xs text-secondary mt-0.5">{getPageSubtitle()}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full gold-bg animate-pulse" />
              <span className="text-xs text-secondary">LEA Executive Residency</span>
            </div>
          </div>

          {/* Mobile top navbar */}
          <div className="md:hidden flex items-center justify-between px-4 py-3 border-subtle card-bg shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-card-bg text-primary transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 gold-accent" />
              <h1 className="font-bold text-primary text-sm" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{getPageTitle()}</h1>
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