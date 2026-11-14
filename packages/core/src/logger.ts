// Gated on AUTH0_LOG=debug (already documented as this repo's convention in its sample .env) -
// for low-level detail that would just be noise most of the time (e.g. which fields a read/write
// stripped), useful when actually debugging. Anything a human should see regardless (a command's
// own progress, a file it's about to overwrite or delete) stays a plain console.log/ui.ts helper,
// not this - this is only for the "noisy if always on" tier.
import chalk from "chalk";

export function debugLog(message: string): void {
  if (process.env.AUTH0_LOG === "debug") {
    console.log(chalk.gray(message));
  }
}
