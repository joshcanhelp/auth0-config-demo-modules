import { clearLine, cursorTo } from "node:readline";
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
  // Set only while menu() is waiting on an answer - lets print() know there's a line to clear
  // and redraw around a background message. A function, not a frozen string, so a redraw always
  // reflects whatever the caller's label looks like *now* (e.g. a pending count that changed
  // since menu() was first called), not whatever it was when menu() started.
  private activePromptLine: (() => string) | undefined;

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

  // A single-line alternative to select(), for a long-running command that wants a menu pinned
  // at the bottom of the screen instead of a multi-line block reprinted every time around a
  // loop. Pairs with print() - anything logged via print() while this is awaiting an answer gets
  // printed above this line, which is then redrawn so it stays the last thing on screen.
  //
  // `label` can be a function instead of a plain string - pass one when the label includes
  // something that can change while this is awaiting an answer (e.g. a pending-change count), so
  // a redraw triggered by print() shows the current value instead of whatever it was when menu()
  // was first called.
  async menu<T>(label: string | (() => string), options: SelectOption<T>[]): Promise<T> {
    const buildPromptText = (): string => {
      const resolvedLabel = typeof label === "function" ? label() : label;
      return (
        `${resolvedLabel}  ` +
        options.map((option, i) => `(${i + 1}) ${option.label}`).join("  ") +
        ": "
      );
    };

    this.activePromptLine = buildPromptText;
    try {
      for (;;) {
        const answer = await this.getInterface().question(buildPromptText());
        const value = parseSelection(answer, options);
        if (value !== null) return value;
      }
    } finally {
      this.activePromptLine = undefined;
    }
  }

  // Logs a message without leaving it interleaved with a menu() prompt that's currently
  // displayed and awaiting an answer - clears that line, logs above it, then redraws it (freshly
  // built, not whatever it looked like when last drawn) so it stays pinned at the bottom. A
  // plain console.log when no menu() is currently active.
  print(message: string): void {
    if (this.activePromptLine === undefined) {
      console.log(message);
      return;
    }
    clearLine(process.stdout, 0);
    cursorTo(process.stdout, 0);
    console.log(message);
    process.stdout.write(this.activePromptLine());
  }

  close(): void {
    this.rl?.close();
  }
}
