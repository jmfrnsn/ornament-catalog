import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sourceStatuses = ["to_read", "in_progress", "digested"] as const;
export const projectStatuses = ["idea", "draft", "in_progress", "finished"] as const;

const timestamps = {
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
};

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  creator: text("creator").notNull(),
  year: text("year").notNull(),
  type: text("type").notNull(),
  era: text("era").notNull(),
  region: text("region"),
  url: text("url"),
  filePath: text("file_path"),
  notionPageId: text("notion_page_id").unique(),
  archivedAt: text("archived_at"),
  status: text("status", { enum: sourceStatuses }).notNull().default("to_read"),
  notes: text("notes").notNull().default(""),
  ...timestamps,
});

export const motifs = sqliteTable("motifs", {
  id: text("id").primaryKey(),
  sourceId: text("source_id")
    .notNull()
    .references(() => sources.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  motifType: text("motif_type").notNull(),
  style: text("style").notNull(),
  description: text("description").notNull(),
  tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default([]),
  visualPrompt: text("visual_prompt").notNull(),
  applications: text("applications").notNull(),
  resonanceScore: integer("resonance_score").notNull().default(3),
  notes: text("notes").notNull().default(""),
  ...timestamps,
});

export const projectThreads = sqliteTable("project_threads", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  theme: text("theme").notNull(),
  status: text("status", { enum: projectStatuses }).notNull().default("idea"),
  notes: text("notes").notNull().default(""),
  potentialFormats: text("potential_formats", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default([]),
  ...timestamps,
});

export const projectMotifs = sqliteTable("project_motifs", {
  projectId: text("project_id")
    .notNull()
    .references(() => projectThreads.id, { onDelete: "cascade" }),
  motifId: text("motif_id")
    .notNull()
    .references(() => motifs.id, { onDelete: "cascade" }),
});

export const projectSources = sqliteTable("project_sources", {
  projectId: text("project_id")
    .notNull()
    .references(() => projectThreads.id, { onDelete: "cascade" }),
  sourceId: text("source_id")
    .notNull()
    .references(() => sources.id, { onDelete: "cascade" }),
});

export const sourcesRelations = relations(sources, ({ many }) => ({
  motifs: many(motifs),
  projectSources: many(projectSources),
}));

export const motifsRelations = relations(motifs, ({ one, many }) => ({
  source: one(sources, {
    fields: [motifs.sourceId],
    references: [sources.id],
  }),
  projectMotifs: many(projectMotifs),
}));

export const projectThreadsRelations = relations(projectThreads, ({ many }) => ({
  projectMotifs: many(projectMotifs),
  projectSources: many(projectSources),
}));

export const projectMotifsRelations = relations(projectMotifs, ({ one }) => ({
  project: one(projectThreads, {
    fields: [projectMotifs.projectId],
    references: [projectThreads.id],
  }),
  motif: one(motifs, {
    fields: [projectMotifs.motifId],
    references: [motifs.id],
  }),
}));

export const projectSourcesRelations = relations(projectSources, ({ one }) => ({
  project: one(projectThreads, {
    fields: [projectSources.projectId],
    references: [projectThreads.id],
  }),
  source: one(sources, {
    fields: [projectSources.sourceId],
    references: [sources.id],
  }),
}));

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Motif = typeof motifs.$inferSelect;
export type NewMotif = typeof motifs.$inferInsert;
export type ProjectThread = typeof projectThreads.$inferSelect;
export type NewProjectThread = typeof projectThreads.$inferInsert;
