import { App } from "obsidian";
import type { IhateTemplateSettings } from "./settings";
import { renderTemplate } from "./template-engine";
import type { RenderedTemplate } from "./template-engine";
import {
  parseCustomSelectPrompts,
  pickOption
} from "./status";
import { resolvePromptPlaceholders } from "./prompt-placeholders";
import { resolveTemplateRulePrompts } from "./template-rules";
import type { TemplateRule } from "./template-rules";
import { PromptCancelledError } from "./prompt-cancellation";
import {
  formatYamlScalarForQuote,
  replaceLiteralOccurrences
} from "./placeholder-values";

const DEFAULT_STATUS = "#status/draft";

export async function renderTemplateWithPrompts(
  app: App,
  templateContent: string,
  title: string,
  settings: IhateTemplateSettings,
  tags: string[] = [],
  rule: TemplateRule | null = null
): Promise<RenderedTemplate> {
  let resolvedTemplate = await resolveTemplateRulePrompts(
    app,
    templateContent,
    rule,
    settings.datetimeFormat
  );
  resolvedTemplate = await resolvePromptPlaceholders(
    app,
    resolvedTemplate,
    settings.datetimeFormat
  );

  const handledPrompts = new Set<string>();
  for (const prompt of parseCustomSelectPrompts(resolvedTemplate)) {
    if (handledPrompts.has(prompt.raw)) {
      continue;
    }
    handledPrompts.add(prompt.raw);

    const selected = await pickOption(
      app,
      prompt.options,
      `Choose ${prompt.field}`
    );
    if (!selected) {
      throw new PromptCancelledError();
    }
    resolvedTemplate = replaceLiteralOccurrences(
      resolvedTemplate,
      prompt.raw,
      (quote) => formatYamlScalarForQuote(selected.value, quote)
    );
  }

  return renderTemplate(resolvedTemplate, {
    title,
    status: DEFAULT_STATUS,
    tags,
    datetimeFormat: settings.datetimeFormat,
    protectedFieldNames: rule?.protectedProperties
  });
}
