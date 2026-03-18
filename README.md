# Coffee Coach

A mobile-first web app that helps specialty coffee drinkers log their brews, track improvement over time, and get personalised coaching from an AI coach called Kapi.

---

## What It Does

Coffee Coach guides a user through a repeating loop:

**Brew → Rate → Get Coaching → Improve → Repeat**

1. **Add your beans** — search a catalog of 3000+ specialty coffees; track roast date, freshness zone, and remaining grams
2. **Choose a brew method** — Pour Over, AeroPress, French Press, Espresso, etc.
3. **Follow a recipe or freestyle** — step-by-step guided brews with live timers, or a free-form parameter log
4. **Rate your brew** — 1–10 slider; a 10 saves the recipe as a favourite
5. **Get Coaching** — pick a symptom ("Bitter", "Weak") or a goal ("more sweetness") and Coach Kapi returns a specific fix
6. **Review your history** — rating trend chart and a journal of every brew

---

## User Loops

### Core Loop (every brew)
```
Log Brew → Brew Complete → Rate → Coaching Sheet → Coach Says → /coach/brew/[id]
```

### Improvement Loop (across brews)
```
History page → tap brew → coaching result → apply fix → next brew → compare rating
```

### Bean Loop
```
My Beans → Add bean (search catalog) → track freshness → restock when low → delete when empty
```

### Favourite Recipe Loop
```
Rate 10/10 → Save this Recipe → appears in "Your Favourites" on next guided brew
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19 |
| Styling | Tailwind CSS 3, Material Symbols, Work Sans |
| State | Zustand 5 |
| Auth | NextAuth v5 (Google OAuth, JWT strategy) |
| Backend | FastAPI, Uvicorn |
| Database | PostgreSQL 16, SQLAlchemy 2, Alembic |
| Hosting | Vercel (frontend) + Hetzner Docker Compose (backend) |

### Repository Structure

```
coffee-coach/          ← this repo (public)
  frontend/            ← Next.js app (deploys to Vercel)
  backend/             ← FastAPI app (deploys to Hetzner)
    data/
      brew_methods.json
      # beans_AI.json, images/, logic/ → gitignored; live in private repo
    routers/
      # coaching.py, recipes.py → gitignored; live in private repo

coffee-coach-private/  ← sibling repo (private)
  backend/
    data/
      beans_AI.json
      images/beans/    ← bean product photos (SCP'd to Hetzner, not git)
      recipes_v4.json
    logic/             ← rule-based coaching JSON files
    routers/
      coaching.py
      recipes.py
```

---

## Design Overview

The UI is dark, warm, and minimal — built around a single amber accent (`#f49d25`) against deep espresso browns. The visual metaphor is a private tasting room, not a consumer dashboard.

**Key design patterns:**

- **Kapi character images** — PNG mascot with `mix-blend-mode: screen` on empty states, coaching moments, and celebrations. All images in `frontend/public/coach/`.
- **Amber accents everywhere** — CTA buttons, left-border tap affordances on history cards, Coach Says card borders, active step indicators, freshness zone fills.
- **Fixed-height coaching sheet** — `h-[85dvh]` bottom sheet prevents height jitter as content changes between rating states.
- **Context bar** — shows `[Bean] · [Method]` on brew flow screens so the user is never lost.
- **Thinking state** — animated "Coach Kapi is thinking..." dots on the Get Coaching button during API fetch.
- **Freshness system** — beans tracked in four zones: Degassing (sky), In the Zone (green), Fading (amber), Aging (slate).

Full details: [`design_spec.md`](design_spec.md)

---

## Architecture

```
Browser
  │
  ▼
Vercel — Next.js 15
  ├── /api/* routes (server-side, HS256 JWT)     ← brews, user profile
  └── /backend/* rewrite → BACKEND_URL           ← beans, preferences, methods (client-side)
           │
           ▼
     Hetzner VPS :8080 (Docker Compose)
       ├── api container (FastAPI, internal :8000)
       └── db container (PostgreSQL 16)
```

### Auth Flow

1. User signs in with Google → NextAuth stores session cookie
2. Server-side Next.js routes call `getAccessToken()` which manually signs a plain **HS256 JWT** (not NextAuth's HKDF-derived token) — compatible with `python-jose` on the backend
3. Backend verifies with the same `AUTH_SECRET`

### State Management

All data is backend-first (PostgreSQL). Zustand stores are in-memory caches with no localStorage persistence except for the active brew session:

| Store | Purpose |
|-------|---------|
| `useBrewHistoryStore` | Brew entries — fetched on history page mount |
| `useBeansStore` | User's bean collection |
| `useLogBrewStore` | Step-1 selections (beanId, methodId) across navigation |
| `useBrewSessionStore` | Persisted active guided brew session |
| `usePreferencesStore` | Persisted last-used bean + method |

---

## Running Locally

### Prerequisites

- Node.js 20+
- Python 3.11+
- PostgreSQL 16 (or Docker)

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # set AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, BACKEND_URL
npm run dev
```

### Backend

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env               # set DATABASE_URL, AUTH_SECRET, ALLOWED_ORIGINS
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

---

## Deployment

### Frontend (Vercel)

Push to `main` — Vercel auto-deploys. Required environment variables in Vercel dashboard:

```
AUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NEXTAUTH_URL
BACKEND_URL=http://<hetzner-ip>:8080
```

### Backend (Hetzner)

```bash
ssh root@<hetzner-ip>
cd /opt/coffee-coach
git pull
docker compose up -d --build
```

Migrations run automatically on container start (`alembic upgrade head` in entrypoint).

**Bean images** are not in git. After initial setup or when new beans are added, SCP them from the private repo:

```bash
scp -r coffee-coach-private/backend/data/images/ root@<hetzner-ip>:/opt/coffee-coach/backend/data/
```

---

## Key Files

| Path | Purpose |
|------|---------|
| `frontend/src/app/log-brew/` | Multi-step brew log flow (step 1 → step 2 → guided or freestyle) |
| `frontend/src/app/log-brew/guided/[id]/page.tsx` | Live guided brew with timer, steps, confirm, complete |
| `frontend/src/app/coach/brew/[id]/page.tsx` | Per-brew coaching result page |
| `frontend/src/components/BrewRatingSheet.tsx` | Post-brew coaching bottom sheet |
| `frontend/src/app/history/page.tsx` | Brew journal with trend chart |
| `frontend/src/app/my-beans/page.tsx` | Bean collection management |
| `frontend/src/lib/api.ts` | Client-side API calls (`postCoachingApi`, `postFavouriteBrewApi`, etc.) |
| `backend/app/routers/` | FastAPI route handlers |
| `design_spec.md` | Full design system reference |
| `tech_spec.md` | Full technical architecture reference |
