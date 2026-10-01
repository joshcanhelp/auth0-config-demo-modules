import type { UserSchemaDef } from "../../../utils/tenantUserSchema.js";
import type { Finding, ValidationDefinition } from "../../types.js";
import type { TenantTag } from "../clients.js";
import {
  checkHardCodedValues,
  DEFINITIONS as HARD_CODED_VALUE_DEFINITIONS,
} from "./actionsHardCodedValueDetected.js";
import {
  checkOldNodeVersion,
  DEFINITIONS as OLD_NODE_VERSION_DEFINITIONS,
} from "./actionsOldNodeVersion.js";
import {
  checkUndeclaredMetadataField,
  DEFINITIONS as UNDECLARED_METADATA_FIELD_DEFINITIONS,
} from "./actionsUndeclaredMetadataField.js";
import {
  checkUndeclaredRootField,
  DEFINITIONS as UNDECLARED_ROOT_FIELD_DEFINITIONS,
} from "./actionsUndeclaredRootField.js";
import {
  checkUserEnumerationVulnerability,
  DEFINITIONS as USER_ENUMERATION_DEFINITIONS,
} from "./actionsUserEnumerationVulnerability.js";

// One file per validation code in this folder owns that code's own DEFINITIONS and check
// logic. This file only wires them together: which checks run for which entity, and what
// their combined DEFINITIONS map looks like.
export const DEFINITIONS: Record<string, ValidationDefinition> = {
  ...HARD_CODED_VALUE_DEFINITIONS,
  ...OLD_NODE_VERSION_DEFINITIONS,
  ...USER_ENUMERATION_DEFINITIONS,
  ...UNDECLARED_ROOT_FIELD_DEFINITIONS,
  ...UNDECLARED_METADATA_FIELD_DEFINITIONS,
};

// Action modules only have code + name - no triggers or runtime. Only the hardcoded-values
// check applies to them; the others either crash on missing fields or filter by trigger type
// and would produce no results anyway.
export async function validateActionModules(
  modules: unknown[],
  _tenantTag?: TenantTag
): Promise<Finding[]> {
  const adapted = (modules as Array<{ name: string; code: string }>).map((m) => ({
    ...m,
    supported_triggers: [{ id: "action-module", version: "v1" }],
  }));

  return checkHardCodedValues(adapted, { includeEntityId: false });
}

export async function validateActions(
  actions: unknown[],
  schema?: UserSchemaDef | null,
  _tenantTag?: TenantTag
): Promise<Finding[]> {
  const [hardCodedValueFindings, oldNodeVersionFindings, userEnumerationFindings] =
    await Promise.all([
      checkHardCodedValues(actions),
      checkOldNodeVersion(actions),
      checkUserEnumerationVulnerability(actions),
    ]);

  return [
    ...hardCodedValueFindings,
    ...oldNodeVersionFindings,
    ...userEnumerationFindings,
    ...checkUndeclaredRootField(actions, schema ?? null),
    ...checkUndeclaredMetadataField(actions, schema ?? null),
  ];
}
