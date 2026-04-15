'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, MessageSquare, Receipt, FileText, Wrench,
  Bell, ClipboardList, Users, Shield, Wifi, Car,
  Zap, CheckCircle, ArrowRight, ArrowUpRight,
  Star, Phone, Mail, MapPin, Menu, X
} from 'lucide-react'
// import LuxuryHamburgerMenu from '@/components/ui/LuxuryHamburgerMenu'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'


interface LuxuryHamburgerMenuProps {
  user: null | any; // can be replaced with actual SupabaseUser type
  currentPage: string;
  onNavigate?: (path: string) => void;
}

const NAV_ITEMS = [
  {
    label: "Properties",
    sub: "Browse our collection",
    path: "properties",
    num: "01",
  },
  {
    label: "Gallery",
    sub: "Virtual property tours",
    path: "gallery",
    num: "02",
  },
  {
    label: "Experiences",
    sub: "Curated stays",
    path: "experiences",
    num: "03",
  },
  { label: "Services", sub: "What we offer", path: "services", num: "04" },
  { label: "Contact", sub: "Get in touch", path: "contact", num: "05" },
];

const IMAGES = [
  "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?q=80&w=600", // Modern living room
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=600", // Luxury kitchen
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=600", // Master bedroom
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=600", // Spa bathroom
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=600", // Rooftop terrace
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=600", // Fitness center
];

