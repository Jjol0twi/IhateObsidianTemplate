import {
  App,
  ItemView,
  MarkdownView,
  Notice,
  TFile,
  WorkspaceLeaf,
  setIcon
} from "obsidian";
import { getMarkersForFile, openMarker } from "./dashboard";
import type { IhateTemplateSettings } from "./settings";
import { changeFileStatus, pickOption, STATUS_OPTIONS } from "./status";
import { editFileTags, getFrontmatterTags } from "./smart-tags";
import { scanFileHealth, showNoteHealth } from "./note-health";
import type { TemplateTrackerHandle } from "./template-tracker";
import { formatDateInput, requestDateValue } from "./prompt-placeholders";

export const WORKSPACE_VIEW_TYPE = "ihate-template-workspace";

const PRIORITY_OPTIONS = [
  { label: "낮음", value: "low" },
  { label: "보통", value: "medium" },
  { label: "높음", value: "high" }
];

export interface WorkspaceViewContext {
  getSettings(): IhateTemplateSettings;
  tracker: TemplateTrackerHandle;
}

export class IhateTemplateWorkspaceView extends ItemView {
  private readonly context: WorkspaceViewContext;
  private renderGeneration = 0;

  constructor(leaf: WorkspaceLeaf, context: WorkspaceViewContext) {
    super(leaf);
    this.context = context;
  }

  getViewType(): string {
    return WORKSPACE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "IhateTemplate";
  }

  getIcon(): string {
    return "layout-panel-right";
  }

  async onOpen(): Promise<void> {
    await this.refresh();
  }

  async refresh(): Promise<void> {
    const generation = ++this.renderGeneration;
    const file = this.app.workspace.getActiveFile();
    this.contentEl.empty();
    this.contentEl.addClass("ihate-template-workspace-view");

    if (!(file instanceof TFile) || file.extension !== "md") {
      this.renderEmptyState();
      return;
    }

    this.renderHeader(file);
    this.renderProperties(file);
    this.renderTags(file);
    this.renderOutline(file);

    const content = await this.app.vault.cachedRead(file);
    if (generation !== this.renderGeneration) {
      return;
    }
    this.renderMarkers(file, content);
    this.renderHealth(file);
  }

  private renderEmptyState(): void {
    const empty = this.contentEl.createDiv({
      cls: "ihate-template-workspace-empty"
    });
    setIcon(empty.createSpan(), "file-text");
    empty.createSpan({ text: "Open a markdown note" });
  }

  private renderHeader(file: TFile): void {
    const header = this.contentEl.createDiv({
      cls: "ihate-template-workspace-header"
    });
    const title = header.createDiv({
      cls: "ihate-template-workspace-title",
      text: file.basename
    });
    title.setAttr("title", file.path);

    const actions = header.createDiv({
      cls: "ihate-template-workspace-actions"
    });
    this.createIconButton(actions, "tags", "Edit tags", async () => {
      if (await editFileTags(this.app, file)) {
        await this.refresh();
      }
    });
    this.createIconButton(actions, "stethoscope", "Check note health", () => {
      showNoteHealth(this.app, this.context.getSettings(), this.context.tracker);
    });
  }

  private renderProperties(file: TFile): void {
    const section = this.createSection("Properties");
    const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
    const status = STATUS_OPTIONS.find((item) => item.value === frontmatter?.status);

    this.createPropertyButton(
      section,
      "Status",
      status?.label ?? "없음",
      async () => {
        await changeFileStatus(this.app, file.path);
        await this.refresh();
      }
    );

    this.createPropertyButton(
      section,
      "Priority",
      getPropertyText(frontmatter?.priority),
      async () => {
        const selected = await pickOption(
          this.app,
          PRIORITY_OPTIONS,
          "Choose priority"
        );
        if (!selected) {
          return;
        }
        await this.app.fileManager.processFrontMatter(file, (nextFrontmatter) => {
          nextFrontmatter.priority = selected.value;
        });
        await this.refresh();
      }
    );

    this.createPropertyButton(
      section,
      "Due",
      getPropertyText(frontmatter?.due),
      async () => {
        const selected = await requestDateValue(this.app, "due");
        if (!selected) {
          return;
        }
        const due = formatDateInput(
          selected,
          this.context.getSettings().datetimeFormat
        );
        await this.app.fileManager.processFrontMatter(file, (nextFrontmatter) => {
          nextFrontmatter.due = due;
        });
        await this.refresh();
      }
    );
  }

  private renderTags(file: TFile): void {
    const section = this.createSection("Tags", "ihate-template-workspace-tags");
    const tags = getFrontmatterTags(this.app, file);
    if (tags.length === 0) {
      section.createDiv({
        cls: "ihate-template-workspace-muted",
        text: "없음"
      });
      return;
    }

    const list = section.createDiv({
      cls: "ihate-template-workspace-tag-list"
    });
    for (const tag of tags) {
      list.createSpan({
        cls: "ihate-template-workspace-tag",
        text: tag
      });
    }
  }

