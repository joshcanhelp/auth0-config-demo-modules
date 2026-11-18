import type { Management } from "auth0";
import { describe, expect, it } from "vitest";

import { checkCimdFieldsNotEditable } from "./clientsCimdFieldsNotEditable.js";

function makeClient(overrides: Record<string, unknown>): Management.Client {
  return {
    client_id: "client_123",
    name: "Test Client",
    ...overrides,
  } as Management.Client;
}

describe("checkCimdFieldsNotEditable", () => {
  it("returns no findings for a non-CIMD client", () => {
    const client = makeClient({ name: "should be ignored" });
    expect(checkCimdFieldsNotEditable([client])).toHaveLength(0);
  });

  it("returns no findings when only editable fields are set on a CIMD client", () => {
    const client = makeClient({
      name: undefined,
      external_client_id: "https://example.com/cimd.json",
      description: "ok",
      refresh_token: { rotation_type: "rotating" },
    });
    expect(checkCimdFieldsNotEditable([client])).toHaveLength(0);
  });

  it("flags fields outside the CIMD-editable set", () => {
    const client = makeClient({
      external_client_id: "https://example.com/cimd.json",
      name: "will be ignored",
      callbacks: ["https://example.com/callback"],
    });
    const findings = checkCimdFieldsNotEditable([client]);

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe("clients_cimd_fields_not_editable");
    expect(findings[0].level).toBe("important");
    expect(findings[0].message).toContain("name");
    expect(findings[0].message).toContain("callbacks");
  });

  it("ignores identity/read-only fields already covered by the general field strip", () => {
    const client = makeClient({
      name: undefined,
      external_client_id: "https://example.com/cimd.json",
      created_at: "2020-01-01",
      jwks_uri: "https://example.com/jwks.json",
    });
    expect(checkCimdFieldsNotEditable([client])).toHaveLength(0);
  });

  it("skips the global client", () => {
    const client = makeClient({
      global: true,
      external_client_id: "https://example.com/cimd.json",
      name: "will be ignored",
    });
    expect(checkCimdFieldsNotEditable([client])).toHaveLength(0);
  });
});
