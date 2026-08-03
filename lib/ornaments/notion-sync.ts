import { Client } from "@notionhq/client";
import { ApiError } from "./errors";
import { upsertSourceFromNotion } from "./repository";
import type { Source } from "./schema";
import { sourceCreateSchema, type SourceCreateInput } from "./validation";

type NotionPage = {
  id: string;
  url: string;
  archived?: boolean;
  cover?: NotionFile | null;
  properties: Record<string, NotionProperty>;
};

type NotionProperty = {
  type: string;
  [key: string]: unknown;
};

type NotionFile = {
  type: string;
  external?: { url?: string };
  file?: { url?: string };
};

export type NotionSyncResult = {
  scanned: number;
  upserted: Source[];
};

const propertyNames = {
  title: process.env.NOTION_ORNAMENT_TITLE_PROPERTY ?? "Name",
  creator: process.env.NOTION_ORNAMENT_CREATOR_PROPERTY ?? "Maker",
  year: process.env.NOTION_ORNAMENT_YEAR_PROPERTY ?? "Date",
  type: process.env.NOTION_ORNAMENT_TYPE_PROPERTY ?? "Source",
  era: process.env.NOTION_ORNAMENT_ERA_PROPERTY ?? "Era",
  region: process.env.NOTION_ORNAMENT_REGION_PROPERTY ?? "Culture",
  url: process.env.NOTION_ORNAMENT_URL_PROPERTY ?? "Object",
  filePath: process.env.NOTION_ORNAMENT_FILE_PATH_PROPERTY ?? "File Path",
  status: process.env.NOTION_ORNAMENT_STATUS_PROPERTY ?? "Status",
  notes: process.env.NOTION_ORNAMENT_NOTES_PROPERTY ?? "Notes",
};

function getNotionConfig() {
  const auth = process.env.NOTION_TOKEN?.trim();
  const dataSourceId = (
    process.env.NOTION_ORNAMENTS_DATA_SOURCE_ID ??
    process.env.NOTION_ORNAMENTS_DATABASE_ID
  )?.trim();

  if (!auth || !dataSourceId) {
    throw new ApiError(
      "NOTION_TOKEN and NOTION_ORNAMENTS_DATA_SOURCE_ID are not configured",
      503,
      "MISSING_ENV",
    );
  }

  return { auth, dataSourceId };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function textFromRichArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .map((entry) => asRecord(entry)?.plain_text)
        .filter((entry): entry is string => typeof entry === "string")
        .join("")
        .trim()
    : undefined;
}

function propertyText(property: NotionProperty | undefined) {
  if (!property) return undefined;

  if (property.type === "title") return textFromRichArray(property.title);
  if (property.type === "rich_text") return textFromRichArray(property.rich_text);
  if (property.type === "url") return typeof property.url === "string" ? property.url : undefined;
  if (property.type === "email") return typeof property.email === "string" ? property.email : undefined;
  if (property.type === "phone_number") {
    return typeof property.phone_number === "string" ? property.phone_number : undefined;
  }
  if (property.type === "number") {
    return typeof property.number === "number" ? String(property.number) : undefined;
  }
  if (property.type === "select") {
    const select = asRecord(property.select);
    return typeof select?.name === "string" ? select.name : undefined;
  }
  if (property.type === "status") {
    const status = asRecord(property.status);
    return typeof status?.name === "string" ? status.name : undefined;
  }
  if (property.type === "multi_select") {
    return Array.isArray(property.multi_select)
      ? property.multi_select
          .map((entry) => asRecord(entry)?.name)
          .filter((entry): entry is string => typeof entry === "string")
          .join(", ")
      : undefined;
  }
  if (property.type === "date") {
    const date = asRecord(property.date);
    return typeof date?.start === "string" ? date.start : undefined;
  }
  if (property.type === "files") {
    return Array.isArray(property.files)
      ? property.files.map(fileUrl).find(Boolean)
      : undefined;
  }

  return undefined;
}

function fileUrl(value: unknown) {
  const file = asRecord(value);
  const external = asRecord(file?.external);
  const notionFile = asRecord(file?.file);

  if (typeof external?.url === "string") return external.url;
  if (typeof notionFile?.url === "string") return notionFile.url;

  return undefined;
}

