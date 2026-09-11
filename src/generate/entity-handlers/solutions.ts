import { readdirSync } from "node:fs";
import { join } from "node:path";

import { deriveActionName, writeAction } from "./actions.js";
import { deriveFlowName, writeFlow } from "./flows.js";
import { deriveFormName, writeForm } from "./forms.js";

export async function handleSolution(
  templateDir: string,
  tenantDir: string
): Promise<void> {
  const subdirs = readdirSync(templateDir, { withFileTypes: true }).filter(
    (entry) => entry.isDirectory() && !entry.name.startsWith(".")
  );

  for (const subdir of subdirs) {
    const subdirPath = join(templateDir, subdir.name);
    const [type] = subdir.name.split(" > ");

    if (type === "Action") {
      writeAction(subdirPath, tenantDir, deriveActionName(subdirPath));
    } else if (type === "Flow") {
      writeFlow(subdirPath, tenantDir, deriveFlowName(subdirPath));
    } else if (type === "Form") {
      writeForm(subdirPath, tenantDir, deriveFormName(subdirPath));
    } else {
      console.log(`Skipping unknown entity type: "${subdir.name}"`);
    }
  }
}
