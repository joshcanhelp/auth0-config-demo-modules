import chalk from "chalk";
import type { Command } from "commander";
import { ENTITY_DEFINITIONS } from "../validate/utils/definitions.js";
import { LEVEL_COLOR, LEVEL_ORDER } from "../validate/utils/levels.js";

export function registerValidateListCommand(program: Command): void {
  program
    .command("validate-list")
    .description(
      "List every validation code, grouped by entity, with its level and description."
    )
    .action(() => {
      for (const { entity, definitions } of ENTITY_DEFINITIONS) {
        console.log(chalk.bold.underline(`\n${entity}`));

        const codes = Object.keys(definitions).sort(
          (a, b) => LEVEL_ORDER[definitions[a].level] - LEVEL_ORDER[definitions[b].level]
        );

        for (const code of codes) {
          const { level, description, property } = definitions[code];
          console.log(`  ${LEVEL_COLOR[level](level.padEnd(13))} ${chalk.bold(code)}`);
          console.log(`  ${" ".repeat(13)} ${chalk.dim(`${property}:`)} ${description}`);
        }
      }

      console.log("");
    });
}
