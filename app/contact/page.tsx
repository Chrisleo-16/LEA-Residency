'use client'

import { useState } from 'react'
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  CheckCircle,
  Send,
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useRouteLoader } from '@/components/RouteLoaderProvider'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

const INQUIRY_TYPES = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'property', label: 'Property Info' },
  { value: 'viewing', label: 'Schedule Viewing' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'support', label: 'Technical Support' },
  { value: 'complaint', label: 'Complaint / Feedback' },
]

const CONTACT_METHODS = ['Email', 'Phone Call', 'WhatsApp']

export default function ContactPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    inquiryType: '',
    subject: '',
    message: '',
    contactMethod: 'Email',
    agreed: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const { startLoading } = useRouteLoader()

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }))

  const canSubmit =
    form.firstName && form.lastName && form.email && form.inquiryType && form.message && form.agreed

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.agreed) {
      setError('Please accept the terms to continue.')
      return
    }
    setSubmitting(true)
    try {
      await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      setSubmitted(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-6">
        <div className="w-full max-w-md rounded-2xl border border-neutral-100 bg-white p-10 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-neutral-900" strokeWidth={1.5} />
          </div>
          <p className="text-xs uppercase tracking-widest text-neutral-400 mb-3">Message Sent</p>
          <h2 className="text-2xl font-bold text-neutral-900 mb-3">We&apos;ll be in touch</h2>
          <p className="text-sm text-neutral-500 leading-relaxed mb-8">
            Thank you, {form.firstName}. Your message has been received. Our team typically
            responds within 2–4 hours during business hours.
          </p>
          <div className="space-y-2.5 mb-8 text-left">
            {[
              'Confirmation sent to your email',
              `We'll reach out via ${form.contactMethod}`,
              'Response within 2–4 hours',
            ].map((t) => (
              <div key={t} className="flex items-center gap-2.5 text-sm text-neutral-600">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-900 shrink-0" />
                {t}
              </div>
            ))}
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-semibold px-8 py-3 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ── NAV ─────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center gap-4">
          <Link
            href="/"
            onClick={() => startLoading()}
            className="flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <div className="w-px h-6 bg-neutral-200" />
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-neutral-900 flex items-center justify-center">
              <MessageSquare className="w-4.5 h-4.5 text-white" strokeWidth={2} />
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900 leading-tight">Contact Us</p>
              <p className="text-xs text-neutral-400 leading-tight">LEA Executive Residency</p>
            </div>
          </div>
        </div>
      </header>

      {/* ── HERO ────────────────────────────── */}
      <div className="bg-white border-b border-neutral-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 md:py-20">
          <div className="w-10 h-0.5 bg-neutral-900 mb-6" />
          <p className="text-xs uppercase tracking-widest text-neutral-400 mb-3">Get in Touch</p>
          <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 leading-tight mb-4">
            How Can We Help You?
          </h1>
          <p className="text-neutral-500 max-w-lg leading-relaxed">
            Questions about a unit, the platform, or your tenancy? Send us a message and our team
            will get back to you quickly.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12 md:py-16">
        <div className="grid lg:grid-cols-[1fr_340px] gap-8">
          {/* ── FORM ──────────────────────────── */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-8 bg-white p-6 md:p-8 rounded-2xl border border-neutral-100 shadow-sm"
          >
            {/* Personal info */}
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 mb-5 pb-3 border-b border-neutral-100">
                Personal Information
              </h2>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1.5">
                  <label htmlFor="firstName" className="text-sm font-medium text-neutral-900">
                    First Name *
                  </label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => set('firstName', e.target.value)}
                    placeholder="Jane"
                    required
                    className="h-11 bg-secondary/50 border-border text-foreground rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="lastName" className="text-sm font-medium text-neutral-900">
                    Last Name *
                  </label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => set('lastName', e.target.value)}
                    placeholder="Doe"
                    required
                    className="h-11 bg-secondary/50 border-border text-foreground rounded-xl"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-sm font-medium text-neutral-900">
                    Email Address *
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="jane@example.com"
                    required
                    className="h-11 bg-secondary/50 border-border text-foreground rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="text-sm font-medium text-neutral-900">
                    Phone Number
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="+254 700 000 000"
                    className="h-11 bg-secondary/50 border-border text-foreground rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Inquiry type */}
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 mb-5 pb-3 border-b border-neutral-100">
                Inquiry Type *
              </h2>
              <div className="flex flex-wrap gap-2.5">
                {INQUIRY_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set('inquiryType', t.value)}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      form.inquiryType === t.value
                        ? 'border-neutral-900 text-neutral-900 bg-neutral-100'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 mb-5 pb-3 border-b border-neutral-100">
                Your Message
              </h2>
              <div className="space-y-1.5 mb-4">
                <label htmlFor="subject" className="text-sm font-medium text-neutral-900">
                  Subject
                </label>
                <Input
                  id="subject"
                  value={form.subject}
                  onChange={(e) => set('subject', e.target.value)}
                  placeholder="e.g. Inquiry about a 2-bedroom unit"
                  className="h-11 bg-secondary/50 border-border text-foreground rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="message" className="text-sm font-medium text-neutral-900">
                  Message *
                </label>
                <Textarea
                  id="message"
                  value={form.message}
                  onChange={(e) => set('message', e.target.value)}
                  placeholder="Tell us more about what you need. The more detail, the faster we can help."
                  required
                  className="min-h-35 bg-secondary/50 border-border text-foreground rounded-xl"
                />
                <p className="text-xs text-neutral-400 text-right">{form.message.length} characters</p>
              </div>
            </div>

            {/* Preferred contact method */}
            <div>
              <label className="text-sm font-medium text-neutral-900 mb-3 block">
                Preferred Response Method
              </label>
              <div className="flex flex-col sm:flex-row gap-2.5">
                {CONTACT_METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set('contactMethod', m)}
                    className={`flex-1 h-11 rounded-xl border text-sm font-medium transition-colors ${
                      form.contactMethod === m
                        ? 'border-neutral-900 text-neutral-900 bg-neutral-100'
                        : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Agreement */}
            <div
              onClick={() => set('agreed', !form.agreed)}
              className={`flex items-start gap-3.5 p-5 rounded-xl border cursor-pointer transition-colors ${
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
                I agree to the terms & conditions and consent to LEA Executive processing my
                personal information in accordance with their privacy policy.
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={!canSubmit || submitting}
              className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground font-semibold rounded-xl flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" /> Send Message
                </>
              )}
            </Button>
          </form>

          {/* ── SIDEBAR ──────────────────────── */}
          <div className="flex flex-col gap-6">
            {/* Contact details */}
            <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-neutral-900 mb-5">Direct Contact</p>
              {[
                { icon: Phone, label: 'Phone', value: '+254 799 956574' },
                { icon: Mail, label: 'Email', value: 'cbempirefx@gmail.com' },
                { icon: MapPin, label: 'Location', value: 'Nairobi, Kenya' },
              ].map(({ icon: Icon, label, value }, i, arr) => (
                <div
                  key={label}
                  className={`flex gap-4 ${i < arr.length - 1 ? 'mb-4 pb-4 border-b border-neutral-100' : ''}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                    <Icon className="w-4.5 h-4.5 text-neutral-900" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-neutral-900">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Hours */}
            <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-900" strokeWidth={1.5} /> Business Hours
              </p>
              {[
                ['Mon – Fri', '8:00 AM – 6:00 PM'],
                ['Saturday', '9:00 AM – 4:00 PM'],
                ['Sunday', '10:00 AM – 2:00 PM'],
              ].map(([d, h]) => (
                <div
                  key={d}
                  className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0"
                >
                  <span className="text-sm text-neutral-500">{d}</span>
                  <span className="text-sm font-semibold text-neutral-900">{h}</span>
                </div>
              ))}
            </div>

            {/* Response promise */}
            <div className="rounded-2xl bg-neutral-900 text-white p-6 text-center">
              <MessageSquare className="w-7 h-7 mx-auto mb-3 text-white/80" strokeWidth={1.5} />
              <p className="text-2xl font-bold mb-1">2–4 Hours</p>
              <p className="text-xs text-white/60 leading-relaxed">
                Average response time during business hours
              </p>
            </div>

            {/* Tenant portal prompt */}
            <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-6">
              <p className="text-sm text-neutral-600 leading-relaxed mb-4">
                Already a resident? Log in to the tenant portal to chat directly with management.
              </p>
              <Link
                href="/login"
                onClick={() => startLoading()}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-900 border border-neutral-900 rounded-full px-5 py-2.5 hover:bg-neutral-900 hover:text-white transition-colors"
              >
                Tenant Portal →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
