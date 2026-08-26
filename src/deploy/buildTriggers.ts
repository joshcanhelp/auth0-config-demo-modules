import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface ActionJson {
  name: string;
  deployed: boolean;
  supported_triggers: Array<{ id: string }>;
}

interface TriggerBinding {
  action_name: string;
  display_name: string;
}

// Scans tenant/actions/ for *.json files, filters out deployed:false, groups by
// trigger ID, sorts alphabetically, and regenerates triggers/triggers.json.
// Returns true if the file was written (content changed or did not exist).
export function buildTriggers(tenantDir: string): boolean {
  const actionsDir = join(tenantDir, "actions");

  if (!existsSync(actionsDir)) {
    return false;
  }

  const byTrigger = new Map<string, string[]>();

  for (const file of readdirSync(actionsDir).filter((f) => f.endsWith(".json"))) {
    const action = JSON.parse(
      readFileSync(join(actionsDir, file), "utf-8")
    ) as ActionJson;

    if (action.deployed === false) continue;

    for (const trigger of action.supported_triggers ?? []) {
      if (["event-stream", "custom-token-exchange"].includes(trigger.id)) {
        continue;
      }

      if (!byTrigger.has(trigger.id)) {
        byTrigger.set(trigger.id, []);
      }
      byTrigger.get(trigger.id)!.push(action.name);
    }
  }

  const result: Record<string, TriggerBinding[]> = {};
  for (const [triggerId, names] of [...byTrigger.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    result[triggerId] = names
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ action_name: name, display_name: name }));
  }

  const triggersDir = join(tenantDir, "triggers");
  if (!existsSync(triggersDir)) {
    mkdirSync(triggersDir);
  }

  const triggersJsonPath = join(triggersDir, "triggers.json");
  const newContent = JSON.stringify(result, null, 2) + "\n";

  let existing = "";
  try {
    existing = readFileSync(triggersJsonPath, "utf-8");
  } catch {
    // file doesn't exist yet
  }

  if (existing === newContent) {
    return false;
  }

  writeFileSync(triggersJsonPath, newContent);
  return true;
}
