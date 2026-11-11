import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export type WriteFileIfMissingResult = "created" | "exists";

// Idempotent, like ensureDirectory: never overwrites a file a project has already customized
// (e.g. a serve.ts someone has started editing), so `init` can be re-run safely.
export async function writeFileIfMissing(
  path: string,
  content: string
): Promise<WriteFileIfMissingResult> {
  try {
    await stat(path);
    return "exists";
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
  return "created";
}
