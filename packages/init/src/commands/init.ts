import { strict as assert } from "node:assert";
import { join, resolve } from "node:path";
import chalk from "chalk";
import type { Command } from "commander";
import { checkDomainIsReachable } from "../checkDomainIsReachable.js";
import { ensureDirectory } from "../ensureDirectory.js";
import { PromptSession } from "../prompts.js";
import { isValidTenantName, pickDefaultTenantName } from "../tenantName.js";
import {
  isTenantConfigured,
  listTenantDirectories,
  writeTenantEnvValue,
  type ExistingTenant,
  type TenantEnv,
} from "../tenantEnv.js";
import { isTenantType, TENANT_TYPE_OPTIONS, type TenantType } from "../tenantType.js";
import {
  printBanner,
  printCallout,
  printChecklistOverview,
  printStepDone,
  printStepInfo,
  printWarning,
} from "../ui.js";

const STEPS = [
  "Create your project folder",
  "Find or create your tenant folder",
  "Choose how this project connects to Auth0 (PUSH or PULL)",
  "Connect to your Auth0 tenant",
  "Create deployment credentials (coming soon)",
];

// Figures out which tenant this run should configure: an existing one that was left
// half-configured by an earlier run, or (once every existing tenant is complete) a brand-new
// one - prompting to add one rather than assuming that's wanted.
async function determineTenantToConfigure(
  prompts: PromptSession,
  existingTenants: ExistingTenant[]
): Promise<string | null> {
  const incomplete = existingTenants.find((tenant) => !isTenantConfigured(tenant.env));
  if (incomplete) {
    printStepInfo(
      `Found tenant "${incomplete.name}" that isn't fully configured yet - resuming its setup.`
    );
    return incomplete.name;
  }

  const existingNames = existingTenants.map((tenant) => tenant.name);
  if (existingNames.length > 0) {
    printStepDone(
      `Existing tenant(s) already configured: ${chalk.cyan(existingNames.join(", "))}`
    );
    const addAnother = await prompts.confirm("Add a new tenant?");
    if (!addAnother) return null;
  }

  printStepInfo(
    "This becomes a folder at tenants/<name>/, holding this tenant's local config and " +
      "connection settings - not a path, just a short label for it."
  );
  const tenantName = await prompts.text(
    'Tenant folder name (e.g. the client name, like "acme")',
    pickDefaultTenantName(existingNames)
  );
  assert(
    isValidTenantName(tenantName),
    `Tenant folder name can only contain letters, numbers, "-", and "_" - got "${tenantName}"`
  );
  assert(
    !existingNames.includes(tenantName),
    `Tenant "${tenantName}" already exists - choose a different name.`
  );
  return tenantName;
}

// Loops so a typo'd domain can be corrected instead of failing outright.
async function resolveDomain(
  prompts: PromptSession,
  knownDomain?: string
): Promise<string> {
  let domain = knownDomain;
  for (;;) {
    if (!domain) {
      printStepInfo(
        "This is the domain shown under Settings in that tenant's Auth0 Dashboard, e.g. " +
          "my-tenant.us.auth0.com."
      );
      domain = await prompts.text("Auth0 tenant domain");
    }
    try {
      await checkDomainIsReachable(domain);
      return domain;
    } catch (err) {
      printWarning(err instanceof Error ? err.message : String(err));
      domain = undefined;
    }
  }
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Scaffold a new demo project and connect it to a tenant.")
    .argument("[dir]", "directory to scaffold into (prompts if omitted)")
    .action(async (dir?: string) => {
      printBanner();
      printChecklistOverview(STEPS);

      const prompts = new PromptSession();
      try {
        // Resolved (not ".") so the prompt and the "created/using existing" message below both
        // show the real path, rather than a bare "." that doesn't say where it actually points.
        let projectDirInput = dir;
        if (!projectDirInput) {
          printStepInfo(
            "This is the folder the project gets scaffolded into - the one you're already in, " +
              "or a new one to create it in instead."
          );
          projectDirInput = await prompts.text(
            "Project folder",
            process.cwd(),
            "current directory"
          );
        }
        const projectDir = resolve(projectDirInput);
        const projectDirResult = await ensureDirectory(projectDir);
        printStepDone(
          `${projectDirResult === "created" ? "Created" : "Using existing"} project folder: ` +
            chalk.cyan(projectDir)
        );

        const tenantsRoot = join(projectDir, "tenants");
        const existingTenants = await listTenantDirectories(tenantsRoot);

        const tenantName = await determineTenantToConfigure(prompts, existingTenants);
        if (tenantName === null) {
          console.log();
          printStepInfo("Nothing more to do - every tenant is already configured.");
          return;
        }

        const tenantDir = join(tenantsRoot, tenantName);
        const tenantDirResult = await ensureDirectory(tenantDir);
        printStepDone(
          `${tenantDirResult === "created" ? "Created" : "Using existing"} tenant folder: ` +
            chalk.cyan(tenantDir)
        );

        const existingEnv: TenantEnv =
          existingTenants.find((tenant) => tenant.name === tenantName)?.env ?? {};

        let tenantType = existingEnv.TENANT_TYPE;
        if (tenantType) {
          assert(
            isTenantType(tenantType),
            `tenants/${tenantName}/.env has an invalid TENANT_TYPE: "${tenantType}" ` +
              `(expected PUSH or PULL)`
          );
        } else {
          printStepInfo(
            "PUSH projects can deploy config changes to the tenant; PULL projects only ever " +
              "read from it."
          );
          tenantType = await prompts.select(
            "How should this project connect?",
            TENANT_TYPE_OPTIONS
          );
        }
        await writeTenantEnvValue(tenantDir, "TENANT_TYPE", tenantType as TenantType);
        printStepDone(`Tenant type: ${chalk.cyan(tenantType)}`);

        if (!existingEnv.TENANT_DOMAIN) {
          printCallout([
            "Create (or pick an existing) tenant for this demo in the Auth0 Dashboard:",
            "  https://manage.auth0.com/",
          ]);
        }

        const domain = await resolveDomain(prompts, existingEnv.TENANT_DOMAIN);
        await writeTenantEnvValue(tenantDir, "TENANT_DOMAIN", domain);
        printStepDone(`Connected to tenant: ${chalk.cyan(domain)}`);

        // TODO (next step): tell the user to create an M2M client for deployment (link to docs),
        // prompt for the client id/secret, confirm we can get a token with scopes that make
        // sense for `tenantType`, and only then write those to tenants/<name>/.env too (and
        // extend tenantEnv.ts's isTenantConfigured to require them).
        console.log();
        printStepInfo(
          `Next: create an M2M client on "${domain}" for deployment, then re-run init to ` +
            `finish setup.`
        );
      } finally {
        prompts.close();
      }
    });
}
