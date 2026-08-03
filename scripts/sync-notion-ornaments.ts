import { loadEnvConfig } from "@next/env";
import { syncNotionOrnamentSources } from "../lib/ornaments/notion-sync";

loadEnvConfig(process.cwd());

async function main() {
  const result = await syncNotionOrnamentSources();

  console.log(
    JSON.stringify(
      {
        ok: true,
        scanned: result.scanned,
        upserted: result.upserted.length,
        sourceIds: result.upserted.map((source) => source.id),
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
