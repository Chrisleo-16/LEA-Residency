'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, Building2 } from 'lucide-react'
import DemoSidebar from '@/components/demo/DemoSidebar'
import DemoChatPage from '@/components/demo/pages/DemoChatPage'
import DemoCommunityPage from '@/components/demo/pages/DemoCommunityPage'
// Will add these as we build them:
// import DemoComplaintsPage from '@/components/demo/pages/DemoComplaintsPage'
// import DemoRequestsPage from '@/components/demo/pages/DemoRequestsPage'
// import DemoPaymentsPage from '@/components/demo/pages/DemoPaymentsPage'
// import DemoPolicyPage from '@/components/demo/pages/DemoPolicyPage'

interface DemoDashboardLayoutProps {
  demoName: string
  demoRole: 'tenant' | 'landlord'
}

export default function DemoDashboardLayout({ demoName, demoRole }: DemoDashboardLayoutProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setSidebarOpen(false)
  }

  const handleDemoLogout = async () => {
    await fetch('/api/demo/end', { method: 'POST' })
    sessionStorage.removeItem('lea_demo_warning_seen')
    router.push('/')
  }

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      chat: demoRole === 'landlord' ? 'Conversations' : 'Messages',
      community: 'Community',
      complaints: demoRole === 'landlord' ? 'Complaints' : 'My Complaints',
      requests: demoRole === 'landlord' ? 'Requests' : 'My Requests',
      payments: demoRole === 'landlord' ? 'Rent Ledger' : 'Payments',
      policy: demoRole === 'landlord' ? 'Manage Policies' : 'Policy & Docs',
      settings: 'Settings',
    }
    return titles[activeTab] || 'LEA Executive'
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <DemoChatPage demoName={demoName} demoRole={demoRole} />
      case 'community':
        return <DemoCommunityPage demoName={demoName} demoRole={demoRole} />
      case 'complaints':
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Demo complaints coming next
          </div>
        )
      case 'requests':
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Demo requests coming next
          </div>
        )
      case 'payments':
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Demo payments coming next
          </div>
        )
      case 'policy':
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Demo policy coming next
          </div>
        )
      case 'settings':
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Settings not available in demo mode
          </div>
        )
      default:
        return <DemoChatPage demoName={demoName} demoRole={demoRole} />
    }
  }

  return (
    <div className="flex h-dvh bg-background overflow-hidden">

      <div className="fixed top-0 left-0 right-0 z-40 bg-accent text-white text-center text-xs py-1.5 font-medium">
        🎬 You're in demo mode — sample data only
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed md:relative inset-y-0 left-0 z-30 h-full pt-7 md:pt-0
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:flex md:shrink-0
      `}>
        <DemoSidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          demoName={demoName}
          demoRole={demoRole}
          onLogout={handleDemoLogout}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 pt-7">
        <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
          <div>
            <h1 className="text-lg font-bold text-foreground">{getPageTitle()}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Sample demo data</p>
          </div>
        </div>

        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-secondary text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-accent" />
            <h1 className="font-bold text-foreground text-sm">{getPageTitle()}</h1>
          </div>
          <div className="w-9" />
        </div>

        <div className="flex-1 overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}