// Shared stub helper for command actions across every package that hasn't been built out yet.
// See projects/003 Restructure.md for the planned behavior of each command.
export function notImplemented(command: string): never {
  throw new Error(
    `"${command}" is not implemented yet - see projects/003 Restructure.md for the planned behavior.`
  );
}
