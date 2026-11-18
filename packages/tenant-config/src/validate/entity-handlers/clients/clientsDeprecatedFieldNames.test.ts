import type { Management } from "auth0";
import { describe, expect, it } from "vitest";

import { checkDeprecatedFieldNames } from "./clientsDeprecatedFieldNames.js";

function makeClient(overrides: Record<string, unknown>): Management.Client {
  return {
    client_id: "client_123",
    name: "Test Client",
    ...overrides,
  } as Management.Client;
}

describe("checkDeprecatedFieldNames", () => {
  it("returns no findings when neither deprecated field is set", () => {
    const client = makeClient({});
    expect(checkDeprecatedFieldNames([client])).toHaveLength(0);
  });

  it("flags cross_origin_auth", () => {
    const client = makeClient({ cross_origin_auth: true });
    const findings = checkDeprecatedFieldNames([client]);

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe("clients_deprecated_cross_origin_auth");
    expect(findings[0].level).toBe("recommended");
    expect(findings[0].message).toContain("cross_origin_authentication");
  });

  it("flags oidc_backchannel_logout", () => {
    const client = makeClient({
      oidc_backchannel_logout: {
        backchannel_logout_urls: ["https://example.com/logout"],
      },
    });
    const findings = checkDeprecatedFieldNames([client]);

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe("clients_deprecated_oidc_backchannel_logout");
    expect(findings[0].message).toContain("oidc_logout");
  });

  it("flags both at once as separate findings", () => {
    const client = makeClient({
      cross_origin_auth: true,
      oidc_backchannel_logout: {
        backchannel_logout_urls: ["https://example.com/logout"],
      },
    });
    expect(checkDeprecatedFieldNames([client])).toHaveLength(2);
  });

  it("skips the global client", () => {
    const client = makeClient({ global: true, cross_origin_auth: true });
    expect(checkDeprecatedFieldNames([client])).toHaveLength(0);
  });
});
