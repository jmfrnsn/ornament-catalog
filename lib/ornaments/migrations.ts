import type Database from "better-sqlite3";

type Migration = {
  id: string;
  sql: string;
};

const migrations: Migration[] = [
  {
    id: "001_create_ornament_catalog",
    sql: `
      CREATE TABLE IF NOT EXISTS sources (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        creator TEXT NOT NULL,
        year TEXT NOT NULL,
        type TEXT NOT NULL,
        era TEXT NOT NULL,
        region TEXT,
        url TEXT,
        file_path TEXT,
        status TEXT NOT NULL DEFAULT 'to_read',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (url IS NOT NULL OR file_path IS NOT NULL),
        CHECK (status IN ('to_read', 'in_progress', 'digested'))
      );

      CREATE TABLE IF NOT EXISTS motifs (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        motif_type TEXT NOT NULL,
        style TEXT NOT NULL,
        description TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        visual_prompt TEXT NOT NULL,
        applications TEXT NOT NULL,
        resonance_score INTEGER NOT NULL DEFAULT 3,
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (resonance_score BETWEEN 1 AND 5)
      );

      CREATE TABLE IF NOT EXISTS project_threads (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        theme TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'idea',
        notes TEXT NOT NULL DEFAULT '',
        potential_formats TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        CHECK (status IN ('idea', 'draft', 'in_progress', 'finished'))
      );

      CREATE TABLE IF NOT EXISTS project_motifs (
        project_id TEXT NOT NULL REFERENCES project_threads(id) ON DELETE CASCADE,
        motif_id TEXT NOT NULL REFERENCES motifs(id) ON DELETE CASCADE,
        PRIMARY KEY (project_id, motif_id)
      );

      CREATE TABLE IF NOT EXISTS project_sources (
        project_id TEXT NOT NULL REFERENCES project_threads(id) ON DELETE CASCADE,
        source_id TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
        PRIMARY KEY (project_id, source_id)
      );

      CREATE INDEX IF NOT EXISTS idx_sources_filters ON sources(type, era, status);
      CREATE INDEX IF NOT EXISTS idx_motifs_filters ON motifs(motif_type, style, resonance_score);
      CREATE INDEX IF NOT EXISTS idx_projects_status ON project_threads(status);
    `,
  },
  {
    id: "002_add_source_notion_page_id",
    sql: `
      ALTER TABLE sources ADD COLUMN notion_page_id TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_sources_notion_page_id ON sources(notion_page_id);
    `,
  },
  {
    id: "003_add_source_archived_at",
    sql: `
      ALTER TABLE sources ADD COLUMN archived_at TEXT;
      CREATE INDEX IF NOT EXISTS idx_sources_archived_at ON sources(archived_at);
    `,
  },
];

export function runMigrations(sqlite: Database.Database) {
  sqlite.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS ornament_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    sqlite
      .prepare("SELECT id FROM ornament_migrations")
      .all()
      .map((row) => (row as { id: string }).id),
  );

  for (const migration of migrations) {
    if (applied.has(migration.id)) {
      continue;
    }

    sqlite.transaction(() => {
      sqlite.exec(migration.sql);
      sqlite
        .prepare("INSERT INTO ornament_migrations (id, applied_at) VALUES (?, ?)")
        .run(migration.id, new Date().toISOString());
    })();
  }
}
