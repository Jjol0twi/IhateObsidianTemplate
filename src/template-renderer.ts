import { App } from "obsidian";
import { IhateTemplateSettings } from "./settings";
import { RenderedTemplate, renderTemplate } from "./template-engine";
import {
  parseCustomSelectPrompts,
  pickOption
} from "./status";
import { resolvePromptPlaceholders } from "./prompt-placeholders";

const DEFAULT_STATUS = "#status/draft";

export async function renderTemplateWithPrompts(
  app: App,
  templateContent: string,
  title: string,
  settings: IhateTemplateSettings
): Promise<RenderedTemplate> {
  let resolvedTemplate = await resolvePromptPlaceholders(
    app,
    templateContent,
    settings.datetimeFormat
  );

  for (const prompt of parseCustomSelectPrompts(resolvedTemplate)) {
    const selected = await pickOption(
      app,
      prompt.options,
      `Choose ${prompt.field}`
    );
    if (!selected) {
      throw new Error(`${prompt.field} selection was cancelled.`);
    }
    resolvedTemplate = resolvedTemplate
      .split(prompt.raw)
      .join(formatSelectValueForTemplate(resolvedTemplate, prompt.raw, selected.value));
  }

  return renderTemplate(resolvedTemplate, {
    title,
    status: DEFAULT_STATUS,
    datetimeFormat: settings.datetimeFormat
  });
}

function formatSelectValueForTemplate(
  template: string,
  rawPlaceholder: string,
  value: string
): string {
  if (isQuotedPlaceholder(template, rawPlaceholder)) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }

  return value;
}

function isQuotedPlaceholder(template: string, rawPlaceholder: string): boolean {
  const index = template.indexOf(rawPlaceholder);
  if (index === -1) {
    return false;
  }

  const before = template[index - 1];
  const after = template[index + rawPlaceholder.length];
  return (before === '"' && after === '"') || (before === "'" && after === "'");
}
