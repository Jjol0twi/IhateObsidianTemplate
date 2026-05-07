import { App, Modal, Setting, TFile } from "obsidian";
import { pickOption, StatusOption } from "./status";
import { formatDate, getDateFormatFromDatetimeFormat } from "./template-engine";

interface FieldPrompt {
  raw: string;
  kind: "datepick" | "property";
  field: string;
}

interface MultiPrompt {
  raw: string;
  field: string;
  options: StatusOption[];
}

const FIELD_PROMPT_REGEX = /%\{\{(datepick|property):([A-Za-z0-9_-]+)}}/g;
const MULTI_PROMPT_REGEX = /%\{\{multi:([A-Za-z0-9_-]+)\|([^}]+)}}/g;

export async function resolvePromptPlaceholders(
  app: App,
  template: string,
  datetimeFormat: string
): Promise<string> {
  let resolved = template;

  resolved = await resolveStringListFields(app, resolved);

  for (const prompt of parseFieldPrompts(template)) {
    const value = await resolveFieldPrompt(app, prompt, datetimeFormat);
    resolved = resolved
      .split(prompt.raw)
      .join(formatPromptValueForTemplate(resolved, prompt.raw, value));
  }

  for (const prompt of parseMultiPrompts(template)) {
    const values = await pickMultipleOptions(
      app,
      prompt.options,
      `Choose ${prompt.field}`
    );
    resolved = resolved.split(prompt.raw).join(formatYamlList(values));
  }

  return resolved;
}

async function resolveStringListFields(app: App, template: string): Promise<string> {
  let resolved = template;

  for (const field of findEmptyStringListFields(template)) {
    const values = await requestStringList(app, field);
    resolved = resolved.replace(
      new RegExp(`^${escapeRegex(field)}:\\s*$`, "m"),
      formatYamlBlockList(field, values)
    );
  }

  return resolved;
}

function findEmptyStringListFields(template: string): string[] {
  const frontmatter = template.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) {
    return [];
  }

  const fields = new Set<string>();
  const lines = frontmatter[1].split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^(attendees):\s*$/);
    if (match) {
      fields.add(match[1]);
    }
  }

  return [...fields];
}

function parseFieldPrompts(template: string): FieldPrompt[] {
  const prompts: FieldPrompt[] = [];
  let match: RegExpExecArray | null;

  while ((match = FIELD_PROMPT_REGEX.exec(template)) !== null) {
    prompts.push({
      raw: match[0],
      kind: match[1] as FieldPrompt["kind"],
      field: match[2]
    });
  }

  return prompts;
}

function parseMultiPrompts(template: string): MultiPrompt[] {
  const prompts: MultiPrompt[] = [];
  let match: RegExpExecArray | null;

  while ((match = MULTI_PROMPT_REGEX.exec(template)) !== null) {
    const options = match[2]
      .split("|")
      .map((option) => option.trim())
      .filter(Boolean)
      .map(parseOption);

    if (options.length === 0) {
      continue;
    }

    prompts.push({
      raw: match[0],
      field: match[1],
      options
    });
  }

  return prompts;
}

async function resolveFieldPrompt(
  app: App,
  prompt: FieldPrompt,
  datetimeFormat: string
): Promise<string> {
  if (prompt.kind === "property") {
    return getActivePropertyValue(app, prompt.field);
  }

  const value = await requestDateValue(app, prompt.field);

  return formatDateInput(value ?? "", datetimeFormat);
}

async function pickMultipleOptions(
  app: App,
  options: StatusOption[],
  placeholder: string
): Promise<string[]> {
  const selectedValues: string[] = [];
  const remaining = [...options];

  while (remaining.length > 0) {
    const selected = await pickOption(
      app,
      [
        {
          label: "Done",
          value: "__IHATE_TEMPLATE_DONE__"
        },
        ...remaining
      ],
      placeholder
    );

    if (!selected || selected.value === "__IHATE_TEMPLATE_DONE__") {
      break;
    }

    selectedValues.push(selected.value);
    const index = remaining.findIndex((option) => option.value === selected.value);
    if (index !== -1) {
      remaining.splice(index, 1);
    }
  }

  return selectedValues;
}

function formatYamlList(values: string[]): string {
  if (values.length === 0) {
    return "[]";
  }

  return `[${values.map((value) => JSON.stringify(value)).join(", ")}]`;
}

