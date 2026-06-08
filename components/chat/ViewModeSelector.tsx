'use client'

import { Eye, EyeOff, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ViewMode = 'once' | 'twice' | 'fulltime'

interface ViewModeSelectorProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

export default function ViewModeSelector({ value, onChange }: ViewModeSelectorProps) {
  const modes: { key: ViewMode; label: string; icon: any; description: string }[] = [
    {
      key: 'once',
      label: 'View Once',
      icon: EyeOff,
      description: 'Media disappears after viewing',
    },
    {
      key: 'twice',
      label: 'View Twice',
      icon: Eye,
      description: 'Media disappears after 2 views',
    },
    {
      key: 'fulltime',
      label: 'Keep Forever',
      icon: Clock,
      description: 'Media stays in chat history',
    },
  ]

  return (
    <div className="flex items-center gap-2 p-1 bg-secondary/50 rounded-lg border border-border">
      {modes.map((mode) => {
        const Icon = mode.icon
        const isActive = value === mode.key
        
        return (
          <button
            key={mode.key}
            type="button"
            onClick={() => onChange(mode.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              isActive
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
            title={mode.description}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{mode.label}</span>
          </button>
        )
      })}
    </div>
  )
}
