import { describe, expect, it } from "vitest";

import { checkEmailTemplateNotConfigured } from "./emailTemplateNotConfigured.js";

describe("checkEmailTemplateNotConfigured", () => {
  it("reports every other known template type as not configured", async () => {
    const findings = await checkEmailTemplateNotConfigured({
      blocked_account: { template: "blocked_account", enabled: true },
    });

    expect(findings.length).toBeGreaterThan(0);
    expect(findings.every((f) => f.code === "email_template_not_configured")).toBe(true);
  });

  it("does not flag the one configured template", async () => {
    const findings = await checkEmailTemplateNotConfigured({
      blocked_account: { template: "blocked_account", enabled: true },
    });

    const blockedAccountFinding = findings.find(
      (f) => f.entityName === "Blocked Account Email"
    );
    expect(blockedAccountFinding).toBeUndefined();
  });

  it("reports nothing when no templates exist at all (handled by email_templates_not_configured instead)", async () => {
    const findings = await checkEmailTemplateNotConfigured({});
    expect(findings).toHaveLength(0);
  });
});
