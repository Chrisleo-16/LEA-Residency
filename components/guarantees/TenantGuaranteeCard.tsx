'use client'

import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck, Upload, Loader2, FileText, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DEFAULT_FEE_PERCENT,
  GUARANTEE_STATUS_LABEL,
  calcMonthlyFee,
  type RentGuarantee,
} from '@/lib/guarantees'
import { toast } from 'sonner'

interface TenantGuaranteeCardProps {
  userId: string
  monthlyRent?: number | null
}

export default function TenantGuaranteeCard({ userId, monthlyRent }: TenantGuaranteeCardProps) {
  const supabase = createClient()
  const [guarantee, setGuarantee] = useState<RentGuarantee | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [phone, setPhone] = useState('')
  const [employer, setEmployer] = useState('')
  const [income, setIncome] = useState('')
  const [notes, setNotes] = useState('')
  const [statementPath, setStatementPath] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/guarantees')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      const mine = (data.guarantees || [])[0] || null
      setGuarantee(mine)
    } catch (err: unknown) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'pdf'
      const path = `${userId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('guarantee-documents').upload(path, file, {
        upsert: false,
      })
      if (error) throw error
      setStatementPath(path)
      toast.success('M-Pesa statement uploaded')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/guarantees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phone,
          employerName: employer,
          declaredIncome: income ? Number(income) : null,
          mpesaStatementPath: statementPath,
          tenantNotes: notes,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Application failed')
      toast.success('Guarantee application submitted for review')
      setShowForm(false)
      setGuarantee(data.guarantee)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Application failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading rent guarantee…
      </div>
    )
  }

  const rent = Number(monthlyRent || guarantee?.monthly_rent || 0)
  const fee = calcMonthlyFee(rent || 0, guarantee?.fee_percent || DEFAULT_FEE_PERCENT)

  if (guarantee && !['rejected', 'ended'].includes(guarantee.status)) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <ShieldCheck className="size-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">LEA Rent Guarantee</p>
              <p className="text-xs text-muted-foreground">
                {GUARANTEE_STATUS_LABEL[guarantee.status]}
                {guarantee.coverage_end ? ` · covers until ${guarantee.coverage_end}` : ''}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wide rounded-full border px-2 py-0.5 bg-secondary text-muted-foreground">
            {guarantee.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-muted/40 p-3">
            <p className="text-muted-foreground">Monthly rent</p>
            <p className="font-bold text-foreground">KES {Number(guarantee.monthly_rent).toLocaleString()}</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-3">
            <p className="text-muted-foreground">Guarantee fee ({guarantee.fee_percent}%)</p>
            <p className="font-bold text-foreground">KES {Number(guarantee.monthly_fee_amount).toLocaleString()}/mo</p>
          </div>
        </div>

        {guarantee.status === 'rejected' && guarantee.rejection_reason && (
          <p className="text-xs text-destructive flex items-start gap-1.5">
            <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
            {guarantee.rejection_reason}
          </p>
        )}

        {['applied', 'under_review'].includes(guarantee.status) && (
          <p className="text-xs text-muted-foreground">
            Our team is reviewing your M-Pesa cashflow and employment details. You will be notified once a decision is made.
          </p>
        )}

        {guarantee.status === 'active' && (
          <p className="text-xs text-emerald-700 dark:text-emerald-400">
            Your landlord is covered for 12 months. Keep paying rent on time through LEA to maintain coverage.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <ShieldCheck className="size-4 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Apply for Rent Guarantee</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Move in with less cash upfront. LEA underwrites you and guarantees rent to your landlord for 12 months.
            Fee ≈ {DEFAULT_FEE_PERCENT}% of rent
            {rent > 0 ? ` (KES ${fee.toLocaleString()}/mo on KES ${rent.toLocaleString()})` : ''}.
          </p>
        </div>
      </div>

      {!showForm ? (
        <Button type="button" onClick={() => setShowForm(true)} className="w-full h-10 rounded-xl">
          Start application
        </Button>
      ) : (
        <form onSubmit={handleApply} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">M-Pesa phone</label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XXXXXXXX"
              required
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Employer / business name</label>
            <Input
              value={employer}
              onChange={(e) => setEmployer(e.target.value)}
              placeholder="Company or self-employed"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Declared monthly income (KES)</label>
            <Input
              type="number"
              min={0}
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="e.g. 45000"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">M-Pesa statement (PDF / image)</label>
            <label className="flex items-center gap-2 h-10 px-3 rounded-xl border border-dashed border-border cursor-pointer hover:bg-muted/40 text-xs text-muted-foreground">
              {uploading ? <Loader2 className="size-3.5 animate-spin" /> : statementPath ? <FileText className="size-3.5 text-emerald-600" /> : <Upload className="size-3.5" />}
              <span className="truncate">
                {statementPath ? 'Statement uploaded' : 'Upload last 3–6 months'}
              </span>
              <input
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleUpload(f)
                }}
              />
            </label>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Anything else we should know?</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className="h-10 rounded-xl"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1 h-10 rounded-xl" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1 h-10 rounded-xl">
              {submitting ? 'Submitting…' : 'Submit for review'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
