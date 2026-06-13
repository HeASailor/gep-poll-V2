# GEP Poll — Pertamina Phase 5 Live Polling App

Real-time live polling platform for Pertamina training sessions.
Supports 1000+ concurrent participants, Bahasa Indonesia UI.

## Features
- Trainer login (multi-admin, each trainer has their own account)
- Create sessions with MCQ, Rating (1–5), and Open Text questions
- Pre-loaded with Pertamina Phase 5 modules
- 4-digit room code for participants to join (no login needed)
- Live real-time results as votes come in
- Timer per question
- CSV export of results
- Mobile-friendly participant view

---

## Setup (5 steps)

### 1. Supabase Database
1. Go to https://supabase.com → New Project
2. SQL Editor → New Query → paste entire contents of `gep_poll_supabase_schema.sql` → Run
3. Go to Settings → API → copy:
   - `Project URL`
   - `anon public` key

### 2. Configure environment
```bash
cp .env.local.example .env.local
```
Edit `.env.local` and fill in your Supabase URL and anon key.

### 3. Install & run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000

### 4. Deploy to Vercel
```bash
npx vercel
```
When prompted, add your two environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 5. Share with participants
- Trainer: `your-app.vercel.app/admin`
- Participants: `your-app.vercel.app/join`

---

## How to use

### As a Trainer
1. Go to `/admin` → Sign up → Login
2. Click **Buat Sesi Baru** → give it a name (e.g. "Pre-Test Day 1")
3. Add questions (MCQ/Rating/Open) with module tag and timer
4. Click **Mulai Sesi Live** → share the 4-digit room code
5. Navigate between questions in the **Tampilkan Live** tab
6. See results in real time → export CSV when done

### As a Participant
1. Go to `/join` on phone/laptop
2. Enter your name and the 4-digit room code
3. Answer each question as it appears
4. Wait for trainer to move to next question

---

## Modules covered (from Pertamina Phase 5 rundown)
- Project Request & Project
- RFx & Bidder List
- Kontrak (Contracts)
- E-Catalog & Procurement Dashboard
- E-Auction

## Tech stack
- Next.js 14 (App Router)
- Supabase (Auth + Realtime PostgreSQL)
- Tailwind CSS
- Recharts

## Scaling
Supabase free tier handles up to 500 concurrent connections.
For 1000+ vendors simultaneously, upgrade to Supabase Pro ($25/mo)
which supports unlimited connections with connection pooling.
