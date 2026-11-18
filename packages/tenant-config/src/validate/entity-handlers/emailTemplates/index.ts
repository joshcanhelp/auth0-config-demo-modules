import type { TenantTag } from "../../utils/tenantTag.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import {
  checkEmailTemplateNotConfigured,
  DEFINITIONS as TEMPLATE_NOT_CONFIGURED_DEFINITIONS,
} from "./emailTemplateNotConfigured.js";
import {
  checkEmailTemplateNotEnabled,
  DEFINITIONS as TEMPLATE_NOT_ENABLED_DEFINITIONS,
} from "./emailTemplateNotEnabled.js";
import {
  checkEmailTemplatesNotConfigured,
  DEFINITIONS as TEMPLATES_NOT_CONFIGURED_DEFINITIONS,
} from "./emailTemplatesNotConfigured.js";

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  ...TEMPLATES_NOT_CONFIGURED_DEFINITIONS,
  ...TEMPLATE_NOT_CONFIGURED_DEFINITIONS,
  ...TEMPLATE_NOT_ENABLED_DEFINITIONS,
};

export async function validateEmailTemplates(
  templatesByType: Record<string, unknown>,
  _tenantTag?: TenantTag
): Promise<Finding[]> {
  const results = await Promise.all([
    checkEmailTemplatesNotConfigured(templatesByType),
    checkEmailTemplateNotConfigured(templatesByType),
    checkEmailTemplateNotEnabled(templatesByType),
  ]);

  return results.flat();
}
