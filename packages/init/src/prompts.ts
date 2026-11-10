import { createInterface, type Interface } from "node:readline/promises";

// An empty answer falls back to `defaultValue` (pressing enter accepts the default); pulled out
// as its own function so the fallback logic is testable without driving a real readline prompt.
export function applyDefault(answer: string, defaultValue?: string): string {
  return answer === "" && defaultValue !== undefined ? defaultValue : answer;
}

export interface SelectOption<T> {
  label: string;
  value: T;
}

export function parseSelection<T>(answer: string, options: SelectOption<T>[]): T | null {
  const index = Number.parseInt(answer.trim(), 10) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= options.length) return null;
  return options[index].value;
}

// A single `init` run can ask several questions in sequence. Node's readline interface is built
// to answer repeated question() calls against one Interface - creating a fresh Interface per
// question instead loses any input the user (or a piped script) already sent ahead of the prompt
// appearing, since the old Interface's line buffer doesn't carry over to the new one.
export class PromptSession {
  private rl: Interface | undefined;

  private getInterface(): Interface {
    if (!this.rl) {
      this.rl = createInterface({ input: process.stdin, output: process.stdout });
    }
    return this.rl;
  }

  // `defaultValueLabel` overrides what's shown in the prompt for the default (e.g. "current
  // directory" instead of printing out the full resolved path) without changing the value an
  // empty answer actually resolves to.
  async text(
    label: string,
    defaultValue?: string,
    defaultValueLabel = defaultValue
  ): Promise<string> {
    const suffix = defaultValue ? ` (${defaultValueLabel})` : "";
    const answer = (await this.getInterface().question(`${label}${suffix}: `)).trim();
    return applyDefault(answer, defaultValue);
  }

  async select<T>(label: string, options: SelectOption<T>[]): Promise<T> {
    console.log(`\n${label}`);
    options.forEach((option, i) => console.log(`  ${i + 1}. ${option.label}`));

    for (;;) {
      const answer = await this.getInterface().question("\nEnter number: ");
      const value = parseSelection(answer, options);
      if (value !== null) return value;
      console.error(`Invalid selection: "${answer.trim()}"`);
    }
  }

  async confirm(label: string): Promise<boolean> {
    const answer = await this.getInterface().question(`${label} (y/N): `);
    return answer.trim().toLowerCase() === "y";
  }

  close(): void {
    this.rl?.close();
  }
}
