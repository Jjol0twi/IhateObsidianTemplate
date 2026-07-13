import { App } from "obsidian";
import {
  formatDateInput,
  pickMultipleOptions,
  requestDateValue,
  requestStringList
} from "./prompt-placeholders";
import { pickOption } from "./status";
import type { StatusOption } from "./status";
import type { TemplateChoice } from "./template-picker";
import { formatDate, getDateFormatFromDatetimeFormat } from "./template-engine";
import { PromptCancelledError } from "./prompt-cancellation";
import {
  formatYamlScalarForQuote,
  replaceLiteralOccurrences
} from "./placeholder-values";

const RULE_VERSION = 1;
const FIELD_NAME_PATTERN = /^[A-Za-z0-9_-]+$/;
const PROPERTY_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 _-]*$/;
const RULE_KEYS = new Set([
  "version",
  "titlePrefix",
  "requiredProperties",
  "protectedProperties",
  "dateProperties",
  "prompts"
]);
const PROMPT_KEYS = new Set(["field", "label", "type", "options"]);
const OPTION_KEYS = new Set(["label", "value"]);

export type RulePromptType = "select" | "multi-select" | "date" | "string-list";
export type TitlePrefix = "date";

export interface TemplateRulePrompt {
  field: string;
  label: string;
  type: RulePromptType;
  options: StatusOption[];
}

export interface TemplateRule {
  version: 1;
  titlePrefix?: TitlePrefix;
  requiredProperties: string[];
  protectedProperties: string[];
  dateProperties: string[];
  prompts: TemplateRulePrompt[];
}

export interface AppliedTemplateRule {
  templatePath: string;
  requiredProperties: string[];
  protectedProperties: string[];
  dateProperties: string[];
}

export class TemplateRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateRuleError";
  }
}

export async function readTemplateRule(
  app: App,
  template: TemplateChoice
): Promise<TemplateRule | null> {
  const rulePath = getTemplateRulePath(template.path);
  if (!(await app.vault.adapter.exists(rulePath))) {
    return null;
  }

  const source = await app.vault.adapter.read(rulePath);
  return parseTemplateRule(source, rulePath);
}

export function getTemplateRulePath(templatePath: string): string {
  return templatePath.toLowerCase().endsWith(".md")
    ? `${templatePath.slice(0, -3)}.ihate.json`
    : `${templatePath}.ihate.json`;
}

export function parseTemplateRule(source: string, path = "template rule"): TemplateRule {
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    throw new TemplateRuleError(`${path} is not valid JSON.`);
  }

  if (!isRecord(value)) {
    throw new TemplateRuleError(`${path} must contain a JSON object.`);
  }
  assertAllowedKeys(value, RULE_KEYS, path);

  if (value.version !== RULE_VERSION) {
    throw new TemplateRuleError(`${path} must use version ${RULE_VERSION}.`);
  }

  return {
    version: RULE_VERSION,
    titlePrefix: parseTitlePrefix(value.titlePrefix, path),
    requiredProperties: parseFieldNames(value.requiredProperties, path),
    protectedProperties: parseFieldNames(value.protectedProperties, path),
    dateProperties: parseFieldNames(value.dateProperties, path),
    prompts: parsePrompts(value.prompts, path)
  };
}

export async function resolveTemplateRulePrompts(
  app: App,
  template: string,
  rule: TemplateRule | null,
  datetimeFormat: string
): Promise<string> {
  if (!rule) {
    return template;
  }

  let resolved = template;
  for (const prompt of rule.prompts) {
    const rawPlaceholder = `%{{field:${prompt.field}}}`;
    if (!resolved.includes(rawPlaceholder)) {
      continue;
    }

    const value = await resolveRulePrompt(app, prompt, datetimeFormat);
    resolved = replaceLiteralOccurrences(resolved, rawPlaceholder, (quote) => {
      if (Array.isArray(value)) {
        if (quote !== null) {
          throw new TemplateRuleError(
            `${rawPlaceholder} must not be quoted when it renders a list.`
          );
        }
        return formatBlockYamlList(value);
      }

      return formatYamlScalarForQuote(value, quote);
    });
  }

  return resolved;
}

export function applyTemplateTitleRule(
  title: string,
  rule: TemplateRule | null,
  datetimeFormat: string,
  now = new Date()
): string {
  if (rule?.titlePrefix !== "date") {
    return title;
  }

  const date = formatDate(
    now,
    getDateFormatFromDatetimeFormat(datetimeFormat)
  );
  return title === date || title.startsWith(`${date} `) ? title : `${date} ${title}`;
}

export function createAppliedTemplateRule(
  templatePath: string,
  rule: TemplateRule | null
): AppliedTemplateRule | undefined {
  if (!rule) {
    return undefined;
  }

  return {
    templatePath,
    requiredProperties: [...rule.requiredProperties],
    protectedProperties: [...rule.protectedProperties],
    dateProperties: [...rule.dateProperties]
  };
}

