import chalk from "chalk";

import { ENTITY_DEFINITIONS } from "./definitions.js";
import { LEVEL_COLOR, LEVEL_ORDER } from "./levels.js";

for (const { entity, definitions } of ENTITY_DEFINITIONS) {
  console.log(chalk.bold.underline(`\n${entity}`));

  const codes = Object.keys(definitions).sort(
    (a, b) => LEVEL_ORDER[definitions[a].level] - LEVEL_ORDER[definitions[b].level]
  );

  for (const code of codes) {
    const { level, description } = definitions[code];
    console.log(`  ${LEVEL_COLOR[level](level.padEnd(13))} ${chalk.bold(code)}`);
    console.log(`  ${" ".repeat(13)} ${description}`);
  }
}

console.log("");
