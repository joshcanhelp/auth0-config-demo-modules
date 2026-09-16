import { DEFINITIONS as ACTION_DEFINITIONS } from "./entity-handlers/actions.js";
import { DEFINITIONS as ATTACK_PROTECTION_DEFINITIONS } from "./entity-handlers/attack_protection.js";
import { DEFINITIONS as CLIENT_DEFINITIONS } from "./entity-handlers/clients.js";
import { DEFINITIONS as CUSTOM_DOMAIN_DEFINITIONS } from "./entity-handlers/custom_domain.js";
import { DEFINITIONS as DATABASE_DEFINITIONS } from "./entity-handlers/databases.js";
import { DEFINITIONS as EMAIL_TEMPLATE_DEFINITIONS } from "./entity-handlers/email_templates.js";
import { DEFINITIONS as ERROR_PAGE_TEMPLATE_DEFINITIONS } from "./entity-handlers/error_page_template.js";
import { DEFINITIONS as EVENT_STREAM_DEFINITIONS } from "./entity-handlers/event_streams.js";
import { DEFINITIONS as RESOURCE_SERVER_DEFINITIONS } from "./entity-handlers/resource_servers.js";
import { DEFINITIONS as TENANT_SETTINGS_DEFINITIONS } from "./entity-handlers/tenant_settings.js";
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
