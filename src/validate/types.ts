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
