'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DemoDashboardLayout from '@/components/demo/DemoDashboardLayout'
import DemoWarningModal from '@/components/demo/DemoWarningModal'

interface DemoSession {
  active: boolean
  name?: string
  role?: 'tenant' | 'landlord'
  startedAt?: number
}

export default function DemoDashboardPage() {
  const router = useRouter()
  const [session, setSession] = useState<DemoSession | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/demo/status')
        const data: DemoSession = await res.json()

        if (!data.active) {
          router.push('/')
          return
        }

        setSession(data)

        const seenWarning = sessionStorage.getItem('lea_demo_warning_seen')
        if (!seenWarning) {
          setShowWarning(true)
          sessionStorage.setItem('lea_demo_warning_seen', 'true')
        }
      } catch {
        router.push('/')
      } finally {
        setLoading(false)
      }
    }
    checkSession()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  if (!session?.active) return null

  return (
    <>
      <DemoDashboardLayout
        demoName={session.name || 'Demo User'}
        demoRole={session.role || 'tenant'}
      />
      {showWarning && (
        <DemoWarningModal
          role={session.role || 'tenant'}
          onClose={() => setShowWarning(false)}
        />
      )}
    </>
  )
}