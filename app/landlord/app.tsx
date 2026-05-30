'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default function LandlordPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, kyc_verified, landlord_code, landlord_block_id, property_setup_complete')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profile?.role !== 'landlord') {
        router.push('/dashboard')
        return
      }

      if (
        !profile?.landlord_code ||
        !profile?.landlord_block_id ||
        !profile?.property_setup_complete
      ) {
        router.push('/complete-setup')
        return
      }

      setUser(session.user)
      setIsLoading(false)
    })
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background" suppressHydrationWarning>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
      </div>
    )
  }

  return <DashboardLayout user={user} />
}