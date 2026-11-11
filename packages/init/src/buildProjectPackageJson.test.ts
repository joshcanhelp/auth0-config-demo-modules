import { describe, expect, it } from "vitest";
import { buildProjectPackageJson } from "./buildProjectPackageJson.js";

const rootPackageJson = {
  dependencies: {
    "express": "^5.2.1",
    "express-session": "^1.19.0",
    "zod": "^4.4.3",
    "dotenv": "^17.4.2",
    "some-other-dep": "^1.0.0",
  },
  devDependencies: {
    "@types/express": "^5.0.6",
    "@types/express-session": "^1.19.0",
    "@tsconfig/node22": "^22.0.5",
    "tsx": "^4.0.0",
    "typescript": "^5.0.0",
  },
};

describe("buildProjectPackageJson", () => {
  it("carries this repo's own dependency versions into the scaffolded package.json", () => {
    const result = JSON.parse(buildProjectPackageJson(rootPackageJson));

    expect(result.dependencies).toEqual({
      "auth0-config-demo-modules": "file:../auth0-config-demo-modules",
      "express": "^5.2.1",
      "express-session": "^1.19.0",
      "zod": "^4.4.3",
      "dotenv": "^17.4.2",
    });
    expect(result.devDependencies).toMatchObject({
      "@types/express": "^5.0.6",
      "@types/express-session": "^1.19.0",
      "@tsconfig/node22": "^22.0.5",
      "tsx": "^4.0.0",
    });
    expect(result.type).toBe("module");
    expect(result.scripts).toEqual({
      "start": "tsx ./serve.ts",
      "modules:local":
        "npm install auth0-config-demo-modules@file:../auth0-config-demo-modules",
      "modules:remote":
        "npm install auth0-config-demo-modules@github:joshcanhelp/auth0-config-demo-modules#main",
    });
  });

  it("throws if this repo's own package.json is missing a dependency the scaffold needs", () => {
    const missingExpress = {
      dependencies: {
        ...rootPackageJson.dependencies,
        express: undefined as unknown as string,
      },
      devDependencies: rootPackageJson.devDependencies,
    };

    expect(() => buildProjectPackageJson(missingExpress)).toThrow(/express/);
  });
});
