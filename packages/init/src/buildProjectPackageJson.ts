import { strict as assert } from "node:assert";

export interface SourcePackageJson {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

const MODULE_NAME = "auth0-config-demo-modules";

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
const GITHUB_MODULE = `github:joshcanhelp/${MODULE_NAME}#main`;

function pick(source: Record<string, string>, keys: string[]): Record<string, string> {
  return Object.fromEntries(
    keys.map((key) => {
      assert(source[key], `Expected ${MODULE_NAME}'s package.json to list "${key}"`);
      return [key, source[key]];
    })
  );
}

export function buildProjectPackageJson(rootPackageJson: SourcePackageJson): string {
  const packageJson = {
    type: "module",
    scripts: {
      "start": "tsx ./serve.ts",
      "init": `tsx node_modules/${MODULE_NAME}/bin/demo.ts init`,
      "pull": `tsx node_modules/${MODULE_NAME}/bin/demo.ts pull`,
      "push": `tsx node_modules/${MODULE_NAME}/bin/demo.ts push`,
      // Switches which auth0-config-demo-modules this project runs against, with no
      // release/version/publish step either way. "local" (the default below) is a sibling
      // checkout, for developing against local edits to it. "remote" installs from its main
      // branch directly, so a push there can reach a deploy on its next build - run it before
      // the deploy's own `npm install` (which installs everything else).
      "modules:local": `npm install ${MODULE_NAME}@file:../${MODULE_NAME}`,
      "modules:remote": `npm install ${MODULE_NAME}@${GITHUB_MODULE}`,
      "build:deploy": "npm run modules:remote && npm install",
      "start:deploy": "npm start -- --tenant tenant-dev",
    },
    dependencies: {
      MODULE_NAME: GITHUB_MODULE,
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
