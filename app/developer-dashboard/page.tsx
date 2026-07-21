'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DeveloperDashboardShell } from '@/components/developer-dashboard/DeveloperDashboardShell'

const supabase = createClient()

export default function DeveloperDashboardPage() {
  const router = useRouter()
  const [authLoading, setAuthLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const validateDeveloper = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()
      if (!profile || profile.role !== 'developer') { router.push('/dashboard'); return }
      setIsAuthorized(true)
      setAuthLoading(false)
    }
    validateDeveloper()
  }, [router])

  if (authLoading || !isAuthorized) {
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
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background">
          <div className="size-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <DeveloperDashboardShell />
    </Suspense>
  )
}
