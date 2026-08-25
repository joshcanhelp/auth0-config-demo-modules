import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["auth0-deploy-cli/**", "node_modules/**"],
  },
});