  private renderOutline(file: TFile): void {
    const section = this.createSection("Outline");
    const headings = this.app.metadataCache.getFileCache(file)?.headings ?? [];
    if (headings.length === 0) {
      section.createDiv({
        cls: "ihate-template-workspace-muted",
        text: "No headings"
      });
      return;
    }

    const list = section.createDiv({
      cls: "ihate-template-workspace-outline"
    });
    for (const heading of headings) {
      const level = Math.min(Math.max(heading.level, 1), 6);
      const item = list.createEl("button", {
        cls: `ihate-template-workspace-outline-item ihate-template-workspace-outline-level-${level}`,
        text: heading.heading,
        attr: { type: "button" }
      });
      item.onClickEvent(() => {
        this.runAction(() => openFileAtLine(
          this.app,
          file,
          heading.position.start.line
        ));
      });
    }
  }

  private renderMarkers(file: TFile, content: string): void {
    const section = this.createSection("Markers");
    const markers = getMarkersForFile(file, content);
    if (markers.length === 0) {
      section.createDiv({
        cls: "ihate-template-workspace-muted",
        text: "없음"
      });
      return;
    }

    const list = section.createDiv({
      cls: "ihate-template-workspace-marker-list"
    });
    for (const marker of markers) {
      const item = list.createEl("button", {
        cls: `ihate-template-workspace-marker ihate-template-marker-${marker.kind.toLowerCase()}`,
        attr: { type: "button" }
      });
      item.createSpan({
        cls: "ihate-template-workspace-marker-kind",
        text: marker.kind
      });
      item.createSpan({
        cls: "ihate-template-workspace-marker-text",
        text: marker.text
      });
      item.onClickEvent(() => {
        this.runAction(() => openMarker(this.app, marker));
      });
    }
  }

  private renderHealth(file: TFile): void {
    const section = this.createSection("Health");
    const issues = scanFileHealth(
      this.app,
      file,
      this.context.getSettings(),
      this.context.tracker
    );
    const button = section.createEl("button", {
      cls: "ihate-template-workspace-health",
      attr: { type: "button" }
    });
    setIcon(button.createSpan(), issues.length === 0 ? "circle-check" : "triangle-alert");
    button.createSpan({
      text: issues.length === 0 ? "No issues" : `${issues.length} issue${issues.length === 1 ? "" : "s"}`
    });
    button.onClickEvent(() => {
      showNoteHealth(this.app, this.context.getSettings(), this.context.tracker);
    });
  }

  private createSection(title: string, className?: string): HTMLElement {
    const section = this.contentEl.createEl("section", {
      cls: ["ihate-template-workspace-section", className ?? ""].filter(Boolean).join(" ")
    });
    section.createEl("h3", { text: title });
    return section;
  }

  private createPropertyButton(
    container: HTMLElement,
    label: string,
    value: string,
    onClick: () => void | Promise<void>
  ): void {
    const button = container.createEl("button", {
      cls: "ihate-template-workspace-property",
      attr: { type: "button" }
    });
    button.createSpan({
      cls: "ihate-template-workspace-property-label",
      text: label
    });
    button.createSpan({
      cls: "ihate-template-workspace-property-value",
      text: value
    });
    button.onClickEvent(() => this.runAction(onClick));
  }

  private createIconButton(
    container: HTMLElement,
    icon: string,
    label: string,
    onClick: () => void | Promise<void>
  ): void {
    const button = container.createEl("button", {
      attr: { "aria-label": label, type: "button" }
    });
    setIcon(button, icon);
    button.onClickEvent(() => this.runAction(onClick));
  }

  private runAction(action: () => void | Promise<void>): void {
    void (async () => {
      try {
        await action();
      } catch {
        new Notice("IhateTemplate could not complete this action.");
      }
    })();
  }
}

function getPropertyText(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "없음";
  }
  return Array.isArray(value) ? value.join(", ") : String(value);
}

async function openFileAtLine(app: App, file: TFile, line: number): Promise<void> {
  const existingLeaf = app.workspace.getLeavesOfType("markdown").find((leaf) => {
    return leaf.view instanceof MarkdownView && leaf.view.file?.path === file.path;
  });
  const leaf = existingLeaf ?? app.workspace.getLeaf(false);
  if (!(leaf.view instanceof MarkdownView) || leaf.view.file?.path !== file.path) {
    await leaf.openFile(file);
  }

  if (leaf.view instanceof MarkdownView) {
    const position = { line: Math.max(line, 0), ch: 0 };
    leaf.view.editor.setCursor(position);
    leaf.view.editor.scrollIntoView({ from: position, to: position }, true);
    app.workspace.revealLeaf(leaf);
  }
}
