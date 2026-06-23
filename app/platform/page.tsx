import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "What You Can Do | LEA Executive Residency",
  description:
    "Everything tenants, prospective residents, and property managers can do on the LEA Executive Residency platform — M-Pesa rent payments, maintenance requests, direct chat with management, and more.",
};

export default function WhatYouCanDoPage() {
  return (
    <main className="prose mx-auto px-4 py-12">
      <h1>Everything You Can Do With LEA Executive Residency</h1>
      <p>
        LEA Executive Residency is a digital tenant management platform built
        for a residential property in Nairobi, Kenya. If you&apos;re a tenant,
        a prospective resident, or a property manager exploring what the
        platform offers, here&apos;s the full picture.
      </p>

      <h2>If You&apos;re Already a Tenant</h2>
      <p>
        Once your property manager registers your account, your dashboard
        gives you six things to manage from one place:
      </p>
      <ul>
        <li>
          <strong>Direct chat with management</strong> — a private messaging
          channel to ask questions, report issues, or get updates, without
          phone tag or unanswered texts.
        </li>
        <li>
          <strong>M-Pesa rent payments</strong> — pay rent through M-Pesa
          Paybill or STK Push, with payments logged and confirmed
          automatically. Your landlord gets notified the moment M-Pesa
          confirms the transaction, and your full payment history and
          receipts are saved permanently.
        </li>
        <li>
          <strong>Maintenance requests</strong> — submit plumbing, electrical,
          structural, or cleaning requests with one tap, and track them
          through submitted → in progress → resolved.
        </li>
        <li>
          <strong>Formal complaints</strong> — log a complaint with a title,
          description, and timestamp, and follow its status as management
          reviews it. Everything stays on record.
        </li>
        <li>
          <strong>Policies &amp; documents</strong> — house rules, tenancy
          agreements, and move-in guidelines stored digitally, with
          agreements available to sign and download as a PDF.
        </li>
        <li>
          <strong>Community group chat</strong> — a shared channel where
          management posts announcements and residents stay current on
          building updates and events.
        </li>
      </ul>
      <p>
        You&apos;ll also get push notifications for new messages, payment
        confirmations, and status updates — even when the app isn&apos;t
        open. All tenant data is protected with row-level security, so your
        conversations and records are visible only to you and your property
        manager.
      </p>

      <h2>If You&apos;re Not a Tenant Yet</h2>
      <p>
        LEA Executive Residency isn&apos;t a property listing or booking
        site — it doesn&apos;t list units or take reservations. It&apos;s the
        operational tool used after you&apos;ve moved in. If you&apos;re
        interested in becoming a resident, reach out directly:
      </p>
      <ul>
        <li>
          <strong>Phone:</strong>{" "}
          <a href="tel:+254748333763">+254 748 333 763</a> or{" "}
          <a href="tel:+254799956574">+254 799 956574</a>
        </li>
        <li>
          <strong>Email:</strong>{" "}
          <a href="mailto:chrisbenevansleo@gmail.com">
            chrisbenevansleo@gmail.com
          </a>
        </li>
        <li>
          <strong>Location:</strong> Nairobi, Kenya
        </li>
      </ul>
      <p>
        Once you&apos;re a resident, management creates your account and
        you&apos;re set up in under two minutes.
      </p>

      <h2>If You&apos;re a Property Manager Evaluating the Platform</h2>
      <p>
        LEA Executive Residency replaces the usual mix of WhatsApp groups,
        phone calls, and missed texts with a single system of record. Every
        message, payment, and maintenance request carries a timestamp and a
        status, so nothing depends on memory or goodwill. Rent payments go
        straight to the building&apos;s own M-Pesa Paybill — the platform
        never holds tenant funds; it simply reads the M-Pesa confirmation the
        moment it&apos;s issued and logs it automatically.
      </p>

      <h2>Frequently Asked</h2>
      <p>
        <strong>Is this a rental listing site?</strong> No — it manages
        tenancies that already exist, not new bookings.
      </p>
      <p>
        <strong>Who receives the rent money?</strong> The landlord, directly
        via M-Pesa. The platform only reads and logs the confirmation.
      </p>
      <p>
        <strong>Can my landlord see my private messages?</strong> No.
        Row-level security keeps your conversations and records visible only
        to you and your property manager.
      </p>
      <p>
        <strong>Is my data safe?</strong> Yes — see the full{" "}
        <a href="/privacy-policy">Privacy Policy</a> and{" "}
        <a href="/terms-of-service">Terms of Service</a> for exactly
        what&apos;s collected and who can access it.
      </p>
    </main>
  );
}