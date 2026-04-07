"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Star,
  Heart,
  Search,
  Calendar,
  Users,
  ArrowRight,
  ArrowUpRight,
  Wifi,
  Car,
  Droplets,
  Zap,
  Dumbbell,
  Coffee,
  Shield,
  CheckCircle2,
  X,
} from "lucide-react";

// ----------------------------------------------------------------------
// LuxuryHamburgerMenu (now defined inline)
// ----------------------------------------------------------------------
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
    label: "Experiences",
    sub: "Curated stays",
    path: "experiences",
    num: "02",
  },
  { label: "Services", sub: "What we offer", path: "services", num: "03" },
  { label: "Contact", sub: "Get in touch", path: "contact", num: "04" },
];

const IMAGES = [
  "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?q=80&w=600",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=600",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=600",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=600",
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

// ----------------------------------------------------------------------
// LandingPage page component
// ----------------------------------------------------------------------
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [likedProps, setLikedProps] = useState<number[]>([]);
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleLike = (id: number) =>
    setLikedProps((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Handle date selection logic here
    console.log('Date selected:', event.target.value);
  };

  const properties = [
    {
      id: 1,
      title: "Oceanview Penthouse",
      location: "Nyali, Mombasa",
      type: "Penthouse",
      price: 450,
      rating: 4.98,
      beds: 3,
      baths: 2,
      sqft: 2400,
      tag: "Top Rated",
      image:
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070",
    },
    {
      id: 2,
      title: "Serene Garden Villa",
      location: "Karen, Nairobi",
      type: "Villa",
      price: 380,
      rating: 4.95,
      beds: 4,
      baths: 3,
      sqft: 3200,
      tag: "Popular",
      image:
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2075",
    },
    {
      id: 3,
      title: "Urban Loft Suite",
      location: "Westlands, Nairobi",
      type: "Apartment",
      price: 290,
      rating: 4.92,
      beds: 2,
      baths: 2,
      sqft: 1100,
      tag: "New",
      image:
        "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=2080",
    },
    {
      id: 4,
      title: "Beachfront Resort",
      location: "Diani Beach",
      type: "Villa",
      price: 650,
      rating: 4.99,
      beds: 5,
      baths: 4,
      sqft: 4800,
      tag: "Exclusive",
      image:
        "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?q=80&w=2070",
    },
    {
      id: 5,
      title: "Executive High-Rise",
      location: "Upper Hill, Nairobi",
      type: "Apartment",
      price: 520,
      rating: 4.96,
      beds: 3,
      baths: 3,
      sqft: 1800,
      tag: "Premium",
      image:
        "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=2072",
    },
    {
      id: 6,
      title: "Lakeside Retreat",
      location: "Naivasha",
      type: "Cottage",
      price: 210,
      rating: 4.89,
      beds: 2,
      baths: 1,
      sqft: 900,
      tag: "Cozy",
      image:
        "https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?q=80&w=2070",
    },
  ];

  const filters = ["All", "Villa", "Penthouse", "Apartment", "Cottage"];
  const filtered =
    activeFilter === "All"
      ? properties
      : properties.filter((p) => p.type === activeFilter);
  const amenities = [
    { icon: Wifi, label: "High-Speed WiFi" },
    { icon: Car, label: "Free Parking" },
    { icon: Droplets, label: "Infinity Pool" },
    { icon: Zap, label: "Backup Power" },
    { icon: Dumbbell, label: "Private Gym" },
    { icon: Coffee, label: "Concierge" },
    { icon: Shield, label: "Security" },
    { icon: CheckCircle2, label: "Verified" },
  ];
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Frequent Traveller",
      location: "New York, USA",
      avatar: "SJ",
      rating: 5,
      text: "The attention to detail and seamless booking process made our Diani stay absolutely unforgettable. Exceeded every expectation.",
    },
    {
      name: "Michael Chen",
      role: "Business Executive",
      location: "Singapore",
      avatar: "MC",
      rating: 5,
      text: "LEA Executive transformed how I find corporate housing. Verified listings and instant support are genuine game-changers.",
    },
    {
      name: "Grace Kimani",
      role: "Property Host",
      location: "Nairobi, Kenya",
      avatar: "GK",
      rating: 5,
      text: "Listing on LEA Executive brought quality guests and completely hassle-free management. Best decision I ever made.",
    },
  ];

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div
      style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        background: "#0f0f0f",
        color: "#f5f0e8",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #0f0f0f; }

        .nav-link { font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 400; letter-spacing: .08em; color: rgba(245,240,232,.6); text-transform: uppercase; background: none; border: none; cursor: pointer; transition: color .25s; padding: 4px 0; }
        .nav-link:hover { color: #f5f0e8; }
        .btn-gold { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; background: #c9a96e; color: #0f0f0f; border: none; cursor: pointer; padding: 12px 28px; transition: all .3s; display: inline-flex; align-items: center; gap: 8px; }
        .btn-gold:hover { background: #b8914f; transform: translateY(-1px); }
        .btn-outline { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; letter-spacing: .14em; text-transform: uppercase; background: transparent; color: #f5f0e8; border: 1px solid rgba(245,240,232,.3); cursor: pointer; padding: 12px 28px; transition: all .3s; display: inline-flex; align-items: center; gap: 8px; }
        .btn-outline:hover { border-color: #c9a96e; color: #c9a96e; }
        .filter-btn { font-family: 'DM Sans', sans-serif; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; background: transparent; border: 1px solid rgba(245,240,232,.18); color: rgba(245,240,232,.5); padding: 8px 20px; cursor: pointer; transition: all .25s; }
        .filter-btn.active, .filter-btn:hover { border-color: #c9a96e; color: #c9a96e; }
        .prop-card { background: #161616; overflow: hidden; transition: transform .4s cubic-bezier(.16,1,.3,1); cursor: pointer; }
        .prop-card:hover { transform: translateY(-6px); }
        .prop-card:hover .prop-img { transform: scale(1.06); }
        .prop-img { width: 100%; object-fit: cover; transition: transform .7s cubic-bezier(.16,1,.3,1); display: block; }
        .search-inp { font-family: 'DM Sans', sans-serif; font-size: 14px; background: transparent; border: none; outline: none; width: 100%; color: #0f0f0f; }
        .search-inp::placeholder { color: rgba(15,15,15,.4); }
        .gold-line { width: 48px; height: 1px; background: #c9a96e; margin: 18px 0; }
        .sec-lbl { font-family: 'DM Sans', sans-serif; font-size: 11px; letter-spacing: .2em; text-transform: uppercase; color: #c9a96e; }
        .amen-item { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 28px 16px; border: 1px solid rgba(245,240,232,.07); transition: border-color .25s; }
        .amen-item:hover { border-color: rgba(201,169,110,.3); }
        .testi-card { padding: 36px; border: 1px solid rgba(245,240,232,.09); transition: border-color .3s; }
        .testi-card:hover { border-color: rgba(201,169,110,.28); }
        .heart-btn { width: 36px; height: 36px; background: rgba(10,10,10,.7); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); transition: background .2s; }
        .heart-btn:hover { background: rgba(10,10,10,.9); }
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .search-row { flex-direction: column !important; }
          .search-divider { width: 100% !important; height: 1px !important; }
          .prop-grid { grid-template-columns: 1fr !important; }
          .amen-grid { grid-template-columns: repeat(2,1fr) !important; }
          .testi-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; }
          .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
          .split-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* NAV */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: 72,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          background: scrolled ? "rgba(15,15,15,.97)" : "transparent",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(245,240,232,.07)" : "none",
          transition: "all .4s",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "pointer",
          }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <div
            style={{
              width: 36,
              height: 36,
              border: "1px solid #c9a96e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Building2 size={16} color="#c9a96e" />
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 20,
                fontWeight: 500,
                letterSpacing: ".05em",
                color: "#f5f0e8",
                lineHeight: 1.1,
              }}
            >
              LEA Executive
            </div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 9,
                letterSpacing: ".2em",
                textTransform: "uppercase",
                color: "rgba(201,169,110,.75)",
                lineHeight: 1,
              }}
            >
              Luxury Residences
            </div>
          </div>
        </div>

        <div
          className="hide-mobile"
          style={{ display: "flex", alignItems: "center", gap: 36 }}
        >
          {["Properties", "Experiences", "Services", "Contact"].map((l) => (
            <button
              key={l}
              className="nav-link"
              onClick={() => scrollTo(l.toLowerCase())}
            >
              {l}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            className="nav-link hide-mobile"
            onClick={() => router.push("/login")}
          >
            Sign In
          </button>
          <button
            className="btn-gold hide-mobile"
            onClick={() => router.push("/login")}
            style={{ padding: "10px 20px", fontSize: 10 }}
          >
            List Property <ArrowUpRight size={11} />
          </button>
          {/* Use the integrated menu component */}
          <LuxuryHamburgerMenu
            user={null}
            currentPage="/"
            onNavigate={(path) => {
              const el = document.getElementById(path);
              if (el) el.scrollIntoView({ behavior: "smooth" });
              else if (path === "/") window.scrollTo({ top: 0, behavior: "smooth" });
              else router.push("/login");
            }}
          />
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          height: "100vh",
          minHeight: 700,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "url(https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?q=80&w=2070)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: "scale(1.04)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(15,15,15,.88) 0%, rgba(15,15,15,.45) 60%, rgba(15,15,15,.15) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(15,15,15,.92) 0%, transparent 55%)",
          }}
        />

        <div
          style={{
            position: "relative",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 40px 80px",
            maxWidth: 820,
          }}
        >
          <div className="sec-lbl" style={{ marginBottom: 24 }}>
            Kenya's Premier Collection
          </div>
          <h1
            style={{
              fontSize: "clamp(52px, 8vw, 96px)",
              fontWeight: 300,
              lineHeight: 1.02,
              letterSpacing: "-.01em",
              color: "#f5f0e8",
              marginBottom: 28,
            }}
          >
            Find Your
            <br />
            <em style={{ color: "#c9a96e", fontStyle: "italic" }}>
              Perfect Stay
            </em>
            <br />
            in Africa
          </h1>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              fontWeight: 300,
              color: "rgba(245,240,232,.68)",
              lineHeight: 1.75,
              maxWidth: 460,
              marginBottom: 44,
            }}
          >
            Hand-curated villas, penthouses, and premium apartments across
            Kenya's most coveted addresses.
          </p>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <button className="btn-gold" onClick={() => scrollTo("properties")}>
              Browse Properties <ArrowRight size={14} />
            </button>
            <button
              className="btn-outline"
              onClick={() => router.push("/login")}
            >
              List Your Property
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            borderTop: "1px solid rgba(245,240,232,.1)",
            background: "rgba(15,15,15,.62)",
            backdropFilter: "blur(16px)",
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
          }}
        >
          {[
            ["200+", "Verified Properties"],
            ["50K+", "Happy Guests"],
            ["4.97", "Average Rating"],
          ].map(([num, label], i) => (
            <div
              key={label}
              style={{
                padding: "22px 32px",
                borderRight: i < 2 ? "1px solid rgba(245,240,232,.08)" : "none",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 28,
                  fontWeight: 400,
                  color: "#c9a96e",
                  lineHeight: 1,
                }}
              >
                {num}
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  letterSpacing: ".1em",
                  textTransform: "uppercase",
                  color: "rgba(245,240,232,.45)",
                  marginTop: 6,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SEARCH ────────────────────────────────────────────── */}
      <section style={{ background: "#161616", padding: "0 40px" }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            marginTop:'40px',
            transform: "translateY(-28px)",
          }}
        >
          <div
            className="search-row"
            style={{
              background: "#f5f0e8",
              display: "flex",
              alignItems: "stretch",
              boxShadow: "0 24px 80px rgba(0,0,0,.55)",
            }}
          >
            {[
              {
                icon: <MapPin size={16} color="#c9a96e" />,
                label: "Location",
                ph: "Nairobi, Mombasa, Diani...",
              },
              {
                icon: <Calendar size={16} color="#c9a96e" />,
                label: "Check-in / Check-out",
                ph: "Select dates",
              },
              {
                icon: <Users size={16} color="#c9a96e" />,
                label: "Guests",
                ph: "2 guests",
              },
            ].map((f, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  padding: "20px 28px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  borderRight: i < 2 ? "1px solid rgba(15,15,15,.1)" : "none",
                }}
              >
                {f.icon}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 9,
                      letterSpacing: ".18em",
                      textTransform: "uppercase",
                      color: "rgba(15,15,15,.4)",
                      marginBottom: 4,
                    }}
                  >
                    {f.label}
                  </div>
                  <input className="search-inp" placeholder={f.ph} />
                </div>
              </div>
            ))}
            <button
              className="btn-gold"
              style={{ margin: 0, padding: "0 36px", flexShrink: 0 }}
              onClick={() => scrollTo("properties")}
            >
              <Search size={16} /> <span className="hide-mobile">Search</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── PROPERTIES ────────────────────────────────────────── */}
      <section
        id="properties"
        style={{ background: "#0f0f0f", padding: "80px 40px 100px" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: 52,
              flexWrap: "wrap",
              gap: 24,
            }}
          >
            <div>
              <div className="sec-lbl">Curated Collection</div>
              <div className="gold-line" />
              <h2
                style={{
                  fontSize: "clamp(32px, 4vw, 52px)",
                  fontWeight: 300,
                  lineHeight: 1.1,
                }}
              >
                Featured
                <br />
                <em style={{ color: "#c9a96e" }}>Properties</em>
              </h2>
            </div>
            <button
              className="btn-outline"
              onClick={() => router.push("/login")}
            >
              View All <ArrowRight size={13} />
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 44,
            }}
          >
            {filters.map((f) => (
              <button
                key={f}
                className={`filter-btn${activeFilter === f ? " active" : ""}`}
                onClick={() => setActiveFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>

          <div
            className="prop-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 24,
            }}
          >
            {filtered.map((p, idx) => (
              <div key={p.id} className="prop-card">
                <div style={{ position: "relative", overflow: "hidden" }}>
                  <img
                    src={p.image}
                    alt={p.title}
                    className="prop-img"
                    style={{ height: idx === 0 ? 320 : 260 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      top: 16,
                      left: 16,
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 10,
                      letterSpacing: ".1em",
                      textTransform: "uppercase",
                      background: "#c9a96e",
                      color: "#0f0f0f",
                      padding: "4px 10px",
                      fontWeight: 500,
                    }}
                  >
                    {p.tag}
                  </span>
                  <button
                    className="heart-btn"
                    style={{ position: "absolute", top: 16, right: 16 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(p.id);
                    }}
                  >
                    <Heart
                      size={15}
                      color={likedProps.includes(p.id) ? "#ef4444" : "#f5f0e8"}
                      fill={likedProps.includes(p.id) ? "#ef4444" : "none"}
                    />
                  </button>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(to top, rgba(15,15,15,.82) 0%, transparent 55%)",
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: "20px 20px 16px",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: 20,
                        fontWeight: 400,
                        color: "#f5f0e8",
                        lineHeight: 1.2,
                        marginBottom: 5,
                      }}
                    >
                      {p.title}
                    </div>
                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 12,
                        color: "rgba(245,240,232,.58)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <MapPin size={11} />
                      {p.location}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderTop: "1px solid rgba(245,240,232,.05)",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: 22,
                        fontWeight: 500,
                        color: "#c9a96e",
                      }}
                    >
                      ${p.price}
                    </span>
                    <span
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        color: "rgba(245,240,232,.38)",
                        marginLeft: 4,
                      }}
                    >
                      / night
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 14 }}
                  >
                    <span
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        color: "rgba(245,240,232,.42)",
                      }}
                    >
                      {p.beds}bd · {p.baths}ba
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        background: "rgba(201,169,110,.1)",
                        padding: "4px 10px",
                      }}
                    >
                      <Star size={11} fill="#c9a96e" color="#c9a96e" />
                      <span
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 12,
                          color: "#c9a96e",
                          fontWeight: 500,
                        }}
                      >
                        {p.rating}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ padding: "0 20px 18px" }}>
                  <button
                    className="btn-gold"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      padding: 12,
                    }}
                    onClick={() => router.push("/login")}
                  >
                    Book Now <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXPERIENCES ───────────────────────────────────────── */}
      <section
        id="experiences"
        style={{ background: "#161616", padding: "100px 40px" }}
      >
        <div
          className="split-grid"
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 80,
            alignItems: "center",
          }}
        >
          <div>
            <div className="sec-lbl">The LEA Standard</div>
            <div className="gold-line" />
            <h2
              style={{
                fontSize: "clamp(30px, 3.5vw, 48px)",
                fontWeight: 300,
                lineHeight: 1.15,
                marginBottom: 24,
              }}
            >
              Every Stay is a<br />
              <em style={{ color: "#c9a96e" }}>Curated Experience</em>
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 15,
                fontWeight: 300,
                color: "rgba(245,240,232,.62)",
                lineHeight: 1.8,
                marginBottom: 40,
              }}
            >
              We don't just list properties — we orchestrate exceptional stays.
              Every detail, from arrival to departure, is considered and
              crafted.
            </p>
            {[
              "Personal concierge for every booking",
              "Verified photos and virtual tours",
              "M-Pesa and card payments accepted",
              "Instant landlord messaging",
            ].map((item) => (
              <div
                key={item}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    width: 1,
                    height: 20,
                    background: "#c9a96e",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    color: "rgba(245,240,232,.78)",
                  }}
                >
                  {item}
                </span>
              </div>
            ))}
            <button
              className="btn-gold"
              style={{ marginTop: 40 }}
              onClick={() => router.push("/login")}
            >
              Explore Services <ArrowRight size={14} />
            </button>
          </div>
          <div style={{ position: "relative", height: 520 }}>
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "65%",
                height: "72%",
                overflow: "hidden",
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800"
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "55%",
                height: "60%",
                overflow: "hidden",
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800"
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                bottom: "8%",
                left: "5%",
                background: "#0f0f0f",
                padding: "20px 24px",
                border: "1px solid rgba(201,169,110,.22)",
              }}
            >
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 28,
                  fontWeight: 400,
                  color: "#c9a96e",
                }}
              >
                4.97
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 10,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: "rgba(245,240,232,.45)",
                  marginTop: 4,
                }}
              >
                Avg. Guest Rating
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AMENITIES ─────────────────────────────────────────── */}
      <section
        id="services"
        style={{ background: "#0f0f0f", padding: "100px 40px" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div className="sec-lbl">What's Included</div>
            <div className="gold-line" style={{ margin: "20px auto" }} />
            <h2 style={{ fontSize: "clamp(28px, 3vw, 44px)", fontWeight: 300 }}>
              Premium <em style={{ color: "#c9a96e" }}>Amenities</em>
            </h2>
          </div>
          <div
            className="amen-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 0,
            }}
          >
            {amenities.map(({ icon: Icon, label }) => (
              <div key={label} className="amen-item">
                <Icon size={22} color="#c9a96e" />
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    letterSpacing: ".06em",
                    color: "rgba(245,240,232,.6)",
                    textAlign: "center",
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <section
        style={{
          background: "#161616",
          borderTop: "1px solid rgba(245,240,232,.06)",
          borderBottom: "1px solid rgba(245,240,232,.06)",
          padding: "80px 40px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            className="stats-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 0,
            }}
          >
            {[
              ["200+", "Verified Properties"],
              ["50K+", "Happy Guests"],
              ["6", "Cities Covered"],
              ["4.97★", "Average Rating"],
            ].map(([num, label], i) => (
              <div
                key={label}
                style={{
                  textAlign: "center",
                  padding: "40px 24px",
                  borderRight:
                    i < 3 ? "1px solid rgba(245,240,232,.07)" : "none",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "clamp(36px, 5vw, 60px)",
                    fontWeight: 300,
                    color: "#c9a96e",
                    lineHeight: 1,
                  }}
                >
                  {num}
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    letterSpacing: ".12em",
                    textTransform: "uppercase",
                    color: "rgba(245,240,232,.4)",
                    marginTop: 12,
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────── */}
      <section style={{ background: "#0f0f0f", padding: "100px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: 64 }}>
            <div className="sec-lbl">Guest Stories</div>
            <div className="gold-line" />
            <h2
              style={{ fontSize: "clamp(28px, 3.5vw, 48px)", fontWeight: 300 }}
            >
              Trusted by <em style={{ color: "#c9a96e" }}>Travellers</em>
            </h2>
          </div>
          <div
            className="testi-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 24,
            }}
          >
            {testimonials.map((t) => (
              <div key={t.name} className="testi-card">
                <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} size={13} fill="#c9a96e" color="#c9a96e" />
                  ))}
                </div>
                <p
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 18,
                    fontWeight: 300,
                    lineHeight: 1.65,
                    color: "rgba(245,240,232,.8)",
                    marginBottom: 28,
                    fontStyle: "italic",
                  }}
                >
                  "{t.text}"
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    borderTop: "1px solid rgba(245,240,232,.07)",
                    paddingTop: 20,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      background: "rgba(201,169,110,.12)",
                      border: "1px solid rgba(201,169,110,.28)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#c9a96e",
                      flexShrink: 0,
                    }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        fontWeight: 500,
                        color: "#f5f0e8",
                      }}
                    >
                      {t.name}
                    </div>
                    <div
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 11,
                        color: "rgba(245,240,232,.38)",
                        marginTop: 2,
                      }}
                    >
                      {t.role} · {t.location}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: 480,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "url(https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=2072)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(15,15,15,.84)",
          }}
        />
        <div
          style={{
            position: "relative",
            maxWidth: 1200,
            margin: "0 auto",
            padding: "80px 40px",
            textAlign: "center",
            width: "100%",
          }}
        >
          <div className="sec-lbl">Join the Collection</div>
          <div className="gold-line" style={{ margin: "20px auto" }} />
          <h2
            style={{
              fontSize: "clamp(32px, 4vw, 60px)",
              fontWeight: 300,
              marginBottom: 20,
            }}
          >
            List Your Property
            <br />
            <em style={{ color: "#c9a96e" }}>with LEA Executive</em>
          </h2>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              color: "rgba(245,240,232,.62)",
              maxWidth: 500,
              margin: "0 auto 44px",
              lineHeight: 1.7,
            }}
          >
            Reach discerning travellers and property seekers across Kenya and
            beyond.
          </p>
          <div
            style={{
              display: "flex",
              gap: 16,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button className="btn-gold" onClick={() => router.push("/login")}>
              Get Started <ArrowRight size={14} />
            </button>
            <button className="btn-outline" onClick={() => scrollTo("contact")}>
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer
        id="contact"
        style={{
          background: "#161616",
          borderTop: "1px solid rgba(245,240,232,.07)",
          padding: "80px 40px 40px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            className="footer-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: 48,
              marginBottom: 60,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    border: "1px solid #c9a96e",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Building2 size={16} color="#c9a96e" />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontSize: 18,
                      fontWeight: 500,
                      color: "#f5f0e8",
                    }}
                  >
                    LEA Executive
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 9,
                      letterSpacing: ".18em",
                      textTransform: "uppercase",
                      color: "rgba(201,169,110,.7)",
                    }}
                  >
                    Luxury Residences
                  </div>
                </div>
              </div>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: "rgba(245,240,232,.45)",
                  lineHeight: 1.8,
                  maxWidth: 280,
                  marginBottom: 28,
                }}
              >
                Curating exceptional stays and premium property management
                across Kenya's most desirable locations.
              </p>
              {[
                { icon: <Phone size={13} />, text: "+254 700 123 456" },
                { icon: <Mail size={13} />, text: "hello@leaexecutive.com" },
              ].map(({ icon, text }) => (
                <div
                  key={text}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    color: "rgba(245,240,232,.45)",
                    marginBottom: 10,
                  }}
                >
                  <span style={{ color: "#c9a96e", display: "flex" }}>
                    {icon}
                  </span>
                  {text}
                </div>
              ))}
            </div>
            {[
              {
                title: "Explore",
                links: ["Stays", "Experiences", "Services", "List Property"],
              },
              {
                title: "Company",
                links: ["About Us", "Careers", "Press", "Partners"],
              },
              {
                title: "Support",
                links: [
                  "Help Center",
                  "Safety",
                  "Cancellations",
                  "Accessibility",
                ],
              },
            ].map((col) => (
              <div key={col.title}>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 10,
                    letterSpacing: ".18em",
                    textTransform: "uppercase",
                    color: "#c9a96e",
                    marginBottom: 20,
                  }}
                >
                  {col.title}
                </div>
                {col.links.map((link) => (
                  <button
                    key={link}
                    style={{
                      display: "block",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      color: "rgba(245,240,232,.45)",
                      marginBottom: 12,
                      textAlign: "left",
                      padding: 0,
                      transition: "color .2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.color = "#c9a96e")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.color = "rgba(245,240,232,.45)")
                    }
                    onClick={() => router.push("/login")}
                  >
                    {link}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div
            style={{
              borderTop: "1px solid rgba(245,240,232,.07)",
              paddingTop: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                color: "rgba(245,240,232,.28)",
              }}
            >
              © 2025 LEA Executive — Luxury Rentals & Residences. All rights
              reserved.
            </span>
            <div style={{ display: "flex", gap: 20 }}>
              {["Privacy", "Terms", "Cookies"].map((l) => (
                <span
                  key={l}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    color: "rgba(245,240,232,.28)",
                    cursor: "pointer",
                  }}
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
