import { strict as assert } from "node:assert";
import { mkdir, stat } from "node:fs/promises";

export type EnsureDirectoryResult = "created" | "exists";

// Idempotent: creates `path` (and any missing parents) if it doesn't exist, and does nothing if
// it already does, so `init` can be re-run to resume a partially-scaffolded project. The result
// tells the caller which happened, so progress output can say "created" vs. "already there".
export async function ensureDirectory(path: string): Promise<EnsureDirectoryResult> {
  try {
    const stats = await stat(path);
    assert(stats.isDirectory(), `"${path}" already exists and is not a directory`);
    return "exists";
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  await mkdir(path, { recursive: true });
  return "created";
}
