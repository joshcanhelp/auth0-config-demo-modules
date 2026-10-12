import { describe, expect, it } from "vitest";

import { getSelfServiceRows } from "./renderClientPage.js";
import type { Auth0Client, Connection } from "../../types.js";

const dbConnection = {
  name: "Username-Password-Authentication",
  strategy: "auth0",
} as Connection;

const backendClient: Auth0Client = {
  client_id: "web123",
  name: "Web App",
  app_type: "regular_web",
  grant_types: ["authorization_code", "client_credentials"],
  token_endpoint_auth_method: "client_secret_post",
  callbacks: [],
  allowed_logout_urls: [],
  allowed_origins: [],
};

const backendClientNoGrant: Auth0Client = {
  ...backendClient,
  grant_types: ["authorization_code"],
};

const spaClientWithBff: Auth0Client = {
  client_id: "spa456",
  name: "SPA App",
  app_type: "spa",
  grant_types: ["authorization_code"],
  token_endpoint_auth_method: "none",
  callbacks: [],
  allowed_logout_urls: [],
  allowed_origins: [],
  client_metadata: { bff_client_id: "bff789" },
};

const spaClientNoBff: Auth0Client = {
  ...spaClientWithBff,
  client_metadata: undefined,
};

function findRow(rows: ReturnType<typeof getSelfServiceRows>, label: string) {
  const row = rows.find((r) => r.label === label);
  if (!row) throw new Error(`Row not found: ${label}`);
  return row;
}

describe("getSelfServiceRows", () => {
  it("hides all rows and gives a reason when there is no database connection", () => {
    const rows = getSelfServiceRows(backendClient, [], "backend");

    expect(findRow(rows, "Change Password (email)")).toMatchObject({
      available: false,
      reason: "Requires a database connection.",
    });
    expect(findRow(rows, "Change Password (link)")).toMatchObject({
      available: false,
      reason: "Requires a database connection.",
    });
  });

  it("enables Verify Email for a backend client with the client_credentials grant", () => {
    const rows = getSelfServiceRows(backendClient, [dbConnection], "backend");

    expect(findRow(rows, "Verify Email")).toMatchObject({ available: true });
    expect(findRow(rows, "Change Password (link)")).toMatchObject({ available: true });
  });

  it("hides Verify Email and Change Password (link) when a backend client lacks the client_credentials grant", () => {
    const rows = getSelfServiceRows(backendClientNoGrant, [dbConnection], "backend");

    expect(findRow(rows, "Verify Email")).toMatchObject({
      available: false,
      reason: "Requires the client_credentials grant.",
    });
    expect(findRow(rows, "Change Password (link)")).toMatchObject({
      available: false,
      reason: "Requires the client_credentials grant.",
    });
  });

  it("hides Verify Email for a frontend client regardless of configuration", () => {
    const rows = getSelfServiceRows(spaClientWithBff, [dbConnection], "frontend");

    expect(findRow(rows, "Verify Email")).toMatchObject({
      available: false,
      reason: "Requires a backend login - this client authenticates in the browser.",
    });
  });

  it("enables Change Password (link) for a frontend client with a bff_client_id", () => {
    const rows = getSelfServiceRows(spaClientWithBff, [dbConnection], "frontend");

    expect(findRow(rows, "Change Password (link)")).toMatchObject({ available: true });
  });

  it("hides Change Password (link) for a frontend client without a bff_client_id", () => {
    const rows = getSelfServiceRows(spaClientNoBff, [dbConnection], "frontend");

    expect(findRow(rows, "Change Password (link)")).toMatchObject({
      available: false,
      reason: "Requires a bff_client_id in client metadata.",
    });
  });
});
