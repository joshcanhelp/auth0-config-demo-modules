import process from "node:process";
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  copyFileSync,
} from "node:fs";
import { join } from "node:path";

import { selectPrompt } from "./utils/selectPrompt.js";
import { textPrompt } from "./utils/textPrompt.js";
import { selectTenant } from "./utils/selectTenant.js";

const { tenantDir } = await selectTenant();

interface TextQuestion {
  type: "text";
  prompt: string;
  key: string;
  validate: (value: string) => string | null;
  transform?: (
    output: Record<string, unknown>,
    answer: string
  ) => Record<string, unknown>;
}

interface SelectQuestion {
  type: "select";
  prompt: string;
  key: string;
  options: Array<{ label: string; value: string }>;
  transform?: (
    output: Record<string, unknown>,
    answer: string
  ) => Record<string, unknown>;
}

type Question = TextQuestion | SelectQuestion;

const CLIENT_QUESTIONS: Question[] = [
  {
    type: "text",
    prompt: "Application name",
    key: "name",
    validate: validateFilename,
  },
];

const MOBILE_QUESTIONS: Question[] = [
  {
    type: "select",
    prompt: "Refresh token?",
    key: "refresh_token_enabled",
    options: [
      { label: "Yes", value: "y" },
      { label: "No", value: "n" },
    ],
    transform: (output, answer) => {
      if (answer === "y") {
        return {
          ...output,
          grant_types: [...((output.grant_types as string[]) ?? []), "refresh_token"],
        };
      }
      const { refresh_token: _, ...rest } = output;
      return rest;
    },
  },
];

const ENTITY_QUESTIONS: Record<string, Question[]> = {
  clients: CLIENT_QUESTIONS,
};

const TEMPLATE_QUESTIONS: Record<string, Question[]> = {
  "mobile-application-template.json": MOBILE_QUESTIONS,
};

function validateFilename(value: string): string | null {
  if (!value) return "Name cannot be empty.";
  if (value === "." || value === "..") return "Name cannot be . or ..";
  if (value.includes("/")) return "Name cannot contain /.";
  if (value.includes("\0")) return "Name cannot contain null bytes.";
  return null;
}

async function askQuestion(question: Question): Promise<string> {
  if (question.type === "select") {
    return selectPrompt(question.prompt, question.options);
  }

  while (true) {
    const answer = await textPrompt(question.prompt);
    const error = question.validate(answer);
    if (!error) return answer;
    console.error(`  Error: ${error}`);
  }
}

const generateDir = "./modules/generate";

const entityOptions = readdirSync(generateDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => ({ label: entry.name, value: entry.name }));

if (entityOptions.length === 0) {
  console.error("No entity types found in modules/generate.");
  process.exit(1);
}

const entityType = await selectPrompt(
  "Select an entity type to generate:",
  entityOptions
);

if (entityType === "solutions" || entityType === "ulp-templates") {
  console.error(`Generate for "${entityType}" is not implemented yet.`);
  process.exit(1);
}

const templateDir = join(generateDir, entityType);

if (entityType === "prompt-partials") {
  const topDirs = readdirSync(templateDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ label: entry.name, value: entry.name }));

  if (topDirs.length === 0) {
    console.error(`No prompt partial directories found in ${templateDir}.`);
    process.exit(1);
  }

  const promptName = await selectPrompt("Select a prompt:", topDirs);
  const promptDir = join(templateDir, promptName);

  const subDirs = readdirSync(promptDir, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory()
  );

  let partialName: string;
  if (subDirs.length === 1) {
    partialName = subDirs[0].name;
  } else {
    const subDirOptions = subDirs.map((entry) => ({
      label: entry.name,
      value: entry.name,
    }));
    partialName = await selectPrompt("Select a partial:", subDirOptions);
  }

  const partialDir = join(promptDir, partialName);
  const files = readdirSync(partialDir).filter((f) => f.endsWith(".liquid"));

  if (files.length === 0) {
    console.error(`No .liquid files found in ${partialDir}.`);
    process.exit(1);
  }

  const fileOptions = files.map((f) => ({ label: f, value: f }));
  const selectedFile = await selectPrompt("Select a partial file:", fileOptions);

  const destDir = join(tenantDir, "prompts", "partials", promptName, partialName);
  const destPath = join(destDir, selectedFile);

  if (existsSync(destPath)) {
    console.error(`File already exists: ${destPath}`);
    process.exit(1);
  }

  mkdirSync(destDir, { recursive: true });
  copyFileSync(join(partialDir, selectedFile), destPath);
  console.log(`\nCreated: ${destPath}`);
  process.exit(0);
}

if (entityType === "actions") {
  const actionDirs = readdirSync(templateDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ label: entry.name, value: entry.name }));

  if (actionDirs.length === 0) {
    console.error(`No action directories found in ${templateDir}.`);
    process.exit(1);
  }

  const actionName = await selectPrompt("Select an action:", actionDirs);

  const deployAnswer = await selectPrompt("Deploy?", [
    { label: "Yes", value: "y" },
    { label: "No", value: "n" },
  ]);

  const srcDir = join(templateDir, actionName);
  const destActionsDir = join(tenantDir, "actions");
  const destDir = join(destActionsDir, actionName);
  const destMetaPath = join(destActionsDir, `${actionName}.json`);

  if (existsSync(destDir) || existsSync(destMetaPath)) {
    console.error(`Action already exists: ${actionName}`);
    process.exit(1);
  }

  mkdirSync(destDir, { recursive: true });

  const srcFiles = readdirSync(srcDir).filter((f) => f !== "metadata.json");
  for (const file of srcFiles) {
    copyFileSync(join(srcDir, file), join(destDir, file));
  }

  const metadata = JSON.parse(
    readFileSync(join(srcDir, "metadata.json"), "utf-8")
  ) as Record<string, unknown>;
  metadata.name = actionName;
  metadata.code = `./actions/${actionName}/code.js`;
  metadata.deployed = deployAnswer === "y";

  writeFileSync(destMetaPath, JSON.stringify(metadata, null, 2) + "\n");
  console.log(`\nCreated: ${destDir}`);
  console.log(`Created: ${destMetaPath}`);
  process.exit(0);
}

const templateFiles = readdirSync(templateDir).filter((f) => f.endsWith(".json"));

if (templateFiles.length === 0) {
  console.error(`No templates found in ${templateDir}.`);
  process.exit(1);
}

const templateOptions = templateFiles.map((f) => {
  const content = JSON.parse(readFileSync(join(templateDir, f), "utf-8")) as Record<
    string,
    unknown
  >;
  return { label: content.name as string, value: f };
});

const templateFile = await selectPrompt("Select a template:", templateOptions);
const template = JSON.parse(
  readFileSync(join(templateDir, templateFile), "utf-8")
) as Record<string, unknown>;

const questions = [
  ...(ENTITY_QUESTIONS[entityType] ?? []),
  ...(TEMPLATE_QUESTIONS[templateFile] ?? []),
];
const answers: Record<string, string> = {};

for (const question of questions) {
  answers[question.key] = await askQuestion(question);
}

let output: Record<string, unknown> = { ...template };

for (const question of questions) {
  const answer = answers[question.key];
  if (question.key in template) {
    output[question.key] = answer;
  }
  if (question.transform) {
    output = question.transform(output, answer);
  }
}

const outputFilename = `${answers.name ?? templateFile}.json`;
const outputPath = join(tenantDir, entityType, outputFilename);

if (existsSync(outputPath)) {
  console.error(`File already exists: ${outputPath}`);
  process.exit(1);
}

writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n");
console.log(`\nCreated: ${outputPath}`);
