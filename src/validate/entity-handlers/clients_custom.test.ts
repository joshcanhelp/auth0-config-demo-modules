import type { Management } from "auth0";
import { describe, expect, it } from "vitest";

import { validateCustomClientChecks } from "./clients_custom.js";

function makeClient(overrides: Partial<Management.Client>): Management.Client {
  return {
    client_id: "client_123",
    name: "Test Client",
    app_type: "regular_web",
    ...overrides,
  } as Management.Client;
}

describe("validateCustomClientChecks", () => {
  it("returns no findings for a non_interactive client with no browser-redirect fields set", () => {
    const client = makeClient({ app_type: "non_interactive" });
    expect(validateCustomClientChecks([client])).toHaveLength(0);
  });

  it("reports one combined finding when multiple disallowed fields are set", () => {
    const client = makeClient({
      app_type: "non_interactive",
      callbacks: ["https://example.com/callback"],
      web_origins: ["https://example.com"],
    });
    const findings = validateCustomClientChecks([client]);

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe("clients_unexpected_fields_for_app_type");
    expect(findings[0].level).toBe("important");
    expect(findings[0].message).toContain("callbacks");
    expect(findings[0].message).toContain("web_origins");
  });

  it("reports allowed_origins set on a regular_web client", () => {
    const client = makeClient({
      app_type: "regular_web",
      allowed_origins: ["https://example.com"],
    });
    const findings = validateCustomClientChecks([client]);

    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("allowed_origins");
  });

  it("does not flag allowed_origins on a spa client", () => {
    const client = makeClient({
      app_type: "spa",
      allowed_origins: ["https://example.com"],
    });
    expect(validateCustomClientChecks([client])).toHaveLength(0);
  });

  it("skips the global client", () => {
    const client = makeClient({
      app_type: "non_interactive",
      global: true,
      callbacks: ["https://example.com/callback"],
    });
    expect(validateCustomClientChecks([client])).toHaveLength(0);
  });

  it("skips clients with no app_type", () => {
    const client = makeClient({
      app_type: undefined,
      callbacks: ["https://example.com/callback"],
    });
    expect(validateCustomClientChecks([client])).toHaveLength(0);
  });
});
