export type FindingLevel = "critical" | "important" | "recommended" | "informational";

export interface Finding {
  code: string;
  level: FindingLevel;
  clientName: string;
  clientId?: string;
  field?: string;
  value?: string;
  message: string;
}

// A static, instance-independent description of a validation check. Each entity
// handler owns one map of these, keyed by code, so the level and description are
// defined once and read by both the handler and the list-validations command.
export interface ValidationDefinition {
  level: FindingLevel;
  description: string;
}
