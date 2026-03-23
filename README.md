# Coffee Coach

A mobile-first web app that helps specialty coffee drinkers log brews, track improvement, and get personalised coaching from an AI coach called **Kapi**.

**Brew → Rate → Get Coaching → Improve → Repeat**

---

## Features

- **Bean library** — catalog of 3 000+ specialty coffees with freshness tracking (Degassing → Peak → Fading → Stale)
- **Brew logging** — guided step-by-step brews with live timers, or freestyle parameter logging
- **Rating & symptoms** — rate each brew 1–10, tag symptoms (bitter, sour, weak…) or goals (more sweetness, clarity…)
- **AI coaching** — rule-based engine analyses your brew and returns specific parameter adjustments with clear explanations
- **History & trends** — rating trend chart and a full brew journal
- **Favourite recipes** — 10/10 brews auto-save as reusable recipes
- **Coach-assisted re-brew** — one tap to log a new brew with coach's suggested parameters pre-filled

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS, Material Symbols |
| State | Zustand |
| Auth | NextAuth v5 (Google OAuth) |
| Backend | FastAPI, SQLAlchemy, Alembic |
| Database | PostgreSQL 16 |
| Infra | Vercel (frontend) · Docker Compose on Hetzner (backend) |

---

## Architecture

```
Browser (HTTPS)
  │
  ▼
Vercel — Next.js 15
  ├── /api/* server routes (HS256 JWT auth)
  └── /backend/* rewrite ──► Hetzner VPS
                                ├── FastAPI (Docker)
                                └── PostgreSQL 16 (Docker)
```

---

## Coaching Engine

The coaching system is entirely rule-based (no LLM calls). It uses a set of JSON logic files to:

1. Map symptoms to root causes and brewing parameter changes
2. Detect conflicting symptoms (e.g. sour + bitter) and sequence fixes by priority
3. Apply roast-level and method-specific modifiers
4. Track bean freshness and adjust advice accordingly
5. Reconcile symptom fixes with improvement goals, deferring goals that conflict

The engine outputs natural language advice, concrete parameter suggestions (e.g. "14 clicks → 12 clicks"), and a "what to expect" section.

---

## Repository Structure

```
coffee-coach/              ← this repo (public — frontend only)
  frontend/                ← Next.js app
```

The backend lives in a separate private repository.

---

## Running Locally

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in AUTH_SECRET, GOOGLE_CLIENT_ID, etc.
npm run dev
```

Requires a running backend instance (not included in this repo).

---

## License

Private project — source visible for portfolio purposes.
