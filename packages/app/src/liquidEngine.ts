import { readFileSync } from "node:fs";
import { Liquid } from "liquidjs";

const liquid = new Liquid();

// liquidjs's renderFile() resolves against its `root` option and refuses paths outside
// it - which breaks once this package is consumed from another project's node_modules.
// Reading the file ourselves and parsing the source directly sidesteps that entirely.
export function renderLiquidFile(
  filePath: string,
  data: Record<string, unknown>
): Promise<string> {
  const source = readFileSync(filePath, "utf8");
  return liquid.parseAndRender(source, data);
}
