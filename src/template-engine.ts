import { DEFAULT_DATETIME_FORMAT } from "./constants";

export type TemplateToken =
  | "title"
  | "page"
  | "status"
  | "datetime"
  | "date"
  | "time"
  | "nowdatetime"
  | "nowdate"
  | "nowtime";

export type NowTemplateToken = "nowdatetime" | "nowdate" | "nowtime";

export interface RenderTemplateOptions {
  title: string;
  datetimeFormat: string;
  status?: string;
  now?: Date;
}

export interface RenderedTemplate {
  content: string;
  nowFields: Record<string, NowTemplateToken>;
  protectedFields: Record<string, string>;
  pageTokenUsed: boolean;
}

const SUPPORTED_TOKENS = new Set<TemplateToken>([
  "title",
  "page",
  "status",
  "datetime",
  "date",
  "time",
  "nowdatetime",
  "nowdate",
  "nowtime"
]);

const NOW_TOKENS = new Set<NowTemplateToken>([
  "nowdatetime",
  "nowdate",
  "nowtime"
]);

export function renderTemplate(
  template: string,
  options: RenderTemplateOptions
): RenderedTemplate {
  const now = options.now ?? new Date();
  const datetimeFormat = options.datetimeFormat || DEFAULT_DATETIME_FORMAT;
  const nowFields = extractNowFields(template);
  const pageTokenUsed = /%\{\{\s*page\s*}}/.test(template);

  const content = template.replace(/%\{\{([^}]+)}}/g, (match, rawToken) => {
    const token = String(rawToken).trim() as TemplateToken;
    if (!SUPPORTED_TOKENS.has(token)) {
      return match;
    }

    return formatTokenValueForTemplate(
      template,
      match,
      renderToken(token, options.title, options.status ?? "", datetimeFormat, now)
    );
  });

  return {
    content,
    nowFields,
    protectedFields: extractFrontmatterValues(content, ["created"]),
    pageTokenUsed
  };
}

function formatTokenValueForTemplate(
  template: string,
  rawPlaceholder: string,
  value: string
): string {
  if (!isQuotedPlaceholder(template, rawPlaceholder)) {
    return value;
  }

  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
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

export function renderNowToken(
  token: NowTemplateToken,
  datetimeFormat: string,
  now = new Date()
): string {
  const dateFormat = getDateFormatFromDatetimeFormat(datetimeFormat);

  switch (token) {
    case "nowdate":
      return formatDate(now, dateFormat);
    case "nowtime":
      return formatDate(now, "HH:mm");
    case "nowdatetime":
      return formatDate(now, datetimeFormat || DEFAULT_DATETIME_FORMAT);
  }
}

function renderToken(
  token: TemplateToken,
  title: string,
  status: string,
  datetimeFormat: string,
  now: Date
): string {
  const dateFormat = getDateFormatFromDatetimeFormat(datetimeFormat);

  switch (token) {
    case "title":
    case "page":
      return title;
    case "status":
      return status;
    case "date":
    case "nowdate":
      return formatDate(now, dateFormat);
    case "time":
    case "nowtime":
      return formatDate(now, "HH:mm");
    case "datetime":
    case "nowdatetime":
      return formatDate(now, datetimeFormat);
  }
}

function extractNowFields(template: string): Record<string, NowTemplateToken> {
  const frontmatter = template.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) {
    return {};
  }

  const fields: Record<string, NowTemplateToken> = {};
  const lines = frontmatter[1].split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      continue;
    }

    const field = match[1].trim();
    const value = match[2];
    const tokenMatch = value.match(/%\{\{(nowdatetime|nowdate|nowtime)}}/);
    if (!tokenMatch) {
      continue;
    }

    const token = tokenMatch[1] as NowTemplateToken;
    if (NOW_TOKENS.has(token)) {
      fields[field] = token;
    }
  }

  return fields;
}

function extractFrontmatterValues(
  content: string,
  fieldNames: string[]
): Record<string, string> {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) {
    return {};
  }

  const wanted = new Set(fieldNames);
  const values: Record<string, string> = {};
  const lines = frontmatter[1].split(/\r?\n/);

  for (const line of lines) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      continue;
    }

    const field = match[1].trim();
    if (!wanted.has(field)) {
      continue;
    }

    values[field] = unquoteYamlScalar(match[2].trim());
  }

  return values;
}

function unquoteYamlScalar(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

export function formatDate(date: Date, format: string): string {
  const values: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    MM: pad(date.getMonth() + 1),
    DD: pad(date.getDate()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds())
  };

  return (format || DEFAULT_DATETIME_FORMAT).replace(
    /YYYY|MM|DD|HH|mm|ss/g,
    (token) => values[token]
  );
}

export function getDateFormatFromDatetimeFormat(format: string): string {
  const normalizedFormat = format || DEFAULT_DATETIME_FORMAT;
  const dayTokenIndex = normalizedFormat.indexOf("DD");

  if (dayTokenIndex === -1) {
    return "YYYY.MM.DD";
  }

  return normalizedFormat.slice(0, dayTokenIndex + "DD".length);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
