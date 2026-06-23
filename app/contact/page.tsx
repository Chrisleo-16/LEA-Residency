'use client'

import { useState } from 'react'
import { ArrowLeft, Building2, Phone, Mail, MapPin, Clock, MessageSquare, CheckCircle, Send } from 'lucide-react'
import Link from 'next/link'
import {useRouteLoader} from '@/components/RouteLoaderProvider'

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
  const { startLoading } = useRouteLoader();

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
    fontFamily: "'Inter', sans-serif", fontSize: 14,
    background: '#ffffff', border: `1px solid ${focused === name ? '#c9a96e' : '#d1d5db'}`,
    borderRadius: '8px',
    color: '#4b5563', padding: '12px 14px', width: '100%', outline: 'none', transition: 'all .25s',
    boxShadow: focused === name ? '0 0 0 3px rgba(59,130,246,.15)' : 'none'
  })
  
  const labelStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500,
    color: '#374151', display: 'block', marginBottom: 6,
  }

  if (submitted) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif", background: '#f9fafb', color: '#4b5563', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');`}</style>
        <div style={{ background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)', padding: '56px 48px', maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={32} color="#16a34a" />
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: '#16a34a', marginBottom: 12 }}>Message Sent</div>
          <h2 style={{ fontSize: 32, fontWeight: 600, marginBottom: 16 }}>We'll be in touch</h2>
          <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.6, marginBottom: 32 }}>
            Thank you, {form.firstName}. Your message has been received. Our team typically responds within 2–4 hours during business hours.
          </p>
          {[{ e: '📧', t: 'Confirmation sent to your email' }, { e: '📱', t: `We'll reach out via ${form.contactMethod}` }, { e: '⏱', t: 'Response within 2–4 hours' }].map(({ e, t }) => (
            <div key={t} style={{ fontSize: 14, color: '#6b7280', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><span>{e}</span> {t}</div>
          ))}
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 32, fontSize: 14, fontWeight: 500, background: '#4b5563', color: '#ffffff', padding: '12px 32px', borderRadius: '8px', textDecoration: 'none', transition: 'background 0.2s' }}>
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#f9fafb', color: '#4b5563', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f9fafb; }
        input, textarea { appearance: none; }
        input::placeholder, textarea::placeholder { color: #9ca3af; }
        textarea { resize: vertical; }

        .inq-pill { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; background: #ffffff; border: 1px solid #d1d5db; border-radius: 20px; color: #4b5563; padding: 8px 16px; cursor: pointer; transition: all .2s; }
        .inq-pill.active { border-color: #c9a96e; color: #c9a96e; background: #fff; box-shadow: 0 0 0 2px rgba(59,130,246,.1); }
        .inq-pill:hover:not(.active) { border-color: #9ca3af; color: #4b5563; }

        .cmethod-btn { font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; background: #ffffff; border: 1px solid #d1d5db; border-radius: 8px; color: #4b5563; padding: 10px 20px; cursor: pointer; transition: all .2s; flex: 1; }
        .cmethod-btn.active { border-color: #c9a96e; color: #c9a96e; background: #fff; box-shadow: 0 0 0 2px rgba(59,130,246,.1); }
        .cmethod-btn:hover:not(.active) { border-color: #9ca3af; color: #4b5563; background: #f3f4f6; }

        .btn-primary { font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; background: #4b5563; color: #ffffff; border: none; border-radius: 8px; cursor: pointer; padding: 14px 36px; transition: all .2s; display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .btn-primary:hover:not(:disabled) { background: #1f2937; transform: translateY(-1px); box-shadow: 0 6px 8px -1px rgba(0,0,0,0.15); }
        .btn-primary:disabled { opacity: .5; cursor: not-allowed; }

        .contact-card { background: #ffffff; border: 1px solid #ece4db; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }

        .section-title { font-size: 16px; font-weight: 600; color: #4b5563; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #ece4db; }

        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 900px) { .two-col { grid-template-columns: 1fr !important; } .sidebar-contact { order: -1; } }
        @media (max-width: 640px) { .inq-grid { grid-template-columns: repeat(2,1fr) !important; } .cmethod-container { flex-direction: column; } }
      `}</style>

      {/* ── NAV ─────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #ece4db', padding: '0 24px', height: 70, display: 'flex', alignItems: 'center', gap: 20 }}>
        <Link href="/" onClick={()=>{startLoading();}} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: '#4b5563', fontSize: 14, fontWeight: 500, transition: 'color 0.2s' }}
          onMouseOver={e => (e.currentTarget.style.color = '#111827')} onMouseOut={e => (e.currentTarget.style.color = '#4b5563')}>
          <ArrowLeft size={18} /> Home
        </Link>
        <div style={{ width: 1, height: 24, background: '#ece4db' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: '#fff', border: '1px solid #c9a96e', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={18} color="#c9a96e" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#4b5563' }}>Contact Us</div>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>LEA Executive Residency</div>
          </div>
        </div>
      </nav>

      {/* ── PAGE HERO ────────────────────────── */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #ece4db', padding: '48px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 12 }}>Get in Touch</div>
          <h1 style={{ fontSize: 'clamp(32px, 4.5vw, 48px)', fontWeight: 700, color: '#4b5563', lineHeight: 1.1, marginBottom: 16 }}>
            How Can We Help You?
          </h1>
          <p style={{ fontSize: 16, color: '#4b5563', maxWidth: 540, lineHeight: 1.6 }}>
            Questions about a unit, the platform, or your tenancy? Send us a message and our team will get back to you quickly.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
        <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 40 }}>

          {/* ── FORM ──────────────────────────── */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 32, background: '#ffffff', padding: 32, borderRadius: 16, boxShadow: '0 1px 3px rgba(180, 185, 195, 0.4)', border: '1px solid #ece4db' }}>

            {/* Name */}
            <div>
              <div className="section-title">Personal Information</div>
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
              <div className="section-title">Inquiry Type *</div>
              <div className="inq-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {INQUIRY_TYPES.map(t => (
                  <button key={t.value} type="button" className={`inq-pill${form.inquiryType === t.value ? ' active' : ''}`} onClick={() => set('inquiryType', t.value)}>{t.label}</button>
                ))}
              </div>
            </div>

            {/* Subject + message */}
            <div>
              <div className="section-title">Your Message</div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Subject</label>
                <input style={inputStyle('subject')} value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Inquiry about a 2-bedroom unit" onFocus={() => setFocused('subject')} onBlur={() => setFocused('')} />
              </div>
              <div>
                <label style={labelStyle}>Message *</label>
                <textarea style={{ ...inputStyle('message'), minHeight: 140 } as React.CSSProperties} value={form.message} onChange={e => set('message', e.target.value)} placeholder="Tell us more about what you need. The more detail, the faster we can help." onFocus={() => setFocused('message')} onBlur={() => setFocused('')} required />
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8, textAlign: 'right' }}>{form.message.length} characters</div>
              </div>
            </div>

            {/* Preferred contact method */}
            <div>
              <label style={labelStyle}>Preferred Response Method</label>
              <div className="cmethod-container" style={{ display: 'flex', gap: 12 }}>
                {CONTACT_METHODS.map(m => (
                  <button key={m} type="button" className={`cmethod-btn${form.contactMethod === m ? ' active' : ''}`} onClick={() => set('contactMethod', m)}>{m}</button>
                ))}
              </div>
            </div>

            {/* Agreement */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '20px', background: form.agreed ? '#fff' : '#f9fafb', border: `1px solid ${form.agreed ? '#bfdbfe' : '#ece4db'}`, borderRadius: 8, cursor: 'pointer', transition: 'all .2s' }}
              onClick={() => set('agreed', !form.agreed)}>
              <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${form.agreed ? '#c9a96e' : '#d1d5db'}`, background: form.agreed ? '#c9a96e' : '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, transition: 'all .2s' }}>
                {form.agreed && <CheckCircle size={14} color="#ffffff" strokeWidth={3} />}
              </div>
              <p style={{ fontSize: 14, color: '#4b5563', lineHeight: 1.5 }}>
                I agree to the terms & conditions and consent to LEA Executive processing my personal information in accordance with their privacy policy.
              </p>
            </div>

            {error && (
              <div style={{ padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8 }}>
                <p style={{ fontSize: 14, color: '#dc2626', fontWeight: 500 }}>{error}</p>
              </div>
            )}

            <div>
              <button type="submit" className="btn-primary" disabled={!canSubmit || submitting}>
                {submitting
                  ? <><div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#ffffff', borderRadius: '50%', animation: 'spin .8s linear infinite' }} /> Sending...</>
                  : <><Send size={18} /> Send Message</>
                }
              </button>
            </div>
          </form>

          {/* ── SIDEBAR ──────────────────────── */}
          <div className="sidebar-contact" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Contact details */}
            <div className="contact-card">
              <div style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', marginBottom: 20 }}>Direct Contact</div>
              {[
                { icon: <Phone size={18} color="#c9a96e" />, label: 'Phone', value: '+254 748 333 763' },
                { icon: <Mail size={18} color="#c9a96e" />, label: 'Email', value: 'chrisbenevansleo@gmail.com' },
                { icon: <MapPin size={18} color="#c9a96e" />, label: 'Location', value: 'Nairobi, Kenya' },
              ].map(({ icon, label, value }) => (
                <div key={label} style={{ display: 'flex', gap: 16, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ width: 40, height: 40, background: '#fff', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#4b5563' }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Hours */}
            <div className="contact-card">
              <div style={{ fontSize: 14, fontWeight: 600, color: '#4b5563', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color="#c9a96e" /> Business Hours
              </div>
              {[['Mon – Fri', '8:00 AM – 6:00 PM'], ['Saturday', '9:00 AM – 4:00 PM'], ['Sunday', '10:00 AM – 2:00 PM']].map(([d, h]) => (
                <div key={d} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 14, color: '#6b7280' }}>{d}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#4b5563' }}>{h}</span>
                </div>
              ))}
            </div>

            {/* Response promise */}
            <div style={{ background: '#fff', border: '1px solid #4b5563', borderRadius: 12, padding: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <MessageSquare size={32} color="#c9a96e" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 24, fontWeight: 700, color: '#4b5563', marginBottom: 8 }}>2–4 Hour</div>
                <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5, fontWeight: 500 }}>Average response time during business hours</div>
              </div>
            </div>

            {/* Tenant portal prompt */}
            <div className="contact-card" style={{ background: '#f9fafb' }}>
              <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6, marginBottom: 16 }}>
                Already a resident? Log in to the tenant portal to chat directly with management.
              </div>
              <Link href="/login" onClick={()=>{startLoading();}} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#c9a96e', textDecoration: 'none', border: '1px solid #c9a96e', background: '#ffffff', borderRadius: 8, padding: '10px 20px', transition: 'all .2s' }}
                onMouseOver={e => (e.currentTarget.style.background = '#fff')} onMouseOut={e => (e.currentTarget.style.background = '#ffffff')}>
                Tenant Portal →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}