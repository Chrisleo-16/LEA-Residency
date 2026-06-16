import { NextResponse } from 'next/server';

interface SentryEvent {
  id: string;
  title: string;
  level: string;
  count: string;
  lastSeen: string;
  firstSeen: string;
  culprit: string;
  isResolved: boolean;
  tags: Record<string, string>;
}

export async function GET() {
  const org = process.env.SENTRY_ORG_SLUG;
  const project = process.env.SENTRY_PROJECT_SLUG;
  const token = process.env.SENTRY_AUTH_TOKEN;

  if (!org || !project || !token) {
    return NextResponse.json(
      { error: 'Sentry configuration missing' },
      { status: 500 }
    );
  }

  try {
    const url = `https://sentry.io/api/0/projects/${org}/${project}/issues/?query=is:unresolved&statsPeriod=14d&limit=20`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error(`Sentry API error: ${res.status}`);
    const issues = await res.json();

    const events: SentryEvent[] = issues.map((issue: any) => ({
      id: issue.id,
      title: issue.title,
      level: issue.level ?? 'error',
      count: issue.count,
      lastSeen: issue.lastSeen,
      firstSeen: issue.firstSeen,
      culprit: issue.culprit,
      isResolved: issue.status === 'resolved',
      tags: issue.annotations ?? {},
    }));

    return NextResponse.json({ events });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch from Sentry' },
      { status: 500 }
    );
  }
}