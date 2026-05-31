'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

export default function SupabaseListener() {
  const router = useRouter()
  
  // Initialize the Supabase client for the browser
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // Listen for any changes in the user's login status
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // THIS is the magic line that clears the Next.js cache!
        router.refresh() 
      }
    })

    return () => subscription.unsubscribe()
  }, [router, supabase])

  return null // This component doesn't render anything visual
}