"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  X,
  Phone,
  CreditCard,
  Building2,
  TrendingUp,
  Calendar,
  Receipt,
  Trash2,
  Search,
  BadgeCheck,
  Download,
  RefreshCw,
  Droplets,
  Wrench,
  Wifi,
  ChevronDown,
  Layers,
  MapPin,
  MessageSquareText,
  Package,
  Zap,
} from "lucide-react";
import PayButton from "../payments/PaymentsButton";
import WifiPayModal from "../payments/WifiPayModal";
import MpesaCodeSubmitCard from "../payments/MpesaCodeSubmitCard";
import LandlordPochiReview from "../payments/LandlordPochiReview";
import MyBillsPanel from "../payments/MyBillsPanel";

const TZ = "Africa/Nairobi";
const toUTC = (s: string) => new Date(s.endsWith("Z") ? s : s + "Z");

interface PropertyItem {
  id: string;
  landlord_block_id: string;
  property_name: string;
  property_address: string;
  capacity?: number;
  used?: number;
  landlord_code?: string;
  totalUnits?: number;
  occupiedUnits?: number;
}

interface Payment {
  id: string;
  tenant_id: string | null;
  tenant_name?: string | null;
  tenant_email?: string | null;
  amount: number;
  phone_number: string | null;
  mpesa_code: string | null;
  account_number: string | null;
  payment_month: string;
  payment_date: string;
  status: string;
  payment_method: string;
  notes: string | null;
  logged_by: string;
  profiles?: { full_name: string; email: string };
}

interface RentSetting {
  tenant_id: string;
  monthly_amount: number;
  due_day: number;
  unit_number: string | null;
  wifi_enabled?: boolean;
  wifi_amount?: number | null;
  garbage_enabled?: boolean;
  garbage_amount?: number | null;
  electricity_enabled?: boolean;
  electricity_amount?: number | null;
  electricity_is_variable?: boolean;
  water_enabled?: boolean;
  water_fixed?: number | null;
  water_is_variable?: boolean;
  allow_advance_months?: number;
  allow_tenant_variable_entry?: boolean;
  water_pay_separate?: boolean;
  garbage_pay_separate?: boolean;
  electricity_pay_separate?: boolean;
  deposit_months?: number;
  deposit_billed_period?: string | null;
  created_at?: string;
  profiles?: { full_name: string; email: string; avatar_url: string | null; created_at?: string };
}

