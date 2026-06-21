'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Home, Building2, Loader2 } from 'lucide-react'

export default function DemoRequestForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [role, setRole] = useState<'tenant' | 'landlord'>('tenant')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter your name')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/demo/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), role }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to start demo')
        setLoading(false)
        return
      }

      router.push('/demo/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-3xl p-6 max-w-md mx-auto shadow-lg">
      <h3 className="text-xl font-bold text-foreground mb-1">Try LEA Free Demo</h3>
      <p className="text-sm text-muted-foreground mb-5">
        Explore the dashboard with sample data — no signup required.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-foreground block mb-2">
            Your Name
          </Label>
          <Input
            placeholder="e.g. Jane Wanjiru"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-secondary border-border rounded-xl h-11"
          />
        </div>

        <div>
          <Label className="text-sm font-medium text-foreground block mb-2">
            I am a...
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole('tenant')}
              className={`h-11 rounded-xl border-2 flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                role === 'tenant'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted-foreground hover:border-accent/30'
              }`}
            >
              <Home className="w-4 h-4" />
              Tenant
            </button>
            <button
              type="button"
              onClick={() => setRole('landlord')}
              className={`h-11 rounded-xl border-2 flex items-center justify-center gap-2 text-sm font-medium transition-all ${
                role === 'landlord'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-muted-foreground hover:border-accent/30'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Landlord
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Launching demo...
            </>
          ) : (
            'Launch Demo Dashboard'
          )}
        </Button>

        <p className="text-[11px] text-center text-muted-foreground">
          No account created. Demo data only — nothing is saved.
        </p>
      </form>
    </div>
  )
}