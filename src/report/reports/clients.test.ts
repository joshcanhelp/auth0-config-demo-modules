import { describe, expect, it } from "vitest";

import type { Auth0Client } from "../../types.js";
import { buildClientsReport } from "./clients.js";

function makeClient(overrides: Partial<Auth0Client> = {}): Auth0Client {
  return {
    client_id: "client-id-1",
    name: "Web Application",
    app_type: "regular_web",
    grant_types: ["authorization_code"],
    token_endpoint_auth_method: "client_secret_post",
    callbacks: [],
    allowed_logout_urls: [],
    allowed_origins: [],
    ...overrides,
  };
}

describe("buildClientsReport", () => {
  it("renders a markdown table sorted by client name", () => {
    const clients = [
      makeClient({ name: "Zebra App", client_id: "id-z", app_type: "spa" }),
      makeClient({
        name: "Alpha App",
        client_id: "id-a",
        description: "First client",
        app_type: "native",
      }),
    ];
    const report = buildClientsReport(clients, "my-tenant", "md");

    expect(report).toBe(
      [
        "# Clients Report",
        "",
        "**Tenant:** my-tenant",
        "",
        "| Name | Description | Client ID | Type |",
        "| --- | --- | --- | --- |",
        "| Alpha App | First client | id-a | native |",
        "| Zebra App |  | id-z | spa |",
        "",
      ].join("\n")
    );
  });

  it("renders a JSON report with tenant metadata and empty description fallback", () => {
    const clients = [makeClient({ name: "Web Application" })];
    const report = buildClientsReport(clients, "my-tenant", "json");

    expect(JSON.parse(report)).toEqual({
      tenant: "my-tenant",
      clients: [
        {
          name: "Web Application",
          description: "",
          client_id: "client-id-1",
          app_type: "regular_web",
        },
      ],
    });
  });
});
