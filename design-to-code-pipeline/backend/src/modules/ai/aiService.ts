import OpenAI from "openai";
import { getConfig } from "../../config/index.js";
import { createLogger } from "../../logger/index.js";

const log = createLogger("ai");

export type CodeGenerationResult = {
  plan: string;
  files: { path: string; content: string }[];
};

export async function analyzeRequirements(input: {
  jiraSummary: string;
  jiraDescription: string;
  figmaJson: unknown | null;
  repoPaths: string[];
}): Promise<string> {
  const cfg = getConfig();
  const client = new OpenAI({ apiKey: cfg.OPENAI_API_KEY });
  const userPayload = {
    jiraSummary: input.jiraSummary,
    jiraDescription: input.jiraDescription.slice(0, 12000),
    figmaStructure: input.figmaJson,
    repositoryPathsSample: input.repoPaths,
  };
  const completion = await client.chat.completions.create({
    model: cfg.OPENAI_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a senior engineer. Produce a concise implementation plan (markdown). Do not include any secrets, tokens, or credentials. Base the plan only on the provided structured context.",
      },
      {
        role: "user",
        content: JSON.stringify(userPayload),
      },
    ],
    temperature: 0.2,
  });
  const text = completion.choices[0]?.message?.content ?? "";
  log.debug({ length: text.length }, "Analysis generated");
  return text;
}

export async function generateCodePatch(input: {
  plan: string;
  jiraSummary: string;
  jiraDescription: string;
  figmaJson: unknown | null;
  repoPaths: string[];
}): Promise<CodeGenerationResult> {
  const cfg = getConfig();
  const client = new OpenAI({ apiKey: cfg.OPENAI_API_KEY });
  const schemaHint =
    'Return strict JSON with keys: "plan" (short string) and "files" (array of { "path": string, "content": string }). Paths must be relative to repo root. Keep changes minimal and focused.';
  const completion = await client.chat.completions.create({
    model: cfg.OPENAI_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You output only valid JSON for code edits. ${schemaHint} Never include API keys, tokens, or .env content.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          existingPlan: input.plan,
          jiraSummary: input.jiraSummary,
          jiraDescription: input.jiraDescription.slice(0, 12000),
          figmaStructure: input.figmaJson,
          repositoryPathsSample: input.repoPaths,
        }),
      },
    ],
    temperature: 0.1,
  });
  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: CodeGenerationResult;
  try {
    parsed = JSON.parse(raw) as CodeGenerationResult;
  } catch {
    throw new Error("AI returned non-JSON code patch");
  }
  if (!parsed.files?.length) {
    throw new Error("AI patch missing files");
  }
  return parsed;
}
