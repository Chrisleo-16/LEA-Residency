'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { fmtKES } from './helpers'

export interface DeletableUser {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
}

interface Impact {
  paymentCount?: number
  complaintCount?: number
  requestCount?: number
  hasSubscription?: boolean
  subscriptionStatus?: string | null
  monthlyFee?: number | null
  blockCount?: number
  tenantCount?: number
  subscriptionPaymentCount?: number
}

interface DeleteUserDialogProps {
  user: DeletableUser | null
  onClose: () => void
  onDeleted: () => void
}

export function DeleteUserDialog({ user, onClose, onDeleted }: DeleteUserDialogProps) {
  const [impact, setImpact] = useState<Impact | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    setImpact(null)
    setConfirmText('')
    setError(null)
    fetch(`/api/developer/users/${user.id}`)
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Failed to load impact summary')
        setImpact(data.impact)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  if (!user) return null

  const isLandlord = user.role === 'landlord'
  const confirmValue = (user.full_name || user.email || '').trim()
  const canDelete = confirmValue.length > 0 && confirmText.trim().toLowerCase() === confirmValue.toLowerCase()

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    const toastId = toast.loading(`Deleting ${confirmValue || 'user'}…`)
    try {
      const res = await fetch(`/api/developer/users/${user.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete user')
      toast.success(`${confirmValue || 'User'} deleted`, {
        id: toastId,
        description: data.removedTenants > 0
          ? `${data.removedTenants} tenant account${data.removedTenants === 1 ? '' : 's'} removed too.`
          : undefined,
      })
      onDeleted()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user', { id: toastId })
      setError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={!!user} onOpenChange={(open) => !open && !deleting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="size-5 text-red-600 dark:text-red-400" />
          </div>
          <DialogTitle className='text-accent'>Delete {isLandlord ? 'landlord' : user.role || 'user'} &ldquo;{confirmValue || user.id}&rdquo;?</DialogTitle>
          <DialogDescription>
            This permanently removes their profile and login access. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Checking what&apos;s attached…
          </div>
        ) : impact ? (
          <div className="rounded-lg border border-border bg-muted/40 p-3.5 text-sm">
            <div className="mb-1.5 font-medium text-accent">This will also permanently delete:</div>
            <ul className="space-y-1 text-muted-foreground">
              {isLandlord && impact.hasSubscription && (
                <li>
                  • 1 subscription ({impact.subscriptionStatus}
                  {impact.monthlyFee ? `, ${fmtKES(impact.monthlyFee)}/mo` : ''})
                </li>
              )}
              {isLandlord && <li>• {impact.blockCount ?? 0} landlord block{(impact.blockCount ?? 0) === 1 ? '' : 's'}</li>}
              {isLandlord && (
                <li>• {impact.tenantCount ?? 0} tenant account{(impact.tenantCount ?? 0) === 1 ? '' : 's'} under them</li>
              )}
              <li>
                • {impact.complaintCount ?? 0} complaint{(impact.complaintCount ?? 0) === 1 ? '' : 's'},{' '}
                {impact.requestCount ?? 0} maintenance request{(impact.requestCount ?? 0) === 1 ? '' : 's'}
              </li>
            </ul>
            {((impact.paymentCount ?? 0) > 0 || (impact.subscriptionPaymentCount ?? 0) > 0) && (
              <div className="mt-2.5 space-y-0.5 border-t border-border pt-2.5 text-xs text-muted-foreground">
                {(impact.paymentCount ?? 0) > 0 && (
                  <div>
                    {impact.paymentCount} rent payment record{impact.paymentCount === 1 ? '' : 's'} — preserved for
                    accounting, just detached from the deleted account.
                  </div>
                )}
                {(impact.subscriptionPaymentCount ?? 0) > 0 && (
                  <div>
                    {impact.subscriptionPaymentCount} subscription payment record
                    {impact.subscriptionPaymentCount === 1 ? '' : 's'} — preserved for accounting.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Type <span className="font-semibold text-foreground">{confirmValue || user.id}</span> to confirm
          </label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={confirmValue || user.id}
            autoFocus
            className="text-muted-foreground"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting} className='text-accent'>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={!canDelete || deleting || loading}>
            {deleting && <Loader2 className="size-4 animate-spin" />}
            Delete permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
