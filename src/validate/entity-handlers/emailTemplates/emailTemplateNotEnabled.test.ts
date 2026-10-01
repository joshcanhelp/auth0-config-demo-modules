import { describe, expect, it } from "vitest";

import { checkEmailTemplateNotEnabled } from "./emailTemplateNotEnabled.js";

describe("checkEmailTemplateNotEnabled", () => {
  it("reports a disabled template as not enabled", async () => {
    const findings = await checkEmailTemplateNotEnabled({
      welcome_email: { template: "welcome_email", enabled: false },
    });

    const finding = findings.find((f) => f.entityName === "Welcome Email");
    expect(finding).toBeDefined();
    expect(finding?.code).toBe("email_template_not_enabled");
    expect(finding?.level).toBe("informational");
  });

  it("does not flag an enabled template", async () => {
    const findings = await checkEmailTemplateNotEnabled({
      welcome_email: { template: "welcome_email", enabled: true },
    });

    expect(findings).toHaveLength(0);
  });
});
