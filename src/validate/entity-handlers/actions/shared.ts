// Common types and helpers reused by more than one check in this folder. Logic specific to
// a single validation code belongs in that code's own file, not here.

// checkActionsRuntime returns a flat array of items directly.
// checkActionsHardCodedValues and checkUserEnumeration return nested { name, report } arrays.
export type CheckmateFlatItem = {
  name: string;
  field: string;
  status: string;
  value?: string | number;
};
export type CheckmateReportItem = {
  field: string;
  status: string;
  value?: string;
  variableName?: string;
  line?: string | number;
};
export type CheckmateNestedReport = { name: string; report: CheckmateReportItem[] };

export type CheckmateFlatResult = { details: CheckmateFlatItem[] };
export type CheckmateNestedResult = { details: CheckmateNestedReport[] };

export type CheckmateFlatFn = (options: { actions: unknown[] }) => Promise<CheckmateFlatResult>;
export type CheckmateNestedFn = (options: {
  actions: unknown[];
}) => Promise<CheckmateNestedResult>;

// checkmate reports an action's name as "Action Name (trigger-id)" when it has triggers, or
// just "Action Name" for action modules, which have none.
export function parseActionName(fullName: string): { actionName: string; trigger: string } {
  const parenIndex = fullName.lastIndexOf(" (");
  if (parenIndex !== -1 && fullName.endsWith(")")) {
    return {
      actionName: fullName.slice(0, parenIndex),
      trigger: fullName.slice(parenIndex + 2, -1),
    };
  }
  return { actionName: fullName, trigger: "" };
}

export type ActionSource = { name?: string; code?: string };

// Strips `//` line comments before scanning action source, so a commented-out example call
// or reference isn't mistaken for a real one. Naive - a `//` inside a string literal would be
// mishandled - but good enough for the calls/accesses the profile-field checks look for.
export function stripLineComments(code: string): string {
  return code.replace(/\/\/.*$/gm, "");
}

export function findMatches(code: string, pattern: RegExp): string[] {
  return [...stripLineComments(code).matchAll(pattern)].map((match) => match[1]);
}
