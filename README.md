# Ornaments

Standalone Next.js site for Jade Franson's historical ornament research catalog.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3003](http://localhost:3003).

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Catalog index |
| `/sources/[id]` | Source detail |
| `/admin` | Private admin login (`noindex`) |
| `/api/notion-webhook` | Notion → GitHub sync trigger |
| `/api/admin/*` | Admin session |
| `/api/sources/[id]/archive` | Archive / restore |

## Environment

See [`docs/notion-ornament-sync.md`](docs/notion-ornament-sync.md) for Notion, webhook, admin, and GitHub Action setup.

## Scripts

```bash
npm run sync-notion-ornaments
npm run sync-ornaments-and-push
npm run sync-ornaments-and-push -- --dry-run
npm run daily-ornament-agent
npm test
```

## Deploy

Host this repository as its own Vercel (or similar) project. The portfolio site links here via `NEXT_PUBLIC_ORNAMENTS_SITE_URL`.
