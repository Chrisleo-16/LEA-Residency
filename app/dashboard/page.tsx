'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { createClient } from '@/lib/supabase/client'
import AuthErrorHandler from '@/components/auth/AuthErrorHandler'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('Auth session error:', error)
        setAuthError(error.message)
        setIsLoading(false)
        return
      }

      if (!session) {
        router.push('/login')
        return
      }

      try {
        // Check for profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, kyc_verified, landlord_code, landlord_block_id, property_setup_complete')
          .eq('id', session.user.id)
          .maybeSingle()

        if (profileError) {
          console.error('Profile error:', profileError)
          setAuthError(profileError.message)
          setIsLoading(false)
          return
        }

        // --- NEW: Handle missing landlord_block_id for tenants (Google OAuth scenario) ---
        if (profile && profile.role === 'tenant' && !profile.landlord_block_id) {
          const pendingRef = localStorage.getItem('landlord_block_id_to_link')
          if (pendingRef) {
            // Update the profile with the landlord_block_id – triggers the slot assignment
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ landlord_block_id: pendingRef })
              .eq('id', session.user.id)

            if (updateError) {
              console.error('Failed to link tenant to block:', updateError)
              setAuthError('Failed to complete your property join. Please contact support.')
              setIsLoading(false)
              localStorage.removeItem('landlord_block_id_to_link') // clean up
              return
            }

            // Remove the used invitation ref
            localStorage.removeItem('landlord_block_id_to_link')

            // Re‑fetch the profile to get the updated landlord_block_id
            const { data: updatedProfile, error: refetchError } = await supabase
              .from('profiles')
              .select('role, kyc_verified, landlord_code, landlord_block_id, property_setup_complete')
              .eq('id', session.user.id)
              .maybeSingle()

            if (refetchError || !updatedProfile) {
              setAuthError('Could not verify profile after linking.')
              setIsLoading(false)
              return
            }

            // Continue with the updated profile
            setUser(session.user)
            setIsLoading(false)
            return
          } else {
            // No pending invitation – tenant still has no block; they might need to join manually
            // For now, just proceed (dashboard will show appropriate UI)
            setUser(session.user)
            setIsLoading(false)
            return
          }
        }
        // --------------------------------------------------------------------------------

        // If profile doesn't exist (unlikely but handle gracefully with an upsert)
        if (!profile) {
          const pendingRef = localStorage.getItem('landlord_block_id_to_link')
          const { error: upsertError } = await supabase
            .from('profiles')
            .upsert({
              id: session.user.id,
              role: 'tenant',
              full_name:
                session.user.user_metadata?.name ||
                session.user.user_metadata?.full_name ||
                session.user.email?.split('@')[0],
              email: session.user.email,
              kyc_verified: false,
              landlord_block_id: pendingRef || null,
            }, { onConflict: 'id' })

          if (upsertError) {
            console.error('Profile upsert error:', upsertError)
            setAuthError(upsertError.message)
            setIsLoading(false)
            return
          }

          if (pendingRef) {
            localStorage.removeItem('landlord_block_id_to_link')
          }

          router.push('/complete-setup')
          return
        }

        // Role‑based routing
        if (profile.role === 'developer') {
          router.push('/developer-dashboard')
          return
        }

        const needsCompletion =
          profile.role === 'landlord' &&
          (!profile.landlord_code ||
            !profile.landlord_block_id ||
            !profile.property_setup_complete)

        if (needsCompletion) {
          router.push('/complete-setup')
          return
        }

        setUser(session.user)
        setIsLoading(false)
      } catch (error: any) {
        console.error('Dashboard setup error:', error)
        setAuthError(error.message || 'Unknown error occurred')
        setIsLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    return () => subscription?.unsubscribe()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background" suppressHydrationWarning>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (authError) {
    return <AuthErrorHandler error={authError} />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background" suppressHydrationWarning>
        <div className="text-center">
          <p className="text-sm text-destructive mb-4">Authentication failed. Redirecting to login...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Suspense fallback={<DashboardLoadingFallback />}>
        <DashboardLayout user={user} />
      </Suspense>
      {authError && <AuthErrorHandler error={authError} />}
    </>
  )
}

function DashboardLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  )
}