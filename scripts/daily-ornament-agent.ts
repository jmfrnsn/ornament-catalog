import { loadEnvConfig } from "@next/env";
import { digestSource } from "../lib/ornaments/digester";
import { syncNotionOrnamentSources } from "../lib/ornaments/notion-sync";
import { getSource, listMotifs, listSources, updateSource } from "../lib/ornaments/repository";
import { suggestProjectThreads } from "../lib/ornaments/weaver";

loadEnvConfig(process.cwd());

async function main() {
  const sync = await syncNotionOrnamentSources();
  const sources = await listSources();
  const digestedSourceIds: string[] = [];

  for (const source of sources) {
    if (source.status === "digested") continue;

    const sourceWithMotifs = await getSource(source.id);
    if (sourceWithMotifs.motifs.length > 0) continue;

    await digestSource(source, { content: source.notes });
    await updateSource(source.id, { status: "digested" });
    digestedSourceIds.push(source.id);
  }

  const highResonanceMotifs = await listMotifs({ resonanceScore: 4 });
  const suggestions = suggestProjectThreads(highResonanceMotifs, sources, {
    limit: 3,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        notion: {
          scanned: sync.scanned,
          upserted: sync.upserted.length,
        },
        digestedSourceIds,
        projectSuggestions: suggestions,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
