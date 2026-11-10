import { describe, expect, it } from "vitest";
import { buildDashboardUrl } from "./buildDashboardUrl.js";

describe("buildDashboardUrl", () => {
  it("builds a CIC demo platform URL", () => {
    expect(buildDashboardUrl("mycompany.cic-demo-platform.auth0app.com")).toBe(
      "https://manage.cic-demo-platform.auth0app.com/dashboard/pi/mycompany"
    );
  });

  it("builds an auth0.com URL with region", () => {
    expect(buildDashboardUrl("mycompany.us.auth0.com")).toBe(
      "https://manage.auth0.com/dashboard/us/mycompany"
    );
  });

  it("returns empty string for unrecognized domain", () => {
    expect(buildDashboardUrl("custom-domain.example.com")).toBe("");
  });
});
