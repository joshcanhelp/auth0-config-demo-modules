import { describe, expect, it } from "vitest";

import { validateEmailTemplates } from "./email_templates.js";

describe("validateEmailTemplates", () => {
  it("reports a single finding when no template files exist at all", async () => {
    const findings = await validateEmailTemplates({});

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe("email_templates_not_configured");
    expect(findings[0].level).toBe("recommended");
  });

  it("reports an enabled template as clean and leaves unconfigured types alone", async () => {
    const findings = await validateEmailTemplates({
      blocked_account: { template: "blocked_account", enabled: true },
    });

    const importantOrCritical = findings.filter(
      (f) => f.level === "important" || f.level === "critical"
    );
    expect(importantOrCritical).toHaveLength(0);

    const blockedAccountFinding = findings.find(
      (f) => f.clientName === "Blocked Account Email"
    );
    expect(blockedAccountFinding).toBeUndefined();

    // Every other known template type is still reported as not configured.
    const unconfigured = findings.filter(
      (f) => f.code === "email_template_not_configured"
    );
    expect(unconfigured.length).toBeGreaterThan(0);
  });

  it("reports a disabled template as not enabled", async () => {
    const findings = await validateEmailTemplates({
      welcome_email: { template: "welcome_email", enabled: false },
    });

    const finding = findings.find(
      (f) => f.code === "email_template_not_enabled" && f.clientName === "Welcome Email"
    );
    expect(finding).toBeDefined();
    expect(finding?.level).toBe("informational");
  });
});
