import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabaseOptions = {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
  },
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, supabaseOptions)
