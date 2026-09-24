'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DeveloperDashboardShell } from '@/components/developer-dashboard/DeveloperDashboardShell'
import AppLockGate from '@/components/security/AppLockGate'

const supabase = createClient()

export default function DeveloperDashboardPage() {
  const router = useRouter()
  const [authLoading, setAuthLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState<string | undefined>()

  useEffect(() => {
    const validateDeveloper = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', session.user.id)
        .maybeSingle()
      if (!profile || profile.role !== 'developer') { router.push('/dashboard'); return }
      setUserId(session.user.id)
      setDisplayName(profile.full_name || session.user.email || undefined)
      setIsAuthorized(true)
      setAuthLoading(false)
    }
    validateDeveloper()
  }, [router])

  if (authLoading || !isAuthorized || !userId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-foreground">
        <div className="text-center">
          <div className="mx-auto mb-4 size-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Verifying developer access…</p>
        </div>
      </div>
    )
  }

  return (
    <AppLockGate userId={userId} displayName={displayName}>
      <Suspense
        fallback={
          <div className="flex min-h-dvh items-center justify-center bg-background">
            <div className="size-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
      >
        <DeveloperDashboardShell />
      </Suspense>
    </AppLockGate>
  )
}
