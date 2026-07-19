'use client'

import { useState } from 'react'
import {
  Sparkles,
  CheckCircle,
  Send,
  AlertCircle,
  MapPin,
  Wallet,
  CalendarDays,
  User,
  Phone,
  Home,
  MessageSquare,
  ArrowLeft,
  ArrowRight,
  Search,
  X,
  Plus,
} from 'lucide-react'
import { search as searchLocations, type SearchResult } from 'kenya-locations/search'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

const formatLocationResult = (r: SearchResult): { label: string; qualifier: string } => {
  switch (r.type) {
    case 'area':
      return { label: r.item.name, qualifier: `${r.item.locality}, ${r.item.county}` }
    case 'locality':
      return { label: r.item.name, qualifier: r.item.county }
    case 'ward':
      return { label: r.item.name, qualifier: `${r.item.constituency} Constituency` }
    case 'sub-county':
    case 'constituency':
      return { label: r.item.name, qualifier: r.item.county }
    case 'county':
      return { label: r.item.name, qualifier: 'County' }
  }
}

const BEDROOM_OPTIONS = [
  { value: 'studio', label: 'Studio' },
  { value: '1', label: '1 Bed' },
  { value: '2', label: '2 Bed' },
  { value: '3+', label: '3+ Bed' },
]

const AMENITIES = [
  'Reliable borehole water',
  'Secure parking',
  'Backup generator',
  'Fibre-ready internet',
  'Gym',
  'Swimming pool',
  'Pet-friendly',
  'Gated & guarded',
  'CCTV surveillance',
  'DSQ / staff quarters',
]

const BUDGET_PRESETS = ['20000', '30000', '45000', '60000', '80000']

const MOVE_IN_PRESETS = [
  { label: 'ASAP', days: 0 },
  { label: 'In 2 weeks', days: 14 },
  { label: 'Next month', days: 30 },
]

const toISODate = (d: Date) => d.toISOString().split('T')[0]

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  maxBudget: '',
  neighborhoods: [] as string[],
  bedrooms: '',
  moveInDate: '',
  amenities: [] as string[],
  notes: '',
  agreed: false,
}

type FormState = typeof EMPTY_FORM

const STEPS: {
  key: string
  icon: typeof User
  title: string
  subtitle: string
  isValid: (f: FormState) => boolean
}[] = [
  {
    key: 'name',
    icon: User,
    title: "Let's start with you",
    subtitle: 'What should we call you?',
    isValid: (f) => !!f.firstName.trim() && !!f.lastName.trim(),
  },
  {
    key: 'contact',
    icon: Phone,
    title: 'How can managers reach you?',
    subtitle: "We'll only use this to send you matches — no spam.",
    isValid: (f) => !!f.email.trim() && !!f.phone.trim(),
  },
  {
    key: 'budget',
    icon: Wallet,
    title: "What's your budget?",
    subtitle: 'Inclusive of service charge.',
    isValid: (f) => !!f.maxBudget && Number(f.maxBudget) > 0,
  },
  {
    key: 'moveIn',
    icon: CalendarDays,
    title: 'When do you need to move in?',
    subtitle: 'This helps us flag urgent matches first.',
    isValid: (f) => !!f.moveInDate,
  },
  {
    key: 'bedrooms',
    icon: Home,
    title: 'What size are you after?',
    subtitle: 'Pick the closest fit.',
    isValid: (f) => !!f.bedrooms,
  },
  {
    key: 'neighborhoods',
    icon: MapPin,
    title: 'Where do you want to live?',
    subtitle: "Select as many areas as you're open to.",
    isValid: (f) => f.neighborhoods.length > 0,
  },
  {
    key: 'amenities',
    icon: Sparkles,
    title: 'Any lifestyle must-haves?',
    subtitle: 'Optional — select any that matter to you.',
    isValid: () => true,
  },
  {
    key: 'notes',
    icon: MessageSquare,
    title: 'Anything else?',
    subtitle: 'Optional notes, plus your consent to share this with managers.',
    isValid: (f) => f.agreed,
  },
]

