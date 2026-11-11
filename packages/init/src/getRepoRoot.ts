import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// This file lives at packages/init/src/, three directories below the repo root - not based on
// process.cwd(), since `init` should resolve the same way regardless of where it's invoked from.
const here = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(here, "..", "..", "..");
