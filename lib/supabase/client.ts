// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: {
          getItem(key: string) {
            return document.cookie
              .split('; ')
              .find(row => row.startsWith(key + '='))
              ?.split('=')?.[1] || null
          },
          setItem(key: string, value: string) {
            document.cookie = `${key}=${value}; path=/; SameSite=Lax`
          },
          removeItem(key: string) {
            document.cookie = `${key}=; path=/; max-age=0`
          },
        },
      },
    }
  )
}