import type { AssetTypes } from "auth0-deploy-cli/lib/types.js";

// Maps a tenant directory name (kebab-case, matching auth0-deploy-cli's own
// directory constants in src/tools/constants.ts) to the Deploy CLI asset type
// it corresponds to. Shared by export.ts, import.ts, and watch.ts so every
// script recognizes the same set of entity types - each used to keep its own
// copy of this map and they drifted out of sync as new types were added.
export const DIR_TO_ASSET_TYPE: Record<string, AssetTypes> = {
  "action-modules": "actionModules",
  "actions": "actions",
  "attack-protection": "attackProtection",
  "branding": "branding",
  "clients": "clients",
  "connections": "connections",
  "custom-domains": "customDomains",
  "database-connections": "databases",
  "emails": "emailTemplates",
  "event-streams": "eventStreams",
  "flow-vault-connections": "flowVaultConnections",
  "flows": "flows",
  "forms": "forms",
  "grants": "clientGrants",
  "guardian": "guardianFactors",
  "log-streams": "logStreams",
  "phone-providers": "phoneProviders",
  "phone-templates": "phoneTemplates",
  "prompts": "prompts",
  "resource-servers": "resourceServers",
  "risk-assessment": "riskAssessment",
  "tenant": "tenant",
  "themes": "themes",
  "token-exchange-profiles": "tokenExchangeProfiles",
  "triggers": "triggers",
};
