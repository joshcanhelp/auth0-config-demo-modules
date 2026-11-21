import { strict as assert } from "node:assert";
import { watch, type FSWatcher } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import chalk from "chalk";
import type { Command } from "commander";
import {
  ManagementApiError,
  PromptSession,
} from "auth0-config-demo-modules/packages/core/src/index.js";
import { bootstrapTenant } from "../bootstrapTenant.js";
import type { EntityDefinition } from "../entityRegistry.js";
import {
  confirmAndRemoveMissingRecord,
  localFileNames,
  readEntityRecord,
} from "../localEntityFiles.js";
import { importSingleFile, pushSingleFile } from "../pushEntity.js";
import { sortKeysDeep } from "../sortKeysDeep.js";
import { runValidate } from "../validate/runValidate.js";
import { resolveWatchTargets, type WatchTarget } from "../watchTargets.js";

interface WatchOptions {
  tenant?: string;
  file?: string[];
  entity?: string[];
  skipPullPrompt: boolean;
  validate: boolean; // --no-validate sets this to false
  confirm: boolean; // --no-confirm sets this to false
  autoDeploy: boolean;
}

const DEBOUNCE_MS = 500;
// How long a "this write is ours, ignore the next fs event for it" suppression lasts before
// expiring on its own - a safety net so a stuck suppression (the expected event never arrives)
// can't silently eat a later, real change to the same file forever.
const SELF_WRITE_SUPPRESS_MS = DEBOUNCE_MS * 4;

interface PendingChange {
  entity: EntityDefinition;
  baseFileName: string;
}

function pendingKey(entity: EntityDefinition, baseFileName: string): string {
  return `${entity.name}/${baseFileName}`;
}

// Deep-equal, independent of key order - used to tell a real edit apart from a re-save that
// didn't actually change anything (an editor resave, a format-on-save, or our own deploy writing
// the server's response back, which always bumps at least `updated_at`).
function recordsAreEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>
): boolean {
  return JSON.stringify(sortKeysDeep(a)) === JSON.stringify(sortKeysDeep(b));
}

// Reads every file about to be watched before the first fs event can possibly arrive, so the
// very first save of a session is compared against what was actually on disk at startup instead
// of being treated as "changed" just because nothing was cached yet.
async function seedLastKnownContent(
  tenantDir: string,
  targets: WatchTarget[],
  lastKnownContent: Map<string, Record<string, unknown>>
): Promise<void> {
  for (const target of targets) {
    const fileNames = target.fileNames
      ? [...target.fileNames]
      : await localFileNames(tenantDir, target.entity);

    for (const baseFileName of fileNames) {
      try {
        const content = await readEntityRecord(tenantDir, target.entity, baseFileName);
        lastKnownContent.set(pendingKey(target.entity, baseFileName), content);
      } catch {
        // Unreadable right now (invalid JSON, permissions, mid-write) - the first real event
        // for it just gets treated as new, same as before this seeding step existed.
      }
    }
  }
}

// Matches core's printStepDone/printStepInfo/printWarning styling, but routed through
// prompts.print() so none of it ever gets interleaved with the pinned menu line below.
function printDone(prompts: PromptSession, message: string): void {
  prompts.print(`${chalk.green("✓")} ${message}`);
}
function printInfo(prompts: PromptSession, message: string): void {
  prompts.print(chalk.dim(message));
}
function printIssue(prompts: PromptSession, message: string): void {
  prompts.print(chalk.yellow(message));
}

