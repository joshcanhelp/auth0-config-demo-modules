import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface PartialEntry {
  name: string;
  template: string;
}

type PartialsJson = Record<string, Array<Record<string, PartialEntry[]>>>;

// Scans tenant/prompts/partials/ for .liquid files and regenerates partials.json.
// Returns true if the file was written (content changed or did not exist).
export function buildPromptPartials(tenantDir: string): boolean {
  const promptsDir = join(tenantDir, "prompts");
  const partialsDir = join(promptsDir, "partials");
  const partialsJsonPath = join(promptsDir, "partials.json");

  if (!existsSync(partialsDir)) {
    return false;
  }

  const liquidFiles = (readdirSync(partialsDir, { recursive: true }) as string[])
    .filter((f) => f.endsWith(".liquid"))
    .map((f) => f.replace(/\\/g, "/"));

  // promptName -> screenName -> entries
  const byPrompt = new Map<string, Map<string, PartialEntry[]>>();

  for (const file of liquidFiles) {
    const parts = file.split("/");
    if (parts.length !== 3) continue;

    const [promptName, screenName, filename] = parts;
    const name = filename.replace(/\.liquid$/, "");
    const template = `partials/${file}`;

    if (!byPrompt.has(promptName)) {
      byPrompt.set(promptName, new Map());
    }

    const byScreen = byPrompt.get(promptName)!;
    if (!byScreen.has(screenName)) {
      byScreen.set(screenName, []);
    }

    byScreen.get(screenName)!.push({ name, template });
  }

  const result: PartialsJson = {};
  for (const [promptName, byScreen] of byPrompt) {
    result[promptName] = [];
    for (const [screenName, entries] of byScreen) {
      result[promptName].push({ [screenName]: entries });
    }
  }

  const newContent = JSON.stringify(result, null, 2) + "\n";

  let existing = "";
  try {
    existing = readFileSync(partialsJsonPath, "utf-8");
  } catch {
    // file doesn't exist yet
  }

  if (existing === newContent) {
    return false;
  }

  writeFileSync(partialsJsonPath, newContent);
  return true;
}
