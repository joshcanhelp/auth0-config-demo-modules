import { strict as assert } from "node:assert";

export interface SourcePackageJson {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

// This repo's own dependency versions are the single source of truth for what a scaffolded
// project needs to run serve.ts - kept here instead of duplicated as a second set of hardcoded
// version strings that could silently drift out of sync.
const DEPENDENCY_KEYS = ["express", "express-session", "zod", "dotenv"];
const DEV_DEPENDENCY_KEYS = [
  "@types/express",
  "@types/express-session",
  "@tsconfig/node22",
  "tsx",
];

// Update if this repo ever moves to a different GitHub owner/org.
const MODULES_GITHUB_PATH = "joshcanhelp/auth0-config-demo-modules";

function pick(source: Record<string, string>, keys: string[]): Record<string, string> {
  return Object.fromEntries(
    keys.map((key) => {
      assert(
        source[key],
        `Expected auth0-config-demo-modules's package.json to list "${key}"`
      );
      return [key, source[key]];
    })
  );
}

export function buildProjectPackageJson(rootPackageJson: SourcePackageJson): string {
  const packageJson = {
    type: "module",
    scripts: {
      "start": "tsx ./serve.ts",
      // Switches which auth0-config-demo-modules this project runs against, with no
      // release/version/publish step either way. "local" (the default below) is a sibling
      // checkout, for developing against local edits to it. "remote" installs from its main
      // branch directly, so a push there can reach a deploy on its next build - run it before
      // the deploy's own `npm install` (which installs everything else).
      "modules:local": "npm install auth0-config-demo-modules@file:../auth0-config-demo-modules",
      "modules:remote": `npm install auth0-config-demo-modules@github:${MODULES_GITHUB_PATH}#main`,
    },
    dependencies: {
      "auth0-config-demo-modules": "file:../auth0-config-demo-modules",
      ...pick(rootPackageJson.dependencies, DEPENDENCY_KEYS),
    },
    devDependencies: {
      // Not one of this repo's own dependencies (it shares a single install's node_modules,
      // where @types/node only ever comes in transitively) - a scaffolded project is a separate
      // npm install and needs it directly.
      "@types/node": "^26.0.0",
      ...pick(rootPackageJson.devDependencies, DEV_DEPENDENCY_KEYS),
    },
  };
  return JSON.stringify(packageJson, null, 2) + "\n";
}
