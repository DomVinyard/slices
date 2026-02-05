/**
 * Regenerate summary-type derived files
 *
 * This regenerator handles files that are summaries of source content.
 * It uses an LLM to generate new summaries when the source changes.
 */

import { writeFile } from "node:fs/promises";
import { computeHash } from "../lib/hash.js";
import type { StaleFile } from "../lib/staleness.js";
import type { ParsedFile } from "@slices/parser";

export interface RegenerateOptions {
  /** LLM API key (required for regeneration) */
  apiKey?: string;
  /** LLM model to use */
  model?: string;
  /** Custom prompt template */
  promptTemplate?: string;
  /** Dry run - don't write changes */
  dryRun?: boolean;
}

export interface RegenerateResult {
  success: boolean;
  derivedId: string;
  newHash?: string;
  newContent?: string;
  error?: string;
}

/**
 * Default prompt template for summary regeneration
 */
const DEFAULT_SUMMARY_PROMPT = `You are regenerating a derived summary file. The source content has changed and the summary needs to be updated.

Source file title: {{sourceTitle}}
Source file ID: {{sourceId}}

Source content:
{{sourceBody}}

Previous summary (for reference):
{{previousBody}}

Generate an updated summary that accurately reflects the current source content. Keep the same format and style as the previous summary.`;

/**
 * Regenerate a summary-type derived file
 *
 * Note: This requires an LLM API. If no API key is provided,
 * it returns an error with instructions on how to set one up.
 */
export async function regenerateSummary(
  staleFile: StaleFile,
  options: RegenerateOptions = {}
): Promise<RegenerateResult> {
  const derivedId = staleFile.derived.parsed.tt?.id || "unknown";

  // Check for required source file
  if (!staleFile.source) {
    return {
      success: false,
      derivedId,
      error: `Source file not found: ${staleFile.derived.sourceId}`,
    };
  }

  // Check for API key
  if (!options.apiKey) {
    return {
      success: false,
      derivedId,
      error:
        "LLM API key required for regeneration. Set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable, or pass --api-key flag.",
    };
  }

  // Build the prompt
  const prompt = (options.promptTemplate || DEFAULT_SUMMARY_PROMPT)
    .replace("{{sourceTitle}}", staleFile.source.tt?.title || "Untitled")
    .replace("{{sourceId}}", staleFile.derived.sourceId)
    .replace("{{sourceBody}}", staleFile.source.body)
    .replace("{{previousBody}}", staleFile.derived.parsed.body);

  try {
    // Call LLM to generate new content
    const newBody = await callLLM(prompt, options);

    if (options.dryRun) {
      return {
        success: true,
        derivedId,
        newContent: newBody,
        newHash: computeHash(staleFile.source.body).formatted,
      };
    }

    // Update the derived file
    const updatedContent = updateDerivedFile(
      staleFile.derived.parsed,
      staleFile.source,
      newBody
    );

    await writeFile(staleFile.derived.parsed.path, updatedContent, "utf-8");

    return {
      success: true,
      derivedId,
      newHash: computeHash(staleFile.source.body).formatted,
      newContent: newBody,
    };
  } catch (error) {
    return {
      success: false,
      derivedId,
      error: `Regeneration failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Update the derived file content with new body and hash
 */
function updateDerivedFile(
  derived: ParsedFile,
  source: ParsedFile,
  newBody: string
): string {
  const newHash = computeHash(source.body);

  // Reconstruct frontmatter with updated hash
  // This is a simple string replacement approach
  let content = derived.raw;

  // Update the hash in derived_from
  const hashRegex = /(\s+hash:\s*)(sha256:[a-fA-F0-9]+|[a-fA-F0-9]+)/;
  content = content.replace(hashRegex, `$1${newHash.formatted}`);

  // Replace body (everything after the second ---)
  const parts = content.split(/^---$/m);
  if (parts.length >= 3) {
    content = parts[0] + "---" + parts[1] + "---\n" + newBody;
  }

  return content;
}

/**
 * Call an LLM API to generate content
 *
 * This is a placeholder implementation. In production, you would:
 * 1. Detect which API is available (Anthropic, OpenAI, etc.)
 * 2. Call the appropriate API
 * 3. Handle rate limits and errors
 */
async function callLLM(
  prompt: string,
  options: RegenerateOptions
): Promise<string> {
  const apiKey = options.apiKey!;
  const model = options.model || "claude-3-haiku-20240307";

  // Check if it's an Anthropic key
  if (apiKey.startsWith("sk-ant-")) {
    return callAnthropic(prompt, apiKey, model);
  }

  // Check if it's an OpenAI key
  if (apiKey.startsWith("sk-")) {
    return callOpenAI(prompt, apiKey, options.model || "gpt-4o-mini");
  }

  throw new Error(
    "Unknown API key format. Expected Anthropic (sk-ant-*) or OpenAI (sk-*) key."
  );
}

/**
 * Call Anthropic Claude API
 */
async function callAnthropic(
  prompt: string,
  apiKey: string,
  model: string
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };
  const textContent = data.content.find((c) => c.type === "text");

  if (!textContent) {
    throw new Error("No text content in Anthropic response");
  }

  return textContent.text;
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  prompt: string,
  apiKey: string,
  model: string
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  if (!data.choices?.[0]?.message?.content) {
    throw new Error("No content in OpenAI response");
  }

  return data.choices[0].message.content;
}
