'use client'

import { Settings, Bell, Lock, Sparkles } from 'lucide-react'

interface DemoSettingsPageProps {
  demoName: string
  demoRole: 'tenant' | 'landlord'
}

export default function DemoSettingsPage({ demoName, demoRole }: DemoSettingsPageProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="p-5 sm:p-8 space-y-6 max-w-2xl mx-auto w-full">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">Demo account preferences</p>
        </div>

        <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <p className="text-xs text-accent leading-relaxed">
            Settings changes are disabled in demo mode — this is just a preview of what's available.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          <div className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
              <span className="text-base font-bold text-accent">{demoName.charAt(0)}</span>
            </div>
            <div>
              <p className="font-semibold text-foreground">{demoName}</p>
              <p className="text-xs text-muted-foreground capitalize">{demoRole} (Demo Account)</p>
            </div>
          </div>

          {[
            { icon: Bell, label: 'Notifications', desc: 'Push notification preferences' },
            { icon: Lock, label: 'Privacy & Security', desc: 'Password and account security' },
            { icon: Settings, label: 'General', desc: 'App preferences and display' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="p-4 flex items-center gap-3 opacity-60">
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}