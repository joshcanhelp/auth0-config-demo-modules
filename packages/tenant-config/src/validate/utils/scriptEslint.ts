import { ESLint, type Linter } from "eslint";
import globals from "globals";

// Action and custom DB scripts run in Auth0's own sandboxed Node.js runtime, not in this
// repo's own TypeScript/browser code - so they get a dedicated, minimal rule set instead of
// reusing eslint.config.js at the repo root. Rules are limited to likely-bug correctness
// checks (undefined references, dead code, duplicate keys, etc.), not style - a false
// positive here reads as a tool bug, not a lint opinion someone can configure away.
// Exported (not just used locally) so `demo init` can generate a project's eslint.config.js
// from this exact same source instead of hand-copying a second list that could drift from
// what `demo validate` actually checks - see packages/init/src/buildProjectEslintConfig.ts.
export const RULES: Linter.RulesRecord = {
  "no-undef": "error",
  "no-unused-vars": ["error", { args: "none", varsIgnorePattern: "^_" }],
  "no-redeclare": "error",
  "no-dupe-keys": "error",
  "no-dupe-args": "error",
  "no-dupe-else-if": "error",
  "no-duplicate-case": "error",
  "no-const-assign": "error",
  "no-unreachable": "error",
  "no-unsafe-finally": "error",
  "no-unsafe-negation": "error",
  "no-unsafe-optional-chaining": "error",
  "no-case-declarations": "error",
  "no-fallthrough": "error",
  "no-cond-assign": "error",
  "no-constant-condition": ["error", { checkLoops: false }],
  "no-self-assign": "error",
  "no-self-compare": "error",
  "no-sparse-arrays": "error",
  "no-obj-calls": "error",
  "no-async-promise-executor": "error",
  "no-misleading-character-class": "error",
  "no-unexpected-multiline": "error",
  "no-irregular-whitespace": "error",
  "use-isnan": "error",
  "valid-typeof": "error",
};

// Custom database scripts run in Auth0's legacy sandbox, which injects a `configuration`
// object (the connection's configuration values) and a set of error constructors as globals
// rather than requiring them - unlike Actions, where everything a script needs arrives as a
// declared function parameter (event, api). Without these, every real script trips
// `no-undef` on code it has no choice but to write.
export const DATABASE_SCRIPT_GLOBALS: Record<string, "readonly"> = {
  configuration: "readonly",
  WrongUsernameOrPasswordError: "readonly",
  ValidationError: "readonly",
  UnauthorizedError: "readonly",
  InvalidSignupError: "readonly",
  PasswordStrengthError: "readonly",
  PasswordHistoryError: "readonly",
  PasswordDictionaryError: "readonly",
  PasswordNoUserInfoError: "readonly",
};

// Shared/custom modules (required from actions as "actions:<module-name>") get an injected
// `actions` global (actions.secrets, etc.) instead of the (event, api) parameters a regular
// triggered action receives - that's how they reach their own secrets without those params.
export const ACTION_MODULE_GLOBALS: Record<string, "readonly"> = {
  actions: "readonly",
};

// Re-exported so callers building a standalone config (init's generated eslint.config.js)
// don't need their own dependency on "globals" just to match what this file lints with.
export const NODE_GLOBALS: Record<string, unknown> = { ...globals.node };

export interface ScriptLintIssue {
  ruleId: string | null;
  message: string;
  line: number;
}

function buildConfig(extraGlobals: Record<string, "readonly"> = {}): Linter.Config {
  return {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: { ...NODE_GLOBALS, ...extraGlobals },
    },
    linterOptions: { reportUnusedDisableDirectives: false },
    rules: RULES,
  };
}

// A fresh ESLint instance per call keeps this stateless for callers - these scripts are
// small and this only runs as part of `validate`, not in a hot loop.
async function lint(
  code: string,
  extraGlobals?: Record<string, "readonly">
): Promise<ScriptLintIssue[]> {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: buildConfig(extraGlobals),
  });
  const [result] = await eslint.lintText(code);
  return (result?.messages ?? []).map((m) => ({
    ruleId: m.ruleId,
    message: m.message,
    line: m.line,
  }));
}

export function lintScriptCode(code: string): Promise<ScriptLintIssue[]> {
  return lint(code);
}

export function lintActionModuleCode(code: string): Promise<ScriptLintIssue[]> {
  return lint(code, ACTION_MODULE_GLOBALS);
}

// A custom DB script's convention is a single un-exported top-level function (e.g.
// `function login(...) {...}`) that Auth0's runtime invokes directly by position in the
// file - it's never referenced from within the script itself. That makes `no-unused-vars`
// flag it on every single script; filter that one specific, expected case back out rather
// than losing the rule's ability to catch genuinely unused locals inside the script body.
const TOP_LEVEL_FUNCTION_NAME = /^function\s+([A-Za-z_$][\w$]*)\s*\(/m;

export async function lintDatabaseScriptCode(code: string): Promise<ScriptLintIssue[]> {
  const issues = await lint(code, DATABASE_SCRIPT_GLOBALS);
  const entryPointName = code.match(TOP_LEVEL_FUNCTION_NAME)?.[1];
  if (!entryPointName) return issues;

  return issues.filter(
    (issue) =>
      !(
        issue.ruleId === "no-unused-vars" &&
        issue.message.startsWith(`'${entryPointName}' is defined but never used`)
      )
  );
}
