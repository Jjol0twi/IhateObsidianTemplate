import { DEFAULT_DATETIME_FORMAT } from "./constants";
import {
  formatYamlScalarForQuote,
  getPlaceholderQuote
} from "./placeholder-values";

export type TemplateToken =
  | "title"
  | "page"
  | "status"
  | "tags"
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
  tags?: string[];
  protectedFieldNames?: string[];
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
  "tags",
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

  const content = template.replace(/%\{\{([^}]+)}}/g, (
    match,
    rawToken,
    offset: number
  ) => {
    const token = String(rawToken).trim() as TemplateToken;
    if (!SUPPORTED_TOKENS.has(token)) {
      return match;
    }

    const value = renderToken(
      token,
      options.title,
      options.status ?? "",
      datetimeFormat,
      now,
      options.tags ?? []
    );
    const quote = getPlaceholderQuote(template, offset, match.length);
    if (token === "tags") {
      if (quote !== null) {
        throw new Error("%{{tags}} must not be quoted because it renders a list.");
      }
      return value;
    }

    return formatYamlScalarForQuote(value, quote);
  });

  return {
    content,
    nowFields,
    protectedFields: extractFrontmatterValues(
      content,
      [...new Set(["created", ...(options.protectedFieldNames ?? [])])]
    ),
    pageTokenUsed
  };
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
  now: Date,
  tags: string[] = []
): string {
  const dateFormat = getDateFormatFromDatetimeFormat(datetimeFormat);

  switch (token) {
    case "title":
    case "page":
      return title;
    case "status":
      return status;
    case "tags":
      return formatYamlList(tags);
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

export function formatYamlList(values: string[]): string {
  if (values.length === 0) {
    return "[]";
  }

  return [
    "",
    ...values.map((value) => `  - ${JSON.stringify(value)}`)
  ].join("\n");
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
    const tokenMatch = value.match(
      /%\{\{\s*(nowdatetime|nowdate|nowtime)\s*}}/
    );
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
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value) as string;
    } catch {
      return value.slice(1, -1);
    }
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
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
  const dateTokens = ["YYYY", "MM", "DD"] as const;
  const positions = dateTokens.map((token) => {
    const index = normalizedFormat.indexOf(token);
    return { token, index };
  });

  if (positions.some(({ index }) => index === -1)) {
    return "YYYY.MM.DD";
  }

  const start = Math.min(...positions.map(({ index }) => index));
  const end = Math.max(
    ...positions.map(({ token, index }) => index + token.length)
  );
  const dateFormat = normalizedFormat.slice(start, end);

  if (/HH|mm|ss/.test(dateFormat)) {
    return "YYYY.MM.DD";
  }

  return dateFormat;
}

export function isValidDateForFormat(value: string, format: string): boolean {
  const tokens: string[] = [];
  const tokenPattern = /YYYY|MM|DD/g;
  let cursor = 0;
  let pattern = "^";
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(format)) !== null) {
    pattern += escapeRegex(format.slice(cursor, match.index));
    pattern += match[0] === "YYYY" ? "(\\d{4})" : "(\\d{2})";
    tokens.push(match[0]);
    cursor = match.index + match[0].length;
  }

  pattern += `${escapeRegex(format.slice(cursor))}$`;
  const valueMatch = new RegExp(pattern).exec(value);
  if (!valueMatch) {
    return false;
  }

  const parts = new Map<string, number>();
  tokens.forEach((token, index) => {
    parts.set(token, Number(valueMatch[index + 1]));
  });
  const year = parts.get("YYYY");
  const month = parts.get("MM");
  const day = parts.get("DD");
  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }

  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