interface WishlistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function WishlistDialog({ open, onOpenChange }: WishlistDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [areaQuery, setAreaQuery] = useState('')
  const [areaResults, setAreaResults] = useState<SearchResult[]>([])

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const toggleInList = (key: 'neighborhoods' | 'amenities', value: string) => {
    setForm((f) => {
      const list = f[key]
      return {
        ...f,
        [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      }
    })
  }

  const handleAreaQueryChange = (value: string) => {
    setAreaQuery(value)
    if (value.trim().length < 2) {
      setAreaResults([])
      return
    }
    setAreaResults(searchLocations(value, { types: ['locality', 'area'], limit: 8 }))
  }

  const addNeighborhood = (value: string) => {
    setForm((f) => (f.neighborhoods.includes(value) ? f : { ...f, neighborhoods: [...f.neighborhoods, value] }))
    setAreaQuery('')
    setAreaResults([])
  }

  const handleAreaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    e.stopPropagation()
    if (areaResults.length > 0) {
      addNeighborhood(formatLocationResult(areaResults[0]).label)
    } else if (areaQuery.trim().length >= 2) {
      addNeighborhood(areaQuery.trim())
    }
  }

  const isLastStep = step === STEPS.length - 1
  const stepValid = STEPS[step].isValid(form)
  const canSubmit = STEPS.every((s) => s.isValid(form))

  const goNext = () => {
    if (!stepValid) return
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }
  const goBack = () => setStep((s) => Math.max(s - 1, 0))

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setForm(EMPTY_FORM)
      setStep(0)
      setSubmitted(false)
      setError('')
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone,
          maxBudget: Number(form.maxBudget),
          neighborhoods: form.neighborhoods,
          bedrooms: form.bedrooms,
          moveInDate: form.moveInDate,
          amenities: form.amenities,
          notes: form.notes,
          agreedToTerms: form.agreed,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return
    if ((e.target as HTMLElement).tagName === 'TEXTAREA') return
    e.preventDefault()
    if (isLastStep) {
      if (canSubmit && !submitting) handleSubmit()
    } else if (stepValid) {
      goNext()
    }
  }

  const StepIcon = STEPS[step].icon
  const chipClass = (active: boolean) =>
    `px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
      active
        ? 'border-neutral-900 text-neutral-900 bg-neutral-100'
        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
    }`

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        onKeyDown={handleKeyDown}
        className="bg-white border border-neutral-200 max-w-2xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-5 sm:p-6"
      >
        {submitted ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-neutral-900" strokeWidth={1.5} />
            </div>
            <p className="text-xs uppercase tracking-widest text-neutral-400 mb-3">Wishlist Live</p>
            <h2 className="text-2xl font-bold text-neutral-900 mb-3">We&apos;re matching you now</h2>
            <p className="text-sm text-neutral-500 leading-relaxed mb-8 max-w-sm mx-auto">
              Thanks, {form.firstName}. Managers with matching vacant units are being notified right
              now. Keep an eye on your evening digest for pitches.
            </p>
            <Button
              onClick={() => handleClose(false)}
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl px-8"
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="pr-6">
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={goBack}
                    aria-label="Back"
                    className="p-1.5 -ml-1.5 rounded-full hover:bg-neutral-100 text-neutral-500 shrink-0 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <DialogTitle className="text-lg sm:text-xl font-bold text-neutral-900 flex items-center gap-2">
                  <StepIcon className="w-5 h-5 shrink-0" />
                  <span>{STEPS[step].title}</span>
                </DialogTitle>
              </div>
              <DialogDescription className="text-neutral-500 text-sm">
                {STEPS[step].subtitle}
              </DialogDescription>
            </DialogHeader>

            {/* Progress */}
            <div className="flex items-center gap-2.5">
              <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-neutral-900 rounded-full transition-all duration-300"
                  style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-neutral-400 shrink-0 tabular-nums">
                {step + 1} / {STEPS.length}
              </span>
            </div>

            <div className="space-y-5 min-h-45">
              {step === 0 && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    autoFocus
                    value={form.firstName}
                    onChange={(e) => set('firstName', e.target.value)}
                    placeholder="First name"
                    className="bg-white border-neutral-200 text-neutral-900 rounded-xl h-12"
                  />
                  <Input
                    value={form.lastName}
                    onChange={(e) => set('lastName', e.target.value)}
                    placeholder="Last name"
                    className="bg-white border-neutral-200 text-neutral-900 rounded-xl h-12"
                  />
                </div>
              )}

              {step === 1 && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    autoFocus
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="jane@example.com"
                    className="bg-white border-neutral-200 text-neutral-900 rounded-xl h-12"
                  />
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="+254 700 000 000"
                    className="bg-white border-neutral-200 text-neutral-900 rounded-xl h-12"
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <Input
                    autoFocus
                    type="number"
                    min={1}
                    value={form.maxBudget}
                    onChange={(e) => set('maxBudget', e.target.value)}
                    placeholder="e.g. 45000"
                    className="bg-white border-neutral-200 text-neutral-900 rounded-xl h-14 text-lg font-semibold"
                  />
                  <p className="text-2xl font-bold text-neutral-900">
                    KES {Number(form.maxBudget || 0).toLocaleString()}
                    <span className="text-sm font-normal text-neutral-400"> /month</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {BUDGET_PRESETS.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => set('maxBudget', v)}
                        className={chipClass(form.maxBudget === v)}
                      >
                        {Number(v) / 1000}K
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {MOVE_IN_PRESETS.map((p) => {
                      const date = toISODate(new Date(Date.now() + p.days * 86400000))
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => set('moveInDate', date)}
                          className={chipClass(form.moveInDate === date)}
                        >
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                  <Input
                    type="date"
                    value={form.moveInDate}
                    onChange={(e) => set('moveInDate', e.target.value)}
                    className="bg-white border-neutral-200 text-neutral-900 rounded-xl h-12"
                  />
                </div>
              )}

              {step === 4 && (
                <div className="flex flex-wrap gap-2.5">
                  {BEDROOM_OPTIONS.map((b) => (
                    <button
                      key={b.value}
                      type="button"
                      onClick={() => set('bedrooms', b.value)}
                      className={chipClass(form.bedrooms === b.value)}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              )}

              {step === 5 && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input
                      autoFocus
                      value={areaQuery}
                      onChange={(e) => handleAreaQueryChange(e.target.value)}
                      onKeyDown={handleAreaKeyDown}
                      placeholder="Search for an area, e.g. Kilimani, Westlands..."
                      className="pl-10 h-12 bg-white border-neutral-200 text-neutral-900 rounded-xl"
                    />
                    {areaResults.length > 0 && (
                      <div className="absolute z-10 mt-1.5 w-full max-h-56 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg">
                        {areaResults.map((r, i) => {
                          const { label, qualifier } = formatLocationResult(r)
                          return (
                            <button
                              key={`${r.type}-${label}-${qualifier}-${i}`}
                              type="button"
                              onClick={() => addNeighborhood(label)}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-neutral-50 border-b border-neutral-100 last:border-0"
                            >
                              <span className="font-medium text-neutral-900">{label}</span>
                              <span className="text-neutral-400"> · {qualifier}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {areaResults.length === 0 && areaQuery.trim().length >= 2 && (
                      <div className="absolute z-10 mt-1.5 w-full rounded-xl border border-neutral-200 bg-white shadow-lg">
                        <button
                          type="button"
                          onClick={() => addNeighborhood(areaQuery.trim())}
                          className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-sm hover:bg-neutral-50 text-neutral-600"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" /> Add &ldquo;{areaQuery.trim()}&rdquo; anyway
                        </button>
                      </div>
                    )}
                  </div>

                  {form.neighborhoods.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {form.neighborhoods.map((n) => (
                        <span
                          key={n}
                          className="inline-flex items-center gap-1.5 pl-3.5 pr-2 py-2 rounded-full bg-neutral-100 text-neutral-900 text-sm font-medium"
                        >
                          {n}
                          <button
                            type="button"
                            onClick={() => toggleInList('neighborhoods', n)}
                            aria-label={`Remove ${n}`}
                            className="p-0.5 rounded-full hover:bg-neutral-200 text-neutral-500 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === 6 && (
                <div className="flex flex-wrap gap-2.5">
                  {AMENITIES.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleInList('amenities', a)}
                      className={chipClass(form.amenities.includes(a))}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              )}

              {step === 7 && (
                <div className="space-y-4">
                  <Textarea
                    autoFocus
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    placeholder="Anything managers should know — occupants, pets, preferred floor, etc."
                    className="bg-white border-neutral-200 text-neutral-900 rounded-xl min-h-24"
                  />
                  <div
                    onClick={() => set('agreed', !form.agreed)}
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                      form.agreed ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 bg-white'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        form.agreed ? 'border-neutral-900 bg-neutral-900' : 'border-neutral-300 bg-white'
                      }`}
                    >
                      {form.agreed && <CheckCircle className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                    </div>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                      I agree to the terms &amp; conditions and consent to LEA Executive sharing my
                      wishlist details with matching property managers.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {isLastStep ? (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="w-full h-12 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Broadcast Wishlist
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={goNext}
                disabled={!stepValid}
                className="w-full h-12 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
