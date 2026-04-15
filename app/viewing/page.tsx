"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  Calendar,
  Clock,
  Users,
  Home,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

const STEPS = ["Personal Info", "Preferences", "Schedule", "Confirm"];

const PROPERTY_TYPES = [
  "Apartment",
  "Villa",
  "Townhouse",
  "Penthouse",
  "Studio",
  "Student Housing",
];
const TIME_SLOTS = [
  "9:00 AM – 10:30 AM",
  "11:00 AM – 12:30 PM",
  "2:00 PM – 3:30 PM",
  "4:00 PM – 5:30 PM",
];
const GROUP_SIZES = [
  "1 Person",
  "2 People",
  "3 People",
  "4 People",
  "5+ People",
];
const URGENCY_OPTIONS = [
  "Within 1 week",
  "Within 1 month",
  "No rush — just looking",
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function ViewingPage() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Calendar state
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    propertyType: "",
    groupSize: "",
    budget: "",
    urgency: "",
    timeSlot: "",
    message: "",
    agreed: false,
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // Calendar helpers
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();
  const isDisabled = (d: Date) => d < today || d.getDay() === 0;
  const isSelected = (d: Date) =>
    selectedDate?.toDateString() === d.toDateString();

  const calDays = () => {
    const total = daysInMonth(calYear, calMonth);
    const start = firstDayOfMonth(calYear, calMonth);
    const days: (Date | null)[] = Array(start).fill(null);
    for (let i = 1; i <= total; i++) days.push(new Date(calYear, calMonth, i));
    return days;
  };

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else setCalMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else setCalMonth((m) => m + 1);
  };

  const canNext = () => {
    if (step === 0)
      return form.firstName && form.lastName && form.email && form.phone;
    if (step === 1) return form.propertyType && form.groupSize && form.urgency;
    if (step === 2) return selectedDate && form.timeSlot;
    return form.agreed;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/viewing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, date: selectedDate?.toISOString() }),
      });
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    background: "#161616",
    border: "1px solid rgba(242,237,228,.1)",
    color: "#f2ede4",
    padding: "12px 14px",
    width: "100%",
    outline: "none",
    transition: "border-color .25s",
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 10,
    letterSpacing: ".16em",
    textTransform: "uppercase",
    color: "rgba(242,237,228,.45)",
    display: "block",
    marginBottom: 8,
  };

  // ── Success ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          background: "#0a0a0a",
          color: "#f2ede4",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>
        <div
          style={{
            background: "#131313",
            border: "1px solid rgba(201,169,110,.25)",
            padding: "56px 48px",
            maxWidth: 460,
            width: "100%",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              background: "rgba(74,222,128,.1)",
              border: "1px solid rgba(74,222,128,.3)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 24px",
            }}
          >
            <CheckCircle size={28} color="#4ade80" />
          </div>
          <div
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 10,
              letterSpacing: ".2em",
              textTransform: "uppercase",
              color: "#c9a96e",
              marginBottom: 12,
            }}
          >
            Confirmed
          </div>
          <h2 style={{ fontSize: 36, fontWeight: 300, marginBottom: 16 }}>
            Viewing{" "}
            <em style={{ color: "#c9a96e", fontStyle: "italic" }}>Scheduled</em>
          </h2>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: "rgba(242,237,228,.55)",
              lineHeight: 1.8,
              marginBottom: 32,
            }}
          >
            Thank you, {form.firstName}. Your viewing request has been received.
            We will confirm your appointment within 24 hours via email or phone.
          </p>
          {selectedDate && (
            <div
              style={{
                background: "#0f0f0f",
                border: "1px solid rgba(242,237,228,.08)",
                padding: "20px 24px",
                marginBottom: 32,
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 10,
                  letterSpacing: ".16em",
                  textTransform: "uppercase",
                  color: "rgba(242,237,228,.4)",
                  marginBottom: 8,
                }}
              >
                Requested Slot
              </div>
              <div
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 20,
                  color: "#f2ede4",
                }}
              >
                {selectedDate.toLocaleDateString("en-KE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  color: "rgba(242,237,228,.5)",
                  marginTop: 4,
                }}
              >
                {form.timeSlot}
              </div>
            </div>
          )}
          {[
            { emoji: "📧", t: "Check email for confirmation" },
            { emoji: "📱", t: "SMS reminder before your visit" },
            { emoji: "🏠", t: "Prepare your questions" },
          ].map(({ emoji, t }) => (
            <div
              key={t}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: "rgba(242,237,228,.45)",
                marginBottom: 8,
              }}
            >
              {emoji} {t}
            </div>
          ))}
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginTop: 32,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".12em",
              textTransform: "uppercase",
              background: "#c9a96e",
              color: "#0a0a0a",
              padding: "13px 32px",
              textDecoration: "none",
            }}
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        background: "#0a0a0a",
        color: "#f2ede4",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }

        input, textarea { appearance: none; }
        input:focus, textarea:focus { border-color: rgba(201,169,110,.5) !important; }
        input::placeholder, textarea::placeholder { color: rgba(242,237,228,.28); }
        textarea { resize: none; }

        .sel-pill { font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500; background: transparent; border: 1px solid rgba(242,237,228,.12); color: rgba(242,237,228,.5); padding: 10px 18px; cursor: pointer; transition: all .25s; text-align: center; }
        .sel-pill.active { border-color: #c9a96e; color: #c9a96e; background: rgba(201,169,110,.07); }
        .sel-pill:hover { border-color: rgba(201,169,110,.4); color: rgba(242,237,228,.85); }

        .cal-day { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-family: 'DM Sans', sans-serif; font-size: 13px; cursor: pointer; transition: all .2s; border: 1px solid transparent; }
        .cal-day.today { border-color: rgba(201,169,110,.3); color: #c9a96e; }
        .cal-day.selected { background: #c9a96e; color: #0a0a0a; font-weight: 600; }
        .cal-day.disabled { color: rgba(242,237,228,.18); cursor: not-allowed; }
        .cal-day:not(.disabled):not(.selected):hover { border-color: rgba(201,169,110,.35); background: rgba(201,169,110,.06); }

        .step-dot { width: 8px; height: 8px; border-radius: 50%; transition: all .3s; }

        .btn-primary { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 600; letter-spacing: .14em; text-transform: uppercase; background: #c9a96e; color: #0a0a0a; border: none; cursor: pointer; padding: 14px 32px; transition: all .3s; display: inline-flex; align-items: center; gap: 8px; }
        .btn-primary:hover:not(:disabled) { background: #b8914f; transform: translateY(-1px); }
        .btn-primary:disabled { opacity: .4; cursor: not-allowed; }

        .btn-ghost { font-family: 'DM Sans', sans-serif; font-size: 11px; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; background: transparent; color: rgba(242,237,228,.5); border: 1px solid rgba(242,237,228,.12); cursor: pointer; padding: 13px 28px; transition: all .25s; display: inline-flex; align-items: center; gap: 8px; }
        .btn-ghost:hover { border-color: rgba(242,237,228,.3); color: #f2ede4; }

        @media (max-width: 768px) {
          .two-col { grid-template-columns: 1fr !important; }
          .sidebar { display: none !important; }
        }
        .step-label { display: none; }
        @media (min-width: 601px) {
          .step-label { display: block; }
        }
      `}</style>

      {/* ── NAV ─────────────────────────────── */}
      <nav
        style={{
          position: "sticky",
        }}
      >
        <Link
          href="/gallery"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: "rgba(242,237,228,.5)",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            letterSpacing: ".1em",
            textTransform: "uppercase",
          }}
          onMouseOver={(e) => (e.currentTarget.style.color = "#c9a96e")}
          onMouseOut={(e) =>
            (e.currentTarget.style.color = "rgba(242,237,228,.5)")
          }
        >
          <ArrowLeft size={13} /> Gallery
        </Link>
        <div
          style={{ width: 1, height: 18, background: "rgba(242,237,228,.1)" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 30,
              height: 30,
              border: "1px solid #c9a96e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Calendar size={14} color="#c9a96e" />
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 17,
                fontWeight: 500,
                color: "#f2ede4",
              }}
            >
              Schedule a Viewing
            </div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 9,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                color: "rgba(201,169,110,.65)",
              }}
            >
              LEA Executive Residency
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {STEPS.map((s, i) => (
            <div
              key={s}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  className="step-dot"
                  style={{
                    background:
                      i < step
                        ? "#c9a96e"
                        : i === step
                          ? "#c9a96e"
                          : "rgba(242,237,228,.15)",
                    transform: i === step ? "scale(1.4)" : "scale(1)",
                  }}
                />
                <span
                  className="step-label"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 10,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: i <= step ? "#c9a96e" : "rgba(242,237,228,.3)",
                  }}
                >
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    width: 20,
                    height: 1,
                    background: i < step ? "#c9a96e" : "rgba(242,237,228,.12)",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </nav>

      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "32px 20px",
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 32,
        }}
        className="two-col"
      >
        {/* ── MAIN FORM ─────────────────────── */}
        <div>
          {/* Step header */}
          <div style={{ marginBottom: 40 }}>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10,
                letterSpacing: ".22em",
                textTransform: "uppercase",
                color: "#c9a96e",
                marginBottom: 8,
              }}
            >
              Step {step + 1} of {STEPS.length}
            </div>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 300 }}>
              {step === 0 && (
                <>
                  <em style={{ color: "#c9a96e", fontStyle: "italic" }}>Who</em>{" "}
                  are you?
                </>
              )}
              {step === 1 && (
                <>
                  What are you{" "}
                  <em style={{ color: "#c9a96e", fontStyle: "italic" }}>
                    looking for?
                  </em>
                </>
              )}
              {step === 2 && (
                <>
                  Pick a{" "}
                  <em style={{ color: "#c9a96e", fontStyle: "italic" }}>
                    date & time
                  </em>
                </>
              )}
              {step === 3 && (
                <>
                  Review &{" "}
                  <em style={{ color: "#c9a96e", fontStyle: "italic" }}>
                    Confirm
                  </em>
                </>
              )}
            </h2>
          </div>

          {/* ── STEP 0: Personal Info ─────────── */}
          {step === 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label style={labelStyle}>First Name *</label>
                  <input
                    style={inputStyle}
                    placeholder="Jane"
                    value={form.firstName}
                    onChange={(e) => set("firstName", e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Last Name *</label>
                  <input
                    style={inputStyle}
                    placeholder="Doe"
                    value={form.lastName}
                    onChange={(e) => set("lastName", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Email Address *</label>
                <input
                  type="email"
                  style={inputStyle}
                  placeholder="jane.doe@example.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Phone Number *</label>
                <input
                  type="tel"
                  style={inputStyle}
                  placeholder="+254 700 123 456"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ── STEP 1: Preferences ──────────── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              <div>
                <label style={labelStyle}>Property Type *</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2,1fr)",
                    gap: 10,
                  }}
                >
                  {PROPERTY_TYPES.map((t) => (
                    <button
                      key={t}
                      className={`sel-pill${form.propertyType === t ? " active" : ""}`}
                      onClick={() => set("propertyType", t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Group Size *</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {GROUP_SIZES.map((g) => (
                    <button
                      key={g}
                      className={`sel-pill${form.groupSize === g ? " active" : ""}`}
                      onClick={() => set("groupSize", g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Move-in Urgency *</label>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  {URGENCY_OPTIONS.map((u) => (
                    <button
                      key={u}
                      className={`sel-pill${form.urgency === u ? " active" : ""}`}
                      style={{ textAlign: "left" }}
                      onClick={() => set("urgency", u)}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Budget Range (KES / month)</label>
                <input
                  style={inputStyle}
                  placeholder="e.g. 45,000 – 80,000"
                  value={form.budget}
                  onChange={(e) => set("budget", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ── STEP 2: Schedule ─────────────── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {/* Calendar */}
              <div>
                <label style={labelStyle}>
                  Preferred Date *{" "}
                  {selectedDate && (
                    <span style={{ color: "#c9a96e" }}>
                      —{" "}
                      {selectedDate.toLocaleDateString("en-KE", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}
                </label>
                <div
                  style={{
                    background: "#131313",
                    border: "1px solid rgba(242,237,228,.08)",
                    padding: "24px 20px",
                    display: "inline-block",
                    minWidth: 280,
                  }}
                >
                  {/* Month nav */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 20,
                    }}
                  >
                    <button
                      onClick={prevMonth}
                      style={{
                        background: "none",
                        border: "1px solid rgba(242,237,228,.1)",
                        width: 32,
                        height: 32,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "rgba(242,237,228,.5)",
                        transition: "all .2s",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.borderColor = "#c9a96e")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.borderColor =
                          "rgba(242,237,228,.1)")
                      }
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: 18,
                        fontWeight: 400,
                        color: "#f2ede4",
                      }}
                    >
                      {MONTHS[calMonth]} {calYear}
                    </span>
                    <button
                      onClick={nextMonth}
                      style={{
                        background: "none",
                        border: "1px solid rgba(242,237,228,.1)",
                        width: 32,
                        height: 32,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "rgba(242,237,228,.5)",
                        transition: "all .2s",
                      }}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.borderColor = "#c9a96e")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.borderColor =
                          "rgba(242,237,228,.1)")
                      }
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  {/* Day headers */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7,36px)",
                      gap: 4,
                      marginBottom: 8,
                    }}
                  >
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                      <div
                        key={d}
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 10,
                          letterSpacing: ".08em",
                          textTransform: "uppercase",
                          color: "rgba(242,237,228,.3)",
                          textAlign: "center",
                          padding: "4px 0",
                        }}
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                  {/* Days */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7,36px)",
                      gap: 4,
                    }}
                  >
                    {calDays().map((d, i) => {
                      if (!d) return <div key={i} />;
                      const dis = isDisabled(d);
                      const sel = isSelected(d);
                      const isToday = d.toDateString() === today.toDateString();
                      return (
                        <div
                          key={i}
                          className={`cal-day${dis ? " disabled" : ""}${sel ? " selected" : ""}${isToday && !sel ? " today" : ""}`}
                          onClick={() => !dis && setSelectedDate(d)}
                        >
                          {d.getDate()}
                        </div>
                      );
                    })}
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 10,
                      color: "rgba(242,237,228,.3)",
                      marginTop: 12,
                      letterSpacing: ".06em",
                    }}
                  >
                    Sundays unavailable
                  </div>
                </div>
              </div>

              {/* Time slots */}
              <div>
                <label style={labelStyle}>Preferred Time *</label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2,1fr)",
                    gap: 10,
                  }}
                >
                  {TIME_SLOTS.map((t) => (
                    <button
                      key={t}
                      className={`sel-pill${form.timeSlot === t ? " active" : ""}`}
                      onClick={() => set("timeSlot", t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Additional notes */}
              <div>
                <label style={labelStyle}>Additional Notes</label>
                <textarea
                  style={{ ...inputStyle, minHeight: 90 }}
                  placeholder="Any specific units you'd like to see, accessibility requirements, or questions..."
                  value={form.message}
                  onChange={(e) => set("message", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ── STEP 3: Confirm ──────────────── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Summary */}
              {[
                {
                  label: "Personal",
                  items: [
                    `${form.firstName} ${form.lastName}`,
                    form.email,
                    form.phone,
                  ],
                },
                {
                  label: "Preferences",
                  items: [
                    form.propertyType,
                    form.groupSize,
                    form.urgency,
                    form.budget ? `Budget: ${form.budget}` : null,
                  ].filter(Boolean) as string[],
                },
                {
                  label: "Viewing",
                  items: [
                    selectedDate?.toLocaleDateString("en-KE", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }) || "",
                    form.timeSlot,
                  ],
                },
              ].map(({ label, items }) => (
                <div
                  key={label}
                  style={{
                    background: "#131313",
                    border: "1px solid rgba(242,237,228,.07)",
                    padding: "20px 24px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 10,
                      letterSpacing: ".18em",
                      textTransform: "uppercase",
                      color: "#c9a96e",
                      marginBottom: 12,
                    }}
                  >
                    {label}
                  </div>
                  {items.map((item) => (
                    <div
                      key={item}
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        color: "rgba(242,237,228,.7)",
                        marginBottom: 6,
                        paddingLeft: 8,
                        borderLeft: "2px solid rgba(201,169,110,.2)",
                      }}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ))}

              {form.message && (
                <div
                  style={{
                    background: "#131313",
                    border: "1px solid rgba(242,237,228,.07)",
                    padding: "20px 24px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 10,
                      letterSpacing: ".18em",
                      textTransform: "uppercase",
                      color: "#c9a96e",
                      marginBottom: 12,
                    }}
                  >
                    Notes
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      color: "rgba(242,237,228,.65)",
                      lineHeight: 1.7,
                    }}
                  >
                    {form.message}
                  </div>
                </div>
              )}

              {/* Agreement */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: "20px",
                  background: "#131313",
                  border: `1px solid ${form.agreed ? "rgba(201,169,110,.3)" : "rgba(242,237,228,.07)"}`,
                  cursor: "pointer",
                  transition: "border-color .25s",
                }}
                onClick={() => set("agreed", !form.agreed)}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: `1px solid ${form.agreed ? "#c9a96e" : "rgba(242,237,228,.3)"}`,
                    background: form.agreed ? "#c9a96e" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                    transition: "all .2s",
                  }}
                >
                  {form.agreed && <CheckCircle size={12} color="#0a0a0a" />}
                </div>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: "rgba(242,237,228,.6)",
                    lineHeight: 1.7,
                  }}
                >
                  I agree to the terms and conditions. I understand this is a
                  viewing request and LEA Executive will confirm the appointment
                  within 24 hours.
                </p>
              </div>

              {error && (
                <div
                  style={{
                    padding: "14px 18px",
                    background: "rgba(239,68,68,.1)",
                    border: "1px solid rgba(239,68,68,.25)",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      color: "#f87171",
                    }}
                  >
                    {error}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Navigation ───────────────────── */}
          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 40,
              paddingTop: 32,
              borderTop: "1px solid rgba(242,237,228,.06)",
            }}
          >
            {step > 0 && (
              <button
                className="btn-ghost"
                onClick={() => setStep((s) => s - 1)}
              >
                <ChevronLeft size={14} /> Back
              </button>
            )}
            {step < 3 ? (
              <button
                className="btn-primary"
                disabled={!canNext()}
                onClick={() => setStep((s) => s + 1)}
                style={{ marginLeft: step > 0 ? 0 : 0 }}
              >
                Continue <ChevronRight size={14} />
              </button>
            ) : (
              <button
                className="btn-primary"
                disabled={!form.agreed || submitting}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <>
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        border: "2px solid rgba(10,10,10,.4)",
                        borderTopColor: "#0a0a0a",
                        borderRadius: "50%",
                        animation: "spin .8s linear infinite",
                      }}
                    />{" "}
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Schedule Viewing
                  </>
                )}
              </button>
            )}
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>

        {/* ── SIDEBAR ──────────────────────── */}
        <div
          className="sidebar"
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          {/* Viewing info card */}
          <div
            style={{
              background: "#131313",
              border: "1px solid rgba(242,237,228,.07)",
              padding: "28px 24px",
            }}
          >
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10,
                letterSpacing: ".2em",
                textTransform: "uppercase",
                color: "#c9a96e",
                marginBottom: 16,
              }}
            >
              What to Expect
            </div>
            {[
              {
                icon: <Clock size={14} color="#c9a96e" />,
                t: "30–45 min tour",
                s: "Comprehensive walkthrough",
              },
              {
                icon: <Users size={14} color="#c9a96e" />,
                t: "Personal guide",
                s: "One-on-one with manager",
              },
              {
                icon: <Home size={14} color="#c9a96e" />,
                t: "Multiple units",
                s: "See available options",
              },
            ].map(({ icon, t, s }) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 16,
                  paddingBottom: 16,
                  borderBottom: "1px solid rgba(242,237,228,.05)",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    background: "rgba(201,169,110,.08)",
                    border: "1px solid rgba(201,169,110,.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {icon}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#f2ede4",
                    }}
                  >
                    {t}
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11,
                      color: "rgba(242,237,228,.4)",
                      marginTop: 2,
                    }}
                  >
                    {s}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Available units */}
          <div
            style={{
              background: "#131313",
              border: "1px solid rgba(242,237,228,.07)",
              padding: "24px",
            }}
          >
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10,
                letterSpacing: ".2em",
                textTransform: "uppercase",
                color: "#c9a96e",
                marginBottom: 16,
              }}
            >
              Available Now
            </div>
            {[
              ["Apartments", "12 units", "from KES 45,000"],
              ["Villas", "3 units", "from KES 85,000"],
              ["Townhouses", "5 units", "from KES 65,000"],
            ].map(([t, u, p]) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid rgba(242,237,228,.05)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 500,
                      color: "#f2ede4",
                    }}
                  >
                    {t}
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11,
                      color: "rgba(242,237,228,.4)",
                    }}
                  >
                    {u}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 14,
                    color: "#c9a96e",
                  }}
                >
                  {p}
                </div>
              </div>
            ))}
          </div>

          {/* Progress indicator */}
          <div
            style={{
              background: "#131313",
              border: "1px solid rgba(242,237,228,.07)",
              padding: "20px 24px",
            }}
          >
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10,
                letterSpacing: ".18em",
                textTransform: "uppercase",
                color: "rgba(242,237,228,.35)",
                marginBottom: 16,
              }}
            >
              Your Progress
            </div>
            {STEPS.map((s, i) => (
              <div
                key={s}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    border: `1px solid ${i <= step ? "#c9a96e" : "rgba(242,237,228,.12)"}`,
                    background: i < step ? "#c9a96e" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {i < step ? (
                    <CheckCircle size={12} color="#0a0a0a" />
                  ) : (
                    <span
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 9,
                        color: i === step ? "#c9a96e" : "rgba(242,237,228,.3)",
                      }}
                    >
                      {i + 1}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    color: i <= step ? "#f2ede4" : "rgba(242,237,228,.3)",
                  }}
                >
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
