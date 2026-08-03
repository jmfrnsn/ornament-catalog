import { loadEnvConfig } from "@next/env";
import { execFileSync } from "node:child_process";
import { DEFAULT_ORNAMENT_EXPORT_PATH, writeOrnamentSourcesExport } from "../lib/ornaments/export";
import { syncNotionOrnamentSources } from "../lib/ornaments/notion-sync";

loadEnvConfig(process.cwd());

type CommandOptions = {
  dryRun: boolean;
  noPush: boolean;
};

function parseOptions(): CommandOptions {
  return {
    dryRun: process.argv.includes("--dry-run"),
    noPush: process.argv.includes("--no-push"),
  };
}

function git(args: string[]) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function gitPassthrough(args: string[]) {
  execFileSync("git", args, {
    cwd: process.cwd(),
    stdio: "inherit",
  });
}

function getExportStatus(exportPath: string) {
  return git(["status", "--porcelain", "--", exportPath])
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

function hasMergeConflict(statusLines: string[]) {
  return statusLines.some((line) => {
    const index = line[0];
    const worktree = line[1];

    return index === "U" || worktree === "U" || (index === "A" && worktree === "A") || (index === "D" && worktree === "D");
  });
}

function getCurrentBranch() {
  const branch = git(["branch", "--show-current"]);

  if (!branch) {
    throw new Error("Cannot push ornament export from a detached HEAD");
  }

  return branch;
}

async function main() {
  const options = parseOptions();
  const sync = await syncNotionOrnamentSources();
  const { exportPath, snapshot } = await writeOrnamentSourcesExport(
    process.env.ORNAMENT_EXPORT_PATH ?? DEFAULT_ORNAMENT_EXPORT_PATH,
  );
  const statusLines = getExportStatus(exportPath);

  if (hasMergeConflict(statusLines)) {
    throw new Error(`Refusing to commit while ${exportPath} has merge conflicts`);
  }

  const summary = {
    ok: true,
    dryRun: options.dryRun,
    noPush: options.noPush,
    sync: {
      scanned: sync.scanned,
      upserted: sync.upserted.length,
    },
    export: {
      path: exportPath,
      total: snapshot.counts.total,
      active: snapshot.counts.active,
      archived: snapshot.counts.archived,
      changed: statusLines.length > 0,
    },
  };

  if (!statusLines.length) {
    console.log(JSON.stringify({ ...summary, committed: false, pushed: false }, null, 2));
    return;
  }

  if (options.dryRun || options.noPush) {
    console.log(JSON.stringify({ ...summary, committed: false, pushed: false }, null, 2));
    return;
  }

  const branch = getCurrentBranch();

  gitPassthrough(["add", "--", exportPath]);
  gitPassthrough([
    "commit",
    "-m",
    "Sync ornament sources from Notion",
    "--",
    exportPath,
  ]);
  gitPassthrough(["push", "origin", branch]);

  console.log(JSON.stringify({ ...summary, committed: true, pushed: true, branch }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
