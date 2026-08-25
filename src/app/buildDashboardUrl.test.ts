import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildDashboardUrl } from "./buildDashboardUrl.js";

describe("buildDashboardUrl", () => {
  it("builds a CIC demo platform URL", () => {
    assert.equal(
      buildDashboardUrl("mycompany.cic-demo-platform.auth0app.com"),
      "https://manage.cic-demo-platform.auth0app.com/dashboard/pi/mycompany"
    );
  });

  it("builds an auth0.com URL with region", () => {
    assert.equal(
      buildDashboardUrl("mycompany.us.auth0.com"),
      "https://manage.auth0.com/dashboard/us/mycompany"
    );
  });

  it("returns empty string for unrecognized domain", () => {
    assert.equal(buildDashboardUrl("custom-domain.example.com"), "");
  });
});
