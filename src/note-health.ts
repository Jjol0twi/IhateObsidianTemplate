import {
  App,
  MarkdownRenderChild,
  Modal,
  Notice,
  TFile,
  normalizePath,
  setIcon
} from "obsidian";
import {
  formatDate,
  getDateFormatFromDatetimeFormat,
  isValidDateForFormat
} from "./template-engine";
import type { IhateTemplateSettings } from "./settings";
import { STATUS_OPTIONS, pickStatus } from "./status";
import {
  buildTagIndex,
  canonicalizeTags,
  getFrontmatterTags,
  getSmartDefaultTagsForFolder,
  getTagIdentity
} from "./smart-tags";
import type { TagCandidate } from "./smart-tags";
import type { TemplateTrackerHandle } from "./template-tracker";
import { formatDateInput, requestDateValue } from "./prompt-placeholders";

export const HEALTH_CODE_BLOCK = "ihate-template-health";

export type NoteHealthIssueKind =
  | "missing-property"
  | "invalid-status"
  | "tags-not-list"
  | "noncanonical-tags"
  | "invalid-date";

export interface NoteHealthIssue {
  id: string;
  kind: NoteHealthIssueKind;
  file: TFile;
  message: string;
  property?: string;
}

export async function scanVaultHealth(
  app: App,
  settings: IhateTemplateSettings,
  tracker: TemplateTrackerHandle
): Promise<NoteHealthIssue[]> {
  const issues: NoteHealthIssue[] = [];
  const tagIndex = buildTagIndex(app);

  for (const file of getScannableFiles(app, settings.templateFolder)) {
    issues.push(...scanFileHealth(app, file, settings, tracker, tagIndex));
  }

  return issues.sort((left, right) => {
    const pathOrder = left.file.path.localeCompare(right.file.path);
    return pathOrder || left.message.localeCompare(right.message);
  });
}

export function scanFileHealth(
  app: App,
  file: TFile,
  settings: IhateTemplateSettings,
  tracker: TemplateTrackerHandle,
  tagIndex?: TagCandidate[]
): NoteHealthIssue[] {
  const issues: NoteHealthIssue[] = [];
  const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
  const appliedRule = tracker.getAppliedRule(file.path);

  for (const property of appliedRule?.requiredProperties ?? []) {
    if (!hasFrontmatterProperty(frontmatter, property)) {
      issues.push(createIssue(
        file,
        "missing-property",
        `Missing required property: ${property}`,
        property
      ));
    }
  }

  if (frontmatter && "status" in frontmatter) {
    const status = frontmatter.status;
    if (typeof status !== "string" || !STATUS_OPTIONS.some((item) => item.value === status)) {
      issues.push(createIssue(file, "invalid-status", "Unknown status value", "status"));
    }
  }

  if (frontmatter && "tags" in frontmatter) {
    if (
      !Array.isArray(frontmatter.tags) ||
      !frontmatter.tags.every((tag: unknown) => typeof tag === "string")
    ) {
      issues.push(createIssue(file, "tags-not-list", "Tags are not stored as a list", "tags"));
    } else {
      const currentTags = getFrontmatterTags(app, file);
      const canonicalTags = canonicalizeTags(app, currentTags, tagIndex);
      if (!sameTags(currentTags, canonicalTags)) {
        issues.push(createIssue(
          file,
          "noncanonical-tags",
          "Tags contain duplicates or inconsistent spelling",
          "tags"
        ));
      }
    }
  }

  const dateFormat = getDateFormatFromDatetimeFormat(settings.datetimeFormat);
  for (const property of appliedRule?.dateProperties ?? []) {
    const value = frontmatter?.[property];
    if (
      typeof value === "string" &&
      value.trim().length > 0 &&
      !isValidDateForFormat(value, dateFormat)
    ) {
      issues.push(createIssue(
        file,
        "invalid-date",
        `${property} does not match ${dateFormat}`,
        property
      ));
    }
  }

  return issues;
}

export async function fixNoteHealthIssue(
  app: App,
  issue: NoteHealthIssue,
  settings: IhateTemplateSettings
): Promise<boolean> {
  switch (issue.kind) {
    case "missing-property":
      return fixMissingProperty(app, issue, settings);
    case "invalid-status":
      return fixInvalidStatus(app, issue.file);
    case "tags-not-list":
    case "noncanonical-tags":
      return fixTags(app, issue.file);
    case "invalid-date":
      return fixDate(app, issue, settings);
  }
}

export function showNoteHealth(
  app: App,
  settings: IhateTemplateSettings,
  tracker: TemplateTrackerHandle
): void {
  new NoteHealthModal(app, settings, tracker).open();
}

