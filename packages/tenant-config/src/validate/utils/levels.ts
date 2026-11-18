import chalk from "chalk";

import type { FindingLevel } from "./types.js";

export const LEVEL_ORDER: Record<FindingLevel, number> = {
  critical: 0,
  important: 1,
  recommended: 2,
  informational: 3,
};

export const LEVEL_COLOR: Record<FindingLevel, chalk.Chalk> = {
  critical: chalk.red.bold,
  important: chalk.yellow,
  recommended: chalk.cyan,
  informational: chalk.gray,
};
