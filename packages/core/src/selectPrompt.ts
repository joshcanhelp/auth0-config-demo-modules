import { createInterface } from "node:readline";
import process from "node:process";

export interface SelectOption<T> {
  label: string;
  value: T;
}

export function parseSelection<T>(answer: string, options: SelectOption<T>[]): T | null {
  const index = parseInt(answer.trim(), 10) - 1;
  if (isNaN(index) || index < 0 || index >= options.length) return null;
  return options[index].value;
}

export async function confirmPrompt(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

export async function selectPrompt<T>(
  label: string,
  options: SelectOption<T>[]
): Promise<T> {
  console.log(`\n${label}`);
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt.label}`);
  });

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve, reject) => {
    rl.question("\nEnter number: ", (answer) => {
      rl.close();
      const value = parseSelection(answer, options);
      if (value === null) {
        reject(new Error(`Invalid selection: "${answer.trim()}"`));
      } else {
        resolve(value);
      }
    });
  });
}
