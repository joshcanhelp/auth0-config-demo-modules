export type TenantType = "PUSH" | "PULL";

export function isTenantType(value: string): value is TenantType {
  return value === "PUSH" || value === "PULL";
}

export const TENANT_TYPE_OPTIONS: { label: string; value: TenantType }[] = [
  { label: "PUSH - read/write, this project can deploy config changes", value: "PUSH" },
  { label: "PULL - read-only, this project never deploys config changes", value: "PULL" },
];
