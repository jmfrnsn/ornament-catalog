import { and, count, desc, eq, gte, inArray, isNotNull, isNull, like, type SQL } from "drizzle-orm";
import { getDb } from "./db";
import { NotFoundError } from "./errors";
import {
  motifs,
  projectMotifs,
  projectSources,
  projectThreads,
  sources,
  type Motif,
  type NewMotif,
  type NewProjectThread,
  type NewSource,
  type ProjectThread,
  type Source,
} from "./schema";
import type {
  MotifCreateInput,
  MotifUpdateInput,
  ProjectCreateInput,
  ProjectUpdateInput,
  SourceCreateInput,
  SourceUpdateInput,
} from "./validation";

type SourceFilters = {
  type?: string;
  era?: string;
  status?: Source["status"];
  includeArchived?: boolean;
  archivedOnly?: boolean;
};

type MotifFilters = {
  motifType?: string;
  style?: string;
  era?: string;
  tags?: string;
  resonanceScore?: number;
};

type ProjectFilters = {
  status?: ProjectThread["status"];
};

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as Partial<T>;
}

export async function createSource(input: SourceCreateInput) {
  const timestamp = now();
  const record: NewSource = {
    id: id(),
    ...input,
    notes: input.notes ?? "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return getDb().insert(sources).values(record).returning().get();
}

function notionSourcePayloadMatches(
  existing: Source,
  input: SourceCreateInput & { notionPageId: string; archivedAt?: string | null },
) {
  return (
    existing.title === input.title &&
    existing.creator === input.creator &&
    existing.year === input.year &&
    existing.type === input.type &&
    existing.era === input.era &&
    existing.region === (input.region ?? null) &&
    existing.url === (input.url ?? null) &&
    existing.filePath === (input.filePath ?? null) &&
    existing.status === input.status &&
    existing.notes === (input.notes ?? "") &&
    existing.notionPageId === input.notionPageId &&
    existing.archivedAt === (input.archivedAt ?? null)
  );
}

export async function upsertSourceFromNotion(input: SourceCreateInput & { notionPageId: string }) {
  const existing = getDb()
    .select()
    .from(sources)
    .where(eq(sources.notionPageId, input.notionPageId))
    .get();

  const archivedAt = input.archivedAt
    ? (existing?.archivedAt ?? input.archivedAt)
    : null;
  const nextInput = { ...input, archivedAt };

  if (existing) {
    if (notionSourcePayloadMatches(existing, nextInput)) {
      return existing;
    }

    return updateSource(existing.id, nextInput);
  }

  return createSource(nextInput);
}

export async function listSources(filters: SourceFilters = {}) {
  const clauses: SQL[] = [];

  if (filters.type) clauses.push(eq(sources.type, filters.type));
  if (filters.era) clauses.push(eq(sources.era, filters.era));
  if (filters.status) clauses.push(eq(sources.status, filters.status));
  if (filters.archivedOnly) {
    clauses.push(isNotNull(sources.archivedAt));
  } else if (!filters.includeArchived) {
    clauses.push(isNull(sources.archivedAt));
  }

  return getDb()
    .select()
    .from(sources)
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(sources.updatedAt))
    .all();
}

export async function getSource(id: string) {
  const source = getDb().select().from(sources).where(eq(sources.id, id)).get();

  if (!source) {
    throw new NotFoundError("Source");
  }

  const linkedMotifs = getDb()
    .select()
    .from(motifs)
    .where(eq(motifs.sourceId, id))
    .orderBy(desc(motifs.createdAt))
    .all();

  return { ...source, motifs: linkedMotifs };
}

export async function updateSource(id: string, input: SourceUpdateInput) {
  const values = compact({ ...input, updatedAt: now() });

  const updated = getDb()
    .update(sources)
    .set(values)
    .where(eq(sources.id, id))
    .returning()
    .get();

  if (!updated) {
    throw new NotFoundError("Source");
  }

  return updated;
}

export async function archiveSource(id: string) {
  const timestamp = now();
  const updated = getDb()
    .update(sources)
    .set({ archivedAt: timestamp, updatedAt: timestamp })
    .where(eq(sources.id, id))
    .returning()
    .get();

  if (!updated) {
    throw new NotFoundError("Source");
  }

  return updated;
}

export async function unarchiveSource(id: string) {
  const timestamp = now();
  const updated = getDb()
    .update(sources)
    .set({ archivedAt: null, updatedAt: timestamp })
    .where(eq(sources.id, id))
    .returning()
    .get();

  if (!updated) {
    throw new NotFoundError("Source");
  }

  return updated;
}