function LuxuryHamburgerMenu({
  user,
  currentPage,
  onNavigate,
}: LuxuryHamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const openMenu = () => {
    setOpen(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
  };

  const closeMenu = () => {
    setVisible(false);
    setTimeout(() => setOpen(false), 600);
  };

  const handleNav = (path: string) => {
    closeMenu();
    setTimeout(() => {
      if (onNavigate) onNavigate(path);
      else {
        const el = document.getElementById(path);
        el?.scrollIntoView({ behavior: "smooth" });
      }
    }, 650);
  };

  const activeImage = hovered !== null ? IMAGES[hovered] : IMAGES[0];

  return (
    <>
      <style>{`
        @keyframes lea-line-in {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes lea-fade-up {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lea-img-in {
          from { opacity: 0; transform: scale(1.08); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes lea-curtain-open {
          from { clip-path: inset(0 0 100% 0); }
          to   { clip-path: inset(0 0 0% 0); }
        }
        .lea-overlay {
          opacity: 0;
          transition: opacity 0.55s cubic-bezier(.16,1,.3,1);
        }
        .lea-overlay.visible {
          opacity: 1;
        }
        .lea-panel {
          transform: translateX(100%);
          transition: transform 0.6s cubic-bezier(.16,1,.3,1);
        }
        .lea-panel.visible {
          transform: translateX(0);
        }
        .lea-img-panel {
          transform: translateX(80px);
          opacity: 0;
          transition: transform 0.7s 0.15s cubic-bezier(.16,1,.3,1),
                      opacity   0.7s 0.15s cubic-bezier(.16,1,.3,1);
        }
        .lea-img-panel.visible {
          transform: translateX(0);
          opacity: 1;
        }
        .lea-nav-item {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.5s, transform 0.5s;
        }
        .lea-nav-item.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .lea-nav-label {
          position: relative;
          display: inline-block;
          color: rgba(245,240,232,0.55);
          transition: color 0.3s;
          cursor: pointer;
        }
        .lea-nav-label::after {
          content: '';
          position: absolute;
          left: 0; bottom: -4px;
          width: 100%; height: 1px;
          background: #c9a96e;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.4s cubic-bezier(.16,1,.3,1);
        }
        .lea-nav-label:hover { color: #f5f0e8; }
        .lea-nav-label:hover::after { transform: scaleX(1); }
        .lea-nav-row:hover .lea-nav-num { color: #c9a96e; }
        .lea-prop-img {
          transition: transform 0.7s cubic-bezier(.16,1,.3,1), opacity 0.5s;
        }
        .lea-burger-line {
          display: block;
          height: 1px;
          background: #c9a96e;
          transition: transform 0.4s cubic-bezier(.16,1,.3,1),
                      opacity   0.3s,
                      width     0.3s;
          transform-origin: center;
        }
        .lea-close-x {
          position: relative;
          width: 24px; height: 24px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .lea-close-x::before,
        .lea-close-x::after {
          content: '';
          position: absolute;
          top: 50%; left: 0;
          width: 100%; height: 1px;
          background: #c9a96e;
          transform-origin: center;
          transition: transform 0.35s cubic-bezier(.16,1,.3,1);
        }
        .lea-close-x::before { transform: translateY(-50%) rotate(45deg);  }
        .lea-close-x::after  { transform: translateY(-50%) rotate(-45deg); }
        .lea-close-x:hover::before { transform: translateY(-50%) rotate(135deg);  }
        .lea-close-x:hover::after  { transform: translateY(-50%) rotate(45deg);   }
        @media (min-width: 769px) {
        .mobile-only-menu {
            display: none !important;
        }
        }
      `}</style>

      {/* Hamburger trigger */}
      <button
          onClick={openMenu}
          aria-label="Open menu"
          className="mobile-only-menu"
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 10001,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "10px 8px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            alignItems: "flex-end",
          }}
        >
        <span className="lea-burger-line" style={{ width: 24 }} />
        <span className="lea-burger-line" style={{ width: 16 }} />
        <span className="lea-burger-line" style={{ width: 20 }} />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className={`lea-overlay${visible ? " visible" : ""}`}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(10,10,10,0.55)",
            backdropFilter: "blur(2px)",
          }}
          onClick={closeMenu}
        />
      )}

      {/* Sliding panel */}
      {open && (
        <div
          className={`lea-panel${visible ? " visible" : ""}`}
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            width: "100%",
            maxWidth: 900,
            display: "flex",
            flexDirection: "row",
            background: "#111",
            borderLeft: "1px solid rgba(201,169,110,0.12)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left image panel (desktop only) */}
          <div
            className={`lea-img-panel${visible ? " visible" : ""}`}
            style={{
              width: "40%",
              position: "relative",
              overflow: "hidden",
              display: "none",
            }}
            ref={(el) => {
              if (el)
                el.style.display = window.innerWidth >= 640 ? "block" : "none";
            }}
          >
            <img
              src={activeImage}
              alt=""
              className="lea-prop-img"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(to right, rgba(10,10,10,.7) 0%, rgba(10,10,10,.1) 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 32,
                left: 32,
                width: 40,
                height: 40,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 24,
                  height: 1,
                  background: "#c9a96e",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 1,
                  height: 24,
                  background: "#c9a96e",
                }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 32,
                right: 32,
                width: 40,
                height: 40,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 24,
                  height: 1,
                  background: "#c9a96e",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 1,
                  height: 24,
                  background: "#c9a96e",
                }}
              />
            </div>
          </div>

          {/* Right nav panel */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: "40px 48px",
              overflowY: "auto",
              background: "#0f0f0f",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 56,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    border: "1px solid #c9a96e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Building2 size={14} color="#c9a96e" />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 16,
                      fontWeight: 500,
                      color: "#f5f0e8",
                      letterSpacing: ".04em",
                      lineHeight: 1.1,
                    }}
                  >
                    LEA Executive
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 8,
                      letterSpacing: ".2em",
                      textTransform: "uppercase",
                      color: "rgba(201,169,110,.7)",
                    }}
                  >
                    Luxury Residences
                  </div>
                </div>
              </div>
              <div
                className="lea-close-x"
                onClick={closeMenu}
                aria-label="Close menu"
              />
            </div>

            <nav style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 10,
                  letterSpacing: ".22em",
                  textTransform: "uppercase",
                  color: "rgba(201,169,110,.5)",
                  marginBottom: 28,
                }}
              >
                Navigation
              </div>

              {NAV_ITEMS.map((item, i) => (
                <div
                  key={item.path}
                  className={`lea-nav-item lea-nav-row${visible ? " visible" : ""}`}
                  style={{
                    transitionDelay: visible ? `${0.12 + i * 0.07}s` : "0s",
                    display: "flex",
                    alignItems: "baseline",
                    gap: 20,
                    padding: "18px 0",
                    borderBottom: "1px solid rgba(245,240,232,0.05)",
                    cursor: "pointer",
                  }}
                  onClick={() => handleNav(item.path)}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span
                    className="lea-nav-num"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11,
                      letterSpacing: ".1em",
                      color: "rgba(245,240,232,0.22)",
                      minWidth: 28,
                      transition: "color 0.3s",
                    }}
                  >
                    {item.num}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      className="lea-nav-label"
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: "clamp(28px, 4.5vw, 44px)",
                        fontWeight: 300,
                        lineHeight: 1.1,
                        letterSpacing: "-.01em",
                        color:
                          hovered === i ? "#f5f0e8" : "rgba(245,240,232,0.55)",
                        transition: "color 0.3s",
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 12,
                        color: "rgba(245,240,232,0.3)",
                        marginTop: 3,
                        letterSpacing: ".04em",
                        opacity: hovered === i ? 1 : 0,
                        transform:
                          hovered === i ? "translateX(0)" : "translateX(-8px)",
                        transition: "opacity 0.3s, transform 0.3s",
                      }}
                    >
                      {item.sub}
                    </div>
                  </div>
                  <ArrowUpRight
                    size={18}
                    color="#c9a96e"
                    style={{
                      opacity: hovered === i ? 1 : 0,
                      transform:
                        hovered === i
                          ? "translate(0,0)"
                          : "translate(-6px, 6px)",
                      transition: "opacity 0.3s, transform 0.3s",
                      flexShrink: 0,
                    }}
                  />
                </div>
              ))}
            </nav>

            <div
              className={`lea-nav-item${visible ? " visible" : ""}`}
              style={{
                transitionDelay: visible ? "0.5s" : "0s",
                marginTop: 48,
              }}
            >
              <button
                onClick={() => {
                  closeMenu();
                  setTimeout(() => router.push("/login"), 600);
                }}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  background: "#c9a96e",
                  color: "#0f0f0f",
                  border: "none",
                  cursor: "pointer",
                  padding: "14px 32px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 36,
                  transition: "background 0.25s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "#b8914f")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "#c9a96e")
                }
              >
                {user ? "Go to Dashboard" : "Sign In / List Property"}
                <ArrowUpRight size={13} />
              </button>

              <div
                style={{
                  height: 1,
                  background: "rgba(245,240,232,0.08)",
                  marginBottom: 28,
                }}
              />

              <div style={{ display: "flex", gap: 32, flexWrap: "wrap" }}>
                {[
                  { icon: <Phone size={12} />, text: "+254 700 123 456" },
                  { icon: <Mail size={12} />, text: "hello@leaexecutive.com" },
                  { icon: <MapPin size={12} />, text: "Nairobi, Kenya" },
                ].map(({ icon, text }) => (
                  <div
                    key={text}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11,
                      color: "rgba(245,240,232,0.35)",
                      letterSpacing: ".04em",
                    }}
                  >
                    <span style={{ color: "#c9a96e", display: "flex" }}>
                      {icon}
                    </span>
                    {text}
                  </div>
                ))}
              </div>

              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 10,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: "rgba(245,240,232,0.2)",
                  marginTop: 28,
                }}
              >
                © 2025 LEA Executive — Luxury Rentals & Residences
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  // Dashboard features — exactly what exists in the app
  const features = [
    {
      icon: MessageSquare,
      title: 'Direct Chat with Management',
      desc: 'Tenants get a private messaging channel with the property manager. Ask questions, report issues, get updates — no phone tag, no waiting.',
      color: '#0d9488',
      num: '01',
    },
    {
      icon: Receipt,
      title: 'M-Pesa Rent Payments',
      desc: 'Pay rent directly via M-Pesa. Your payment is logged and confirmed in the system immediately. Landlord gets instant notification.',
      color: '#16a34a',
      num: '02',
    },
    {
      icon: FileText,
      title: 'Policies & Documents',
      desc: 'House rules, tenancy agreements, move-in guidelines — all stored digitally. Read them anytime, sign and download the agreement as a PDF.',
      color: '#2563eb',
      num: '03',
    },
    {
      icon: Wrench,
      title: 'Maintenance Requests',
      desc: 'Submit plumbing, electrical, structural, or cleaning requests with one tap. Track status from submitted → in progress → resolved in real time.',
      color: '#ea580c',
      num: '04',
    },
    {
      icon: ClipboardList,
      title: 'Formal Complaints',
      desc: 'Log complaints with a title, full description, and timestamp. Management reviews and updates status. Everything is on record.',
      color: '#dc2626',
      num: '05',
    },
    {
      icon: Users,
      title: 'Community Group Chat',
      desc: 'A shared group channel for all residents. Management posts announcements, tenants stay informed about building updates and events.',
      color: '#7c3aed',
      num: '06',
    },
    {
      icon: Bell,
      title: 'Push Notifications',
      desc: 'Instant alerts for new messages, payment confirmations, status updates, and community announcements — even when the app is closed.',
      color: '#b45309',
      num: '07',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      desc: 'Your data is protected with Supabase Row Level Security. Only you and your property manager see your personal conversations and records.',
      color: '#0891b2',
      num: '08',
    },
  ]

  // What you see when you log in as a tenant
  const dashboardTabs = [
    { label: 'Chat', icon: MessageSquare, desc: 'Private messages with your landlord' },
    { label: 'Community', icon: Users, desc: 'Group chat & announcements' },
    { label: 'Complaints', icon: ClipboardList, desc: 'Submit & track issues' },
    { label: 'Requests', icon: Wrench, desc: 'Maintenance & service requests' },
    { label: 'Policies', icon: FileText, desc: 'Documents & house rules' },
    { label: 'Settings', icon: Bell, desc: 'Profile & notifications' },
  ]

  const testimonials = [
    {
      name: 'Amina W.',
      role: 'Resident Tenant',
      avatar: 'AW',
      rating: 5,
      text: 'Paying rent through the app is so seamless. I send to the Paybill and a few seconds later it shows confirmed. No more calling to check if it went through.',
    },
    {
      name: 'James M.',
      role: 'Resident Tenant',
      avatar: 'JM',
      rating: 5,
      text: 'I logged a plumbing issue on Monday morning. By Wednesday it was already resolved and marked done in the app. This is how management should work.',
    },
    {
      name: 'Faith N.',
      role: 'Resident Tenant',
      avatar: 'FN',
      rating: 5,
      text: 'The community chat is great. We know immediately when there\'s a water outage or a notice from management. Everyone stays on the same page.',
    },
  ]

  const howItWorks = [
    {
      step: '01',
      title: 'You get an account',
      desc: 'Your property manager registers you in the system. You receive a login link and set up your account in under 2 minutes.',
    },
    {
      step: '02',
      title: 'Set up your profile',
      desc: 'Add your name, photo, and phone number. Link your M-Pesa number so payments can be tracked automatically when you pay rent.',
    },
    {
      step: '03',
      title: 'Manage everything from one place',
      desc: 'Chat with management, pay rent, submit requests, read policies, and stay connected with your building community — all in one app.',
    },
  ]

  return (
    <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", background: '#0a0a0a', color: '#f2ede4', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #0a0a0a; }

        .nav-btn { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; background: none; border: none; cursor: pointer; color: rgba(242,237,228,.55); transition: color .2s; padding: 4px 0; }
        .nav-btn:hover { color: #f2ede4; }

        .btn-gold { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; background: #c9a96e; color: #0a0a0a; border: none; cursor: pointer; padding: 14px 32px; transition: all .3s; display: inline-flex; align-items: center; gap: 8px; }
        .btn-gold:hover { background: #b8914f; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(201,169,110,.25); }

        .btn-outline { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; background: transparent; color: #f2ede4; border: 1px solid rgba(242,237,228,.28); cursor: pointer; padding: 13px 32px; transition: all .3s; display: inline-flex; align-items: center; gap: 8px; }
        .btn-outline:hover { border-color: #c9a96e; color: #c9a96e; }

        .gold-line { width: 44px; height: 1px; background: #c9a96e; margin: 16px 0; }
        .gold-line-center { width: 44px; height: 1px; background: #c9a96e; margin: 16px auto; }
        .sec-label { font-family: 'DM Sans', sans-serif; font-size: 10px; letter-spacing: .24em; text-transform: uppercase; color: #c9a96e; }

        .feat-card { background: #131313; border: 1px solid rgba(242,237,228,.07); padding: 36px 32px; transition: border-color .3s, transform .4s cubic-bezier(.16,1,.3,1); }
        .feat-card:hover { border-color: rgba(201,169,110,.25); transform: translateY(-4px); }

        .tab-chip { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; letter-spacing: .06em; border: 1px solid rgba(242,237,228,.12); background: rgba(242,237,228,.04); padding: 10px 18px; display: flex; align-items: center; gap: 8px; transition: all .25s; }
        .tab-chip:hover { border-color: rgba(201,169,110,.35); background: rgba(201,169,110,.06); color: #c9a96e; }

        .testi-card { padding: 36px; border: 1px solid rgba(242,237,228,.09); transition: border-color .3s; }
        .testi-card:hover { border-color: rgba(201,169,110,.25); }

        .step-num { font-family: 'Cormorant Garamond', serif; font-size: 72px; font-weight: 300; color: rgba(201,169,110,.12); line-height: 1; position: absolute; top: -16px; left: -8px; z-index: 0; }

        .mpesa-badge { background: rgba(22,163,74,.1); border: 1px solid rgba(22,163,74,.25); color: #4ade80; font-family: 'DM Sans', sans-serif; font-size: 10px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; padding: 4px 12px; display: inline-flex; align-items: center; gap: 6px; }

        .amen-item { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border: 1px solid rgba(242,237,228,.07); transition: border-color .25s; }
        .amen-item:hover { border-color: rgba(201,169,110,.2); }

        .paybill-box { background: rgba(201,169,110,.07); border: 1px solid rgba(201,169,110,.2); padding: 16px 28px; text-align: center; min-width: 140px; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fadeUp .6s ease forwards; }
        .fade-up-1 { animation-delay: .1s; opacity: 0; }
        .fade-up-2 { animation-delay: .25s; opacity: 0; }
        .fade-up-3 { animation-delay: .4s; opacity: 0; }
        .fade-up-4 { animation-delay: .55s; opacity: 0; }

        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .feat-grid { grid-template-columns: 1fr !important; }
          .tab-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .testi-grid { grid-template-columns: 1fr !important; }
          .how-grid { grid-template-columns: 1fr !important; }
          .amen-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .paybill-row { flex-direction: column !important; align-items: flex-start !important; }
          .hero-ctas { flex-direction: column !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .tab-grid { grid-template-columns: 1fr !important; }
          .stats-grid { grid-template-columns: 1fr !important; }
          .feat-grid { grid-template-columns: 1fr !important; }
          .how-grid { grid-template-columns: 1fr !important; }
          .testi-grid { grid-template-columns: 1fr !important; }
          .amen-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        background: scrolled ? 'rgba(10,10,10,.97)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(242,237,228,.07)' : 'none',
        transition: 'all .35s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{ width: 36, height: 36, border: '1px solid #c9a96e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={16} color="#c9a96e" />
          </div>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontWeight: 500, color: '#f2ede4', letterSpacing: '.04em', lineHeight: 1.1 }}>LEA Executive</div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, letterSpacing: '.22em', textTransform: 'uppercase', color: 'rgba(201,169,110,.7)', lineHeight: 1 }}>Residency · Property Management</div>
          </div>
        </div>

        <div className="hide-mobile" style={{ display: 'flex', gap: 36 }}>
          {[['How It Works', 'howitworks'], ['Features', 'features'], ['Gallery', 'gallery'], ['Payments', 'payments'], ['Contact', 'contact']].map(([l, id]) => (
            <button key={id} className="nav-btn" onClick={() => id === 'contact' ? router.push('/contact') : scrollTo(id)}>{l}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button className="nav-btn hide-mobile" onClick={() => router.push('/login')}>Login</button>
          <button className="btn-gold hide-mobile" onClick={() => router.push('/login')} style={{ padding: '10px 20px', fontSize: 10 }}>
            Sign Up <ArrowUpRight size={11} />
          </button>
          <LuxuryHamburgerMenu
            user={null}
            currentPage="/"
            onNavigate={(path) => {
              if (path === '/') window.scrollTo({ top: 0, behavior: 'smooth' })
              else { const el = document.getElementById(path); if (el) el.scrollIntoView({ behavior: 'smooth' }); else router.push('/login') }
            }}
          />
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        {/* Background */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/images/licensed-image.jpg)',
          backgroundSize: 'cover', backgroundPosition: 'center top',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, rgba(10,10,10,.97) 0%, rgba(10,10,10,.85) 50%, rgba(10,10,10,.5) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,10,1) 0%, transparent 40%)' }} />

        {/* Decorative vertical line */}
        <div style={{ position: 'absolute', left: 40, top: 120, bottom: 120, width: 1, background: 'linear-gradient(to bottom, transparent, rgba(201,169,110,.3), transparent)', display: 'none' }} className="hide-mobile" />

        <div style={{ position: 'relative', maxWidth: 860, padding: '100px 20px 120px', zIndex: 1, marginBottom: '200px', marginTop: '50px' }}>
          <div className="fade-up fade-up-1">
            <div className="sec-label" style={{ marginBottom: 20 }}>Property Management Platform · Nairobi</div>
          </div>

          <h1 className="fade-up fade-up-2" style={{
            fontSize: 'clamp(44px, 6.5vw, 80px)',
            fontWeight: 300, lineHeight: 1.05, letterSpacing: '-.01em',
            color: '#f2ede4', marginBottom: 12,
          }}>
            Your Home.<br />
            <em style={{ color: '#c9a96e', fontStyle: 'italic' }}>Managed Digitally.</em><br />
            <span style={{ fontSize: '85%', fontWeight: 300, color: 'rgba(242,237,228,.72)' }}>From One App.</span>
          </h1>

          <div className="fade-up fade-up-3">
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 300, lineHeight: 1.8, color: 'rgba(242,237,228,.65)', maxWidth: 540, marginBottom: 12, marginTop: 24 }}>
              LEA Executive Residency gives every tenant a digital dashboard to pay rent via M-Pesa, chat with management, log maintenance requests, access all house policies, and stay connected with building announcements.
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 400, color: 'rgba(242,237,228,.45)', marginBottom: 40 }}>
              No more calling. No more confusion. Everything on record.
            </p>
          </div>

          <div className="fade-up fade-up-4 hero-ctas" style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <button className="btn-gold" onClick={() => router.push('/login')}>
              Get Started <ArrowRight size={14} />
            </button>
            <button className="btn-outline" onClick={() => scrollTo('features')}>
              See All Features
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
          borderTop: '1px solid rgba(242,237,228,.1)',
          background: 'rgba(10,10,10,.7)', backdropFilter: 'blur(16px)',
        }} className="stats-grid">
          {[
            ['6+', 'Dashboard Features'],
            ['M-Pesa', 'Instant Payments'],
            ['Real-time', 'Chat & Notifications'],
          ].map(([num, label], i) => (
            <div key={label} style={{ padding: '22px 32px', borderRight: i < 2 ? '1px solid rgba(242,237,228,.08)' : 'none', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 400, color: '#c9a96e' }}>{num}</div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(242,237,228,.42)', marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHAT'S ON THE DASHBOARD ───────────────────────────── */}
      <section style={{ background: '#0f0f0f', padding: '60px 20px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div className="sec-label">What You Get</div>
              <div className="gold-line" />
              <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 300 }}>
                Your Dashboard Has<br /><em style={{ color: '#c9a96e' }}>6 Sections</em>
              </h2>
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(242,237,228,.5)', maxWidth: 340, lineHeight: 1.75 }}>
              When you log in, this is your navigation. Every section is built specifically for tenants and property managers.
            </p>
          </div>

          <div className="tab-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {dashboardTabs.map(({ label, icon: Icon, desc }) => (
              <div key={label} className="tab-chip">
                <div style={{ width: 32, height: 32, background: 'rgba(13,148,136,.1)', border: '1px solid rgba(13,148,136,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={14} color="#0d9488" />
                </div>
                <div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#f2ede4' }}>{label}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(242,237,228,.4)', marginTop: 1 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section id="howitworks" style={{ background: '#0a0a0a', padding: '100px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <div className="sec-label">Getting Started</div>
            <div className="gold-line-center" />
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: 300 }}>
              How <em style={{ color: '#c9a96e' }}>It Works</em>
            </h2>
          </div>

          <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {howItWorks.map(({ step, title, desc }) => (
              <div key={step} style={{ padding: '48px 36px', border: '1px solid rgba(242,237,228,.07)', position: 'relative', overflow: 'hidden' }}>
                <div className="step-num" style={{padding:"0 20px"}}>{step}</div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '.18em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 16 }}>Step {step}</div>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 400, color: '#f2ede4', marginBottom: 16, lineHeight: 1.2 }}>{title}</h3>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(242,237,228,.55)', lineHeight: 1.8 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 56 }}>
            <button className="btn-gold" onClick={() => router.push('/login')}>
              Get Access <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────── */}
      <section id="features" style={{ background: '#0f0f0f', padding: '100px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 64, flexWrap: 'wrap', gap: 24 }}>
            <div>
              <div className="sec-label">Platform Features</div>
              <div className="gold-line" />
              <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: 300, lineHeight: 1.1 }}>
                Everything a Tenant<br /><em style={{ color: '#c9a96e' }}>Could Need</em>
              </h2>
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(242,237,228,.45)', maxWidth: 320, lineHeight: 1.8 }}>
              All features are live and functional at lea-residency.vercel.app. Log in to access your dashboard.
            </p>
          </div>

          <div className="feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, border: '1px solid rgba(242,237,228,.06)' }}>
            {features.map(({ icon: Icon, title, desc, color, num }) => (
              <div key={num} className="feat-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                  <div style={{ width: 44, height: 44, background: `${color}14`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} color={color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, fontWeight: 400, color: '#f2ede4', lineHeight: 1.2 }}>{title}</h3>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'rgba(201,169,110,.3)', letterSpacing: '.1em' }}>{num}</span>
                    </div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 300, color: 'rgba(242,237,228,.52)', lineHeight: 1.8 }}>{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PAYMENTS SECTION ─────────────────────────────────── */}
      <section id="payments" style={{ background: '#0a0a0a', padding: '100px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }} className="how-grid">
            {/* Left — content */}
            <div>
              <div className="sec-label">Rent Payments</div>
              <div className="gold-line" />
              <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 300, lineHeight: 1.15, marginBottom: 24 }}>
                Pay Rent Via<br /><em style={{ color: '#c9a96e' }}>M-Pesa</em><br />
                <span style={{ fontSize: '75%', fontWeight: 300, color: 'rgba(242,237,228,.55)' }}>Logged Automatically</span>
              </h2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 300, color: 'rgba(242,237,228,.6)', lineHeight: 1.8, marginBottom: 36 }}>
                Use M-Pesa Paybill to pay rent. Your payment is recognised by the system automatically, logged against your account, and your landlord is notified instantly. No manual confirmation needed.
              </p>

              {/* Payment flow */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <CheckCircle size={14} color="#c9a96e" style={{ flexShrink: 0 }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(242,237,228,.72)' }}>Tenant initiates payment from their M-Pesa menu</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <CheckCircle size={14} color="#c9a96e" style={{ flexShrink: 0 }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(242,237,228,.72)' }}>Payment goes through as usual via M-Pesa</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <CheckCircle size={14} color="#c9a96e" style={{ flexShrink: 0 }} />
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(242,237,228,.72)' }}>Our system detects the payment in real time via M-Pesa APIs</span>
              </div>

              {/* What happens after payment */}
              {[
                'Payment received and logged in real time',
                'Tenant gets immediate confirmation in-app',
                'Landlord receives instant notification',
                'Monthly history and receipts saved forever',
              ].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <CheckCircle size={14} color="#c9a96e" style={{ flexShrink: 0 }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(242,237,228,.72)' }}>{item}</span>
                </div>
              ))}
            </div>

            {/* Right — visual */}
            <div style={{ position: 'relative', background: '#131313', border: '1px solid rgba(242,237,228,.07)', padding: '40px 36px' }}>
              {/* Mock payment status card */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(242,237,228,.35)', marginBottom: 16 }}>April 2026 · Rent Status</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 400, color: '#4ade80' }}>PAID</span>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(242,237,228,.45)' }}>KES 22,000</span>
                </div>
                <div style={{ height: 6, background: 'rgba(242,237,228,.07)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '100%', background: 'linear-gradient(to right, #16a34a, #4ade80)', borderRadius: 3 }} />
                </div>
              </div>

              {/* Payment history rows */}
              {[
                { month: 'March 2026', amount: 'KES 22,000', code: 'RGR0012345', status: 'PAID' },
                { month: 'February 2026', amount: 'KES 22,000', code: 'RGR0098231', status: 'PAID' },
                { month: 'January 2026', amount: 'KES 22,000', code: 'RGR0076654', status: 'PAID' },
              ].map(p => (
                <div key={p.month} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid rgba(242,237,228,.06)' }}>
                  <div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: '#f2ede4', fontWeight: 500 }}>{p.month}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'rgba(242,237,228,.35)', marginTop: 2 }}>{p.code}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(242,237,228,.6)' }}>{p.amount}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: '#4ade80', letterSpacing: '.1em', fontWeight: 600 }}>{p.status}</div>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 24, padding: '14px', background: 'rgba(13,148,136,.08)', border: '1px solid rgba(13,148,136,.2)' }}>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(242,237,228,.5)', lineHeight: 1.7 }}>
                  💡 The app also supports STK Push — tap to trigger an M-Pesa prompt directly to your phone without opening the M-Pesa menu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BUILDING AMENITIES ───────────────────────────────── */}
      <section style={{ background: '#0f0f0f', padding: '80px 40px', borderTop: '1px solid rgba(242,237,228,.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div className="sec-label">What's Included</div>
            <div className="gold-line-center" />
            <h2 style={{ fontSize: 'clamp(24px, 2.5vw, 36px)', fontWeight: 300 }}>
              Building <em style={{ color: '#c9a96e' }}>Facilities</em>
            </h2>
          </div>
          <div className="amen-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
            {[
              { icon: Wifi, label: 'High-Speed WiFi', desc: 'Fibre connection in all units' },
              { icon: Car, label: 'Secure Parking', desc: 'Controlled access parking bay' },
              { icon: Zap, label: 'Backup Power', desc: 'Generator for power outages' },
              { icon: Shield, label: 'CCTV Security', desc: '24/7 surveillance, controlled gate' },
              { icon: Wifi, label: 'Water Supply', desc: 'Consistent water, storage tanks' },
              { icon: CheckCircle, label: 'Digital Management', desc: 'Everything handled through the app' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="amen-item">
                <div style={{ width: 38, height: 38, background: 'rgba(201,169,110,.08)', border: '1px solid rgba(201,169,110,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color="#c9a96e" />
                </div>
                <div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#f2ede4' }}>{label}</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(242,237,228,.4)', marginTop: 2 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────── */}
      <section style={{ background: '#0a0a0a', padding: '100px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ marginBottom: 64 }}>
            <div className="sec-label">From Our Residents</div>
            <div className="gold-line" />
            <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: 300 }}>
              What Tenants<br /><em style={{ color: '#c9a96e' }}>Are Saying</em>
            </h2>
          </div>
          <div className="testi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {testimonials.map(t => (
              <div key={t.name} className="testi-card">
                <div style={{ display: 'flex', gap: 3, marginBottom: 24 }}>
                  {[...Array(t.rating)].map((_, i) => <Star key={i} size={13} fill="#c9a96e" color="#c9a96e" />)}
                </div>
                <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 300, lineHeight: 1.7, color: 'rgba(242,237,228,.8)', marginBottom: 28, fontStyle: 'italic' }}>
                  "{t.text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid rgba(242,237,228,.07)', paddingTop: 20 }}>
                  <div style={{ width: 40, height: 40, background: 'rgba(201,169,110,.1)', border: '1px solid rgba(201,169,110,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#c9a96e', flexShrink: 0 }}>{t.avatar}</div>
                  <div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#f2ede4' }}>{t.name}</div>
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'rgba(242,237,228,.38)', marginTop: 2, letterSpacing: '.04em' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '100px 40px' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=2072)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,10,.88)' }} />
        <div style={{ position: 'relative', maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div className="sec-label" style={{ marginBottom: 16 }}>Ready to Get Started</div>
          <div className="gold-line-center" />
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 300, marginBottom: 20, lineHeight: 1.15 }}>
            Your Property Management<br /><em style={{ color: '#c9a96e' }}>Dashboard Awaits</em>
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: 'rgba(242,237,228,.55)', marginBottom: 44, lineHeight: 1.8 }}>
            If you are a resident at LEA Executive Residency, log in to access your full tenant dashboard. New residents are registered by management.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-gold" onClick={() => router.push('/login')}>Tenant Login <ArrowRight size={14} /></button>
            <button className="btn-outline" onClick={() => router.push('/contact')}>Contact Management</button>
          </div>

          {/* Live site note */}
          <div style={{ marginTop: 40, display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(242,237,228,.12)', padding: '10px 20px' }}>
            <div style={{ width: 8, height: 8, background: '#4ade80', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(242,237,228,.45)', letterSpacing: '.08em' }}>
              Live at lea-residency.vercel.app
            </span>
          </div>
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
        </div>
      </section>

      {/* ── GALLERY ─────────────────────────────────────────── */}
      <section id="gallery" style={{ background: '#0a0a0a', padding: '100px 40px 80px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="fade-up">
            <div className="sec-label" style={{ marginBottom: 16 }}>Property Gallery</div>
            <div className="gold-line-center" />
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 56px)', fontWeight: 300, marginBottom: 16, lineHeight: 1.15 }}>
              Virtual Tours of <em style={{ color: '#c9a96e' }}>LEA Executive</em>
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: 'rgba(242,237,228,.6)', marginBottom: 60, lineHeight: 1.8, maxWidth: 600 }}>
              Take a virtual tour through our luxury residences. Experience the modern living spaces, premium amenities, and elegant design that make LEA Executive the perfect place to call home.
            </p>
          </div>

          <div className="gallery-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {[
              { img: IMAGES[0], title: 'Modern Living Room', desc: 'Spacious living area with premium furnishings and city views' },
              { img: IMAGES[1], title: 'Executive Kitchen', desc: 'State-of-the-art kitchen with high-end appliances' },
              { img: IMAGES[2], title: 'Master Bedroom', desc: 'Elegant master suite with premium bedding and ample storage' },
              { img: IMAGES[3], title: 'Spa Bathroom', desc: 'Luxurious bathroom with marble finishes and modern fixtures' },
              { img: IMAGES[4], title: 'Rooftop Terrace', desc: 'Private rooftop with panoramic views and outdoor seating' },
              { img: IMAGES[5], title: 'Fitness Center', desc: 'Fully equipped gym facilities for resident wellness' }
            ].map((item, i) => (
              <div key={i} className="gallery-item fade-up" style={{
                position: 'relative', overflow: 'hidden', borderRadius: 12, cursor: 'pointer',
                transition: 'transform .3s ease, box-shadow .3s ease',
                animationDelay: `${i * 0.1}s`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(201,169,110,.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onClick={() => {
                // Open modal or navigate to full gallery
                const modal = document.createElement('div');
                modal.style.position = 'fixed';
                modal.style.inset = '0';
                modal.style.background = 'rgba(0,0,0,0.9)';
                modal.style.zIndex = '10000';
                modal.style.display = 'flex';
                modal.style.alignItems = 'center';
                modal.style.justifyContent = 'center';
                modal.innerHTML = `
                  <div style="position: relative; max-width: 90vw; max-height: 90vh;">
                    <img src="${item.img}" style="max-width: 100%; max-height: 100%; border-radius: 8px;" />
                    <button onclick="this.parentElement.parentElement.remove()" style="position: absolute; top: -40px; right: 0; background: none; border: none; color: white; font-size: 24px; cursor: pointer;">×</button>
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding: 20px; border-radius: 0 0 8px 8px;">
                      <h3 style="color: white; font-size: 24px; margin: 0 0 8px 0;">${item.title}</h3>
                      <p style="color: rgba(255,255,255,0.8); margin: 0;">${item.desc}</p>
                    </div>
                  </div>
                `;
                document.body.appendChild(modal);
                modal.onclick = (e) => {
                  if (e.target === modal) modal.remove();
                };
              }}>
                <div style={{ height: 250, overflow: 'hidden' }}>
                  <img src={item.img} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .3s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'} />
                </div>
                <div style={{ padding: 20, background: 'rgba(242,237,228,.02)', borderTop: '1px solid rgba(242,237,228,.05)' }}>
                  <h3 style={{ fontSize: 18, fontWeight: 500, color: '#f2ede4', marginBottom: 8 }}>{item.title}</h3>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: 'rgba(242,237,228,.5)', lineHeight: 1.5 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', display:'flex', marginTop: 60, gap:14, alignItems:'center', justifyContent:'center' }}>
            <button className="btn-gold" onClick={() => router.push('/viewing')} style={{ padding: '14px 28px' }}>
              Schedule a Viewing <ArrowRight size={14} />
            </button>
            <button className="btn-outline" onClick={() => router.push('/gallery')} style={{ padding: '14px 28px' }}>
              View More <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer id="contact" style={{ background: '#131313', borderTop: '1px solid rgba(242,237,228,.07)', padding: '72px 40px 36px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 56 }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, border: '1px solid #c9a96e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={16} color="#c9a96e" />
                </div>
                <div>
                  <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, fontWeight: 500, color: '#f2ede4' }}>LEA Executive</div>
                  <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(201,169,110,.65)' }}>Residency · Property Management</div>
                </div>
              </div>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(242,237,228,.4)', lineHeight: 1.8, maxWidth: 280, marginBottom: 24 }}>
                A digital-first residential property in Nairobi. Tenants manage their entire tenancy — rent, requests, communication and documents — from one platform.
              </p>
              {/* Contact */}
              {[
                { icon: <Phone size={12} />, text: '+254 700 000 000' },
                { icon: <Mail size={12} />, text: 'management@lea-residency.app' },
                { icon: <MapPin size={12} />, text: 'Nairobi, Kenya' },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(242,237,228,.4)', marginBottom: 10 }}>
                  <span style={{ color: '#c9a96e', display: 'flex' }}>{icon}</span>{text}
                </div>
              ))}
            </div>

            {/* Columns */}
            {[
              { title: 'Platform', links: ['Tenant Dashboard', 'M-Pesa Payments', 'Maintenance', 'Community Chat'] },
              { title: 'Support', links: ['How It Works', 'Contact Management', 'Policy Docs', 'Sign In'] },
              { title: 'Payments', links: ['STK Push', 'Payment History'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, letterSpacing: '.2em', textTransform: 'uppercase', color: '#c9a96e', marginBottom: 20 }}>{col.title}</div>
                {col.links.map(link => (
                  <button key={link} style={{ display: 'block', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: 'rgba(242,237,228,.4)', marginBottom: 12, padding: 0, textAlign: 'left', transition: 'color .2s' }}
                    onMouseOver={e => (e.currentTarget.style.color = '#c9a96e')}
                    onMouseOut={e => (e.currentTarget.style.color = 'rgba(242,237,228,.4)')}
                    onClick={() => router.push('/login')}>{link}</button>
                ))}
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(242,237,228,.07)', paddingTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(242,237,228,.25)' }}> &copy; {new Date().getFullYear()} LEA Executive Residency. All rights reserved.</span>
            <div style={{ display: 'flex', gap: 20 }}>
              {['Privacy Policy', 'Terms of Service', 'Tenant Rights'].map(l => (
                <span key={l} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: 'rgba(242,237,228,.25)', cursor: 'pointer' }}>{l}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}