export const TENANT_TAGS = ["dev", "stage", "prod"] as const;
export type TenantTag = (typeof TENANT_TAGS)[number];