export class NoteHealthDashboardBlock extends MarkdownRenderChild {
  private readonly app: App;
  private readonly getSettings: () => IhateTemplateSettings;
  private readonly tracker: TemplateTrackerHandle;
  private refreshTimer: number | null = null;
  private generation = 0;

  constructor(
    app: App,
    containerEl: HTMLElement,
    getSettings: () => IhateTemplateSettings,
    tracker: TemplateTrackerHandle
  ) {
    super(containerEl);
    this.app = app;
    this.getSettings = getSettings;
    this.tracker = tracker;
  }

  onload(): void {
    void this.refresh();
    this.registerEvent(this.app.metadataCache.on("changed", () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on("rename", () => this.scheduleRefresh()));
    this.registerEvent(this.app.vault.on("delete", () => this.scheduleRefresh()));
    this.register(() => {
      if (this.refreshTimer !== null) {
        window.clearTimeout(this.refreshTimer);
      }
    });
  }

  private scheduleRefresh(): void {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      void this.refresh();
    }, 200);
  }

  private async refresh(): Promise<void> {
    const generation = ++this.generation;
    this.containerEl.empty();
    this.containerEl.addClass("ihate-template-health-block");
    this.containerEl.createDiv({
      cls: "ihate-template-health-loading",
      text: "Checking notes"
    });

    let issues: NoteHealthIssue[];
    try {
      issues = await scanVaultHealth(this.app, this.getSettings(), this.tracker);
    } catch {
      if (generation !== this.generation) {
        return;
      }
      this.containerEl.empty();
      this.containerEl.createDiv({
        cls: "ihate-template-query-error",
        text: "Note health를 확인하지 못했습니다."
      });
      return;
    }
    if (generation !== this.generation) {
      return;
    }

    this.containerEl.empty();
    const header = this.containerEl.createDiv({
      cls: "ihate-template-health-block-header"
    });
    header.createEl("h3", { text: "Note health" });
    const review = header.createEl("button", {
      text: "Review",
      attr: { type: "button" }
    });
    review.onClickEvent(() => {
      showNoteHealth(this.app, this.getSettings(), this.tracker);
    });

    if (issues.length === 0) {
      const empty = this.containerEl.createDiv({
        cls: "ihate-template-health-block-empty"
      });
      setIcon(empty.createSpan(), "circle-check");
      empty.createSpan({ text: "No issues" });
      return;
    }

    this.containerEl.createDiv({
      cls: "ihate-template-health-block-count",
      text: `${issues.length} issue${issues.length === 1 ? "" : "s"}`
    });
    const list = this.containerEl.createDiv({
      cls: "ihate-template-health-block-list"
    });
    for (const issue of issues.slice(0, 10)) {
      const item = list.createEl("button", {
        cls: "ihate-template-health-block-item",
        attr: { type: "button", title: issue.file.path }
      });
      item.createSpan({
        cls: "ihate-template-health-block-file",
        text: issue.file.basename
      });
      item.createSpan({
        cls: "ihate-template-health-block-message",
        text: issue.message
      });
      item.onClickEvent(() => {
        void this.app.workspace.getLeaf(false).openFile(issue.file).catch(() => {
          new Notice("IhateTemplate could not open the note.");
        });
      });
    }
  }
}

function getScannableFiles(app: App, templateFolder: string): TFile[] {
  const normalizedTemplateFolder = normalizePath(templateFolder);
  return app.vault.getMarkdownFiles().filter((file) => {
    return file.path !== "IhateTemplate Dashboard.md" &&
      !file.path.startsWith(".obsidian/") &&
      file.path !== normalizedTemplateFolder &&
      !file.path.startsWith(`${normalizedTemplateFolder}/`);
  });
}

function createIssue(
  file: TFile,
  kind: NoteHealthIssueKind,
  message: string,
  property?: string
): NoteHealthIssue {
  return {
    id: `${file.path}:${kind}:${property ?? ""}`,
    kind,
    file,
    message,
    property
  };
}

function hasFrontmatterProperty(
  frontmatter: Record<string, unknown> | undefined,
  property: string
): boolean {
  return frontmatter !== undefined && Object.prototype.hasOwnProperty.call(frontmatter, property);
}

function sameTags(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((tag, index) => {
    return tag === right[index] && getTagIdentity(tag) === getTagIdentity(right[index]);
  });
}

async function fixMissingProperty(
  app: App,
  issue: NoteHealthIssue,
  settings: IhateTemplateSettings
): Promise<boolean> {
  const property = issue.property;
  if (!property) {
    return false;
  }

  const value = getDefaultPropertyValue(app, issue.file, property, settings);
  await app.fileManager.processFrontMatter(issue.file, (frontmatter) => {
    if (!Object.prototype.hasOwnProperty.call(frontmatter, property)) {
      frontmatter[property] = value;
    }
  });
  return true;
}

