import { createInterface } from "node:readline";
import process from "node:process";

export async function textPrompt(prompt: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    rl.question(`\n${prompt}: `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}
