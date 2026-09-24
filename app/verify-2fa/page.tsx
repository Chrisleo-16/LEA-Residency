'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TwoFactorVerifyPanel from '@/components/security/TwoFactorPanel'
import { Loader2 } from 'lucide-react'

function Verify2faContent() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const run = async () => {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('two_factor_enabled, role')
        .eq('id', session.user.id)
        .maybeSingle()

      if (!profile?.two_factor_enabled) {
        router.replace(
          profile?.role === 'developer' ? '/developer-dashboard' : '/dashboard'
        )
        return
      }
      setChecking(false)
    }
    run()
  }, [router])

  const afterVerify = async () => {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, landlord_code, landlord_block_id, property_setup_complete')
      .eq('id', session!.user.id)
      .maybeSingle()

    if (profile?.role === 'developer') {
      router.replace('/developer-dashboard')
      return
    }
    if (
      profile?.role === 'landlord' &&
      (!profile.landlord_code ||
        !profile.landlord_block_id ||
        !profile.property_setup_complete)
    ) {
      router.replace('/complete-setup')
      return
    }
    router.replace('/dashboard')
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <TwoFactorVerifyPanel onVerified={afterVerify} onSignOut={signOut} />
    </div>
  )
}

export default function Verify2faPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      }
    >
      <Verify2faContent />
    </Suspense>
  )
}