async function resolveRulePrompt(
  app: App,
  prompt: TemplateRulePrompt,
  datetimeFormat: string
): Promise<string | string[]> {
  switch (prompt.type) {
    case "select": {
      const selected = await pickOption(app, prompt.options, prompt.label);
      if (!selected) {
        throw new PromptCancelledError();
      }
      return selected.value;
    }
    case "multi-select": {
      const selected = await pickMultipleOptions(app, prompt.options, prompt.label);
      if (selected === null) {
        throw new PromptCancelledError();
      }
      return selected;
    }
    case "date": {
      const selected = await requestDateValue(app, prompt.label);
      if (selected === null) {
        throw new PromptCancelledError();
      }
      return formatDateInput(selected, datetimeFormat);
    }
    case "string-list": {
      const selected = await requestStringList(app, prompt.label);
      if (selected === null) {
        throw new PromptCancelledError();
      }
      return selected;
    }
  }
}

function formatBlockYamlList(values: string[]): string {
  if (values.length === 0) {
    return "[]";
  }

  return ["", ...values.map((value) => `  - ${JSON.stringify(value)}`)].join("\n");
}

function parseTitlePrefix(value: unknown, path: string): TitlePrefix | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === "date") {
    return value;
  }
  throw new TemplateRuleError(`${path} has an unsupported titlePrefix.`);
}

function parseFieldNames(value: unknown, path: string): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new TemplateRuleError(`${path} property lists must be arrays.`);
  }

  const fields: string[] = [];
  for (const field of value) {
    if (typeof field !== "string" || !PROPERTY_NAME_PATTERN.test(field)) {
      throw new TemplateRuleError(`${path} contains an invalid property name.`);
    }
    if (!fields.includes(field)) {
      fields.push(field);
    }
  }
  return fields;
}

function parsePrompts(value: unknown, path: string): TemplateRulePrompt[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new TemplateRuleError(`${path} prompts must be an array.`);
  }

  const prompts = value.map((prompt, index) =>
    parsePrompt(prompt, `${path} prompt ${index + 1}`)
  );
  const fields = new Set<string>();
  for (const prompt of prompts) {
    if (fields.has(prompt.field)) {
      throw new TemplateRuleError(`${path} contains duplicate prompt field: ${prompt.field}`);
    }
    fields.add(prompt.field);
  }
  return prompts;
}

function parsePrompt(value: unknown, context: string): TemplateRulePrompt {
  if (!isRecord(value)) {
    throw new TemplateRuleError(`${context} must be an object.`);
  }
  assertAllowedKeys(value, PROMPT_KEYS, context);

  const field = value.field;
  const type = value.type;
  if (typeof field !== "string" || !FIELD_NAME_PATTERN.test(field)) {
    throw new TemplateRuleError(`${context} has an invalid field.`);
  }
  if (!isRulePromptType(type)) {
    throw new TemplateRuleError(`${context} has an unsupported type.`);
  }

  const label = typeof value.label === "string" && value.label.trim()
    ? value.label.trim()
    : field;
  const options = parseOptions(value.options, context);
  if ((type === "select" || type === "multi-select") && options.length === 0) {
    throw new TemplateRuleError(`${context} requires options.`);
  }
  if (type !== "select" && type !== "multi-select" && options.length > 0) {
    throw new TemplateRuleError(`${context} does not support options.`);
  }

  return { field, label, type, options };
}

function parseOptions(value: unknown, context: string): StatusOption[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new TemplateRuleError(`${context} options must be an array.`);
  }

  const options: StatusOption[] = [];
  const values = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const option = value[index];
    if (!isRecord(option)) {
      throw new TemplateRuleError(`${context} option ${index + 1} must be an object.`);
    }
    assertAllowedKeys(option, OPTION_KEYS, `${context} option ${index + 1}`);
    if (typeof option.label !== "string" || typeof option.value !== "string") {
      throw new TemplateRuleError(`${context} option ${index + 1} is invalid.`);
    }
    const label = option.label.trim();
    const optionValue = option.value.trim();
    if (!label || !optionValue) {
      throw new TemplateRuleError(`${context} option ${index + 1} cannot be empty.`);
    }
    if (values.has(optionValue)) {
      throw new TemplateRuleError(`${context} contains a duplicate option value.`);
    }
    values.add(optionValue);
    options.push({ label, value: optionValue });
  }
  return options;
}

function isRulePromptType(value: unknown): value is RulePromptType {
  return value === "select" ||
    value === "multi-select" ||
    value === "date" ||
    value === "string-list";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  context: string
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new TemplateRuleError(`${context} contains an unsupported field: ${key}`);
    }
  }
}
