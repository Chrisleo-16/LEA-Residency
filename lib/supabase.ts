import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
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
})