# Trailhead — Personal & Family Money Ledger

> trailhead.in | Personal financial ledger: track money by account, owner, and category.

## Structure

```
trailhead/
├── frontend/     React + Vite + TypeScript + Tailwind + shadcn/ui + React Router
└── backend/      Cloudflare Workers + Hono + TypeScript + Zod + Prisma + Neon
```

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- Cloudflare account (free tier)
- Neon account (free tier)

### First-time setup

```bash
# 1. Install all dependencies
cd frontend && npm install
cd ../backend && npm install

# 2. Set backend secrets (once Cloudflare is configured)
wrangler secret put DATABASE_URL    # your Neon connection string
wrangler secret put JWT_SECRET      # 64-char random string
wrangler secret put FRONTEND_URL    # https://trailhead.in

# 3. Push Prisma schema to Neon
cd backend && npm run db:generate && npm run db:push

# 4. Run frontend dev server
cd frontend && npm run dev

# 5. Run backend worker locally
cd backend && npm run dev
```

### Deploy

**Frontend → Cloudflare Pages**
```bash
cd frontend && npm run build
# Upload dist/ to Cloudflare Pages
# Build command: npm run build
# Output dir: dist
```

**Backend → Cloudflare Workers**
```bash
cd backend && npm run deploy
```

## Architecture
- Frontend: https://trailhead.in → Cloudflare Pages
- Backend:  https://api.trailhead.in → Cloudflare Workers
- Database: Neon PostgreSQL via Prisma (edge-compatible adapter)
- Auth: JWT in HttpOnly cookies (SameSite=Strict)
