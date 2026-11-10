import chalk from "chalk";

export function printBanner(): void {
  console.log();
  console.log(chalk.bold.cyanBright("Auth0 Demo CLI") + chalk.dim("  ·  init"));
  console.log(
    chalk.dim("Scaffold a new demo project and connect it to an Auth0 tenant.")
  );
  console.log(chalk.dim("─".repeat(64)));
}

// A preview of the whole checklist, printed once up front so the user knows what's coming before
// any prompts start. Steps are checked off as they complete via printStepDone, below.
export function printChecklistOverview(steps: string[]): void {
  console.log(chalk.bold("\nHere's what we'll do:"));
  steps.forEach((step, i) => console.log(chalk.dim(`  ${i + 1}. ${step}`)));
  console.log();
}

export function printStepDone(message: string): void {
  console.log(`${chalk.green("✓")} ${message}`);
}

export function printStepInfo(message: string): void {
  console.log(chalk.dim(message));
}

export function printWarning(message: string): void {
  console.error(chalk.yellow(message));
}

// For "go do this in another tab before continuing" instructions - not a completed step, so it
// doesn't get a checkmark. Plain lines stay dim, same as printStepInfo; only the actual URL (once
// trimmed) gets color and an underline, so it reads as a link instead of blending in with the
// surrounding instructions.
export function printCallout(lines: string[]): void {
  console.log();
  lines.forEach((line) => {
    const style = line.trim().startsWith("http") ? chalk.cyan.underline : chalk.dim;
    console.log(style(line));
  });
  console.log();
}
