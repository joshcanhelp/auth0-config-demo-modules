import type { TenantTag } from "../../utils/tenantTag.js";
import type { Finding, ValidationDefinition } from "../../utils/types.js";
import {
  checkErrorPageTemplateRawFilter,
  DEFINITIONS as RAW_FILTER_DEFINITIONS,
} from "./errorPageTemplateRawFilter.js";
import {
  checkErrorPageTemplateUnescapedOutput,
  DEFINITIONS as UNESCAPED_OUTPUT_DEFINITIONS,
} from "./errorPageTemplateUnescapedOutput.js";

export const DEFINITIONS: Record<string, ValidationDefinition> = {
  ...RAW_FILTER_DEFINITIONS,
  ...UNESCAPED_OUTPUT_DEFINITIONS,
};

export async function validateErrorPageTemplate(
  errorPageTemplate: string,
  _tenantTag?: TenantTag
): Promise<Finding[]> {
  const results = await Promise.all([
    checkErrorPageTemplateRawFilter(errorPageTemplate),
    checkErrorPageTemplateUnescapedOutput(errorPageTemplate),
  ]);

  return results.flat();
}
