# Historic Ornament Research

Standalone Next.js catalog for historical ornament research. Routes live at the site root (`/`).

## Data Model

The catalog uses SQLite through Drizzle ORM. The default database path is `data/ornament-research.sqlite`; override it with `ORNAMENT_DB_PATH`.

- `Source`: research source metadata, reading status, notes, and either a URL or local file path.
- `Motif`: extracted ornament records linked to a source, with type, style, tags, visual prompt, applications, notes, and a user-set `resonanceScore`.
- `ProjectThread`: thematic project ideas that link many motifs and sources through join tables.

Migrations run automatically from `lib/ornaments/migrations.ts` when the DB singleton initializes.

## API Endpoints

- `POST /api/sources/:id/archive`
- `POST /api/sources/:id/unarchive`
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/session`
- `POST /api/notion-webhook`

## Services

`lib/ornaments/digester.ts` turns a source and optional text content into motif candidates. If `OPENAI_API_KEY` is present it calls OpenAI; otherwise it uses a deterministic local stub.

`lib/ornaments/weaver.ts` clusters motifs into unsaved project suggestions, prioritizing higher-resonance groups and optional desired output formats.

`lib/ornaments/notion-sync.ts` imports rows from the Notion Historical Ornaments database as `Source` records and dedupes by Notion page ID. Website archives set the row's Notion `Status` select to `Archived` and store a local `archivedAt` timestamp; archived rows move from the active sources list to the archived view. See [`notion-ornament-sync.md`](notion-ornament-sync.md) for setup and scheduling.

`lib/ornaments/export.ts` writes a deterministic tracked snapshot to `data/ornaments/sources.json`. `npm run sync-ornaments-and-push` syncs Notion into SQLite, refreshes that snapshot, and commits/pushes only the export file when it changes.

Autonomous updates use Notion webhooks at `POST /api/notion-webhook`, which trigger the GitHub Action `.github/workflows/sync-ornaments.yml`. See [`notion-ornament-sync.md`](notion-ornament-sync.md).

## UI Structure

- `/`: catalog index of active sources.
- `/sources/:id`: source detail.
- `/admin`: private admin login.
- `/motifs`, `/projects`: currently redirect to `/`.
