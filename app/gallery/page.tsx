'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  Search, Grid, List, ArrowLeft, MapPin,
  Bed, Bath, Square, Heart, ArrowUpRight,
  SlidersHorizontal, X, Building2
} from 'lucide-react'
import Link from 'next/link'
 
const GOLD = '#c9a96e'

const sampleProperties = [
  { id: '1', title: 'Sunset Apartments', type: 'Apartment Block', location: 'Nairobi, Kenya', price: 45000, bedrooms: 2, bathrooms: 1, area: 85, featured: true, available: true, image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=800', tag: 'Featured' },
  { id: '2', title: 'Garden Villa Estate', type: 'Villa', location: 'Karen, Nairobi', price: 85000, bedrooms: 4, bathrooms: 3, area: 250, featured: true, available: true, image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800', tag: 'Popular' },
  { id: '3', title: 'City Heights', type: 'Apartment', location: 'Westlands, Nairobi', price: 55000, bedrooms: 3, bathrooms: 2, area: 120, featured: false, available: true, image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=800', tag: 'New' },
  { id: '4', title: 'Riverside Gardens', type: 'Townhouse', location: 'Thika Road, Nairobi', price: 65000, bedrooms: 3, bathrooms: 2, area: 150, featured: false, available: false, image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800', tag: 'Occupied' },
  { id: '5', title: 'Executive Suites', type: 'Penthouse', location: 'Kilimani, Nairobi', price: 120000, bedrooms: 3, bathrooms: 2, area: 180, featured: true, available: true, image: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?q=80&w=800', tag: 'Exclusive' },
  { id: '6', title: 'Student Housing Complex', type: 'Apartment', location: 'Juja, Kenya', price: 25000, bedrooms: 1, bathrooms: 1, area: 45, featured: false, available: true, image: 'https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?q=80&w=800', tag: 'Budget' },
]

const TYPES = ['All', 'Apartment', 'Villa', 'Townhouse', 'Penthouse', 'Apartment Block']
const SORTS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price-low', label: 'Price: Low → High' },
  { value: 'price-high', label: 'Price: High → Low' },
  { value: 'area', label: 'Largest Area' },
]

export default function GalleryPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('All')
  const [sort, setSort] = useState('newest')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [liked, setLiked] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  const fmtKES = (n: number) =>
    'KES ' + new Intl.NumberFormat('en-KE', { minimumFractionDigits: 0 }).format(n)

  const filtered = sampleProperties
    .filter(p => {
      const q = search.toLowerCase()
      return (!q || p.title.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)) &&
        (type === 'All' || p.type.toLowerCase().includes(type.toLowerCase()))
    })
    .sort((a, b) => {
      if (sort === 'price-low') return a.price - b.price
      if (sort === 'price-high') return b.price - a.price
      if (sort === 'area') return b.area - a.area
      return 0
    })

  return (
    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", background: '#0a0a0a', color: '#f2ede4', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }

        .filter-pill { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; letter-spacing: .08em; text-transform: uppercase; background: transparent; border: 1px solid rgba(242,237,228,.14); color: rgba(242,237,228,.5); padding: 8px 18px; cursor: pointer; transition: all .25s; white-space: nowrap; }
        .filter-pill.active, .filter-pill:hover { border-color: #c9a96e; color: #c9a96e; background: rgba(201,169,110,.06); }

        .sort-select { font-family: 'DM Sans', sans-serif; font-size: 12px; background: #161616; border: 1px solid rgba(242,237,228,.1); color: rgba(242,237,228,.7); padding: 10px 14px; cursor: pointer; outline: none; }
        .sort-select option { background: #161616; }

        .prop-card { background: #131313; border: 1px solid rgba(242,237,228,.07); overflow: hidden; cursor: pointer; transition: border-color .3s, transform .4s cubic-bezier(.16,1,.3,1); }
        .prop-card:hover { border-color: rgba(201,169,110,.3); transform: translateY(-5px); }
        .prop-card:hover .prop-img-inner { transform: scale(1.05); }
        .prop-img-inner { width: 100%; height: 100%; object-fit: cover; transition: transform .7s cubic-bezier(.16,1,.3,1); display: block; }

        .heart-btn { width: 34px; height: 34px; background: rgba(10,10,10,.75); border: 1px solid rgba(242,237,228,.15); cursor: pointer; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); transition: all .2s; }
        .heart-btn:hover { border-color: #c9a96e; }

        .view-btn { width: 36px; height: 36px; border: 1px solid rgba(242,237,228,.14); background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .25s; }
        .view-btn.active { border-color: #c9a96e; background: rgba(201,169,110,.1); }
        .view-btn:hover { border-color: rgba(201,169,110,.5); }

        .search-wrap { position: relative; flex: 1; max-width: 380px; }
        .search-inp { font-family: 'DM Sans', sans-serif; font-size: 13px; background: #161616; border: 1px solid rgba(242,237,228,.1); color: #f2ede4; padding: 11px 14px 11px 40px; width: 100%; outline: none; transition: border-color .25s; }
        .search-inp::placeholder { color: rgba(242,237,228,.32); }
        .search-inp:focus { border-color: rgba(201,169,110,.4); }

        .stat-chip { font-family: 'DM Sans', sans-serif; font-size: 11px; letter-spacing: .06em; border: 1px solid rgba(242,237,228,.1); padding: 6px 14px; color: rgba(242,237,228,.45); }

        .list-card { background: #131313; border: 1px solid rgba(242,237,228,.07); overflow: hidden; cursor: pointer; transition: border-color .3s; display: flex; gap: 0; }
        .list-card:hover { border-color: rgba(201,169,110,.3); }
        .list-card:hover .list-img-inner { transform: scale(1.04); }
        .list-img-inner { width: 100%; height: 100%; object-fit: cover; transition: transform .6s cubic-bezier(.16,1,.3,1); display: block; }

        .avail-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

        @media (max-width: 768px) {
          .filter-row { flex-wrap: wrap !important; }
          .grid-3 { grid-template-columns: 1fr !important; }
          .hide-sm { display: none !important; }
        }
      `}</style>

      {/* ── NAV ──────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,10,.97)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(242,237,228,.07)',
        padding: '0 40px', height: 66,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'rgba(242,237,228,.55)', fontFamily: "'DM Sans', sans-serif", fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', transition: 'color .2s' }}
            onMouseOver={e => (e.currentTarget.style.color = '#c9a96e')}
            onMouseOut={e => (e.currentTarget.style.color = 'rgba(242,237,228,.55)')}>
            <ArrowLeft size={14} /> Back
          </Link>
          <div style={{ width: 1, height: 20, background: 'rgba(242,237,228,.1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, border: '1px solid #c9a96e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={14} color="#c9a96e" />
            </div>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 17, fontWeight: 500, color: '#f2ede4', letterSpacing: '.04em' }}>Property Gallery</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(201,169,110,.65)' }}>LEA Executive Residency</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className={`view-btn${view === 'grid' ? ' active' : ''}`} onClick={() => setView('grid')} title="Grid view">
            <Grid size={15} color={view === 'grid' ? '#c9a96e' : 'rgba(242,237,228,.5)'} />
          </button>
          <button className={`view-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')} title="List view">
            <List size={15} color={view === 'list' ? '#c9a96e' : 'rgba(242,237,228,.5)'} />
          </button>
        </div>
      </nav>

      {/* ── HERO BAR ──────────────────────────── */}
      <div style={{ background: '#0f0f0f', borderBottom: '1px solid rgba(242,237,228,.06)', padding: '32px 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '.22em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 8 }}>Browse Collection</div>
          <h1 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 300, lineHeight: 1.1, marginBottom: 20 }}>
            Available <em style={{ color: '#c9a96e', fontStyle: 'italic' }}>Properties</em>
          </h1>

          {/* Search + sort row */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="search-wrap">
              <Search size={14} color="rgba(242,237,228,.35)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input className="search-inp" placeholder="Search by name or location..." value={search} onChange={e => setSearch(e.target.value)} />
              {search && (
                <button style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(242,237,228,.4)' }} onClick={() => setSearch('')}>
                  <X size={13} />
                </button>
              )}
            </div>
            <select className="sort-select" value={sort} onChange={e => setSort(e.target.value)}>
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <div className="stat-chip">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>

      {/* ── TYPE FILTERS ──────────────────────── */}
      <div style={{ background: '#0a0a0a', borderBottom: '1px solid rgba(242,237,228,.05)', padding: '0 40px', overflowX: 'auto' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 0, padding: '16px 0' }} className="filter-row">
          {TYPES.map(t => (
            <button key={t} className={`filter-pill${type === t ? ' active' : ''}`} onClick={() => setType(t)}
              style={{ marginRight: 8 }}>{t}</button>
          ))}
        </div>
      </div>

      {/* ── RESULTS ──────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 40px' }}>

        {/* Grid view */}
        {view === 'grid' && (
          <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {filtered.map((p, idx) => (
              <div key={p.id} className="prop-card" onClick={() => router.push(`/gallery/${p.id}`)}>
                {/* Image */}
                <div style={{ position: 'relative', height: idx === 0 ? 300 : 240, overflow: 'hidden' }}>
                  <img src={p.image} alt={p.title} className="prop-img-inner" />

                  {/* Overlay */}
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,10,.85) 0%, transparent 55%)', pointerEvents: 'none' }} />

                  {/* Tag */}
                  <div style={{ position: 'absolute', top: 14, left: 14 }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', background: p.available ? '#c9a96e' : 'rgba(239,68,68,.85)', color: p.available ? '#0a0a0a' : '#fff', padding: '4px 10px', fontWeight: 600 }}>{p.tag}</span>
                  </div>

                  {/* Heart */}
                  <button className="heart-btn" style={{ position: 'absolute', top: 14, right: 14 }}
                    onClick={e => { e.stopPropagation(); setLiked(l => l.includes(p.id) ? l.filter(x => x !== p.id) : [...l, p.id]) }}>
                    <Heart size={14} color={liked.includes(p.id) ? '#ef4444' : '#f2ede4'} fill={liked.includes(p.id) ? '#ef4444' : 'none'} />
                  </button>

                  {/* Unavailable veil */}
                  {!p.available && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', border: '1px solid rgba(242,237,228,.4)', padding: '8px 18px', color: 'rgba(242,237,228,.7)' }}>Currently Occupied</span>
                    </div>
                  )}

                  {/* Bottom info over image */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 18px' }}>
                    <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, fontWeight: 400, color: '#f2ede4', lineHeight: 1.2, marginBottom: 4 }}>{p.title}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(242,237,228,.55)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={10} />{p.location}
                    </div>
                  </div>
                </div>

                {/* Card footer */}
                <div style={{ padding: '16px 18px', borderTop: '1px solid rgba(242,237,228,.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 500, color: '#c9a96e' }}>{fmtKES(p.price)}</span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(242,237,228,.35)', marginLeft: 4 }}>/ month</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="avail-dot" style={{ background: p.available ? '#4ade80' : '#ef4444' }} />
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: p.available ? '#4ade80' : '#ef4444' }}>{p.available ? 'Available' : 'Occupied'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                    {[
                      { icon: <Bed size={12} />, val: `${p.bedrooms} bd` },
                      { icon: <Bath size={12} />, val: `${p.bathrooms} ba` },
                      { icon: <Square size={12} />, val: `${p.area}m²` },
                    ].map(({ icon, val }) => (
                      <div key={val} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(242,237,228,.45)' }}>
                        {icon}{val}
                      </div>
                    ))}
                  </div>
                  <button style={{ width: '100%', fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', background: 'rgba(201,169,110,.08)', border: '1px solid rgba(201,169,110,.25)', color: '#c9a96e', padding: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .25s' }}
                    onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,169,110,.16)'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#c9a96e' }}
                    onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,169,110,.08)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,169,110,.25)' }}
                    onClick={e => { e.stopPropagation(); router.push('/viewing') }}>
                    Schedule Viewing <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List view */}
        {view === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map(p => (
              <div key={p.id} className="list-card" onClick={() => router.push(`/gallery/${p.id}`)}>
                {/* Image */}
                <div style={{ width: 240, minHeight: 160, position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                  <img src={p.image} alt={p.title} className="list-img-inner" />
                  {!p.available && <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,.6)' }} />}
                  <span style={{ position: 'absolute', top: 12, left: 12, fontFamily: "'DM Sans', sans-serif", fontSize: 9, letterSpacing: '.12em', textTransform: 'uppercase', background: p.available ? '#c9a96e' : 'rgba(239,68,68,.8)', color: p.available ? '#0a0a0a' : '#fff', padding: '3px 9px', fontWeight: 600 }}>{p.tag}</span>
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                        <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 400, color: '#f2ede4', marginBottom: 4 }}>{p.title}</h3>
                        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(242,237,228,.45)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={11} />{p.location}
                        </div>
                      </div>
                      <button className="heart-btn" style={{ flexShrink: 0 }}
                        onClick={e => { e.stopPropagation(); setLiked(l => l.includes(p.id) ? l.filter(x => x !== p.id) : [...l, p.id]) }}>
                        <Heart size={14} color={liked.includes(p.id) ? '#ef4444' : '#f2ede4'} fill={liked.includes(p.id) ? '#ef4444' : 'none'} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 20, margin: '16px 0' }}>
                      {[{ icon: <Bed size={13} />, val: `${p.bedrooms} Bedrooms` }, { icon: <Bath size={13} />, val: `${p.bathrooms} Bathrooms` }, { icon: <Square size={13} />, val: `${p.area} m²` }].map(({ icon, val }) => (
                        <div key={val} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(242,237,228,.45)' }}>
                          {icon}{val}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 500, color: '#c9a96e' }}>{fmtKES(p.price)}</span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(242,237,228,.35)', marginLeft: 6 }}>/ month</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="avail-dot" style={{ background: p.available ? '#4ade80' : '#ef4444' }} />
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: p.available ? '#4ade80' : '#ef4444' }}>{p.available ? 'Available' : 'Occupied'}</span>
                      </div>
                      <button style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', background: 'rgba(201,169,110,.08)', border: '1px solid rgba(201,169,110,.25)', color: '#c9a96e', padding: '9px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .25s' }}
                        onMouseOver={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,169,110,.16)')}
                        onMouseOut={e => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(201,169,110,.08)')}
                        onClick={e => { e.stopPropagation(); router.push('/viewing') }}>
                        View Details <ArrowUpRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 48, fontWeight: 300, color: 'rgba(242,237,228,.1)', marginBottom: 16 }}>No results</div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(242,237,228,.4)', marginBottom: 24 }}>Try adjusting your search or filters</p>
            <button style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', background: 'rgba(201,169,110,.08)', border: '1px solid rgba(201,169,110,.3)', color: '#c9a96e', padding: '12px 28px', cursor: 'pointer' }}
              onClick={() => { setSearch(''); setType('All') }}>Clear Filters</button>
          </div>
        )}
      </div>
    </div>
  )
}