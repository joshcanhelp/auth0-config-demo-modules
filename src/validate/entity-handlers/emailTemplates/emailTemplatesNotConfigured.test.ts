import { describe, expect, it } from "vitest";

import { checkEmailTemplatesNotConfigured } from "./emailTemplatesNotConfigured.js";

describe("checkEmailTemplatesNotConfigured", () => {
  it("reports a single finding when no template files exist at all", async () => {
    const findings = await checkEmailTemplatesNotConfigured({});

    expect(findings).toHaveLength(1);
    expect(findings[0].code).toBe("email_templates_not_configured");
    expect(findings[0].level).toBe("recommended");
  });

  it("does not report when at least one template is configured", async () => {
    const findings = await checkEmailTemplatesNotConfigured({
      blocked_account: { template: "blocked_account", enabled: true },
    });

    expect(findings).toHaveLength(0);
  });
});
