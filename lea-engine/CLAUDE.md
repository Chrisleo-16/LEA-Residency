# LEA Content Engine — Read This First

This folder is how LEA Executive Residency runs its marketing, tenant
communication, and legal documentation work with Claude. It is not a
chatbox history — it's a filing system Claude reads from and writes to,
so every new conversation starts with full context instead of starting
from zero.

## The shape of it

```
lea-engine/
  CLAUDE.md                 ← you are here. the manual.
  brand-system/             ← the locked kit: colors, fonts, voice, legal facts
  playbooks/                ← how-to guides for each type of work
    landing-page/
    legal-docs/
    tenant-comms/
    social-content/
  campaigns/
    {campaign}/
      activity.md            ← the living log for this campaign — survives every reset
      drafts/                ← work in progress
      final/                 ← shipped, approved versions
```

## How to use this with Claude

1. At the start of any session, point Claude at `brand-system/brand-kit.md`
   first — it has the colors, fonts, and tone rules so nothing has to be
   re-explained.
2. If the task matches an existing playbook (e.g. you're updating the
   landing page), point Claude at that playbook before asking for changes.
   The playbook has the constraints already worked out — what NOT to
   touch, what's allowed to change.
3. If it's an ongoing piece of work (a campaign, a redesign, a document
   revision), create a folder under `campaigns/` and keep an `activity.md`
   inside it. Append to that file every session — what was asked, what
   was delivered, what's still open. This is what makes Claude "remember"
   across separate conversations: you paste the activity.md back in, and
   it has the full history without you re-explaining everything.
4. Finished work goes in `final/`. Work in progress stays in `drafts/`.

## Why bother with this instead of just chatting

Without this, every new conversation with Claude starts from zero — you
re-explain the brand colors, the M-Pesa-not-custodying-funds legal
position, the tone, the existing page structure, every single time. With
this, you paste in 2-3 files and Claude has everything it needs in one
shot. The folder is the memory; Claude is the worker.