function normalizeStatus(status: string | undefined): SourceCreateInput["status"] {
  const value = status?.toLowerCase() ?? "";

  if (isArchivedStatus(status)) {
    return "to_read";
  }

  if (value.includes("digest") || value.includes("done") || value.includes("complete")) {
    return "digested";
  }

  if (value.includes("progress") || value.includes("read")) {
    return "in_progress";
  }

  return "to_read";
}

function isArchivedStatus(status: string | undefined) {
  return status?.toLowerCase().includes("archiv") ?? false;
}

function cleanText(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

export function notionPageToSourceInput(page: NotionPage): SourceCreateInput & { notionPageId: string } {
  const props = page.properties;
  const title = cleanText(propertyText(props[propertyNames.title]), "Untitled ornament source");
  const sourceUrl = cleanText(propertyText(props[propertyNames.url]), page.url);
  const imageUrl = propertyText(props[propertyNames.filePath]) ?? fileUrl(page.cover);
  const notionStatus = propertyText(props[propertyNames.status]);
  const archivedAt = isArchivedStatus(notionStatus) || page.archived
    ? new Date().toISOString()
    : null;

  return sourceCreateSchema.parse({
    title,
    creator: cleanText(propertyText(props[propertyNames.creator]), "Unknown"),
    year: cleanText(propertyText(props[propertyNames.year]), "Undated"),
    type: cleanText(propertyText(props[propertyNames.type]), "archive_page"),
    era: cleanText(propertyText(props[propertyNames.era]), "Unsorted"),
    region: propertyText(props[propertyNames.region]),
    url: sourceUrl,
    filePath: imageUrl,
    archivedAt,
    status: normalizeStatus(notionStatus),
    notes: propertyText(props[propertyNames.notes]) ?? "",
    notionPageId: page.id,
  }) as SourceCreateInput & { notionPageId: string };
}

export async function syncNotionOrnamentSources(): Promise<NotionSyncResult> {
  const { auth, dataSourceId } = getNotionConfig();

  const notion = new Client({ auth });
  const upserted: Source[] = [];
  let scanned = 0;
  let cursor: string | undefined;

  do {
    const response = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
    });

    for (const result of response.results) {
      if (!("properties" in result) || !("url" in result)) continue;

      scanned += 1;
      const input = notionPageToSourceInput(result as NotionPage);
      upserted.push(await upsertSourceFromNotion(input));
    }

    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return { scanned, upserted };
}

export async function ensureNotionStatusProperty() {
  const { auth, dataSourceId } = getNotionConfig();
  const notion = new Client({ auth });

  await notion.dataSources.update({
    data_source_id: dataSourceId,
    properties: {
      [propertyNames.status]: {
        select: {
          options: [
            { name: "Active", color: "green" },
            { name: "Archived", color: "gray" },
          ],
        },
      },
    },
  });
}

async function setNotionSourceStatus(
  notionPageId: string,
  statusName: "Active" | "Archived",
) {
  const { auth } = getNotionConfig();
  const notion = new Client({ auth });

  try {
    await ensureNotionStatusProperty();
  } catch (error) {
    console.warn(
      "[ornaments] Could not ensure Notion Status select options",
      error,
    );
  }

  try {
    await notion.pages.update({
      page_id: notionPageId,
      archived: false,
      properties: {
        [propertyNames.status]: {
          select: { name: statusName },
        },
      },
    });
    return;
  } catch (selectError) {
    try {
      await notion.pages.update({
        page_id: notionPageId,
        archived: false,
        properties: {
          [propertyNames.status]: {
            status: { name: statusName },
          },
        },
      });
      return;
    } catch (statusError) {
      const details = {
        selectError:
          selectError instanceof Error ? selectError.message : selectError,
        statusError:
          statusError instanceof Error ? statusError.message : statusError,
      };
      console.error("[ornaments] Failed to update Notion Status", details);
      throw new ApiError(
        `Unable to set Notion Status to ${statusName}`,
        502,
        "NOTION_UPDATE_FAILED",
        details,
      );
    }
  }
}

export async function archiveNotionSourcePage(notionPageId: string) {
  await setNotionSourceStatus(notionPageId, "Archived");
}

export async function unarchiveNotionSourcePage(notionPageId: string) {
  await setNotionSourceStatus(notionPageId, "Active");
}