async function runWatch(options: WatchOptions, prompts: PromptSession): Promise<void> {
  assert(!options.skipPullPrompt, "--skip-pull-prompt is not implemented yet.");
  assert(options.validate, "--no-validate is not implemented yet.");
  assert(options.confirm, "--no-confirm is not implemented yet.");

  const tenantsRoot = join(process.cwd(), "tenants");
  const { tenantName, tenantDir, api } = await bootstrapTenant(
    tenantsRoot,
    prompts,
    options.tenant,
    { requireWriteAccess: true }
  );

  const targets = await resolveWatchTargets(tenantsRoot, tenantDir, options, prompts);
  const watchedEntityNames = [...new Set(targets.map((target) => target.entity.name))];

  const pending = new Map<string, PendingChange>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  // Content last seen for a file, so a settled change can be compared against it - undefined
  // means "first time seeing this file," which is always treated as a real change.
  const lastKnownContent = new Map<string, Record<string, unknown>>();
  // Keys currently expecting exactly one more fs event that's actually our own write, not a
  // user edit - see markSelfWrite.
  const selfWrites = new Set<string>();
  const selfWriteTimers = new Map<string, ReturnType<typeof setTimeout>>();

  // Call right before writing a file as part of a deploy, so the fs event that write produces
  // doesn't get mistaken for a new, independent change and queued right back up.
  function markSelfWrite(key: string): void {
    selfWrites.add(key);
    const existing = selfWriteTimers.get(key);
    if (existing) clearTimeout(existing);
    selfWriteTimers.set(
      key,
      setTimeout(() => {
        selfWrites.delete(key);
        selfWriteTimers.delete(key);
      }, SELF_WRITE_SUPPRESS_MS)
    );
  }

  function consumeSelfWrite(key: string): boolean {
    if (!selfWrites.delete(key)) return false;
    const timer = selfWriteTimers.get(key);
    if (timer) clearTimeout(timer);
    selfWriteTimers.delete(key);
    return true;
  }

  // Resolves whether a settled change is worth acting on - not our own deploy's write-back, and
  // not a re-save of exactly the same content.
  async function isRealChange(
    entity: EntityDefinition,
    baseFileName: string
  ): Promise<boolean> {
    const key = pendingKey(entity, baseFileName);
    const wasSelfWrite = consumeSelfWrite(key);

    let content: Record<string, unknown>;
    try {
      content = await readEntityRecord(tenantDir, entity, baseFileName);
    } catch {
      lastKnownContent.delete(key);
      return !wasSelfWrite;
    }

    const previous = lastKnownContent.get(key);
    lastKnownContent.set(key, content);

    if (wasSelfWrite) return false;
    return previous === undefined || !recordsAreEqual(previous, content);
  }

  // Pushes an existing record, or imports a brand-new one (no identifier yet) - decided fresh
  // here rather than at detection time, in case the file was already imported another way (e.g.
  // a `demo push --import` run from another terminal) by the time this actually runs.
  async function deployOne(change: PendingChange): Promise<void> {
    const { entity, baseFileName } = change;
    const key = pendingKey(entity, baseFileName);

    let record: Record<string, unknown>;
    try {
      record = await readEntityRecord(tenantDir, entity, baseFileName);
    } catch {
      printInfo(
        prompts,
        `"${entity.name}/${baseFileName}.json" no longer exists - skipping.`
      );
      return;
    }

    try {
      if (typeof record[entity.identifierField] !== "string") {
        markSelfWrite(key);
        const filePath = await importSingleFile(api, tenantDir, entity, baseFileName);
        printDone(prompts, `Imported ${filePath}`);
        return;
      }
      markSelfWrite(key);
      const filePath = await pushSingleFile(api, tenantDir, entity, baseFileName);
      printDone(prompts, `Pushed ${filePath}`);
    } catch (err) {
      if (err instanceof ManagementApiError && err.status === 404) {
        await confirmAndRemoveMissingRecord(prompts, tenantDir, entity, baseFileName);
        return;
      }
      // A long-running watch session should survive one failed deploy - the next change (or a
      // manual retry from the menu) gets another chance, instead of the whole session crashing.
      printIssue(
        prompts,
        `Deploy failed for "${entity.name}/${baseFileName}.json": ${String(err)}`
      );
    }
  }

  function scheduleChange(entity: EntityDefinition, baseFileName: string): void {
    const key = pendingKey(entity, baseFileName);

    const existingTimer = timers.get(key);
    if (existingTimer) clearTimeout(existingTimer);

    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        void (async () => {
          if (!(await isRealChange(entity, baseFileName))) return;

          if (options.autoDeploy) {
            await deployOne({ entity, baseFileName });
            return;
          }
          pending.set(key, { entity, baseFileName });
          printInfo(
            prompts,
            `"${entity.name}/${baseFileName}.json" changed - queued (${pending.size} pending).`
          );
        })();
      }, DEBOUNCE_MS)
    );
  }

  await seedLastKnownContent(tenantDir, targets, lastKnownContent);

  const watchers: FSWatcher[] = targets.map((target) =>
    watch(join(tenantDir, target.entity.name), (_event, filename) => {
      if (!filename || !filename.endsWith(".json")) return;
      const baseFileName = filename.slice(0, -".json".length);
      if (target.fileNames && !target.fileNames.has(baseFileName)) return;
      scheduleChange(target.entity, baseFileName);
    })
  );

  async function deployPending(): Promise<void> {
    if (pending.size === 0) {
      printInfo(prompts, "Nothing pending to deploy.");
      return;
    }
    const changes = [...pending.values()];
    pending.clear();
    for (const change of changes) {
      await deployOne(change);
    }
  }

  async function runValidateMenu(): Promise<void> {
    await runValidate(
      {
        tenant: tenantName,
        entity: watchedEntityNames,
        showPassed: false,
        verbose: false,
      },
      prompts
    );
  }

  printDone(
    prompts,
    `Watching ${watchedEntityNames.join(", ")} in ${tenantDir}` +
      (options.autoDeploy ? " (auto-deploy on)" : "")
  );

  for (;;) {
    const choice = await prompts.menu<"deploy" | "validate" | "generate" | "quit">(
      () => `${pending.size} pending`,
      [
        { label: "Deploy", value: "deploy" },
        { label: "Validate", value: "validate" },
        { label: "Generate", value: "generate" },
        { label: "Quit", value: "quit" },
      ]
    );

    if (choice === "quit") break;
    if (choice === "deploy") await deployPending();
    if (choice === "validate") await runValidateMenu();
    if (choice === "generate")
      printInfo(prompts, "Generate isn't wired into watch's menu yet.");
  }

  for (const timer of timers.values()) clearTimeout(timer);
  for (const timer of selfWriteTimers.values()) clearTimeout(timer);
  for (const watcher of watchers) watcher.close();
}

export function registerWatchCommand(program: Command): void {
  program
    .command("watch")
    .description("Watch local tenant config files and push changes as they're saved.")
    .option("--tenant <name>", "tenant directory name (skips interactive selection)")
    .option("--file <path...>", "watch only these files (prompts to choose if omitted)")
    .option("--entity <name...>", "watch only these entity types")
    .option(
      "--skip-pull-prompt",
      "don't prompt to pull local files before watching starts",
      false
    )
    .option("--no-validate", "push changed files without validating them first")
    .option(
      "--no-confirm",
      "push even when validation produces warnings, without asking first"
    )
    .option(
      "--auto-deploy",
      "deploy each change immediately instead of queuing it for the idle menu's " +
        '"deploy" option',
      false
    )
    .action(async (options: WatchOptions) => {
      const prompts = new PromptSession();
      try {
        await runWatch(options, prompts);
      } finally {
        prompts.close();
      }
    });
}
