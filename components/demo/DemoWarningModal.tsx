// components/demo/DemoWarningModal.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Sparkles, X } from 'lucide-react'

interface DemoWarningModalProps {
  role: 'tenant' | 'landlord'
  onClose: () => void
}

export default function DemoWarningModal({ role, onClose }: DemoWarningModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-3xl max-w-sm w-full p-6 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
          <Sparkles className="w-6 h-6 text-accent" />
        </div>

        <h3 className="text-lg font-bold text-foreground mb-2">
          You're viewing a demo
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          This is a sample {role} dashboard with example data — messages,
          payments, and requests shown here are not real. Nothing you do here
          is saved or sent to anyone.
        </p>
        <p className="text-xs text-muted-foreground/70 mb-5">
          This session ends automatically when you log out.
        </p>

        <Button
          onClick={onClose}
          className="w-full h-11 rounded-xl bg-accent hover:bg-accent/90 text-white font-semibold gap-2"
        >
          <X className="w-4 h-4" />
          Got it, explore the demo
        </Button>
      </div>
    </div>
  )
}