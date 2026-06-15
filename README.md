# GEP TrainIQ — Training Assessment Platform

> Built by Himanshu Chaudhary, GEP Worldwide | Originally deployed for Pertamina Phase 5

GEP TrainIQ is a **real-time training assessment platform** built to replace third-party tools like Mentimeter and Kahoot for GEP client training engagements. It provides live pre-test and post-test quizzes, real-time results, and automated scoring — all under GEP's control.

---

## Why GEP TrainIQ?

| Feature | Mentimeter | Kahoot | GEP TrainIQ |
|---|---|---|---|
| Pre/Post test scoring | ❌ | ❌ | ✅ |
| Answer key + PASS/FAIL | ❌ | ❌ | ✅ |
| 1000+ concurrent users | Paid | Paid | ✅ Free |
| GEP data ownership | ❌ | ❌ | ✅ |
| Bilingual (EN/Bahasa) | ❌ | ❌ | ✅ |
| Custom branding | Paid | Paid | ✅ |
| Cost per engagement | ~$30/mo | ~$30/mo | $0 |

---

## Features

- **Multi-admin** — Multiple GEP trainers can manage sessions independently
- **Live polling** — Real-time results as participants answer
- **Pre/Post test** — Separate sessions with score comparison
- **Auto-scoring** — PASS/FAIL based on configurable passing score (default 70%)
- **Timer sync** — Admin controls timer, participants see countdown live
- **Auto-submit** — Answers auto-submitted when timer expires
- **Bilingual** — Full English/Bahasa Indonesia toggle on all pages
- **CSV export** — Download results for Excel reporting
- **Mobile-first** — Works on any phone browser, no app download needed
- **Invite code** — Only GEP team members can register as trainers
- **Reset button** — One-click clear all test data between sessions
- **Question types** — MCQ, Rating (1-5), Open Text

---

## Current Deployment

**Live URL:** https://gep-poll.vercel.app

**First client:** Pertamina Phase 5 (GEP SMART S2P Implementation)
- 31 pre-loaded sessions (KU × 5 days, EU × 5 days, VD × 4 days)
- 310 questions with answer keys
- 3 feedback surveys
- Training dates: July 2026

---

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **Database:** Supabase (PostgreSQL + Realtime)
- **Auth:** Supabase Auth (email/password)
- **Hosting:** Vercel (free tier)
- **Language:** TypeScript

---

## Setup for New Client Engagement

### 1. Clone and configure
```bash
git clone https://github.com/HeASailor/gep-poll-V2.git
cd gep-poll-V2
cp .env.local.example .env.local
# Add Supabase credentials
```

### 2. Database setup
Run `gep_poll_supabase_schema.sql` in Supabase SQL Editor.

### 3. Load client questions
Use the browser console script pattern (see `/docs/load_questions.js`) to bulk-load questions from Excel answer key.

### 4. Deploy
```bash
npx vercel
```

Or connect GitHub repo to Vercel for auto-deploy on every push.

---

## Pages

| Page | URL | Access |
|---|---|---|
| Home | `/` | Public |
| Participant Join | `/join` | Public (room code required) |
| Trainer Dashboard | `/admin` | GEP trainers (invite code) |
| Session Manager | `/admin/session/[id]` | GEP trainers |
| Reports & Scoring | `/admin/reports` | GEP trainers |

---

## Roadmap (for Engineering)

- [ ] Multi-tenant architecture (one platform, multiple clients)
- [ ] White-label branding per client (logo, colors via config)
- [ ] Custom domain per client (`client-quiz.gep.com`)
- [ ] SSO / SAML login for enterprise clients
- [ ] PowerPoint export for training reports
- [ ] QR code for room code
- [ ] Leaderboard during session
- [ ] Email results to trainer after session ends
- [ ] Admin can see who hasn't answered in real time
- [ ] Question bank — reuse questions across engagements

---

## Built By

**Himanshu Chaudhary**
Senior Business Consultant, GEP Worldwide
Pertamina Phase 5 — Change Management Lead

> *"Built during active client engagement to eliminate Mentimeter dependency and give GEP full control over training data and assessment quality."*

---

*GEP TrainIQ — Proprietary training assessment platform by GEP Worldwide*
