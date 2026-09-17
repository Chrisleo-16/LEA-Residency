'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShieldCheck, ArrowLeft, LogOut, Home } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface GuaranteeAppShellProps {
  children: React.ReactNode
  role?: string | null
  title?: string
  subtitle?: string
}

export default function GuaranteeAppShell({
  children,
  role,
  title = 'LEA Rent Guarantee',
  subtitle = 'Separate product · underwriting & coverage',
}: GuaranteeAppShellProps) {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const backHref =
    role === 'developer' ? '/developer-dashboard' : '/dashboard'

  return (
    <div className="min-h-dvh bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{title}</p>
              <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs gap-1.5">
              <Link href={backHref}>
                <ArrowLeft className="size-3.5" />
                <span className="hidden sm:inline">
                  {role === 'developer' ? 'Developer' : 'Property Mgmt'}
                </span>
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleLogout}
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      <footer className="border-t border-border py-4">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <p>LEA Guarantee is a separate product from Property Management.</p>
          <Link href={backHref} className="inline-flex items-center gap-1 hover:text-foreground">
            <Home className="size-3" />
            Back to {role === 'developer' ? 'Developer Console' : 'dashboard'}
          </Link>
        </div>
      </footer>
    </div>
  )
}
