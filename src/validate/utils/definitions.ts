import { DEFINITIONS as ACTION_DEFINITIONS } from "../entity-handlers/actions/index.js";
import { DEFINITIONS as ATTACK_PROTECTION_DEFINITIONS } from "../entity-handlers/attackProtection/index.js";
import { DEFINITIONS as CLIENT_DEFINITIONS } from "../entity-handlers/clients/index.js";
import { DEFINITIONS as CUSTOM_DOMAIN_DEFINITIONS } from "../entity-handlers/customDomain/index.js";
import { DEFINITIONS as DATABASE_DEFINITIONS } from "../entity-handlers/databases/index.js";
import { DEFINITIONS as EMAIL_TEMPLATE_DEFINITIONS } from "../entity-handlers/emailTemplates/index.js";
import { DEFINITIONS as ERROR_PAGE_TEMPLATE_DEFINITIONS } from "../entity-handlers/errorPageTemplate/index.js";
import { DEFINITIONS as EVENT_STREAM_DEFINITIONS } from "../entity-handlers/eventStreams/index.js";
import { DEFINITIONS as RESOURCE_SERVER_DEFINITIONS } from "../entity-handlers/resourceServers/index.js";
import { DEFINITIONS as TENANT_SETTINGS_DEFINITIONS } from "../entity-handlers/tenantSettings/index.js";
import type { ValidationDefinition } from "./types.js";

// Single registry of every entity's DEFINITIONS map, used by both the
// validate:list command and tenant skip-config validation.
export const ENTITY_DEFINITIONS: {
  entity: string;
  definitions: Record<string, ValidationDefinition>;
}[] = [
  { entity: "clients", definitions: CLIENT_DEFINITIONS },
  { entity: "actions", definitions: ACTION_DEFINITIONS },
  { entity: "attack-protection", definitions: ATTACK_PROTECTION_DEFINITIONS },
  { entity: "custom-domains", definitions: CUSTOM_DOMAIN_DEFINITIONS },
  { entity: "database-connections", definitions: DATABASE_DEFINITIONS },
  { entity: "email-templates", definitions: EMAIL_TEMPLATE_DEFINITIONS },
  { entity: "pages", definitions: ERROR_PAGE_TEMPLATE_DEFINITIONS },
  { entity: "event-streams", definitions: EVENT_STREAM_DEFINITIONS },
  { entity: "resource-servers", definitions: RESOURCE_SERVER_DEFINITIONS },
  { entity: "tenant-settings", definitions: TENANT_SETTINGS_DEFINITIONS },
];

export const ALL_DEFINITIONS: Record<string, ValidationDefinition> = Object.assign(
  {},
  ...ENTITY_DEFINITIONS.map(({ definitions }) => definitions)
);