function getDefaultPropertyValue(
  app: App,
  file: TFile,
  property: string,
  settings: IhateTemplateSettings
): unknown {
  switch (property) {
    case "status":
      return STATUS_OPTIONS[0].value;
    case "tags":
      return getSmartDefaultTagsForFolder(app, file.parent?.path ?? "");
    case "created":
    case "updated":
      return formatDate(new Date(), settings.datetimeFormat);
    case "attendees":
    case "related":
    case "source":
      return [];
    default:
      return "";
  }
}

async function fixInvalidStatus(app: App, file: TFile): Promise<boolean> {
  const status = await pickStatus(app);
  if (!status) {
    return false;
  }

  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    frontmatter.status = status.value;
  });
  return true;
}

async function fixTags(app: App, file: TFile): Promise<boolean> {
  const tags = canonicalizeTags(app, getFrontmatterTags(app, file));
  await app.fileManager.processFrontMatter(file, (frontmatter) => {
    frontmatter.tags = tags;
  });
  return true;
}

async function fixDate(
  app: App,
  issue: NoteHealthIssue,
  settings: IhateTemplateSettings
): Promise<boolean> {
  const property = issue.property;
  if (!property) {
    return false;
  }

  const selected = await requestDateValue(app, property);
  if (!selected) {
    return false;
  }
  const formatted = formatDateInput(selected, settings.datetimeFormat);
  await app.fileManager.processFrontMatter(issue.file, (frontmatter) => {
    frontmatter[property] = formatted;
  });
  return true;
}

class NoteHealthModal extends Modal {
  private readonly settings: IhateTemplateSettings;
  private readonly tracker: TemplateTrackerHandle;
  private issues: NoteHealthIssue[] = [];

  constructor(
    app: App,
    settings: IhateTemplateSettings,
    tracker: TemplateTrackerHandle
  ) {
    super(app);
    this.settings = settings;
    this.tracker = tracker;
  }

  onOpen(): void {
    this.titleEl.setText("Note health");
    this.contentEl.addClass("ihate-template-health-modal");
    void this.refresh();
  }

  private async refresh(): Promise<void> {
    this.contentEl.empty();
    this.contentEl.createDiv({
      cls: "ihate-template-health-loading",
      text: "Checking notes"
    });
    try {
      this.issues = await scanVaultHealth(this.app, this.settings, this.tracker);
      this.renderIssues();
    } catch {
      this.contentEl.empty();
      this.contentEl.createDiv({
        cls: "ihate-template-query-error",
        text: "Note health를 확인하지 못했습니다."
      });
    }
  }

  private renderIssues(): void {
    this.contentEl.empty();

    const summary = this.contentEl.createDiv({
      cls: "ihate-template-health-summary"
    });
    summary.createSpan({
      text: this.issues.length === 0
        ? "No issues found"
        : `${this.issues.length} issue${this.issues.length === 1 ? "" : "s"}`
    });
    const refreshButton = summary.createEl("button", {
      attr: { "aria-label": "Refresh", type: "button" }
    });
    setIcon(refreshButton, "refresh-cw");
    refreshButton.onClickEvent(() => void this.refresh());

    if (this.issues.length === 0) {
      return;
    }

    const list = this.contentEl.createDiv({
      cls: "ihate-template-health-list"
    });
    for (const issue of this.issues) {
      const row = list.createDiv({ cls: "ihate-template-health-item" });
      const description = row.createDiv({
        cls: "ihate-template-health-description"
      });
      description.createDiv({
        cls: "ihate-template-health-file",
        text: issue.file.basename
      });
      description.createDiv({
        cls: "ihate-template-health-message",
        text: issue.message
      });

      const actions = row.createDiv({ cls: "ihate-template-health-actions" });
      const openButton = actions.createEl("button", {
        attr: { "aria-label": "Open note", type: "button" }
      });
      setIcon(openButton, "file-text");
      openButton.onClickEvent(() => {
        void this.app.workspace.getLeaf(false).openFile(issue.file).catch(() => {
          new Notice("IhateTemplate could not open the note.");
        });
      });

      const fixButton = actions.createEl("button", {
        attr: { "aria-label": "Fix issue", type: "button" }
      });
      setIcon(fixButton, "wrench");
      fixButton.onClickEvent(() => {
        void (async () => {
          try {
            if (await fixNoteHealthIssue(this.app, issue, this.settings)) {
              await this.refresh();
            }
          } catch {
            new Notice("IhateTemplate could not fix this issue.");
          }
        })();
      });
    }
  }
}
