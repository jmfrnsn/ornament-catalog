import { z } from "zod";
import { projectStatuses, sourceStatuses } from "./schema";

const optionalText = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? undefined : value));

const tagsSchema = z.array(z.string().trim().min(1)).default([]);

const sourceBaseSchema = z.object({
  title: z.string().trim().min(1),
  creator: z.string().trim().min(1),
  year: z.union([z.string(), z.number()]).transform(String),
  type: z.string().trim().min(1),
  era: z.string().trim().min(1),
  region: optionalText,
  url: optionalText,
  filePath: optionalText,
  notionPageId: optionalText,
  archivedAt: z.string().nullable().optional(),
  status: z.enum(sourceStatuses).default("to_read"),
  notes: z.string().default(""),
});

export const sourceCreateSchema = sourceBaseSchema.refine(
  (value) => Boolean(value.url || value.filePath),
  {
    message: "Either url or filePath is required",
    path: ["url"],
  },
);

export const sourceUpdateSchema = sourceBaseSchema.partial().refine(
  (value) => {
    if ("url" in value || "filePath" in value) {
      return Boolean(value.url || value.filePath);
    }

    return true;
  },
  {
    message: "Either url or filePath is required when updating location",
    path: ["url"],
  },
);

export const sourceFiltersSchema = z.object({
  type: optionalText,
  era: optionalText,
  status: z.enum(sourceStatuses).optional(),
});

export const motifCreateSchema = z.object({
  name: z.string().trim().min(1),
  motifType: z.string().trim().min(1),
  style: z.string().trim().min(1),
  sourceId: z.string().trim().min(1),
  description: z.string().trim().min(1),
  tags: tagsSchema,
  visualPrompt: z.string().trim().min(1),
  applications: z.string().trim().min(1),
  resonanceScore: z.number().int().min(1).max(5).default(3),
  notes: z.string().default(""),
});

export const motifUpdateSchema = motifCreateSchema.partial();

export const motifFiltersSchema = z.object({
  motifType: optionalText,
  style: optionalText,
  era: optionalText,
  tags: optionalText,
  resonanceScore: z.coerce.number().int().min(1).max(5).optional(),
});

export const projectCreateSchema = z.object({
  title: z.string().trim().min(1),
  theme: z.string().trim().min(1),
  motifIds: z.array(z.string().trim().min(1)).default([]),
  sourceIds: z.array(z.string().trim().min(1)).default([]),
  status: z.enum(projectStatuses).default("idea"),
  notes: z.string().default(""),
  potentialFormats: tagsSchema,
});

export const projectUpdateSchema = projectCreateSchema.partial();

export const projectFiltersSchema = z.object({
  status: z.enum(projectStatuses).optional(),
});

export const digestRequestSchema = z.object({
  content: z.string().optional(),
});

export const projectSuggestSchema = z.object({
  minimumResonanceScore: z.number().int().min(1).max(5).default(4),
  desiredFormatTypes: z.array(z.string().trim().min(1)).default([]),
  limit: z.number().int().min(1).max(10).default(3),
});

export type SourceCreateInput = z.infer<typeof sourceCreateSchema>;
export type SourceUpdateInput = z.infer<typeof sourceUpdateSchema>;
export type MotifCreateInput = z.infer<typeof motifCreateSchema>;
export type MotifUpdateInput = z.infer<typeof motifUpdateSchema>;
export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