interface PaymentsPageProps {
  user: User | null;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
  return `${d.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: TZ,
  })}|${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
});

export default function PaymentsPage({ user }: PaymentsPageProps) {
  const [role, setRole] = useState<string | null>(null);
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>("all");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [rentSettings, setRentSettings] = useState<RentSetting[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [tenantSlots, setTenantSlots] = useState<any[]>([]);
  const [tenantJoinDates, setTenantJoinDates] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeMonth, setActiveMonth] = useState(MONTHS[0].split("|")[1]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [settingsWifiEnabled, setSettingsWifiEnabled] = useState(false);
  const [settingsWifiAmount, setSettingsWifiAmount] = useState("");
  const [settingsWaterEnabled, setSettingsWaterEnabled] = useState(true);
  const [settingsWaterMode, setSettingsWaterMode] = useState<"variable" | "fixed">(
    "variable",
  );
  const [settingsWaterFixed, setSettingsWaterFixed] = useState("");
  const [settingsGarbageEnabled, setSettingsGarbageEnabled] = useState(false);
  const [settingsGarbageAmount, setSettingsGarbageAmount] = useState("");
  const [settingsElecEnabled, setSettingsElecEnabled] = useState(false);
  const [settingsElecMode, setSettingsElecMode] = useState<"variable" | "fixed">(
    "fixed",
  );
  const [settingsElecAmount, setSettingsElecAmount] = useState("");
  const [settingsAdvanceMonths, setSettingsAdvanceMonths] = useState(0);
  const [settingsAllowTenantVar, setSettingsAllowTenantVar] = useState(true);
  const [settingsDepositMonths, setSettingsDepositMonths] = useState(0);
  const [settingsWaterSeparate, setSettingsWaterSeparate] = useState(false);
  const [settingsGarbageSeparate, setSettingsGarbageSeparate] = useState(false);
  const [settingsElecSeparate, setSettingsElecSeparate] = useState(false);
  const [separatePayFocus, setSeparatePayFocus] = useState<{
    types: string[];
    amount: number;
    label: string;
  } | null>(null);
  const [landlordWifiChannel, setLandlordWifiChannel] = useState<any>(null);
  const [showWifiPayModal, setShowWifiPayModal] = useState(false);

  // Manual log form states — landlord
  const [showLogForm, setShowLogForm] = useState(false);
  const [logTenantId, setLogTenantId] = useState("");
  const [logAmount, setLogAmount] = useState("");
  const [logMpesaCode, setLogMpesaCode] = useState("");
  const [logPhone, setLogPhone] = useState("");
  const [logMethod, setLogMethod] = useState("mpesa");
  const [logMonth, setLogMonth] = useState(MONTHS[0].split("|")[1]);
  const [logNotes, setLogNotes] = useState("");
  const [isLogging, setIsLogging] = useState(false);

  // Rent settings form
  const [showSettingsForm, setShowSettingsForm] = useState(false);
  const [settingsTenantId, setSettingsTenantId] = useState("");
  const [settingsAmount, setSettingsAmount] = useState("");
  const [settingsUnit, setSettingsUnit] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // STK Push states
  const [showPayModal, setShowPayModal] = useState(false);
  const [payPhone, setPayPhone] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentTab, setPaymentTab] = useState<"bills" | "pay" | "history">(
    "bills",
  );
  const [billsPayAmount, setBillsPayAmount] = useState<number | null>(null);
  const [selectedTenantAccountId, setSelectedTenantAccountId] = useState<
    string | null
  >(null);
  /** Pochi manual flow: tenant clicked Got it — enter M-Pesa code here */
  const [awaitingCodePayment, setAwaitingCodePayment] = useState<{
    id: string;
    amount: number;
    month: string;
  } | null>(null);

  const countsAsConfirmedRent = (p: any) => {
    const notes = (p.notes || "").toUpperCase();
    if (notes.includes("WIFI")) return false;
    const s = String(p.status || "confirmed").toLowerCase();
    return !["awaiting_sms", "awaiting_ll", "awaiting_confirmation", "pending", "failed", "cancelled", "declined"].includes(
      s,
    );
  };

  // ── Payment status calculator ─────────────────────────
  const getTenantPaymentStatus = (tenantId: string, month: string) => {
    const rs = rentSettings.find((r) => r.tenant_id === tenantId);
    const monthPayments = payments.filter(
      (p) =>
        p.tenant_id === tenantId &&
        p.payment_month === month &&
        countsAsConfirmedRent(p),
    );
    const totalPaid = monthPayments.reduce((s, p) => s + Number(p.amount), 0);
    const expected = rs?.monthly_amount || 0;

    // Check if tenant joined AFTER this month (prevent showing pending for months they never existed)
    const joinMonthStr = tenantJoinDates[tenantId];
    const isBeforeTenantJoined = joinMonthStr ? month < joinMonthStr : false;

    const pending = isBeforeTenantJoined ? 0 : Math.max(0, expected - totalPaid);
    const isComplete = expected > 0 && totalPaid >= expected;
    const isPartial = totalPaid > 0 && totalPaid < expected;

    return {
      totalPaid,
      expected,
      pending,
      isComplete,
      isPartial,
      isBeforeTenantJoined,
      hasNoSetting: expected === 0,
      payments: monthPayments,
    };
  };

  const showFeedback = (msg: string, isError = false) => {
    if (isError) setError(msg);
    else setSuccess(msg);
    setTimeout(() => {
      setError("");
      setSuccess("");
    }, 5000);
  };

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = !!opts?.silent;
    if (!silent) setIsLoading(true);
    try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, landlord_block_id")
      .eq("id", user!.id)
      .single();
    setRole(profile?.role || null);

    if (profile?.role === "landlord") {
      try {
        const propRes = await fetch("/api/landlord/properties");
        const propJson = await propRes.json();

        if (propRes.ok && propJson.success) {
          const propsList: PropertyItem[] = propJson.properties || [];
          setProperties(propsList);

          const slotsList = propJson.allSlots || [];
          setTenantSlots(slotsList);

          const tenantMap: Record<string, any> = {};
          const rentSettingsMap: Record<string, RentSetting> = {};
          const joinDates: Record<string, string> = {};

          slotsList.forEach((slot: any) => {
            if (slot.tenant && slot.tenant_id) {
              tenantMap[slot.tenant_id] = slot.tenant;
            }
            if (slot.rent_setting && slot.tenant_id) {
              rentSettingsMap[slot.tenant_id] = {
                ...slot.rent_setting,
                profiles: slot.tenant,
              };
            }
            if (slot.tenant_id) {
              // Prioritize lease_start_date, then created_at from slot / tenant / rent_setting
              const earliestDateStr =
                slot.lease_start_date ||
                slot.created_at ||
                slot.tenant?.created_at ||
                slot.rent_setting?.created_at;
              if (earliestDateStr) {
                const d = new Date(earliestDateStr);
                if (!isNaN(d.getTime())) {
                  joinDates[slot.tenant_id] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                }
              }
            }
          });

          // Payments from API
          const paysList: Payment[] = propJson.payments || [];
          setPayments(paysList);

          // Fetch additional rent_settings and profiles if any were set directly
          const slotTenantIds = Object.keys(tenantMap);
          if (slotTenantIds.length > 0) {
            const { data: dbRentSettings } = await supabase
              .from("rent_settings")
              .select("*, profiles(full_name, email, avatar_url, created_at)")
              .in("tenant_id", slotTenantIds);

            if (dbRentSettings) {
              dbRentSettings.forEach((rs) => {
                rentSettingsMap[rs.tenant_id] = rs;
                if (!joinDates[rs.tenant_id] && (rs.created_at || rs.profiles?.created_at)) {
                  const d = new Date(rs.created_at || rs.profiles?.created_at);
                  if (!isNaN(d.getTime())) {
                    joinDates[rs.tenant_id] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                  }
                }
              });
            }
          }

          // Active tenants assigned to landlord units (excluding deleted/unassigned historical users)
          setTenants(Object.values(tenantMap));
          setRentSettings(Object.values(rentSettingsMap));
          setTenantJoinDates(joinDates);
        } else {
          throw new Error("Could not load from properties route");
        }
      } catch (err) {
        console.warn("Falling back to direct supabase query in PaymentsPage", err);
        const { data: slotRows } = await supabase
          .from("tenant_slots")
          .select("id, tenant_id, lease_start_date, created_at, landlord_block_id")
          .eq("landlord_block_id", profile.landlord_block_id)
          .not("tenant_id", "is", null);

        setTenantSlots(slotRows || []);

        const tenantIds = (slotRows || [])
          .map((slot: any) => slot.tenant_id)
          .filter(Boolean);

        if (tenantIds.length) {
          const { data: pays } = await supabase
            .from("payments")
            .select("*, profiles!payments_tenant_id_fkey(full_name, email)")
            .in("tenant_id", tenantIds)
            .order("payment_date", { ascending: false });
          setPayments(pays || []);

          const { data: tList } = await supabase
            .from("profiles")
            .select("id, full_name, email, avatar_url, phone_number, created_at")
            .in("id", tenantIds);
          setTenants(tList || []);

          const { data: rs } = await supabase
            .from("rent_settings")
            .select("*, profiles(full_name, email, avatar_url, created_at)")
            .in("tenant_id", tenantIds);
          setRentSettings(rs || []);

          const joinDates: Record<string, string> = {};
          for (const t of tList || []) {
            const slot = (slotRows || []).find((s: any) => s.tenant_id === t.id);
            const rentSet = (rs || []).find((r: any) => r.tenant_id === t.id);
            const earliestDateStr = slot?.lease_start_date || slot?.created_at || t.created_at || rentSet?.created_at;
            if (earliestDateStr) {
              const d = new Date(earliestDateStr);
              if (!isNaN(d.getTime())) {
                joinDates[t.id] = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
              }
            }
          }
          setTenantJoinDates(joinDates);
        } else {
          const { data: pays } = await supabase
            .from("payments")
            .select("*, profiles!payments_tenant_id_fkey(full_name, email)")
            .eq("landlord_id", user!.id)
            .order("payment_date", { ascending: false });
          setPayments(pays || []);
          setTenants([]);
          setRentSettings([]);
          setTenantJoinDates({});
        }
      }
    } else {
      // Tenant — own payments only
      const { data: pays } = await supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", user!.id)
        .order("payment_date", { ascending: false });
      setPayments(pays || []);

      const { data: rs } = await supabase
        .from("rent_settings")
        .select("*, profiles(created_at)")
        .eq("tenant_id", user!.id)
        .maybeSingle();
      if (rs) setRentSettings([rs]);

      const { data: mySlot } = await supabase
        .from("tenant_slots")
        .select("lease_start_date, created_at")
        .eq("tenant_id", user!.id)
        .maybeSingle();

      const { data: myProfile } = await supabase
        .from("profiles")
        .select("created_at")
        .eq("id", user!.id)
        .maybeSingle();

      const earliestDateStr = mySlot?.lease_start_date || myProfile?.created_at || rs?.created_at;
      if (earliestDateStr) {
        const d = new Date(earliestDateStr);
        if (!isNaN(d.getTime())) {
          setTenantJoinDates({
            [user!.id]: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
          });
        }
      }

      const { data: wifiChan } = await supabase
        .from("landlord_payment_settings")
        .select("payhero_channel_id")
        .eq("is_wifi", true)
        .maybeSingle();
      setLandlordWifiChannel(wifiChan || null);
    }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchData(); // full-page spinner only on first load

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const softRefresh = () => {
      // Debounce + silent: My Bills ledger writes must not remount this whole page
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => fetchData({ silent: true }), 400);
    };

    const channel = supabase
      .channel("payments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payments" },
        softRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rent_settings" },
        softRefresh,
      )
      .subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      channel.unsubscribe();
    };
  }, [user, fetchData]);

  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTenantId || !logAmount) return;
    setIsLogging(true);
    try {
      if (!tenants.some((t) => t.id === logTenantId)) {
        throw new Error("Selected tenant is not assigned to you.");
      }

      if (logMpesaCode) {
        const { data: existing } = await supabase
          .from("payments")
          .select("id")
          .eq("mpesa_code", logMpesaCode.toUpperCase())
          .maybeSingle();
        if (existing)
          throw new Error("This M-Pesa code has already been recorded.");
      }

      const { error } = await supabase.from("payments").insert({
        tenant_id: logTenantId,
        landlord_id: user!.id,
        amount: parseFloat(logAmount),
        phone_number: logPhone || null,
        mpesa_code: logMpesaCode ? logMpesaCode.toUpperCase() : null,
        payment_month: logMonth,
        payment_method: logMethod,
        notes: logNotes || null,
        logged_by: "landlord",
        status: "confirmed",
      });
      if (error) throw error;

      showFeedback("Payment logged successfully!");
      setLogTenantId("");
      setLogAmount("");
      setLogMpesaCode("");
      setLogPhone("");
      setLogNotes("");
      setShowLogForm(false);
      fetchData({ silent: true });
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setIsLogging(false);
    }
  };

  const loadSettingsFromExisting = (existing: RentSetting | undefined) => {
    if (!existing) {
      setSettingsAmount("");
      setSettingsUnit("");
      setSettingsWifiEnabled(false);
      setSettingsWifiAmount("");
      setSettingsWaterEnabled(true);
      setSettingsWaterMode("variable");
      setSettingsWaterFixed("");
      setSettingsGarbageEnabled(false);
      setSettingsGarbageAmount("");
      setSettingsElecEnabled(false);
      setSettingsElecMode("fixed");
      setSettingsElecAmount("");
      setSettingsAdvanceMonths(0);
      setSettingsAllowTenantVar(true);
      setSettingsDepositMonths(0);
      setSettingsWaterSeparate(false);
      setSettingsGarbageSeparate(false);
      setSettingsElecSeparate(false);
      return;
    }
    setSettingsAmount(String(existing.monthly_amount));
    setSettingsUnit(existing.unit_number || "");
    setSettingsWifiEnabled(!!existing.wifi_enabled);
    setSettingsWifiAmount(
      existing.wifi_amount ? String(existing.wifi_amount) : "",
    );
    setSettingsWaterEnabled(existing.water_enabled !== false);
    setSettingsWaterMode(
      existing.water_is_variable === false && Number(existing.water_fixed) > 0
        ? "fixed"
        : "variable",
    );
    setSettingsWaterFixed(
      existing.water_fixed ? String(existing.water_fixed) : "",
    );
    setSettingsGarbageEnabled(!!existing.garbage_enabled);
    setSettingsGarbageAmount(
      existing.garbage_amount ? String(existing.garbage_amount) : "",
    );
    setSettingsElecEnabled(!!existing.electricity_enabled);
    setSettingsElecMode(
      existing.electricity_is_variable ? "variable" : "fixed",
    );
    setSettingsElecAmount(
      existing.electricity_amount ? String(existing.electricity_amount) : "",
    );
    setSettingsAdvanceMonths(
      Math.min(3, Math.max(0, Number(existing.allow_advance_months) || 0)),
    );
    setSettingsAllowTenantVar(existing.allow_tenant_variable_entry !== false);
    setSettingsDepositMonths(
      [0, 2, 3].includes(Number(existing.deposit_months))
        ? Number(existing.deposit_months)
        : 0,
    );
    setSettingsWaterSeparate(!!existing.water_pay_separate);
    setSettingsGarbageSeparate(!!existing.garbage_pay_separate);
    setSettingsElecSeparate(!!existing.electricity_pay_separate);
  };

  const handleSaveRentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsTenantId || !settingsAmount) return;
    setIsSavingSettings(true);
    try {
      if (!tenants.some((t) => t.id === settingsTenantId)) {
        throw new Error("Selected tenant is not assigned to you.");
      }

      const waterIsVariable = settingsWaterMode === "variable";
      const { error } = await supabase.from("rent_settings").upsert(
        {
          tenant_id: settingsTenantId,
          monthly_amount: parseFloat(settingsAmount),
          unit_number: settingsUnit || null,
          wifi_enabled: settingsWifiEnabled,
          wifi_amount: settingsWifiEnabled
            ? parseFloat(settingsWifiAmount || "0")
            : null,
          water_enabled: settingsWaterEnabled,
          water_is_variable: waterIsVariable,
          water_fixed:
            settingsWaterEnabled && !waterIsVariable
              ? parseFloat(settingsWaterFixed || "0")
              : null,
          garbage_enabled: settingsGarbageEnabled,
          garbage_amount: settingsGarbageEnabled
            ? parseFloat(settingsGarbageAmount || "0")
            : null,
          electricity_enabled: settingsElecEnabled,
          electricity_is_variable: settingsElecMode === "variable",
          electricity_amount: settingsElecEnabled
            ? parseFloat(settingsElecAmount || "0")
            : null,
          allow_advance_months: settingsAdvanceMonths,
          allow_tenant_variable_entry: settingsAllowTenantVar,
          deposit_months: settingsDepositMonths,
          water_pay_separate: settingsWaterSeparate,
          garbage_pay_separate: settingsGarbageSeparate,
          electricity_pay_separate: settingsElecSeparate,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" },
      );
      if (error) throw error;

      // Sync ledger recurring charges for this tenant
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        await fetch(
          `/api/tenancy/account?tenant_id=${settingsTenantId}&generate=1`,
          {
            credentials: "include",
            headers: session?.access_token
              ? { Authorization: `Bearer ${session.access_token}` }
              : {},
          },
        );
      } catch {
        /* best-effort */
      }

      showFeedback("Charge plan saved!");
      setShowSettingsForm(false);
      fetchData({ silent: true });
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const initiateSTKPush = async () => {
    if (!myRentSetting) {
      showFeedback(
        "Your rent amount is not set. Please contact landlord.",
        true,
      );
      return;
    }
    if (!payPhone || payPhone.length < 9) {
      showFeedback("Please enter a valid M-Pesa phone number", true);
      return;
    }

    setIsPaying(true);
    try {
      const res = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: myRentSetting.monthly_amount,
          phone: payPhone,
          tenantId: user!.id,
          month: activeMonth,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showFeedback(
        "Payment request sent. Please check your phone and enter PIN.",
      );
      setShowPayModal(false);
      setPayPhone("");
    } catch (err: any) {
      showFeedback(err.message, true);
    } finally {
      setIsPaying(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
    const paymentToDelete = payments.find((p) => p.id === id);
    if (!paymentToDelete) {
      showFeedback("Payment not found.", true);
      return;
    }

    if (
      role === "landlord" &&
      !tenants.some((t) => t.id === paymentToDelete.tenant_id)
    ) {
      showFeedback("Unauthorized to delete this payment.", true);
      return;
    }

    const deleteQuery = supabase.from("payments").delete().eq("id", id);
    if (role === "landlord") {
      deleteQuery.eq("landlord_id", user!.id);
    } else {
      deleteQuery.eq("tenant_id", user!.id);
    }

    const { error } = await deleteQuery;
    if (error) {
      showFeedback("Failed to delete payment.", true);
      return;
    }

    showFeedback("Payment record deleted.");
    fetchData({ silent: true });
  };

  const formatDate = (s: string) =>
    toUTC(s)
      .toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: TZ,
      })
      .replace(",", " ");

  // CSV Export Function
  const exportToCSV = () => {
    const monthPayments = currentMonthPayments;

    if (monthPayments.length === 0) {
      const monthName =
        MONTHS.find((m) => m.split("|")[1] === activeMonth)?.split("|")[0] ||
        "Unknown";
      showFeedback(
        `No payments found for ${monthName}. Log some payments first!`,
        true,
      );
      return;
    }

    const headers = [
      "Property",
      "Unit",
      "Tenant Name",
      "Email",
      "Payment Type",
      "Amount (KES)",
      "M-Pesa Code",
      "Payment Date",
      "Payment Method",
      "Status",
      "Notes",
    ];

    const rows = monthPayments.map((payment) => {
      const tenant = tenants.find((t) => t.id === payment.tenant_id);
      const propInfo = payment.tenant_id ? tenantPropertyMap[payment.tenant_id] : null;
      const paymentType = getPaymentTypeFromNotes(payment.notes);

      return [
        propInfo?.propertyName || "N/A",
        propInfo?.unitNumber || "N/A",
        tenant?.full_name || payment.tenant_name || "Unknown",
        tenant?.email || payment.tenant_email || "Unknown",
        paymentType,
        payment.amount.toString(),
        payment.mpesa_code || "N/A",
        formatDate(payment.payment_date),
        payment.payment_method || "M-Pesa",
        payment.status || "confirmed",
        payment.notes || "",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    const monthName =
      MONTHS.find((m) => m.split("|")[1] === activeMonth)?.split("|")[0] ||
      "Unknown";
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `payment_ledger_${monthName.replace(" ", "_")}.csv`,
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showFeedback(`Payment ledger for ${monthName} exported successfully!`);
  };

  // Smart Sync PayHero Transactions Function
  const smartSyncPayHero = async () => {
    try {
      showFeedback("Smart syncing PayHero transactions...", false);

      const response = await fetch("/api/sync/smart-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (result.success) {
        const stats = result.stats || { updated: 0, created: 0, skipped: 0 };
        showFeedback(
          `Smart sync completed: ${stats.updated} updated, ${stats.created} created, ${stats.skipped} skipped`,
          false,
        );
        fetchData({ silent: true });
      } else {
        showFeedback(
          `Smart sync failed: ${result.error || "Unknown error"}`,
          true,
        );
      }
    } catch (error: any) {
      console.error("Smart sync error:", error);
      showFeedback("Smart sync failed. Please try again.", true);
    }
  };

  // Helper function to determine payment type from notes
  const getPaymentTypeFromNotes = (notes: string | null) => {
    if (!notes) return "Rent";
    if (notes.toUpperCase().includes("WIFI")) return "Wi-Fi";
    if (notes.toLowerCase().includes("water")) return "Rent + Water";
    if (
      notes.toLowerCase().includes("repair") ||
      notes.toLowerCase().includes("service")
    )
      return "Repairs";
    if (notes.toLowerCase().includes("plumbing")) return "Plumbing";
    if (notes.toLowerCase().includes("electrical")) return "Electrical";
    if (notes.toLowerCase().includes("painting")) return "Painting";
    if (notes.toLowerCase().includes("carpentry")) return "Carpentry";
    if (notes.toLowerCase().includes("security")) return "Security";
    if (notes.toLowerCase().includes("delivery")) return "Delivery";
    return "Rent";
  };

  const formatMoney = (n: number) =>
    `KES ${n.toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;

  // Mapping tenant_id -> Property details
  const tenantPropertyMap = useMemo(() => {
    const map: Record<
      string,
      { propertyId: string; propertyName: string; propertyAddress: string; unitNumber?: string }
    > = {};

    tenantSlots.forEach((slot: any) => {
      if (slot.tenant_id) {
        const matchedProp = properties.find(
          (p) => p.landlord_block_id === slot.landlord_block_id,
        );
        map[slot.tenant_id] = {
          propertyId: matchedProp?.id || slot.landlord_block_id || "default",
          propertyName: matchedProp?.property_name || "LEA Residency",
          propertyAddress: matchedProp?.property_address || "Nairobi, Kenya",
          unitNumber: slot.rent_setting?.unit_number || `Unit ${slot.slot_number}`,
        };
      }
    });

    return map;
  }, [tenantSlots, properties]);

  // Filter tenants list by selected property
  const filteredTenantsByProperty = useMemo(() => {
    if (selectedPropertyFilter === "all") return tenants;
    return tenants.filter((t) => {
      const propInfo = tenantPropertyMap[t.id];
      if (propInfo) {
        return propInfo.propertyId === selectedPropertyFilter;
      }
      const prop = properties.find((p) => p.id === selectedPropertyFilter);
      const slot = tenantSlots.find((s) => s.tenant_id === t.id);
      return slot && prop && slot.landlord_block_id === prop.landlord_block_id;
    });
  }, [tenants, selectedPropertyFilter, tenantPropertyMap, properties, tenantSlots]);

  const filteredTenantIdSet = useMemo(() => {
    return new Set(filteredTenantsByProperty.map((t) => t.id));
  }, [filteredTenantsByProperty]);

  const currentMonthPayments = useMemo(() => {
    return payments.filter((p) => {
      if (p.payment_month !== activeMonth) return false;
      if (selectedPropertyFilter === "all") return true;
      return p.tenant_id ? filteredTenantIdSet.has(p.tenant_id) : true;
    });
  }, [payments, activeMonth, selectedPropertyFilter, filteredTenantIdSet]);

  // ── Stats ────────────────────────────────────────────
  const totalCollected = currentMonthPayments.reduce(
    (s, p) => s + Number(p.amount),
    0,
  );
  const paidTenantIds = new Set(currentMonthPayments.map((p) => p.tenant_id));

  // Count active tenants in this month (filtered by property and whose join month <= activeMonth)
  const activeTenantsThisMonth = filteredTenantsByProperty.filter((t) => {
    const joinMonth = tenantJoinDates[t.id];
    return !joinMonth || activeMonth >= joinMonth;
  });
  const totalTenants = activeTenantsThisMonth.length;
  const paidCount = paidTenantIds.size;
  const unpaidCount = Math.max(0, totalTenants - paidCount);

  // ── Tenant's own data ────────────────────────────────
  const myRentSetting = rentSettings.find((r) => r.tenant_id === user?.id);
  const myJoinMonth = user ? tenantJoinDates[user.id] : null;
  const isSelectedMonthBeforeMyJoin = myJoinMonth ? activeMonth < myJoinMonth : false;

  const myCurrentMonthPaid = payments.some(
    (p) =>
      p.tenant_id === user?.id &&
      p.payment_month === activeMonth &&
      countsAsConfirmedRent(p),
  );
  const myCurrentPayment = payments.find(
    (p) =>
      p.tenant_id === user?.id &&
      p.payment_month === activeMonth &&
      countsAsConfirmedRent(p),
  );
  const myAwaitingCodeEntry = payments.find(
    (p) =>
      p.tenant_id === user?.id &&
      p.payment_month === activeMonth &&
      String(p.status || "").toLowerCase() === "awaiting_sms" &&
      !(p.notes || "").toUpperCase().includes("WIFI"),
  );
  const myAwaitingLandlord = payments.find(
    (p) =>
      p.tenant_id === user?.id &&
      p.payment_month === activeMonth &&
      String(p.status || "").toLowerCase() === "awaiting_ll" &&
      !(p.notes || "").toUpperCase().includes("WIFI"),
  );
  const pendingCodePayment =
    awaitingCodePayment?.month === activeMonth
      ? awaitingCodePayment
      : myAwaitingCodeEntry
        ? {
            id: myAwaitingCodeEntry.id,
            amount: Number(myAwaitingCodeEntry.amount),
            month: myAwaitingCodeEntry.payment_month,
          }
        : null;
  const myWifiEnabled = !!myRentSetting?.wifi_enabled;
  const myWifiAmount = Number(myRentSetting?.wifi_amount || 0);
  const myWifiPaidThisMonth = payments.some(
    (p) =>
      p.tenant_id === user?.id &&
      p.payment_month === activeMonth &&
      (p.notes || "").toUpperCase().includes("WIFI"),
  );

  const filteredPayments = currentMonthPayments.filter((p) => {
    if (!searchQuery) return true;
    const name = (p.profiles?.full_name || p.tenant_name || "").toLowerCase();
    const code = (p.mpesa_code || "").toLowerCase();
    const notes = (p.notes || "").toLowerCase();
    const q = searchQuery.toLowerCase();
    return (
      name.includes(q) ||
      code.includes(q) ||
      notes.includes(q)
    );
  });

  // Landlord's Payment Records / Rent Ledger no longer shows Wi-Fi transactions
  const rentLedgerPayments = filteredPayments.filter(
    (p) => getPaymentTypeFromNotes(p.notes) !== "Wi-Fi",
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="p-5 sm:p-8 space-y-6 max-w-4xl mx-auto w-full">
        {/* ── Header ──────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              {role === "landlord" ? "Tenant Accounts" : "My Bills & Payments"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {role === "landlord" ? (
                `${paidCount}/${totalTenants} tenants paid this month`
              ) : isSelectedMonthBeforeMyJoin ? (
                <span className="text-muted-foreground font-medium">
                  — Was not in occupancy during this period
                </span>
              ) : myCurrentMonthPaid ? (
                <span className="text-emerald-600 font-medium">
                  ✓ Paid this month
                </span>
              ) : (
                <span className="text-amber-600 font-medium">
                  ⏳ Payment due this month
                </span>
              )}
            </p>
          </div>
          {role === "landlord" && (
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={exportToCSV}
                variant="outline"
                className="border-border rounded-xl h-9 sm:h-10 gap-1.5 sm:gap-2 text-xs sm:text-sm hover:bg-accent dark:hover:text-accent text-accent"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
              <Button
                onClick={smartSyncPayHero}
                variant="outline"
                className="border-border rounded-xl h-9 sm:h-10 gap-1.5 sm:gap-2 text-xs sm:text-sm hover:bg-accent dark:hover:text-accent text-accent"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Smart Sync</span>
              </Button>
              <Button
                onClick={() => setShowSettingsForm(!showSettingsForm)}
                variant="outline"
                className="border-border rounded-xl h-9 sm:h-10 gap-1.5 sm:gap-2 text-xs sm:text-sm hover:bg-accent dark:hover:text-accent text-accent"
              >
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Set Rent</span>
              </Button>
              <Button
                onClick={() => setShowLogForm(!showLogForm)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-md shadow-accent/20 h-9 sm:h-10 gap-1.5 sm:gap-2 text-xs sm:text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Log Payment</span>
              </Button>
            </div>
          )}
        </div>

        {/* ── Feedback ────────────────────────────────── */}
        {error && (
          <div className="p-4 bg-destructive/8 border border-destructive/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl dark:bg-emerald-950/20 dark:border-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              {success}
            </p>
          </div>
        )}

        {/* ── LANDLORD: Pending Pochi codes ─────────────── */}
        {role === "landlord" && (
          <LandlordPochiReview
            payments={payments.filter(
              (p) => String(p.status || "").toLowerCase() === "awaiting_ll",
            )}
            tenants={tenants}
            onDone={(msg) => {
              showFeedback(msg);
              fetchData({ silent: true });
            }}
            onError={(msg) => showFeedback(msg, true)}
          />
        )}

        {/* ── LANDLORD: Property Filter Scope Selector ───────────── */}
        {role === "landlord" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border rounded-2xl p-3.5 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">Property Scope:</span>
                  {selectedPropertyFilter === "all" ? (
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      All Properties ({properties.length || 1})
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-accent">
                      {properties.find((p) => p.id === selectedPropertyFilter)?.property_name}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {selectedPropertyFilter === "all"
                    ? `Showing aggregated rent ledger across all properties (${filteredTenantsByProperty.length} tenants)`
                    : `${properties.find((p) => p.id === selectedPropertyFilter)?.property_address || "Kenya"} • ${filteredTenantsByProperty.length} assigned tenants`}
                </p>
              </div>
            </div>

            {properties.length > 0 && (
              <div className="relative min-w-[200px] sm:w-64">
                <select
                  value={selectedPropertyFilter}
                  onChange={(e) => setSelectedPropertyFilter(e.target.value)}
                  className="w-full h-9 rounded-xl border border-border bg-secondary/60 px-3 pr-8 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-accent appearance-none cursor-pointer"
                >
                  <option value="all"> All Properties ({properties.length})</option>
                  {properties.map((prop) => {
                    const propSlots = tenantSlots.filter((s) => s.landlord_block_id === prop.landlord_block_id);
                    const occupied = propSlots.filter((s) => s.is_occupied || s.tenant_id).length;
                    return (
                      <option key={prop.id} value={prop.id}>
                        {prop.property_name} ({occupied || prop.capacity || 0} units)
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        )}

        {/* ── LANDLORD: Stats cards ────────────────────── */}
        {role === "landlord" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Collected",
                value: formatMoney(totalCollected),
                icon: <TrendingUp className="w-4 h-4" />,
                color: "text-emerald-600",
                bg: "bg-emerald-50 dark:bg-emerald-950/20",
              },
              {
                label: "Paid",
                value: `${paidCount} tenants`,
                icon: <CheckCircle2 className="w-4 h-4" />,
                color: "text-emerald-600",
                bg: "bg-emerald-50 dark:bg-emerald-950/20",
              },
              {
                label: "Pending",
                value: `${unpaidCount} tenants`,
                icon: <Clock className="w-4 h-4" />,
                color: "text-amber-600 dark:text-amber-",
                bg: "bg-amber-50 dark:bg-amber-950/20",
              },
              {
                label: "Transactions",
                value: currentMonthPayments.length,
                icon: <Receipt className="w-4 h-4" />,
                color: "text-accent",
                bg: "bg-accent/5",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`${stat.bg} border border-border rounded-2xl p-4`}
              >
                <div className={`${stat.color} mb-2`}>{stat.icon}</div>
                <p className="text-lg font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── TENANT: My Bills / Pay / History tabs ───── */}
        {role === "tenant" && (
          <div className="flex gap-1 rounded-xl border border-border bg-secondary/40 p-1">
            {(
              [
                ["bills", "My Bills"],
                ["pay", "Make Payment"],
                ["history", "History"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPaymentTab(id)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                  paymentTab === id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {role === "tenant" && paymentTab === "bills" && (
          <MyBillsPanel
            user={user}
            onPayTotal={(total) => {
              setSeparatePayFocus(null);
              setBillsPayAmount(total);
              setPaymentTab("pay");
            }}
            onPaySeparate={(item) => {
              setSeparatePayFocus({
                types: [item.charge_type],
                amount: item.amount,
                label: item.label,
              });
              setBillsPayAmount(item.amount);
              setPaymentTab("pay");
            }}
          />
        )}

        {/* ── TENANT: Payment status card ─────────────── */}
        {role === "tenant" && paymentTab === "pay" && (
          <div
            className={`rounded-2xl border p-5 ${
              isSelectedMonthBeforeMyJoin
                ? "bg-secondary/40 border-border"
                : myCurrentMonthPaid
                ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
                : "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isSelectedMonthBeforeMyJoin
                    ? "bg-secondary"
                    : myCurrentMonthPaid
                    ? "bg-emerald-100 dark:bg-emerald-900/40"
                    : "bg-amber-100 dark:bg-amber-900/40"
                }`}
              >
                {isSelectedMonthBeforeMyJoin ? (
                  <Clock className="w-5 h-5 text-muted-foreground" />
                ) : myCurrentMonthPaid ? (
                  <BadgeCheck className="w-5 h-5 text-emerald-600" />
                ) : pendingCodePayment ? (
                  <MessageSquareText className="w-5 h-5 text-amber-900" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-900" />
                )}
              </div>
              <div>
                <p
                  className={`font-bold text-base ${
                    isSelectedMonthBeforeMyJoin
                      ? "text-muted-foreground"
                      : myCurrentMonthPaid
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-amber-900 dark:text-amber-900"
                  }`}
                >
                  {isSelectedMonthBeforeMyJoin
                    ? "Not In Occupancy (Pre-Tenancy)"
                    : myCurrentMonthPaid
                    ? "Rent Paid ✅"
                    : pendingCodePayment
                    ? "Enter your M-Pesa code"
                    : myAwaitingLandlord
                    ? "Awaiting landlord confirmation"
                    : "Rent Due ⏳"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {
                    MONTHS.find((m) => m.split("|")[1] === activeMonth)?.split(
                      "|",
                    )[0]
                  }
                </p>
              </div>
              {myRentSetting && !isSelectedMonthBeforeMyJoin && (
                <div className="ml-auto text-right">
                  <p className="font-bold text-foreground">
                    {formatMoney(myRentSetting.monthly_amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">monthly rent</p>
                </div>
              )}
            </div>

            {isSelectedMonthBeforeMyJoin ? (
              <div className="bg-background/60 rounded-xl p-3 text-xs text-muted-foreground">
                You were not in occupancy during this month. Your ledger history is only calculated starting from when your lease/account was active ({myJoinMonth || "current period"}). No payment is due for this month.
              </div>
            ) : myCurrentPayment ? (
              <div className="bg-white/60 dark:bg-black/20 rounded-xl p-3 space-y-1">
                {myCurrentPayment.mpesa_code && (
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-xs text-foreground">
                      M-Pesa Code:{" "}
                      <span className="font-bold font-mono">
                        {myCurrentPayment.mpesa_code}
                      </span>
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-foreground">
                    Amount:{" "}
                    <span className="font-bold">
                      {formatMoney(Number(myCurrentPayment.amount))}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(myCurrentPayment.payment_date)}
                  </span>
                </div>
              </div>
            ) : null}

            {!isSelectedMonthBeforeMyJoin &&
              !myCurrentMonthPaid &&
              pendingCodePayment && (
                <div className="mt-3">
                  <MpesaCodeSubmitCard
                    paymentId={pendingCodePayment.id}
                    amount={pendingCodePayment.amount}
                    month={pendingCodePayment.month}
                    onDone={() => {
                      setAwaitingCodePayment(null);
                      showFeedback(
                        "Code submitted — your landlord will confirm it on Pochi",
                      );
                      fetchData({ silent: true });
                    }}
                  />
                </div>
              )}

            {!isSelectedMonthBeforeMyJoin &&
              !myCurrentMonthPaid &&
              myAwaitingLandlord && (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-1">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    Code submitted — waiting for landlord
                  </p>
                  <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                    M-Pesa code{" "}
                    <span className="font-mono font-bold">
                      {myAwaitingLandlord.mpesa_code}
                    </span>{" "}
                    · KES{" "}
                    {Number(myAwaitingLandlord.amount).toLocaleString("en-KE")}.
                    Your landlord will confirm this against their Pochi la Biashara
                    (PayHero cannot see Pochi payments).
                  </p>
                </div>
              )}

            {!isSelectedMonthBeforeMyJoin &&
              !myCurrentMonthPaid &&
              !pendingCodePayment &&
              !myAwaitingLandlord &&
              myRentSetting && (
              <>
                <div className="mt-3 p-3 bg-white/60 dark:bg-black/20 rounded-xl">
                  <p className="text-xs font-semibold text-foreground mb-2">
                    Enhanced Payment Options:
                  </p>
                  <div className="space-y-1">
                    {[
                      "Rent + Water Bills + Repair Services",
                      "Choose payment type in the modal",
                      "M-Pesa STK Push or Pochi la Biashara",
                      "Enter your M-Pesa code after Pochi payment",
                    ].map((s) => (
                      <p key={s} className="text-xs text-muted-foreground">
                        {s}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="mt-3">
                  <PayButton
                    user={user}
                    amount={
                      separatePayFocus?.amount ||
                      billsPayAmount ||
                      myRentSetting.monthly_amount
                    }
                    month={activeMonth}
                    focusChargeTypes={separatePayFocus?.types}
                    buttonLabel={
                      separatePayFocus
                        ? `Pay ${separatePayFocus.label}`
                        : undefined
                    }
                    onSuccess={() => {
                      showFeedback(
                        separatePayFocus
                          ? `${separatePayFocus.label} payment initiated`
                          : "Enhanced payment initiated! Check your phone 📱",
                      );
                      fetchData({ silent: true });
                      setBillsPayAmount(null);
                      setSeparatePayFocus(null);
                    }}
                    onError={(msg: string) => showFeedback(msg, true)}
                    onManualAwaitingCode={(payment) => {
                      setAwaitingCodePayment(payment);
                      setPaymentTab("pay");
                      showFeedback(
                        "Pay via Pochi, then enter your M-Pesa code below",
                      );
                      fetchData({ silent: true });
                    }}
                  />
                  {separatePayFocus && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline mt-2 w-full"
                      onClick={() => setSeparatePayFocus(null)}
                    >
                      Back to rent payment
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Separate utility pay when rent already paid */}
            {!isSelectedMonthBeforeMyJoin &&
              myCurrentMonthPaid &&
              separatePayFocus &&
              myRentSetting && (
                <div className="mt-3">
                  <p className="text-sm font-medium mb-2">
                    Paying {separatePayFocus.label} separately
                  </p>
                  <PayButton
                    user={user}
                    amount={separatePayFocus.amount}
                    month={activeMonth}
                    focusChargeTypes={separatePayFocus.types}
                    buttonLabel={`Pay ${separatePayFocus.label}`}
                    onSuccess={() => {
                      showFeedback(
                        `${separatePayFocus.label} payment initiated`,
                      );
                      fetchData({ silent: true });
                      setSeparatePayFocus(null);
                      setBillsPayAmount(null);
                    }}
                    onError={(msg: string) => showFeedback(msg, true)}
                    onManualAwaitingCode={(payment) => {
                      setAwaitingCodePayment(payment);
                      showFeedback(
                        "Pay via Pochi, then enter your M-Pesa code below",
                      );
                      fetchData({ silent: true });
                    }}
                  />
                </div>
              )}
          </div>
        )}

        {/* ── TENANT: Wi-Fi callout — shown only after rent is paid, only if landlord enabled Wi-Fi for this tenant, only if not yet paid this month ── */}
        {role === "tenant" &&
          paymentTab === "pay" &&
          myCurrentMonthPaid &&
          myWifiEnabled &&
          !myWifiPaidThisMonth && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-800 p-5 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center shrink-0">
                  <Wifi className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <p className="font-bold text-sky-700 dark:text-sky-400">
                    Wi-Fi Subscription Unpaid
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatMoney(myWifiAmount)} due this month
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setShowWifiPayModal(true)}
                className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl h-10 shrink-0"
              >
                Pay for Wi-Fi
              </Button>
            </div>
          )}

        {/* Modal for phone number (STK Push) — rent */}
        {showPayModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h3 className="font-bold mb-4">Enter M-Pesa Number</h3>
              <input
                type="tel"
                placeholder="e.g. 0712345678"
                value={payPhone}
                onChange={(e) => setPayPhone(e.target.value)}
                className="w-full rounded-xl border border-border p-3 mb-4 bg-secondary"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-destructive"
                >
                  Cancel
                </Button>
                <Button
                  onClick={initiateSTKPush}
                  disabled={isPaying}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {isPaying ? "Sending..." : "Pay"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal for Wi-Fi STK Push */}
        <WifiPayModal
          open={showWifiPayModal}
          onClose={() => setShowWifiPayModal(false)}
          amount={myWifiAmount}
          tenantId={user?.id || ""}
          month={activeMonth}
          channelId={landlordWifiChannel?.payhero_channel_id || null}
          onSuccess={() => {
            showFeedback("Wi-Fi payment request sent — check your phone.");
            fetchData({ silent: true });
          }}
          onError={(msg) => showFeedback(msg, true)}
        />

        {/* ── Month selector ───────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          {MONTHS.slice(0, 6).map((m, index) => {
            const [label, value] = m.split("|");
            return (
              <button
                key={`${value}-${index}`}
                onClick={() => setActiveMonth(value)}
                className={`text-xs px-3.5 py-2 rounded-xl border whitespace-nowrap transition-all shrink-0 font-medium ${
                  activeMonth === value
                    ? "bg-accent dark:text-accent-foreground text-white border-accent shadow-sm shadow-accent/20"
                    : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ── LANDLORD: Set Rent Settings Form ────────── */}
        {role === "landlord" && showSettingsForm && (
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">
                Tenant charge plan
              </h3>
              <button
                onClick={() => setShowSettingsForm(false)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveRentSettings} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Tenant
                </label>
                <select
                  value={settingsTenantId}
                  onChange={(e) => {
                    setSettingsTenantId(e.target.value);
                    const existing = rentSettings.find(
                      (r) => r.tenant_id === e.target.value,
                    );
                    loadSettingsFromExisting(existing);
                  }}
                  required
                  className="w-full rounded-xl border border-border bg-secondary text-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">Select tenant...</option>
                  {filteredTenantsByProperty.map((t) => {
                    const prop = tenantPropertyMap[t.id];
                    return (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.email}) {prop ? `—  ${prop.propertyName} (${prop.unitNumber || "Unit"})` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Monthly Rent (KES)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 18000"
                    value={settingsAmount}
                    onChange={(e) => setSettingsAmount(e.target.value)}
                    required
                    className="bg-secondary border-border text-foreground rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Unit / House No.
                  </label>
                  <Input
                    placeholder="e.g. A3, B12"
                    value={settingsUnit}
                    onChange={(e) => setSettingsUnit(e.target.value)}
                    className="bg-secondary border-border text-foreground rounded-xl h-11"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border p-3.5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Utilities &amp; fees
                </p>

                {/* Water */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-sky-600" />
                    <p className="text-sm font-medium">Water</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettingsWaterEnabled(!settingsWaterEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${settingsWaterEnabled ? "bg-accent" : "bg-border"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settingsWaterEnabled ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>
                {settingsWaterEnabled && (
                  <div className="space-y-2 w-full min-w-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={settingsWaterMode}
                        onChange={(e) =>
                          setSettingsWaterMode(
                            e.target.value as "variable" | "fixed",
                          )
                        }
                        className="w-full rounded-xl border border-border bg-secondary text-sm p-2.5 h-11"
                      >
                        <option value="variable">Variable (meter)</option>
                        <option value="fixed">Fixed amount</option>
                      </select>
                      {settingsWaterMode === "fixed" && (
                        <Input
                          type="number"
                          min={0}
                          placeholder="Water fee (KES)"
                          value={settingsWaterFixed}
                          onChange={(e) => setSettingsWaterFixed(e.target.value)}
                          className="w-full bg-secondary border-border rounded-xl h-11"
                        />
                      )}
                    </div>
                    <select
                      value={settingsWaterSeparate ? "separate" : "bundled"}
                      onChange={(e) =>
                        setSettingsWaterSeparate(e.target.value === "separate")
                      }
                      className="w-full rounded-xl border border-border bg-secondary text-sm p-2.5 h-11"
                    >
                      <option value="bundled">Pay with rent (one total)</option>
                      <option value="separate">Pay separately</option>
                    </select>
                  </div>
                )}

                {/* Garbage */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Garbage plan</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSettingsGarbageEnabled(!settingsGarbageEnabled)
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${settingsGarbageEnabled ? "bg-accent" : "bg-border"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settingsGarbageEnabled ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>
                {settingsGarbageEnabled && (
                  <div className="space-y-2 w-full min-w-0">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Garbage fee (KES)"
                      value={settingsGarbageAmount}
                      onChange={(e) => setSettingsGarbageAmount(e.target.value)}
                      className="w-full bg-secondary border-border rounded-xl h-11"
                    />
                    <select
                      value={settingsGarbageSeparate ? "separate" : "bundled"}
                      onChange={(e) =>
                        setSettingsGarbageSeparate(e.target.value === "separate")
                      }
                      className="w-full rounded-xl border border-border bg-secondary text-sm p-2.5 h-11"
                    >
                      <option value="bundled">Pay with rent (one total)</option>
                      <option value="separate">Pay separately</option>
                    </select>
                  </div>
                )}

                {/* Electricity */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <p className="text-sm font-medium">Electricity</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettingsElecEnabled(!settingsElecEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${settingsElecEnabled ? "bg-accent" : "bg-border"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settingsElecEnabled ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>
                {settingsElecEnabled && (
                  <div className="space-y-2 w-full min-w-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={settingsElecMode}
                        onChange={(e) =>
                          setSettingsElecMode(
                            e.target.value as "variable" | "fixed",
                          )
                        }
                        className="w-full rounded-xl border border-border bg-secondary text-sm p-2.5 h-11"
                      >
                        <option value="fixed">Fixed amount</option>
                        <option value="variable">Variable (meter)</option>
                      </select>
                      <Input
                        type="number"
                        min={0}
                        placeholder="Electricity (KES)"
                        value={settingsElecAmount}
                        onChange={(e) => setSettingsElecAmount(e.target.value)}
                        className="w-full bg-secondary border-border rounded-xl h-11"
                        disabled={settingsElecMode === "variable"}
                      />
                    </div>
                    <select
                      value={settingsElecSeparate ? "separate" : "bundled"}
                      onChange={(e) =>
                        setSettingsElecSeparate(e.target.value === "separate")
                      }
                      className="w-full rounded-xl border border-border bg-secondary text-sm p-2.5 h-11"
                    >
                      <option value="bundled">Pay with rent (one total)</option>
                      <option value="separate">Pay separately</option>
                    </select>
                  </div>
                )}

                {/* Wi-Fi — separate after rent */}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-border">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Wifi className="w-4 h-4 text-sky-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        Wi-Fi (after rent)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Paid separately once rent is confirmed
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettingsWifiEnabled(!settingsWifiEnabled)}
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${settingsWifiEnabled ? "bg-sky-500" : "bg-border"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settingsWifiEnabled ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>
                {settingsWifiEnabled && (
                  <div className="w-full min-w-0">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Wi-Fi monthly (KES)"
                      value={settingsWifiAmount}
                      onChange={(e) => setSettingsWifiAmount(e.target.value)}
                      required={settingsWifiEnabled}
                      className="w-full bg-secondary border-border rounded-xl h-11"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border p-3.5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  First-time deposit
                </p>
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    Security deposit (new tenants)
                  </label>
                  <select
                    value={settingsDepositMonths}
                    onChange={(e) =>
                      setSettingsDepositMonths(Number(e.target.value))
                    }
                    className="w-full rounded-xl border border-border bg-secondary text-sm p-2.5 h-11"
                  >
                    <option value={0}>None</option>
                    <option value={2}>2 months of rent</option>
                    <option value={3}>3 months of rent</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                    For a first bill only: deposit is due instead of normal rent.
                    From the next month they pay the usual monthly rent. Overpayments
                    cover following months automatically.
                    {settingsAmount && settingsDepositMonths > 0
                      ? ` Preview: KES ${(Number(settingsAmount) * settingsDepositMonths).toLocaleString("en-KE")}.`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border p-3.5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Payment rules
                </p>
                <div>
                  <label className="text-sm font-medium block mb-1.5">
                    Advance months allowed
                  </label>
                  <select
                    value={settingsAdvanceMonths}
                    onChange={(e) =>
                      setSettingsAdvanceMonths(Number(e.target.value))
                    }
                    className="w-full rounded-xl border border-border bg-secondary text-sm p-2.5"
                  >
                    <option value={0}>None — current month only</option>
                    <option value={1}>1 month ahead</option>
                    <option value={2}>2 months ahead</option>
                    <option value={3}>3 months ahead</option>
                  </select>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      Tenant may enter variable amounts
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Off = fixed-only plan, no self-log inputs
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSettingsAllowTenantVar(!settingsAllowTenantVar)
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${settingsAllowTenantVar ? "bg-accent" : "bg-border"}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${settingsAllowTenantVar ? "translate-x-5" : "translate-x-0"}`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSettingsForm(false)}
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-destructive rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingSettings}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-sm shadow-accent/20"
                >
                  {isSavingSettings ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── LANDLORD: Log Payment Form ───────────────── */}
        {role === "landlord" && showLogForm && (
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-sm max-h-[90vh] overflow-y-auto mx-4 sm:mx-0 max-w-lg sm:max-w-none w-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-accent" />
                </div>
                <h3 className="font-semibold text-foreground">
                  Log Payment Manually
                </h3>
              </div>
              <button
                onClick={() => setShowLogForm(false)}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogPayment} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Tenant
                </label>
                <select
                  value={logTenantId}
                  onChange={(e) => {
                    setLogTenantId(e.target.value);
                    const rs = rentSettings.find(
                      (r) => r.tenant_id === e.target.value,
                    );
                    if (rs) setLogAmount(String(rs.monthly_amount));
                  }}
                  required
                  className="w-full rounded-xl border border-border bg-secondary text-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
                >
                  <option value="">Select tenant...</option>
                  {filteredTenantsByProperty.map((t) => {
                    const prop = tenantPropertyMap[t.id];
                    return (
                      <option key={t.id} value={t.id}>
                        {t.full_name} ({t.email}) {prop ? `—  ${prop.propertyName} (${prop.unitNumber || "Unit"})` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Amount (KES)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 18000"
                    value={logAmount}
                    onChange={(e) => setLogAmount(e.target.value)}
                    required
                    className="bg-secondary border-border text-foreground rounded-xl h-11"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Payment Month
                  </label>
                  <select
                    value={logMonth}
                    onChange={(e) => setLogMonth(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary text-foreground p-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 h-11"
                  >
                    {MONTHS.map((m) => {
                      const [label, value] = m.split("|");
                      return (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { value: "mpesa", label: "M-Pesa", icon: "📱" },
                    { value: "bank", label: "Bank Transfer", icon: "🏦" },
                    { value: "other", label: "Other", icon: "💵" },
                  ].map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setLogMethod(m.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all ${
                        logMethod === m.value
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <span className="text-lg">{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {logMethod === "mpesa" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      M-Pesa Code
                    </label>
                    <Input
                      placeholder="e.g. RGR000X1234"
                      value={logMpesaCode}
                      onChange={(e) =>
                        setLogMpesaCode(e.target.value.toUpperCase())
                      }
                      className="bg-secondary border-border text-foreground rounded-xl h-11 font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-1.5">
                      Phone Number
                    </label>
                    <Input
                      placeholder="e.g. 0712345678"
                      value={logPhone}
                      onChange={(e) => setLogPhone(e.target.value)}
                      className="bg-secondary border-border text-foreground rounded-xl h-11"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">
                  Notes{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </label>
                <Input
                  placeholder="e.g. Includes water bill, partial payment..."
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  className="bg-secondary border-border text-foreground rounded-xl h-11"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLogForm(false)}
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-destructive rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLogging}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl shadow-sm shadow-accent/20"
                >
                  {isLogging ? "Logging..." : "Log Payment"}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── LANDLORD: Tenant payment status grid ────── */}
        {role === "landlord" && filteredTenantsByProperty.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">
                Tenant Status —{" "}
                {
                  MONTHS.find((m) => m.split("|")[1] === activeMonth)?.split(
                    "|",
                  )[0]
                }
              </h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {
                    filteredTenantsByProperty.filter(
                      (t) =>
                        getTenantPaymentStatus(t.id, activeMonth).isComplete,
                    ).length
                  }{" "}
                  paid
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  {
                    filteredTenantsByProperty.filter(
                      (t) =>
                        getTenantPaymentStatus(t.id, activeMonth).isPartial,
                    ).length
                  }{" "}
                  partial
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  {
                    filteredTenantsByProperty.filter((t) => {
                      const s = getTenantPaymentStatus(t.id, activeMonth);
                      return !s.isBeforeTenantJoined && !s.isComplete && !s.isPartial && !s.hasNoSetting;
                    }).length
                  }{" "}
                  unpaid
                </span>
              </div>
            </div>
            <div className="divide-y divide-border">
              {filteredTenantsByProperty.map((tenant) => {
                const status = getTenantPaymentStatus(tenant.id, activeMonth);
                const rs = rentSettings.find((r) => r.tenant_id === tenant.id);
                const now = new Date();
                const day = parseInt(
                  now.toLocaleDateString("en-GB", {
                    day: "numeric",
                    timeZone: TZ,
                  }),
                );
                const isOverdue =
                  !status.isComplete && day > (rs?.due_day || 5);

                let badge = {
                  label: "PENDING",
                  style: "bg-amber-100 text-amber-700 border-amber-200",
                  dot: "bg-amber-400",
                };
                if (status.isBeforeTenantJoined)
                  badge = {
                    label: "NOT IN OCCUPANCY",
                    style: "bg-secondary text-muted-foreground border-border",
                    dot: "bg-muted-foreground",
                  };
                else if (status.isComplete)
                  badge = {
                    label: "PAID",
                    style: "bg-emerald-100 text-emerald-700 border-emerald-200",
                    dot: "bg-emerald-500",
                  };
                else if (status.isPartial)
                  badge = {
                    label: "PARTIAL",
                    style: "bg-blue-100 text-blue-700 border-blue-200",
                    dot: "bg-blue-400",
                  };
                else if (isOverdue)
                  badge = {
                    label: "OVERDUE",
                    style: "bg-red-100 text-red-700 border-red-200",
                    dot: "bg-red-400",
                  };
                else if (status.hasNoSetting)
                  badge = {
                    label: "NOT SET",
                    style: "bg-secondary text-muted-foreground border-border",
                    dot: "bg-muted-foreground",
                  };

                return (
                  <div
                    key={tenant.id}
                    className="p-4 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center overflow-hidden border border-accent/20">
                          {tenant.avatar_url ? (
                            <img
                              src={tenant.avatar_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-accent">
                              {tenant.full_name?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${badge.dot}`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {tenant.full_name}
                          </p>
                          {tenantPropertyMap[tenant.id]?.propertyName && (
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-secondary border border-border text-foreground/80">
                               {tenantPropertyMap[tenant.id].propertyName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {tenantPropertyMap[tenant.id]?.unitNumber || (rs ? `Unit ${rs.unit_number || "—"}` : "Unit —")}
                          {rs ? ` · ${formatMoney(rs.monthly_amount)}/mo` : " · Rent not set"}
                          {rs?.wifi_enabled && (
                            <span className="inline-flex items-center gap-0.5 ml-1.5 text-sky-600">
                              <Wifi className="w-3 h-3" /> Wi-Fi
                            </span>
                          )}
                        </p>
                        {status.payments[0]?.mpesa_code && (
                          <p className="text-[10px] font-mono text-accent mt-0.5">
                            {status.payments[0].mpesa_code}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.style}`}
                        >
                          {badge.label}
                        </span>
                        {status.totalPaid > 0 && (
                          <span className="text-xs font-bold text-foreground">
                            {formatMoney(status.totalPaid)}
                          </span>
                        )}
                        {status.isPartial && (
                          <span className="text-[10px] text-red-500 font-medium">
                            -{formatMoney(status.pending)} pending
                          </span>
                        )}
                        {!status.isBeforeTenantJoined &&
                          !status.isComplete &&
                          !status.hasNoSetting &&
                          status.expected > 0 &&
                          status.totalPaid === 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {formatMoney(status.expected)} due
                            </span>
                          )}
                        {status.isBeforeTenantJoined && (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            Was not in occupancy
                          </span>
                        )}
                      </div>
                    </div>

                    {status.isPartial && status.expected > 0 && (
                      <div className="mt-3 ml-13">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground">
                            Payment progress
                          </span>
                          <span className="text-[10px] font-medium text-foreground">
                            {Math.round(
                              (status.totalPaid / status.expected) * 100,
                            )}
                            %
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (status.totalPaid / status.expected) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Enhanced Payment Table (Wi-Fi excluded) ─────────────── */}
        {role === "landlord" && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-foreground">
                    Payment Records
                  </h3>
                  <Button
                    onClick={exportToCSV}
                    variant="outline"
                    size="sm"
                    className="border-border rounded-xl h-8 gap-2 text-xs text-accent dark:hover:text-accent"
                    disabled={rentLedgerPayments.length === 0}
                  >
                    <Download className="w-3 h-3" />
                    Export CSV
                  </Button>
                </div>
                <div className="relative max-w-xs">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    placeholder="Search by name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-secondary border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent/40"
                  />
                </div>
              </div>

              {/* Summary Stats (Wi-Fi card removed) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-2">
                  <p className="text-xs text-emerald-600 font-medium whitespace-nowrap">
                    Rent
                  </p>
                  <p className="text-sm font-bold text-emerald-700">
                    {formatMoney(
                      rentLedgerPayments
                        .filter((p) => {
                          const t = getPaymentTypeFromNotes(p.notes);
                          return !t.includes("Water") && !t.includes("Repair");
                        })
                        .reduce((sum, p) => sum + p.amount, 0),
                    )}
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-2">
                  <p className="text-xs text-blue-600 font-medium whitespace-nowrap">
                    Water
                  </p>
                  <p className="text-sm font-bold text-blue-700">
                    {formatMoney(
                      rentLedgerPayments
                        .filter((p) =>
                          getPaymentTypeFromNotes(p.notes).includes("Water"),
                        )
                        .reduce((sum, p) => sum + p.amount, 0),
                    )}
                  </p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-2">
                  <p className="text-xs text-amber-600 font-medium whitespace-nowrap">
                    Repairs
                  </p>
                  <p className="text-sm font-bold text-amber-700">
                    {formatMoney(
                      rentLedgerPayments
                        .filter(
                          (p) =>
                            getPaymentTypeFromNotes(p.notes).includes(
                              "Repair",
                            ) ||
                            getPaymentTypeFromNotes(p.notes).includes(
                              "Plumbing",
                            ) ||
                            getPaymentTypeFromNotes(p.notes).includes(
                              "Electrical",
                            ) ||
                            getPaymentTypeFromNotes(p.notes).includes(
                              "Painting",
                            ) ||
                            getPaymentTypeFromNotes(p.notes).includes(
                              "Carpentry",
                            ) ||
                            getPaymentTypeFromNotes(p.notes).includes(
                              "Security",
                            ) ||
                            getPaymentTypeFromNotes(p.notes).includes(
                              "Delivery",
                            ),
                        )
                        .reduce((sum, p) => sum + p.amount, 0),
                    )}
                  </p>
                </div>
                <div className="bg-accent/5 rounded-xl p-2">
                  <p className="text-xs text-accent font-medium whitespace-nowrap">
                    Total
                  </p>
                  <p className="text-sm font-bold text-accent">
                    {formatMoney(
                      rentLedgerPayments.reduce(
                        (sum, p) => sum + p.amount,
                        0,
                      ),
                    )}
                  </p>
                </div>
              </div>
            </div>

            {rentLedgerPayments.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                  <Receipt className="w-7 h-7 text-muted-foreground/30" />
                </div>
                <p className="font-semibold text-foreground">
                  No payments this month
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Log a payment above or wait for M-Pesa callback
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-secondary/50 border-b border-border sticky top-0">
                    <tr>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground whitespace-nowrap">
                        Tenant
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground whitespace-nowrap">
                        Type
                      </th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground whitespace-nowrap">
                        Amount
                      </th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground whitespace-nowrap">
                        M-Pesa Code
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground whitespace-nowrap">
                        Date
                      </th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground whitespace-nowrap">
                        Method
                      </th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground whitespace-nowrap">
                        Notes
                      </th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground whitespace-nowrap">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rentLedgerPayments.map((payment) => {
                      const tenant = tenants.find(
                        (t) => t.id === payment.tenant_id,
                      );
                      const paymentType = getPaymentTypeFromNotes(
                        payment.notes,
                      );
                      const typeIcon = paymentType.includes("Water") ? (
                        <Droplets className="w-3 h-3 text-blue-500" />
                      ) : paymentType.includes("Repair") ||
                        paymentType.includes("Plumbing") ||
                        paymentType.includes("Electrical") ||
                        paymentType.includes("Painting") ||
                        paymentType.includes("Carpentry") ||
                        paymentType.includes("Security") ||
                        paymentType.includes("Delivery") ? (
                        <Wrench className="w-3 h-3 text-amber-500" />
                      ) : (
                        <Building2 className="w-3 h-3 text-emerald-500" />
                      );

                      return (
                        <tr
                          key={payment.id}
                          className="hover:bg-secondary/20 transition-colors"
                        >
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                                {(tenant?.full_name || payment.tenant_name)
                                  ?.charAt(0)
                                  .toUpperCase() || "?"}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {tenant?.full_name ||
                                      payment.tenant_name ||
                                      "Unknown"}
                                  </p>
                                  {payment.tenant_id && tenantPropertyMap[payment.tenant_id]?.propertyName && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-secondary border border-border text-foreground/80">
                                      {tenantPropertyMap[payment.tenant_id].propertyName}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                  {tenant?.email || payment.tenant_email || ""}
                                  {payment.tenant_id && tenantPropertyMap[payment.tenant_id]?.unitNumber && (
                                    <span className="ml-1 font-medium text-foreground">
                                      • {tenantPropertyMap[payment.tenant_id].unitNumber}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {typeIcon}
                              <span className="text-xs font-medium text-foreground">
                                {paymentType}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <span className="text-sm font-bold text-foreground">
                              {formatMoney(payment.amount)}
                            </span>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            {payment.mpesa_code ? (
                              <span className="text-xs font-mono text-accent bg-accent/5 px-2 py-1 rounded">
                                {payment.mpesa_code}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                N/A
                              </span>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(payment.payment_date)}
                            </span>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <span className="text-xs px-2 py-1 rounded-full bg-green-50 dark:bg-green-950/20 text-green-600 border border-green-200 dark:border-green-800">
                              {payment.payment_method || "M-Pesa"}
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span
                              className="text-xs text-muted-foreground max-w-40 truncate block"
                              title={payment.notes || ""}
                            >
                              {payment.notes || "-"}
                            </span>
                          </td>
                          <td className="p-3 text-center whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePayment(payment.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-6 w-6 p-0"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TENANT: Payment History ───────────────────── */}
        {role === "tenant" && paymentTab === "history" && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden p-2 max-h-[calc(100vh-120px)]">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Payment History</h3>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
                  <Receipt className="w-7 h-7 text-muted-foreground/30" />
                </div>
                <p className="font-semibold text-foreground">
                  No payments this month
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Pay via M-Pesa Paybill 400200
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border m-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                {filteredPayments.map((payment) => {
                  const pType = getPaymentTypeFromNotes(payment.notes);
                  return (
                    <div
                      key={payment.id}
                      className="bg-card border border-border rounded-2xl p-4 hover:shadow-sm transition-shadow m-2"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg ${
                            pType === "Wi-Fi"
                              ? "bg-sky-50 dark:bg-sky-950/20"
                              : payment.payment_method === "mpesa"
                                ? "bg-green-50 dark:bg-green-950/20"
                                : "bg-blue-50 dark:bg-blue-950/20"
                          }`}
                        >
                          {pType === "Wi-Fi" ? (
                            <Wifi className="w-4.5 h-4.5 text-sky-600" />
                          ) : payment.payment_method === "mpesa" ? (
                            "📱"
                          ) : payment.payment_method === "bank" ? (
                            "🏦"
                          ) : (
                            "💵"
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-base font-bold text-foreground">
                              {formatMoney(Number(payment.amount))}
                            </p>
                            {pType === "Wi-Fi" && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200">
                                Wi-Fi
                              </span>
                            )}
                            {payment.mpesa_code && (
                              <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded-lg text-accent border border-accent/20">
                                {payment.mpesa_code}
                              </span>
                            )}
                            {payment.logged_by === "landlord" && (
                              <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full border border-border">
                                manual
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {payment.phone_number && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {payment.phone_number}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(payment.payment_date)}
                            </span>
                          </div>
                          {payment.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              {payment.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            CONFIRMED
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TENANT: Paybill info banner ──────────────── */}
        {role === "tenant" && (
          <div className="bg-card border border-accent/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground">Payment Details</h3>
            </div>
            <div className="space-y-1.5">
              {[
                "✅ Pay between 1st and 5th of every month",
                "✅ Water bill must be paid together with rent",
                "❌ Cash and cheque payments not accepted",
                "📋 Always save your M-Pesa receipt code",
                "⚠️ Late payments attract a 10% penalty",
              ].map((tip) => (
                <p key={tip} className="text-xs text-muted-foreground">
                  {tip}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}