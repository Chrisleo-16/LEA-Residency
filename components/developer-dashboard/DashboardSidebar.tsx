'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Terminal, UserCheck, LogOut, Search, X, ChevronsUpDown, type LucideIcon } from 'lucide-react'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { TabId } from './types'

const supabase = createClient()

interface NavItem {
  id: TabId
  label: string
  icon: LucideIcon
}

interface NavSection {
  label: string
  items: NavItem[]
}

interface DashboardSidebarProps {
  sections: NavSection[]
  unresolvedErrors: number
  mobileOpen: boolean
  onMobileClose: () => void
  onVerifications: () => void
  onLogout: () => void
}

function SidebarHeader() {
  return (
    <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Terminal className="size-4 text-primary" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold leading-tight">Developer Console</div>
        {/* <div className="flex items-center gap-1.5">
          <span className="size-1.5 animate-pulse rounded-full bg-green-500" />
        </div> */}
      </div>
    </div>
  )
}

function SidebarSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [focused, setFocused] = useState(false)

  // Makes the "/" hint a real shortcut: press it anywhere (outside another
  // input) to jump focus into the sidebar search, like Linear/Vercel/GitHub.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== '/') return
      const target = e.target as HTMLElement
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      if (isTyping) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const showHint = !focused && !value

  return (
    <div className="px-3 pt-3 pb-1">
      {/* Positioning context is this wrapper alone (no padding of its own),
          so left/right/top offsets below are relative to the input's own
          box, not the outer padded container — that mismatch was causing
          the icon/hint to sit off-center at every screen size. */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search"
          className="h-9 w-full rounded-lg border border-border bg-muted/40 pl-8 pr-8 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        {showHint ? (
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground">
            /
          </kbd>
        ) : value ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground"
            title="Clear search"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

function NavList({
  sections, unresolvedErrors, onSelect,
}: {
  sections: NavSection[]
  unresolvedErrors: number
  onSelect?: () => void
}) {
  return (
    <TabsList className="flex h-auto w-full flex-col items-stretch gap-0.5 bg-transparent p-0">
      {sections.map((section) => (
        <div key={section.label} className="mb-1">
          <div className="px-3 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {section.label}
          </div>
          {section.items.map((item) => {
            const Icon = item.icon
            const badge = item.id === 'errors' && unresolvedErrors > 0 ? unresolvedErrors : null
            return (
              <TabsTrigger
                key={item.id}
                value={item.id}
                onClick={onSelect}
                className="h-auto w-full flex-none justify-start gap-2.5 rounded-lg border-none px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-primary/5 hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                <Icon className="size-4" />
                <span className="flex-1 text-left">{item.label}</span>
                {badge !== null && (
                  <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-red-600 dark:text-red-400">
                    {badge}
                  </span>
                )}
              </TabsTrigger>
            )
          })}
        </div>
      ))}
    </TabsList>
  )
}

function AccountSwitcher({ onVerifications, onLogout }: { onVerifications: () => void; onLogout: () => void }) {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [])

  return (
    <div className="shrink-0 px-3 pb-3">
      <Separator className="mb-2.5" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-primary/5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
              DEV
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium leading-tight">Developer</div>
              <div className="truncate text-xs text-muted-foreground">{email ?? '—'}</div>
            </div>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-56">
          <DropdownMenuItem onClick={onVerifications}>
            <UserCheck className="size-4" />
            Verifications
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onLogout} variant="destructive">
            <LogOut className="size-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function filterSections(sections: NavSection[], query: string): NavSection[] {
  if (!query.trim()) return sections
  const q = query.trim().toLowerCase()
  return sections
    .map((s) => ({ ...s, items: s.items.filter((i) => i.label.toLowerCase().includes(q)) }))
    .filter((s) => s.items.length > 0)
}

export function DashboardSidebar({
  sections, unresolvedErrors, mobileOpen, onMobileClose, onVerifications, onLogout,
}: DashboardSidebarProps) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => filterSections(sections, query), [sections, query])

  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/30 md:flex">
        <SidebarHeader />
        <SidebarSearch value={query} onChange={setQuery} />
        <nav className="flex-1 overflow-y-auto px-3">
          <NavList sections={filtered} unresolvedErrors={unresolvedErrors} />
        </nav>
        <AccountSwitcher onVerifications={onVerifications} onLogout={onLogout} />
      </aside>

      <div className={cn('fixed inset-0 z-50 md:hidden', !mobileOpen && 'pointer-events-none')}>
        <div
          className={cn(
            'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={onMobileClose}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 flex w-72 flex-col border-r border-border bg-background transition-transform duration-200',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <SidebarHeader />
          <SidebarSearch value={query} onChange={setQuery} />
          <nav className="flex-1 overflow-y-auto px-3">
            <NavList sections={filtered} unresolvedErrors={unresolvedErrors} onSelect={onMobileClose} />
          </nav>
          <AccountSwitcher onVerifications={onVerifications} onLogout={onLogout} />
        </aside>
      </div>
    </>
  )
}