export async function createMotif(input: MotifCreateInput) {
  await getSource(input.sourceId);

  const timestamp = now();
  const record: NewMotif = {
    id: id(),
    ...input,
    notes: input.notes ?? "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return getDb().insert(motifs).values(record).returning().get();
}

export async function createMotifs(inputs: MotifCreateInput[]) {
  const created: Motif[] = [];

  for (const input of inputs) {
    created.push(await createMotif(input));
  }

  return created;
}

export async function listMotifs(filters: MotifFilters = {}) {
  const clauses: SQL[] = [];

  if (filters.motifType) clauses.push(eq(motifs.motifType, filters.motifType));
  if (filters.style || filters.era) {
    clauses.push(eq(motifs.style, filters.style ?? filters.era ?? ""));
  }
  if (filters.tags) clauses.push(like(motifs.tags, `%${filters.tags}%`));
  if (filters.resonanceScore) {
    clauses.push(gte(motifs.resonanceScore, filters.resonanceScore));
  }

  return getDb()
    .select()
    .from(motifs)
    .where(clauses.length ? and(...clauses) : undefined)
    .orderBy(desc(motifs.resonanceScore), desc(motifs.createdAt))
    .all();
}

export async function getMotif(id: string) {
  const motif = getDb().select().from(motifs).where(eq(motifs.id, id)).get();

  if (!motif) {
    throw new NotFoundError("Motif");
  }

  const source = getDb()
    .select()
    .from(sources)
    .where(eq(sources.id, motif.sourceId))
    .get();

  return { ...motif, source };
}

export async function updateMotif(id: string, input: MotifUpdateInput) {
  const values = compact({ ...input, updatedAt: now() });

  const updated = getDb()
    .update(motifs)
    .set(values)
    .where(eq(motifs.id, id))
    .returning()
    .get();

  if (!updated) {
    throw new NotFoundError("Motif");
  }

  return updated;
}

export async function createProject(input: ProjectCreateInput) {
  const timestamp = now();
  const record: NewProjectThread = {
    id: id(),
    title: input.title,
    theme: input.theme,
    status: input.status,
    notes: input.notes,
    potentialFormats: input.potentialFormats,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const db = getDb();

  return db.transaction((tx) => {
    const project = tx.insert(projectThreads).values(record).returning().get();

    if (input.motifIds.length) {
      tx.insert(projectMotifs)
        .values(input.motifIds.map((motifId) => ({ projectId: project.id, motifId })))
        .run();
    }

    if (input.sourceIds.length) {
      tx.insert(projectSources)
        .values(input.sourceIds.map((sourceId) => ({ projectId: project.id, sourceId })))
        .run();
    }

    return project;
  });
}

export async function listProjects(filters: ProjectFilters = {}) {
  return getDb()
    .select()
    .from(projectThreads)
    .where(filters.status ? eq(projectThreads.status, filters.status) : undefined)
    .orderBy(desc(projectThreads.updatedAt))
    .all();
}

export async function getProject(id: string) {
  const project = getDb()
    .select()
    .from(projectThreads)
    .where(eq(projectThreads.id, id))
    .get();

  if (!project) {
    throw new NotFoundError("Project");
  }

  const motifLinks = getDb()
    .select({ motifId: projectMotifs.motifId })
    .from(projectMotifs)
    .where(eq(projectMotifs.projectId, id))
    .all();
  const sourceLinks = getDb()
    .select({ sourceId: projectSources.sourceId })
    .from(projectSources)
    .where(eq(projectSources.projectId, id))
    .all();

  const linkedMotifs = motifLinks.length
    ? getDb()
        .select()
        .from(motifs)
        .where(inArray(motifs.id, motifLinks.map((link) => link.motifId)))
        .all()
    : [];
  const linkedSources = sourceLinks.length
    ? getDb()
        .select()
        .from(sources)
        .where(inArray(sources.id, sourceLinks.map((link) => link.sourceId)))
        .all()
    : [];

  return { ...project, motifs: linkedMotifs, sources: linkedSources };
}

export async function updateProject(id: string, input: ProjectUpdateInput) {
  const db = getDb();

  return db.transaction((tx) => {
    const values = compact({
      title: input.title,
      theme: input.theme,
      status: input.status,
      notes: input.notes,
      potentialFormats: input.potentialFormats,
      updatedAt: now(),
    });

    const updated = tx
      .update(projectThreads)
      .set(values)
      .where(eq(projectThreads.id, id))
      .returning()
      .get();

    if (!updated) {
      throw new NotFoundError("Project");
    }

    if (input.motifIds) {
      tx.delete(projectMotifs).where(eq(projectMotifs.projectId, id)).run();

      if (input.motifIds.length) {
        tx.insert(projectMotifs)
          .values(input.motifIds.map((motifId) => ({ projectId: id, motifId })))
          .run();
      }
    }

    if (input.sourceIds) {
      tx.delete(projectSources).where(eq(projectSources.projectId, id)).run();

      if (input.sourceIds.length) {
        tx.insert(projectSources)
          .values(input.sourceIds.map((sourceId) => ({ projectId: id, sourceId })))
          .run();
      }
    }

    return updated;
  });
}

export async function getDashboardStats() {
  const db = getDb();
  const sourceCount =
    db.select({ value: count() }).from(sources).where(isNull(sources.archivedAt)).get()?.value ?? 0;
  const [motifCount, projectCount] = await Promise.all([
    db.$count(motifs),
    db.$count(projectThreads),
  ]);
  const recentMotifs = db
    .select()
    .from(motifs)
    .orderBy(desc(motifs.resonanceScore), desc(motifs.createdAt))
    .limit(6)
    .all();

  return { sourceCount, motifCount, projectCount, recentMotifs };
}
