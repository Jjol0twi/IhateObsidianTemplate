import {
  App,
  MarkdownRenderChild,
  Notice,
  TFile,
  normalizePath,
  parseYaml
} from "obsidian";
import { STATUS_OPTIONS } from "./status";
import { getFrontmatterTags, getTagIdentity, normalizeTagValue } from "./smart-tags";

export const QUERY_CODE_BLOCK = "ihate-template-query";

type QuerySort = "name" | "created" | "updated" | "due";
type QueryOrder = "asc" | "desc";
type QueryLayout = "list" | "grid";

interface DashboardQueryConfig {
  title?: string;
  statuses: string[];
  tags: string[];
  folder?: string;
  sort: QuerySort;
  order: QueryOrder;
  limit: number;
  layout: QueryLayout;
}

const ALLOWED_KEYS = new Set([
  "title",
  "status",
  "tag",
  "folder",
  "sort",
  "order",
  "limit",
  "layout"
]);

export class DashboardQueryBlock extends MarkdownRenderChild {
  private readonly app: App;
  private readonly source: string;
  private readonly templateFolder: string;
  private refreshTimer: number | null = null;

  constructor(
    app: App,
    containerEl: HTMLElement,
    source: string,
    templateFolder: string
  ) {
    super(containerEl);
    this.app = app;
    this.source = source;
    this.templateFolder = templateFolder;
  }

  onload(): void {
    this.render();
    this.registerEvent(this.app.metadataCache.on("changed", () => this.scheduleRender()));
    this.registerEvent(this.app.vault.on("rename", () => this.scheduleRender()));
    this.registerEvent(this.app.vault.on("delete", () => this.scheduleRender()));
    this.register(() => {
      if (this.refreshTimer !== null) {
        window.clearTimeout(this.refreshTimer);
      }
    });
  }

  private scheduleRender(): void {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      this.render();
    }, 150);
  }

  private render(): void {
    this.containerEl.empty();
    this.containerEl.addClass("ihate-template-query-block");

    let config: DashboardQueryConfig;
    try {
      config = parseDashboardQuery(this.source);
    } catch (error) {
      this.containerEl.createDiv({
        cls: "ihate-template-query-error",
        text: error instanceof Error ? error.message : "Invalid dashboard query"
      });
      return;
    }

    if (config.title) {
      this.containerEl.createEl("h3", { text: config.title });
    }

    const files = runDashboardQuery(
      this.app,
      config,
      this.templateFolder
    );
    const list = this.containerEl.createDiv({
      cls: `ihate-template-query-results ihate-template-query-${config.layout}`
    });

    if (files.length === 0) {
      list.createDiv({
        cls: "ihate-template-status-empty",
        text: "없음"
      });
      return;
    }

    for (const file of files) {
      const button = list.createEl("button", {
        cls: "ihate-template-query-item",
        text: file.basename,
        attr: { type: "button", title: file.path }
      });
      button.onClickEvent(() => {
        void this.app.workspace.getLeaf(false).openFile(file).catch(() => {
          new Notice("IhateTemplate could not open the note.");
        });
      });
    }
  }
}

export function parseDashboardQuery(source: string): DashboardQueryConfig {
  let value: unknown;
  try {
    value = parseYaml(source.trim() || "{}");
  } catch {
    throw new Error("Dashboard query must be valid YAML.");
  }

  if (!isRecord(value)) {
    throw new Error("Dashboard query must contain YAML properties.");
  }

  for (const key of Object.keys(value)) {
    if (!ALLOWED_KEYS.has(key)) {
      throw new Error(`Unsupported dashboard query property: ${key}`);
    }
  }

  const statuses = toStringList(value.status).map(resolveStatusValue);
  const tags = toStringList(value.tag)
    .map(normalizeTagValue)
    .filter(Boolean);

  return {
    title: optionalString(value.title, "title"),
    statuses,
    tags,
    folder: normalizeFolder(optionalString(value.folder, "folder")),
    sort: parseEnum(value.sort, ["name", "created", "updated", "due"], "name"),
    order: parseEnum(value.order, ["asc", "desc"], "asc"),
    limit: parseLimit(value.limit),
    layout: parseEnum(value.layout, ["list", "grid"], "list")
  };
}

function runDashboardQuery(
  app: App,
  config: DashboardQueryConfig,
  templateFolder: string
): TFile[] {
  const normalizedTemplateFolder = normalizePath(templateFolder);
  const files = app.vault.getMarkdownFiles().filter((file) => {
    if (
      file.path === "IhateTemplate Dashboard.md" ||
      file.path === normalizedTemplateFolder ||
      file.path.startsWith(`${normalizedTemplateFolder}/`) ||
      file.path.startsWith(".obsidian/")
    ) {
      return false;
    }

    if (config.folder && !isInsideFolder(file, config.folder)) {
      return false;
    }

    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
    if (
      config.statuses.length > 0 &&
      !config.statuses.includes(String(frontmatter?.status ?? ""))
    ) {
      return false;
    }

    if (config.tags.length > 0) {
      const fileTagIdentities = new Set(
        getFrontmatterTags(app, file).map(getTagIdentity)
      );
      if (!config.tags.every((tag) => fileTagIdentities.has(getTagIdentity(tag)))) {
        return false;
      }
    }

    return true;
  });

  files.sort((left, right) => compareFiles(app, left, right, config.sort));
  if (config.order === "desc") {
    files.reverse();
  }
  return files.slice(0, config.limit);
}

function compareFiles(app: App, left: TFile, right: TFile, sort: QuerySort): number {
  if (sort === "name") {
    return left.basename.localeCompare(right.basename);
  }

  const leftValue = getFrontmatterSortValue(app, left, sort);
  const rightValue = getFrontmatterSortValue(app, right, sort);
  return leftValue.localeCompare(rightValue) || left.basename.localeCompare(right.basename);
}

function getFrontmatterSortValue(app: App, file: TFile, property: QuerySort): string {
  const value = app.metadataCache.getFileCache(file)?.frontmatter?.[property];
  return value === undefined || value === null ? "" : String(value);
}

function resolveStatusValue(value: string): string {
  const normalized = value
    .trim()
    .replace(/^#?status\//, "")
    .toLocaleLowerCase();
  const status = STATUS_OPTIONS.find((option) => {
    return option.key === normalized ||
      option.label.toLocaleLowerCase() === normalized ||
      option.value.replace(/^#?status\//, "").toLocaleLowerCase() === normalized;
  });
  if (!status) {
    throw new Error(`Unknown status in dashboard query: ${value}`);
  }
  return status.value;
}

function isInsideFolder(file: TFile, folder: string): boolean {
  const parent = file.parent?.path ?? "";
  return parent === folder || parent.startsWith(`${folder}/`);
}

function normalizeFolder(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = normalizePath(value);
  return normalized === "/" ? undefined : normalized;
}

function toStringList(value: unknown): string[] {
  if (value === undefined || value === null || value === "") {
    return [];
  }
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value;
  }
  throw new Error("status and tag must be strings or string lists.");
}

function optionalString(value: unknown, property: string): string | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`${property} must be a string.`);
  }
  return value.trim() || undefined;
}

function parseEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  if (typeof value === "string" && allowed.includes(value as T)) {
    return value as T;
  }
  throw new Error(`Expected one of: ${allowed.join(", ")}`);
}

function parseLimit(value: unknown): number {
  if (value === undefined || value === null || value === "") {
    return 20;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 200) {
    throw new Error("limit must be an integer from 1 to 200.");
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