function formatYamlBlockList(field: string, values: string[]): string {
  if (values.length === 0) {
    return `${field}: []`;
  }

  return [
    `${field}:`,
    ...values.map((value) => `  - ${JSON.stringify(value)}`)
  ].join("\n");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getActivePropertyValue(app: App, field: string): string {
  const file = app.workspace.getActiveFile();
  if (!(file instanceof TFile)) {
    return "";
  }

  const cache = app.metadataCache.getFileCache(file);
  const value = cache?.frontmatter?.[field];
  if (value === undefined || value === null) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  return String(value);
}

function parseOption(option: string): StatusOption {
  const separatorIndex = option.indexOf("=");
  if (separatorIndex === -1) {
    return {
      label: option,
      value: option
    };
  }

  const label = option.slice(0, separatorIndex).trim();
  const value = option.slice(separatorIndex + 1).trim();
  return {
    label: label || value,
    value: value || label
  };
}

function formatPromptValueForTemplate(
  template: string,
  rawPlaceholder: string,
  value: string
): string {
  if (isQuotedPlaceholder(template, rawPlaceholder)) {
    return escapeForQuotedYamlScalar(value);
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

function escapeForQuotedYamlScalar(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, "\\n");
}

function formatDateInput(value: string, datetimeFormat: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return value;
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return formatDate(date, getDateFormatFromDatetimeFormat(datetimeFormat));
}

async function requestDateValue(app: App, field: string): Promise<string | null> {
  return new Promise((resolve) => {
    const modal = new DatePromptModal(app, field, resolve);
    modal.open();
  });
}

async function requestStringList(app: App, field: string): Promise<string[]> {
  return new Promise((resolve) => {
    const modal = new StringListPromptModal(app, field, resolve);
    modal.open();
  });
}

class StringListPromptModal extends Modal {
  private readonly field: string;
  private readonly resolveValues: (values: string[]) => void;
  private readonly values: string[] = [];
  private readonly valueSet = new Set<string>();
  private inputEl: HTMLInputElement | null = null;
  private listEl: HTMLElement | null = null;
  private resolved = false;
  private compositionActive = false;

  constructor(app: App, field: string, resolveValues: (values: string[]) => void) {
    super(app);
    this.field = field;
    this.resolveValues = resolveValues;
  }

  onOpen(): void {
    this.titleEl.setText(`Enter ${this.field}`);
    this.contentEl.empty();

    new Setting(this.contentEl)
      .setName(this.field)
      .setDesc("Press Enter after each name.")
      .addText((text) => {
        text.setPlaceholder("Name");
        this.inputEl = text.inputEl;
        text.inputEl.addEventListener("compositionstart", () => {
          this.compositionActive = true;
        });
        text.inputEl.addEventListener("compositionend", () => {
          this.compositionActive = false;
        });
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.isComposing || this.compositionActive) {
            return;
          }
          if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            this.addCurrentValue();
          }
        });
      });

    this.listEl = this.contentEl.createDiv({
      cls: "ihate-template-string-list"
    });

    const actions = this.contentEl.createDiv({
      cls: "ihate-template-title-actions"
    });

    actions.createEl("button", { text: "Cancel" }).onClickEvent(() => this.close());
    actions.createEl("button", { text: "Done", cls: "mod-cta" }).onClickEvent(() => {
      this.submit();
    });

    this.renderValues();
    window.setTimeout(() => this.inputEl?.focus(), 0);
  }

  onClose(): void {
    if (!this.resolved) {
      this.resolved = true;
      this.resolveValues([]);
    }
  }

  private addCurrentValue(): void {
    const value = this.inputEl?.value.trim();
    if (!value || this.valueSet.has(value)) {
      if (this.inputEl) {
        this.inputEl.value = "";
      }
      return;
    }

    this.values.push(value);
    this.valueSet.add(value);
    if (this.inputEl) {
      this.inputEl.value = "";
    }
    this.renderValues();
  }

  private renderValues(): void {
    if (!this.listEl) {
      return;
    }

    this.listEl.empty();
    for (const value of this.values) {
      this.listEl.createDiv({
        cls: "ihate-template-string-list-item",
        text: value
      });
    }
  }

  private submit(): void {
    this.addCurrentValue();
    this.resolved = true;
    this.resolveValues([...this.values]);
    this.close();
  }
}

class DatePromptModal extends Modal {
  private readonly field: string;
  private readonly resolveValue: (value: string | null) => void;
  private inputEl: HTMLInputElement | null = null;
  private resolved = false;

  constructor(
    app: App,
    field: string,
    resolveValue: (value: string | null) => void
  ) {
    super(app);
    this.field = field;
    this.resolveValue = resolveValue;
  }

  onOpen(): void {
    this.titleEl.setText(`Choose ${this.field}`);
    this.contentEl.empty();

    new Setting(this.contentEl)
      .setName(this.field)
      .addText((text) => {
        text.inputEl.type = "date";
        this.inputEl = text.inputEl;
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            this.submit();
          }
        });
      });

    const actions = this.contentEl.createDiv({
      cls: "ihate-template-title-actions"
    });

    actions.createEl("button", { text: "Cancel" }).onClickEvent(() => this.close());
    actions.createEl("button", { text: "Apply", cls: "mod-cta" }).onClickEvent(() => {
      this.submit();
    });

    window.setTimeout(() => this.inputEl?.focus(), 0);
  }

  onClose(): void {
    if (!this.resolved) {
      this.resolved = true;
      this.resolveValue(null);
    }
  }

  private submit(): void {
    this.resolved = true;
    this.resolveValue(this.inputEl?.value ?? "");
    this.close();
  }
}
