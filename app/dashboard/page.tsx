'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { supabase } from '@/lib/supabase'
import AuthErrorHandler from '@/components/auth/AuthErrorHandler'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
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
        // ✅ Check if profile has a role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle()

        if (profileError) {
          console.error('Profile error:', profileError)
          setAuthError(profileError.message)
          setIsLoading(false)
          return
        }

        // ✅ If no profile or no role — insert with default tenant role
        if (!profile) {
          const { error: insertError } = await supabase.from('profiles').insert({
            id: session.user.id,
            role: 'tenant',
            full_name: session.user.user_metadata?.name ||
                       session.user.user_metadata?.full_name ||
                       session.user.email?.split('@')[0],
            email: session.user.email,
          })

          if (insertError) {
            console.error('Profile insert error:', insertError)
            setAuthError(insertError.message)
            setIsLoading(false)
            return
          }
        }

        setUser(session.user)
        setIsLoading(false)
      } catch (error: any) {
        console.error('Dashboard setup error:', error)
        setAuthError(error.message || 'Unknown error occurred')
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          router.push('/login')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    )
  }

  return (
    <>
      <DashboardLayout user={user} />
      <AuthErrorHandler error={authError || undefined} />
    </>
  )
}
