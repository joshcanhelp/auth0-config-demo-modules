import type { Management } from "auth0";
import { describe, expect, it } from "vitest";

import { checkTokenVaultPrivilegedAccessNotDeployable } from "./clientsTokenVaultPrivilegedAccessNotDeployable.js";

function makeClient(overrides: Partial<Management.Client>): Management.Client {
  return {
    client_id: "client_123",
    name: "Test Client",
    ...overrides,
  } as Management.Client;
}

describe("checkTokenVaultPrivilegedAccessNotDeployable", () => {
  it("returns no findings when token_vault_privileged_access is not set", () => {
    const client = makeClient({});
    expect(checkTokenVaultPrivilegedAccessNotDeployable([client])).toHaveLength(0);
  });

  it("flags a client with token_vault_privileged_access set", () => {
    const client = makeClient({
      token_vault_privileged_access: {
        credentials: [{ id: "cred_123" }],
        ip_allowlist: ["1.2.3.4"],
      },
    });
    const findings = checkTokenVaultPrivilegedAccessNotDeployable([client]);

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe("clients_token_vault_privileged_access_not_deployable");
    expect(findings[0].level).toBe("informational");
  });

  it("skips the global client", () => {
    const client = makeClient({
      global: true,
      token_vault_privileged_access: {
        credentials: [{ id: "cred_123" }],
        ip_allowlist: ["1.2.3.4"],
      },
    });
    expect(checkTokenVaultPrivilegedAccessNotDeployable([client])).toHaveLength(0);
  });
});
