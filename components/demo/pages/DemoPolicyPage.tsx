'use client'

import { useState, useEffect } from 'react'
import { FileText, Home, DollarSign, Wrench, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
import { generateDemoPolicies, DemoPolicy } from '@/lib/demo/demoData'

interface DemoPolicyPageProps {
  demoRole: 'tenant' | 'landlord'
}

const CATEGORY_ICONS: Record<string, any> = {
  house_rules: Home,
  rent_payment: DollarSign,
  maintenance: Wrench,
}

export default function DemoPolicyPage({ demoRole }: DemoPolicyPageProps) {
  const [policies, setPolicies] = useState<DemoPolicy[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setPolicies(generateDemoPolicies())
  }, [])

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

  const handleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
    setReadIds(prev => new Set(prev).add(id))
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="p-5 sm:p-8 space-y-6 max-w-3xl mx-auto w-full">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            {demoRole === 'landlord' ? 'Manage Policies' : 'Policy & Documents'}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {policies.length} published documents
          </p>
        </div>

        <div className="space-y-3">
          {policies.map((policy) => {
            const Icon = CATEGORY_ICONS[policy.category] || FileText
            const isExpanded = expandedId === policy.id
            const isRead = readIds.has(policy.id)

            return (
              <div key={policy.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => handleExpand(policy.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl border border-border bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-foreground text-sm">{policy.title}</h4>
                        {isRead && demoRole === 'tenant' && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">📅 {formatDate(policy.created_at)}</p>
                      {!isExpanded && (
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{policy.content}</p>
                      )}
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-border px-5 py-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{policy.content}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}