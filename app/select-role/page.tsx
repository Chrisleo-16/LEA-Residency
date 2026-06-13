'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export default function SelectRolePage() {
  const router = useRouter()
  const [role, setRole] = useState<'tenant' | 'landlord'>('tenant')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setIsLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      const response = await fetch('/api/auth/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      if (role === 'landlord') {
        router.push('/complete-setup')
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to set role')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-4xl border border-border bg-popover p-8 shadow-xl">
        <h1 className="text-3xl font-semibold text-foreground mb-2">Welcome to LEA</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Tell us how you'll be using LEA Executive Residency.
        </p>

        {error && (
          <div className="mb-6 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-8">
          {[
            { value: 'tenant', label: '🏠 Tenant', desc: 'I rent a property' },
            { value: 'landlord', label: '🏢 Landlord', desc: 'I own a property' },
          ].map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value as 'tenant' | 'landlord')}
              className={`p-4 rounded-2xl border text-left transition-all ${
                role === r.value
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted-foreground hover:border-accent/50'
              }`}
            >
              <p className="font-medium">{r.label}</p>
              <p className="text-xs mt-1 text-muted-foreground">{r.desc}</p>
            </button>
          ))}
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full h-12 rounded-2xl"
        >
          {isLoading ? 'Saving...' : 'Continue'}
        </Button>
      </div>
    </div>
  )
}