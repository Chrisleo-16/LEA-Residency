// app/api/developer/logs/route.ts
// Aggregates logs from Vercel Log Drain + Supabase postgres_logs
// Requires: VERCEL_API_TOKEN, VERCEL_PROJECT_ID, VERCEL_TEAM_ID (optional)
// in your Vercel / .env.local

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────
export interface LogEntry {
  id: string;
  timestamp: string;       // ISO 8601
  timestampMs: number;     // epoch ms for sorting
  level: "error" | "warn" | "info" | "debug";
  message: string;
  source: "vercel" | "supabase" | "app";
  deployment?: string;
  meta?: Record<string, unknown>;
}

// ─── Helpers ──────────────────────────────────────────────────────
function toLevel(raw: string): LogEntry["level"] {
  const r = raw.toLowerCase();
  if (r.includes("fatal") || r.includes("error") || r.includes("err")) return "error";
  if (r.includes("warn") || r.includes("warning"))                        return "warn";
  if (r.includes("debug") || r.includes("verbose"))                       return "debug";
  return "info";
}

function shortId() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── 1. Vercel Runtime Logs ───────────────────────────────────────
// Uses Vercel REST API v6 — returns last N log lines for the project
async function fetchVercelLogs(limit = 100): Promise<LogEntry[]> {
  const token     = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId    = process.env.VERCEL_TEAM_ID; // optional

  if (!token || !projectId) return [];

  try {
    // Step 1: get latest deployment ID
    const teamQ   = teamId ? `&teamId=${teamId}` : "";
    const depResp = await fetch(
      `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=1&state=READY${teamQ}`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 0 } },
    );

    if (!depResp.ok) return [];
    const depData = await depResp.json();
    const deploymentId: string | undefined = depData.deployments?.[0]?.uid;
    if (!deploymentId) return [];

    // Step 2: fetch runtime logs for that deployment
    const logResp = await fetch(
      `https://api.vercel.com/v2/deployments/${deploymentId}/events?limit=${limit}${teamQ}`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 0 } },
    );

    if (!logResp.ok) return [];
    const events: any[] = await logResp.json();

    return events
      .filter((e) => e.type === "stdout" || e.type === "stderr" || e.type === "command")
      .map((e) => {
        const ts = e.created ?? Date.now();
        return {
          id:          shortId(),
          timestamp:   new Date(ts).toISOString(),
          timestampMs: ts,
          level:       e.type === "stderr" ? "error" : toLevel(e.text ?? ""),
          message:     (e.text ?? "").trim() || "(empty)",
          source:      "vercel" as const,
          deployment:  deploymentId,
          meta:        { type: e.type, deploymentId },
        };
      });
  } catch {
    return [];
  }
}

// ─── 2. Supabase postgres_logs ────────────────────────────────────
// Reads from Supabase's internal postgres_logs table (available in
// Supabase projects as a built-in view). Falls back gracefully if
// the project doesn't expose it.
async function fetchSupabaseLogs(limit = 100): Promise<LogEntry[]> {
  try {
    const supabase = await createClient();

    // postgres_logs is a Supabase built-in log view
    const { data, error } = await supabase
      .from("postgres_logs")
      .select("id, timestamp, error_severity, user_name, query, detail, context, message")
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row: any) => {
      const ts = new Date(row.timestamp).getTime();
      return {
        id:          String(row.id ?? shortId()),
        timestamp:   row.timestamp,
        timestampMs: ts,
        level:       toLevel(row.error_severity ?? "info"),
        message:     row.message ?? row.query ?? "(no message)",
        source:      "supabase" as const,
        meta: {
          severity: row.error_severity,
          user:     row.user_name,
          detail:   row.detail,
          context:  row.context,
          query:    row.query,
        },
      };
    });
  } catch {
    return [];
  }
}

// ─── 3. App-level logs from a custom `app_logs` table ─────────────
// Optional: create this table to store structured logs from your app.
// See the SQL migration file included in this package.
async function fetchAppLogs(limit = 100): Promise<LogEntry[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("app_logs")
      .select("id, created_at, level, message, source, meta")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((row: any) => {
      const ts = new Date(row.created_at).getTime();
      return {
        id:          String(row.id),
        timestamp:   row.created_at,
        timestampMs: ts,
        level:       toLevel(row.level ?? "info"),
        message:     row.message ?? "",
        source:      "app" as const,
        meta:        row.meta ?? {},
      };
    });
  } catch {
    return [];
  }
}

// ─── Route handler ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  // Auth guard — only developer role can access
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .maybeSingle();
    if (!profile || profile.role !== "developer") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Auth error" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "200"), 500);
  const source = searchParams.get("source") ?? "all"; // "all" | "vercel" | "supabase" | "app"

  // Fetch in parallel
  const [vercelLogs, supabaseLogs, appLogs] = await Promise.all([
    source === "all" || source === "vercel"   ? fetchVercelLogs(limit)   : [],
    source === "all" || source === "supabase" ? fetchSupabaseLogs(limit) : [],
    source === "all" || source === "app"      ? fetchAppLogs(limit)      : [],
  ]);

  // Merge + sort newest first
  const all = [...vercelLogs, ...supabaseLogs, ...appLogs].sort(
    (a, b) => b.timestampMs - a.timestampMs,
  );

  const sources = {
    vercel:   { configured: !!process.env.VERCEL_API_TOKEN && !!process.env.VERCEL_PROJECT_ID, count: vercelLogs.length },
    supabase: { configured: true, count: supabaseLogs.length },
    app:      { configured: true, count: appLogs.length },
  };

  return NextResponse.json(
    { logs: all.slice(0, limit), total: all.length, sources, fetchedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Log-Count":   String(all.length),
      },
    },
  );
}