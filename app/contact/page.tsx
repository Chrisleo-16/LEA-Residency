'use client'

import { useState } from 'react'
import { ArrowLeft, Building2, Phone, Mail, MapPin, Clock, MessageSquare, CheckCircle, Send } from 'lucide-react'
import Link from 'next/link'

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
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', inquiryType: '', subject: '', message: '', contactMethod: 'Email', agreed: false })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState('')

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const canSubmit = form.firstName && form.lastName && form.email && form.inquiryType && form.message && form.agreed

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.agreed) { setError('Please accept the terms to continue.'); return }
    setSubmitting(true)
    try {
      await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      setSubmitted(true)
    } catch { setError('Something went wrong. Please try again.') }
    finally { setSubmitting(false) }
  }

  const inputStyle = (name: string): React.CSSProperties => ({
    fontFamily: "'DM Sans', sans-serif", fontSize: 13,
    background: '#161616', border: `1px solid ${focused === name ? 'rgba(201,169,110,.5)' : 'rgba(242,237,228,.1)'}`,
    color: '#f2ede4', padding: '12px 14px', width: '100%', outline: 'none', transition: 'border-color .25s',
  })
  const labelStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '.16em',
    textTransform: 'uppercase', color: 'rgba(242,237,228,.42)', display: 'block', marginBottom: 8,
  }

  if (submitted) {
    return (
      <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", background: '#0a0a0a', color: '#f2ede4', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>
        <div style={{ background: '#131313', border: '1px solid rgba(201,169,110,.25)', padding: '56px 48px', maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={28} color="#4ade80" />
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 12 }}>Message Sent</div>
          <h2 style={{ fontSize: 38, fontWeight: 300, marginBottom: 16 }}>We'll be in <em style={{ color: '#c9a96e', fontStyle: 'italic' }}>touch</em></h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(242,237,228,.55)', lineHeight: 1.8, marginBottom: 32 }}>
            Thank you, {form.firstName}. Your message has been received. Our team typically responds within 2–4 hours during business hours.
          </p>
          {[{ e: '📧', t: 'Confirmation sent to your email' }, { e: '📱', t: `We'll reach out via ${form.contactMethod}` }, { e: '⏱', t: 'Response within 2–4 hours' }].map(({ e, t }) => (
            <div key={t} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(242,237,228,.45)', marginBottom: 8 }}>{e} {t}</div>
          ))}
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 32, fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', background: '#c9a96e', color: '#0a0a0a', padding: '13px 32px', textDecoration: 'none' }}>
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", background: '#0a0a0a', color: '#f2ede4', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }
        input, textarea { appearance: none; }
        input::placeholder, textarea::placeholder { color: rgba(242,237,228,.28); }
        textarea { resize: none; }

        .inq-pill { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; background: transparent; border: 1px solid rgba(242,237,228,.12); color: rgba(242,237,228,.5); padding: 10px 16px; cursor: pointer; transition: all .25s; }
        .inq-pill.active { border-color: #c9a96e; color: #c9a96e; background: rgba(201,169,110,.07); }
        .inq-pill:hover { border-color: rgba(201,169,110,.4); color: rgba(242,237,228,.85); }

        .cmethod-btn { font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; background: transparent; border: 1px solid rgba(242,237,228,.12); color: rgba(242,237,228,.5); padding: 9px 20px; cursor: pointer; transition: all .25s; }
        .cmethod-btn.active { border-color: #c9a96e; color: #c9a96e; background: rgba(201,169,110,.07); }
        .cmethod-btn:hover { border-color: rgba(201,169,110,.4); }

        .btn-gold { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; background: #c9a96e; color: #0a0a0a; border: none; cursor: pointer; padding: 14px 36px; transition: all .3s; display: inline-flex; align-items: center; gap: 8px; }
        .btn-gold:hover:not(:disabled) { background: #b8914f; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(201,169,110,.25); }
        .btn-gold:disabled { opacity: .4; cursor: not-allowed; }

        .contact-card { background: #131313; border: 1px solid rgba(242,237,228,.07); padding: 24px; transition: border-color .3s; }
        .contact-card:hover { border-color: rgba(201,169,110,.2); }

        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 900px) { .two-col { grid-template-columns: 1fr !important; } .sidebar-contact { order: -1; } }
        @media (max-width: 640px) { .inq-grid { grid-template-columns: repeat(2,1fr) !important; } }
      `}</style>

      {/* ── NAV ─────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,.97)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(242,237,228,.07)', padding: '0 40px', height: 66, display: 'flex', alignItems: 'center', gap: 20 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'rgba(242,237,228,.5)', fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase' }}
          onMouseOver={e => (e.currentTarget.style.color = '#c9a96e')} onMouseOut={e => (e.currentTarget.style.color = 'rgba(242,237,228,.5)')}>
          <ArrowLeft size={13} /> Home
        </Link>
        <div style={{ width: 1, height: 18, background: 'rgba(242,237,228,.1)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, border: '1px solid #c9a96e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={14} color="#c9a96e" />
          </div>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 500, color: '#f2ede4' }}>Contact Us</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'rgba(201,169,110,.65)' }}>LEA Executive Residency</div>
          </div>
        </div>
      </nav>

      {/* ── PAGE HERO ────────────────────────── */}
      <div style={{ background: '#0f0f0f', borderBottom: '1px solid rgba(242,237,228,.06)', padding: '48px 40px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 10 }}>Get in Touch</div>
          <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 60px)', fontWeight: 300, lineHeight: 1.05, marginBottom: 16 }}>
            How Can We <em style={{ color: '#c9a96e', fontStyle: 'italic' }}>Help You?</em>
          </h1>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 300, color: 'rgba(242,237,228,.5)', maxWidth: 480, lineHeight: 1.8 }}>
            Questions about a unit, the platform, or your tenancy? Send us a message and our team will get back to you quickly.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 40px' }}>
        <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32 }}>

          {/* ── FORM ──────────────────────────── */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* Name */}
            <div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid rgba(242,237,228,.06)' }}>Personal Information</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>First Name *</label>
                  <input style={inputStyle('firstName')} value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Jane" onFocus={() => setFocused('firstName')} onBlur={() => setFocused('')} required />
                </div>
                <div>
                  <label style={labelStyle}>Last Name *</label>
                  <input style={inputStyle('lastName')} value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Doe" onFocus={() => setFocused('lastName')} onBlur={() => setFocused('')} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Email Address *</label>
                  <input type="email" style={inputStyle('email')} value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" onFocus={() => setFocused('email')} onBlur={() => setFocused('')} required />
                </div>
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input type="tel" style={inputStyle('phone')} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+254 700 000 000" onFocus={() => setFocused('phone')} onBlur={() => setFocused('')} />
                </div>
              </div>
            </div>

            {/* Inquiry type */}
            <div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid rgba(242,237,228,.06)' }}>Inquiry Type *</div>
              <div className="inq-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {INQUIRY_TYPES.map(t => (
                  <button key={t.value} type="button" className={`inq-pill${form.inquiryType === t.value ? ' active' : ''}`} onClick={() => set('inquiryType', t.value)}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* Subject + message */}
            <div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid rgba(242,237,228,.06)' }}>Your Message</div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Subject</label>
                <input style={inputStyle('subject')} value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Inquiry about a 2-bedroom unit" onFocus={() => setFocused('subject')} onBlur={() => setFocused('')} />
              </div>
              <div>
                <label style={labelStyle}>Message *</label>
                <textarea style={{ ...inputStyle('message'), minHeight: 140 } as React.CSSProperties} value={form.message} onChange={e => set('message', e.target.value)} placeholder="Tell us more about what you need. The more detail, the faster we can help." onFocus={() => setFocused('message')} onBlur={() => setFocused('')} required />
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'rgba(242,237,228,.28)', marginTop: 6, textAlign: 'right' }}>{form.message.length} characters</div>
              </div>
            </div>

            {/* Preferred contact method */}
            <div>
              <label style={labelStyle}>Preferred Response Method</label>
              <div style={{ display: 'flex', gap: 10 }}>
                {CONTACT_METHODS.map(m => (
                  <button key={m} type="button" className={`cmethod-btn${form.contactMethod === m ? ' active' : ''}`} onClick={() => set('contactMethod', m)}>{m}</button>
                ))}
              </div>
            </div>

            {/* Agreement */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '20px', background: '#131313', border: `1px solid ${form.agreed ? 'rgba(201,169,110,.3)' : 'rgba(242,237,228,.07)'}`, cursor: 'pointer', transition: 'border-color .25s' }}
              onClick={() => set('agreed', !form.agreed)}>
              <div style={{ width: 18, height: 18, border: `1px solid ${form.agreed ? '#c9a96e' : 'rgba(242,237,228,.3)'}`, background: form.agreed ? '#c9a96e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, transition: 'all .2s' }}>
                {form.agreed && <CheckCircle size={12} color="#0a0a0a" />}
              </div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(242,237,228,.6)', lineHeight: 1.7 }}>
                I agree to the terms & conditions and consent to LEA Executive processing my personal information in accordance with their privacy policy.
              </p>
            </div>

            {error && (
              <div style={{ padding: '14px 18px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)' }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#f87171' }}>{error}</p>
              </div>
            )}

            <div>
              <button type="submit" className="btn-gold" disabled={!canSubmit || submitting}>
                {submitting
                  ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(10,10,10,.4)', borderTopColor: '#0a0a0a', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> Sending...</>
                  : <><Send size={14} /> Send Message</>
                }
              </button>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
          </form>

          {/* ── SIDEBAR ──────────────────────── */}
          <div className="sidebar-contact" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Contact details */}
            <div className="contact-card">
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 20 }}>Direct Contact</div>
              {[
                { icon: <Phone size={14} color="#c9a96e" />, label: 'Phone', value: '+254 700 000 000' },
                { icon: <Mail size={14} color="#c9a96e" />, label: 'Email', value: 'management@lea-residency.app' },
                { icon: <MapPin size={14} color="#c9a96e" />, label: 'Location', value: 'Nairobi, Kenya' },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ display: 'flex', gap: 12, marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid rgba(242,237,228,.05)' }}>
                  <div style={{ width: 32, height: 32, background: 'rgba(201,169,110,.08)', border: '1px solid rgba(201,169,110,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
                  <div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(242,237,228,.35)', marginBottom: 3 }}>{label}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: '#f2ede4' }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Hours */}
            <div className="contact-card">
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={12} /> Business Hours
              </div>
              {[['Mon – Fri', '8:00 AM – 6:00 PM'], ['Saturday', '9:00 AM – 4:00 PM'], ['Sunday', '10:00 AM – 2:00 PM']].map(([d, h]) => (
                <div key={d} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(242,237,228,.05)' }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(242,237,228,.5)' }}>{d}</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, color: '#f2ede4' }}>{h}</span>
                </div>
              ))}
            </div>

            {/* Response promise */}
            <div style={{ background: 'rgba(201,169,110,.06)', border: '1px solid rgba(201,169,110,.2)', padding: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <MessageSquare size={28} color="#c9a96e" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 400, color: '#f2ede4', marginBottom: 8 }}>2–4 Hour</div>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(242,237,228,.5)', lineHeight: 1.7, letterSpacing: '.04em' }}>Average response time during business hours</div>
              </div>
            </div>

            {/* Tenant portal prompt */}
            <div className="contact-card" style={{ background: '#0f0f0f' }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(242,237,228,.45)', lineHeight: 1.7, marginBottom: 14 }}>
                Already a resident? Log in to the tenant portal to chat directly with management.
              </div>
              <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: '#c9a96e', textDecoration: 'none', border: '1px solid rgba(201,169,110,.3)', padding: '9px 18px', transition: 'all .25s' }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(201,169,110,.08)')} onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                Tenant Portal →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}