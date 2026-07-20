'use client'

import { useEffect, useState, useRef } from 'react'
import { Inter } from 'next/font/google'
import { User } from '@supabase/supabase-js'
import { Menu, Building2 } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'
import { startTour } from '@/components/tour/AppTour'
import ChatArea from '@/components/chat/ChatArea'
import SettingsPanel from '@/components/settings/SettingsPanel'
import InstallPrompt from '@/components/pwa/InstallPrompt'
import ComplaintsPage from '@/components/pages/ComplaintsPage'
import RequestsPage from '@/components/pages/RequestsPage'
import StaffManagementPage from '@/components/pages/StaffManagementPage'
import PolicyPage from '@/components/pages/PolicyPage'
import CommunityPage from '@/components/pages/CommunityPage'
import LeadsPage from '@/components/pages/LeadsPage'
import PaymentsPage from '@/components/pages/PaymentsPage'
import BillingPage from '@/components/pages/BillingPage'
import SubscriptionModal from '@/components/billing/SubscriptionModal'
import { createClient } from '@/lib/supabase/client'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'] })

interface DashboardLayoutProps {
  user: User | null
}

export default function DashboardLayout({ user }: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [subscriptionChecked, setSubscriptionChecked] = useState(false)
  const [tourCompleted, setTourCompleted] = useState<boolean | null>(null)
  const tourStartedRef = useRef(false)

  // Step 1: fetch role
  useEffect(() => {
    if (!user) return
    const fetchRole = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('profiles')
          .select('role, tour_completed')
          .eq('id', user.id)
          .maybeSingle()
        if (error) {
          console.error('Error fetching role:', error)
          setUserRole(null)
        } else {
          setUserRole(data?.role || null)
          setTourCompleted(data?.tour_completed ?? true)
        }
      } catch (err: any) {
        console.error('Unexpected error fetching role:', err)
        setUserRole(null)
      }
    }
    fetchRole()
  }, [user])

  // Step 2: check subscription ONLY after role is known
  useEffect(() => {
    if (!user || userRole === null) return

    if (userRole === 'landlord') {
      const checkSubscription = async () => {
        try {
          const res = await fetch('/api/billing/status')
          const data = await res.json()
          setSubscription(data.subscription || null)
        } catch (err) {
          console.error('Error checking subscription:', err)
          setSubscription(null)
        } finally {
          setSubscriptionChecked(true)
        }
      }
      checkSubscription()
    } else {
      // Tenants are never gated
      setSubscriptionChecked(true)
    }
  }, [user, userRole])

  const hasFreeAccess =
    !!subscription?.free_access_until && new Date(subscription.free_access_until) > new Date()

  const showModal =
    userRole === 'landlord' &&
    subscriptionChecked &&
    subscription !== null &&
    subscription.status !== 'active' &&
    subscription.status !== 'exempt' &&
    !hasFreeAccess

  // Step 3: auto-start the guided tour once, after role/subscription are known
  useEffect(() => {
    if (!user || !userRole || tourCompleted !== false || tourStartedRef.current) return
    if (userRole === 'landlord' && !subscriptionChecked) return
    if (showModal) return

    tourStartedRef.current = true
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    if (isMobile) setSidebarOpen(true)

    startTour(userRole, {
      delayMs: isMobile ? 350 : 0,
      onComplete: async () => {
        if (isMobile) setSidebarOpen(false)
        setTourCompleted(true)
        const supabase = createClient()
        await supabase.from('profiles').update({ tour_completed: true }).eq('id', user.id)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userRole, subscriptionChecked, tourCompleted, showModal])

  const handleTabChange = (tab: string) => {
    if (showModal) return // block navigation while unpaid
    setActiveTab(tab)
    setSidebarOpen(false)
  }

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      chat: 'Messages',
      leads: 'Tenant Leads',
      community: 'Community',
      complaints: 'Complaints',
      requests: 'Requests',
      policy: 'Policy & Docs',
      payments: 'Payments',
      settings: 'Settings',
      staff: 'Staff Management',
      billing: 'Subscription Billing',
    }
    return titles[activeTab] || 'LEA Executive'
  }

  const getPageSubtitle = () => {
    const subtitles: Record<string, string> = {
      chat: 'Your private conversations',
      leads: 'Tenants whose wishlist matches your listings',
      community: 'Group chat & announcements',
      complaints: 'Submit and track your issues',
      requests: 'Service & maintenance requests',
      policy: 'Rules, documents & guidelines',
      payments: 'Track rent payments and receipts',
      settings: 'Account & preferences',
      maintenance: 'Maintenance requests and tracking',
      staff: 'Staff management and information',
      billing: 'Subscription & payment management',
    }
    return subtitles[activeTab] || ''
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':       return <ChatArea user={user} />
      case 'leads':      return <LeadsPage user={user} />
      case 'community':  return <CommunityPage user={user} />
      case 'complaints': return <ComplaintsPage user={user} />
      case 'requests':   return <RequestsPage user={user} />
      case 'staff':      return <StaffManagementPage user={user} />
      case 'policy':     return <PolicyPage user={user} />
      case 'payments':   return <PaymentsPage user={user} />
      case 'settings':   return <SettingsPanel user={user} />
      case 'billing':    return <BillingPage user={user} />
      default:           return <ChatArea user={user} />
    }
  }

  return (
    <>
      <div className={`${inter.className} flex h-dvh bg-background overflow-hidden`}>

        {/* Mobile overlay */}
        {sidebarOpen && !showModal && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar — blurred and disabled when modal showing */}
        <div className={`
          fixed md:relative inset-y-0 left-0 z-30 h-full
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:flex md:shrink-0
          ${showModal ? 'blur-sm pointer-events-none select-none' : ''}
        `}>
          <Sidebar activeTab={activeTab} setActiveTab={handleTabChange} />
        </div>

        {/* Main content — blurred and disabled when modal showing */}
        <div className={`
          flex-1 flex flex-col overflow-hidden min-w-0
          transition-all duration-300
          ${showModal ? 'blur-sm pointer-events-none select-none' : ''}
        `}>

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
              onClick={() => !showModal && setSidebarOpen(true)}
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

      {/* Subscription modal — sits above everything */}
      {showModal && subscription && (
        <SubscriptionModal
          subscription={subscription}
          onPaid={() =>
            setSubscription((prev: any) => ({ ...prev, status: 'active' }))
          }
        />
      )}

      <InstallPrompt />
    </>
  )
}