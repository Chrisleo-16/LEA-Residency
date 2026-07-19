'use client'

import { Receipt, Sparkles, ClipboardList, Users, FileText, Check } from 'lucide-react'
import { FOCUS_AREAS } from '@/lib/focusAreas'

const ICONS: Record<string, typeof Receipt> = {
  rent: Receipt,
  tenants: Sparkles,
  maintenance: ClipboardList,
  staff: Users,
  policy: FileText,
}

interface FocusAreaPickerProps {
  selected: string[]
  onChange: (next: string[]) => void
}

export default function FocusAreaPicker({ selected, onChange }: FocusAreaPickerProps) {
  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])
  }

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {FOCUS_AREAS.map((area) => {
        const Icon = ICONS[area.id]
        const isSelected = selected.includes(area.id)
        return (
          <button
            key={area.id}
            type="button"
            onClick={() => toggle(area.id)}
            className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
              isSelected
                ? 'border-accent bg-accent/10 shadow-sm shadow-accent/10'
                : 'border-border hover:border-accent/40 hover:bg-secondary'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isSelected ? 'bg-accent text-white' : 'bg-secondary text-muted-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">{area.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{area.description}</p>
            </div>
            {isSelected && (
              <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
