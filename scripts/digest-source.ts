import fs from "node:fs/promises";
import { digestSource } from "../lib/ornaments/digester";
import { getSource, updateSource } from "../lib/ornaments/repository";

function hasFlag(name: string) {
  return process.argv.includes(name);
}

async function main() {
  const sourceId = process.argv[2];

  if (!sourceId) {
    throw new Error("Usage: npm run digest-source -- <source-id> [--dry-run] [--content path]");
  }

  const contentFlagIndex = process.argv.indexOf("--content");
  const contentPath =
    contentFlagIndex >= 0 ? process.argv[contentFlagIndex + 1] : undefined;
  const content = contentPath ? await fs.readFile(contentPath, "utf8") : undefined;
  const dryRun = hasFlag("--dry-run");
  const source = await getSource(sourceId);
  const result = await digestSource(source, { content, dryRun });

  if (!dryRun) {
    await updateSource(sourceId, { status: "digested" });
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
