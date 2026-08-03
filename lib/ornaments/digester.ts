import { createMotifs } from "./repository";
import type { Source } from "./schema";
import { motifCreateSchema, type MotifCreateInput } from "./validation";

type DigestOptions = {
  content?: string;
  dryRun?: boolean;
};

type DigestResult = {
  motifs: MotifCreateInput[];
  saved: boolean;
};

const promptIntro = `You are a historian of decorative arts and a pattern book author.
Given this text, extract distinct ornamental motifs.
For each motif, return JSON with:
- name
- motifType (floral, geometric, architectural, typographic, emblematic, etc.)
- era/style (best guess)
- description (2-4 sentence text)
- tags (array of short labels)
- visualPrompt (for sketching or image generation)
- applications (modern design uses)`;

function buildDigestPrompt(source: Source, content?: string) {
  return `${promptIntro}

Source:
${JSON.stringify(
  {
    title: source.title,
    creator: source.creator,
    year: source.year,
    type: source.type,
    era: source.era,
    region: source.region,
    notes: source.notes,
  },
  null,
  2,
)}

Text:
${content?.trim() || source.notes || source.title}

Return only a JSON array.`;
}

function extractJsonArray(text: string) {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("LLM response did not include a JSON array");
  }

  return JSON.parse(text.slice(start, end + 1)) as unknown[];
}

function normalizeMotif(source: Source, raw: unknown): MotifCreateInput {
  const value = raw as Record<string, unknown>;

  return motifCreateSchema.parse({
    name: value.name,
    motifType: value.motifType,
    style: value.style ?? value.era ?? value["era/style"] ?? source.era,
    sourceId: source.id,
    description: value.description,
    tags: value.tags,
    visualPrompt: value.visualPrompt,
    applications: value.applications,
    resonanceScore: 3,
  });
}

function fallbackDigest(source: Source, content?: string) {
  const text = `${source.title} ${source.notes} ${content ?? ""}`.toLowerCase();
  const motifType = text.includes("letter") || text.includes("type")
    ? "typographic"
    : text.includes("cornice") || text.includes("facade") || text.includes("building")
      ? "architectural"
      : text.includes("flower") || text.includes("vine") || text.includes("leaf")
        ? "floral"
        : text.includes("catalog") || text.includes("emblem")
          ? "emblematic"
          : "geometric";

  return [
    motifCreateSchema.parse({
      name: `${source.era} ${motifType} study from ${source.title}`,
      motifType,
      style: source.era,
      sourceId: source.id,
      description: `A provisional motif extracted from ${source.title}. The record captures visible language from the source metadata and notes so it can be refined after closer reading.`,
      tags: [source.era.toLowerCase(), source.type, motifType],
      visualPrompt: `Sketch a ${source.era} ${motifType} ornament inspired by ${source.title}, restrained linework, archival reference sheet`,
      applications:
        "Use as a starting point for zine borders, print studies, UI dividers, or shallow relief experiments.",
      resonanceScore: 3,
    }),
  ];
}

async function callOpenAi(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return undefined;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.ORNAMENT_LLM_MODEL ?? "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI digest failed: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content;
}

export async function digestSource(
  source: Source,
  options: DigestOptions = {},
): Promise<DigestResult> {
  const prompt = buildDigestPrompt(source, options.content);
  const llmResponse = await callOpenAi(prompt);
  const motifs = llmResponse
    ? extractJsonArray(llmResponse).map((motif) => normalizeMotif(source, motif))
    : fallbackDigest(source, options.content);

  if (!options.dryRun) {
    await createMotifs(motifs);
  }

  return { motifs, saved: !options.dryRun };
}
