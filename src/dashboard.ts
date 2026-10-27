import {
  App,
  MarkdownRenderChild,
  MarkdownView,
  Notice,
  TFile,
  normalizePath
} from "obsidian";
import { STATUS_OPTIONS } from "./status";
import type { StatusOption } from "./status";
import { HEALTH_CODE_BLOCK } from "./note-health";

const DASHBOARD_PATH = "IhateTemplate Dashboard.md";
const STATUS_BOARD_CODE_BLOCK = "ihate-template-status-board";
const STATUS_CODE_BLOCK = "ihate-template-status";
const TODO_CODE_BLOCK = "ihate-template-todo";
const FIXME_CODE_BLOCK = "ihate-template-fixme";
const IDEA_CODE_BLOCK = "ihate-template-idea";

export type MarkerKind = "TODO" | "FIXME" | "IDEA";

export interface MarkerItem {
  kind: MarkerKind;
  file: TFile;
  line: number;
  text: string;
}

export function getMarkersForFile(file: TFile, content: string): MarkerItem[] {
  return (["TODO", "FIXME", "IDEA"] as const).flatMap((kind) =>
    extractMarkers(file, content, kind)
  ).sort((left, right) => left.line - right.line);
}

export async function createOrOpenDashboardPage(app: App): Promise<void> {
  if (await app.vault.adapter.exists(DASHBOARD_PATH)) {
    const existing = app.vault.getAbstractFileByPath(DASHBOARD_PATH);
    if (existing instanceof TFile) {
      await migrateDashboardPageIfLegacy(app, existing);
      await app.workspace.getLeaf(false).openFile(existing);
    }
    return;
  }

  const file = await app.vault.create(DASHBOARD_PATH, buildDashboardContent(app));
  await app.workspace.getLeaf(false).openFile(file);
}

export function isDashboardPath(path: string): boolean {
  return path === DASHBOARD_PATH;
}

function buildDashboardContent(_app: App): string {
  return `## IhateTemplate Dashboard

## Status

\`\`\`${STATUS_CODE_BLOCK}
draft
\`\`\`

\`\`\`${STATUS_CODE_BLOCK}
review
\`\`\`

\`\`\`${STATUS_CODE_BLOCK}
done
\`\`\`

\`\`\`${STATUS_CODE_BLOCK}
updating
\`\`\`

\`\`\`${STATUS_CODE_BLOCK}
outdated
\`\`\`

## Markers

\`\`\`${TODO_CODE_BLOCK}
\`\`\`

\`\`\`${FIXME_CODE_BLOCK}
\`\`\`

\`\`\`${IDEA_CODE_BLOCK}
\`\`\`

## Health

\`\`\`${HEALTH_CODE_BLOCK}
\`\`\`
`;
}

async function migrateDashboardPageIfLegacy(app: App, file: TFile): Promise<void> {
  const content = await app.vault.read(file);
  if (content.trim() === buildLegacyDashboardContent().trim()) {
    await app.vault.modify(file, buildDashboardContent(app));
  }
}

function buildLegacyDashboardContent(): string {
  return `## IhateTemplate Dashboard

\`\`\`${STATUS_BOARD_CODE_BLOCK}
\`\`\`
`;
}

export function renderStatusBoard(app: App, container: HTMLElement): void {
  container.empty();
  container.addClass("ihate-template-status-board");

  for (const status of STATUS_OPTIONS) {
    const section = container.createEl("section", {
      cls: [
        "ihate-template-status-section",
        status.key ? `ihate-template-status-${status.key}` : "",
        status.key === "draft" ? "ihate-template-status-section-wide" : ""
      ].filter(Boolean).join(" ")
    });
    section.createEl("h3", { text: status.label });

    const files = getFilesByStatus(app, status.value);
    const list = section.createEl("div", {
      cls: "ihate-template-status-list"
    });

    if (files.length === 0) {
      list.createEl("div", {
        cls: "ihate-template-status-empty",
        text: "없음"
      });
      continue;
    }

    for (const file of files) {
      const item = list.createEl("button", {
        cls: "ihate-template-status-item",
        text: file.basename
      });
      item.onClickEvent(() => {
        openDashboardFile(app, file);
      });
    }
  }
}

export function renderStatusBlock(
  app: App,
  source: string,
  container: HTMLElement
): void {
  container.empty();
  container.addClass("ihate-template-status-block");

  const status = resolveStatus(source) ?? STATUS_OPTIONS[0];
  renderStatusSection(app, container, status, false);
}

export async function renderMarkerBlock(
  app: App,
  container: HTMLElement,
  kind: MarkerKind,
  templateFolder: string
): Promise<void> {
  container.empty();
  container.addClass("ihate-template-marker-block");
  container.addClass(`ihate-template-marker-${kind.toLowerCase()}`);

  const title = getMarkerTitle(kind);
  container.createEl("h3", { text: title });

  const list = container.createEl("div", {
    cls: "ihate-template-marker-list"
  });
  list.createEl("div", {
    cls: "ihate-template-status-empty",
    text: "불러오는 중"
  });

  const markers = await getMarkers(app, kind, templateFolder);
  renderMarkerItems(app, list, markers);
}

export class StatusBoardDashboardBlock extends MarkdownRenderChild {
  private readonly app: App;
  private refreshTimer: number | null = null;

  constructor(app: App, containerEl: HTMLElement) {
    super(containerEl);
    this.app = app;
  }

  onload(): void {
    renderStatusBoard(this.app, this.containerEl);
    this.registerStatusEvents(() => this.scheduleRender());
    this.register(() => this.clearTimer());
  }

  private registerStatusEvents(refresh: () => void): void {
    this.registerEvent(this.app.metadataCache.on("changed", refresh));
    this.registerEvent(this.app.vault.on("rename", refresh));
    this.registerEvent(this.app.vault.on("delete", refresh));
  }

  private scheduleRender(): void {
    this.clearTimer();
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      renderStatusBoard(this.app, this.containerEl);
    }, 150);
  }

  private clearTimer(): void {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

export class StatusDashboardBlock extends MarkdownRenderChild {
  private readonly app: App;
  private readonly source: string;
  private refreshTimer: number | null = null;

  constructor(app: App, containerEl: HTMLElement, source: string) {
    super(containerEl);
    this.app = app;
    this.source = source;
  }

  onload(): void {
    renderStatusBlock(this.app, this.source, this.containerEl);
    const refresh = (): void => this.scheduleRender();
    this.registerEvent(this.app.metadataCache.on("changed", refresh));
    this.registerEvent(this.app.vault.on("rename", refresh));
    this.registerEvent(this.app.vault.on("delete", refresh));
    this.register(() => this.clearTimer());
  }

  private scheduleRender(): void {
    this.clearTimer();
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      renderStatusBlock(this.app, this.source, this.containerEl);
    }, 150);
  }

  private clearTimer(): void {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

export class MarkerDashboardBlock extends MarkdownRenderChild {
  private readonly app: App;
  private readonly kind: MarkerKind;
  private readonly getTemplateFolder: () => string;
  private refreshTimer: number | null = null;
  private generation = 0;

  constructor(
    app: App,
    containerEl: HTMLElement,
    kind: MarkerKind,
    getTemplateFolder: () => string
  ) {
    super(containerEl);
    this.app = app;
    this.kind = kind;
    this.getTemplateFolder = getTemplateFolder;
  }

  onload(): void {
    void this.refresh();
    const refresh = (): void => this.scheduleRefresh();
    this.registerEvent(this.app.vault.on("create", refresh));
    this.registerEvent(this.app.vault.on("modify", refresh));
    this.registerEvent(this.app.vault.on("rename", refresh));
    this.registerEvent(this.app.vault.on("delete", refresh));
    this.register(() => this.clearTimer());
  }

  private scheduleRefresh(): void {
    this.clearTimer();
    this.refreshTimer = window.setTimeout(() => {
      this.refreshTimer = null;
      void this.refresh();
    }, 150);
  }

  private async refresh(): Promise<void> {
    const generation = ++this.generation;
    renderMarkerLoading(this.containerEl, this.kind);

    try {
      const markers = await getMarkers(
        this.app,
        this.kind,
        this.getTemplateFolder()
      );
      if (generation !== this.generation) {
        return;
      }

      const list = prepareMarkerContainer(this.containerEl, this.kind);
      renderMarkerItems(this.app, list, markers);
    } catch {
      if (generation !== this.generation) {
        return;
      }
      const list = prepareMarkerContainer(this.containerEl, this.kind);
      list.createEl("div", {
        cls: "ihate-template-query-error",
        text: "Marker 목록을 불러오지 못했습니다."
      });
    }
  }

  private clearTimer(): void {
    if (this.refreshTimer !== null) {
      window.clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}

function renderMarkerLoading(container: HTMLElement, kind: MarkerKind): void {
  const list = prepareMarkerContainer(container, kind);
  list.createEl("div", {
    cls: "ihate-template-status-empty",
    text: "불러오는 중"
  });
}

function prepareMarkerContainer(
  container: HTMLElement,
  kind: MarkerKind
): HTMLElement {
  container.empty();
  container.addClass("ihate-template-marker-block");
  container.addClass(`ihate-template-marker-${kind.toLowerCase()}`);
  container.createEl("h3", { text: getMarkerTitle(kind) });
  return container.createEl("div", {
    cls: "ihate-template-marker-list"
  });
}

function renderMarkerItems(
  app: App,
  list: HTMLElement,
  markers: MarkerItem[]
): void {
  list.empty();

  if (markers.length === 0) {
    list.createEl("div", {
      cls: "ihate-template-status-empty",
      text: "없음"
    });
    return;
  }

  for (const marker of markers) {
    const item = list.createEl("button", {
      cls: "ihate-template-marker-item"
    });
    item.createEl("span", {
      cls: "ihate-template-marker-text",
      text: marker.text
    });
    item.createEl("span", {
      cls: "ihate-template-marker-meta",
      text: `${marker.file.basename}:${marker.line}`
    });
    item.onClickEvent(() => {
      void openMarker(app, marker).catch(() => {
        new Notice("IhateTemplate could not open the marker.");
      });
    });
  }
}

export {
  FIXME_CODE_BLOCK,
  IDEA_CODE_BLOCK,
  STATUS_BOARD_CODE_BLOCK,
  STATUS_CODE_BLOCK,
  TODO_CODE_BLOCK
};

function getFilesByStatus(app: App, statusValue: string): TFile[] {
  return app.vault
    .getMarkdownFiles()
    .filter((file) => file.path !== DASHBOARD_PATH)
    .filter((file) => {
      const cache = app.metadataCache.getFileCache(file);
      return cache?.frontmatter?.status === statusValue;
    })
    .sort((a, b) => a.basename.localeCompare(b.basename));
}

function renderStatusSection(
  app: App,
  container: HTMLElement,
  status: StatusOption,
  wide: boolean
): void {
  const section = container.createEl("section", {
    cls: [
      "ihate-template-status-section",
      status.key ? `ihate-template-status-${status.key}` : "",
      wide ? "ihate-template-status-section-wide" : ""
    ].filter(Boolean).join(" ")
  });
  section.createEl("h3", { text: status.label });

  const files = getFilesByStatus(app, status.value);
  const list = section.createEl("div", {
    cls: "ihate-template-status-list"
  });

  if (files.length === 0) {
    list.createEl("div", {
      cls: "ihate-template-status-empty",
      text: "없음"
    });
    return;
  }

  for (const file of files) {
    const item = list.createEl("button", {
      cls: "ihate-template-status-item",
      text: file.basename
    });
    item.onClickEvent(() => {
      openDashboardFile(app, file);
    });
  }
}

function resolveStatus(source: string): StatusOption | null {
  const normalizedSource = normalizeStatusSource(source);
  if (!normalizedSource) {
    return null;
  }

  return STATUS_OPTIONS.find((status) => {
    return [
      status.key ?? "",
      status.label,
      status.value,
      status.value.replace(/^#?status\//, "")
    ].some((candidate) => normalizeStatusSource(candidate) === normalizedSource);
  }) ?? null;
}

function normalizeStatusSource(source: string): string {
  return source
    .trim()
    .replace(/^["']|["']$/g, "")
    .toLowerCase()
    .replace(/^#?status\//, "");
}

async function getMarkers(
  app: App,
  kind: MarkerKind,
  templateFolder: string
): Promise<MarkerItem[]> {
  const normalizedTemplateFolder = normalizePath(templateFolder);
  const markers: MarkerItem[] = [];

  for (const file of app.vault.getMarkdownFiles()) {
    if (shouldSkipMarkerFile(file, normalizedTemplateFolder)) {
      continue;
    }

    const content = await app.vault.cachedRead(file);
    markers.push(...extractMarkers(file, content, kind));
  }

  return markers.sort((a, b) => {
    const pathOrder = a.file.path.localeCompare(b.file.path);
    return pathOrder === 0 ? a.line - b.line : pathOrder;
  });
}

function shouldSkipMarkerFile(file: TFile, templateFolder: string): boolean {
  return (
    file.path === DASHBOARD_PATH ||
    file.path.startsWith(".obsidian/") ||
    file.path === templateFolder ||
    file.path.startsWith(`${templateFolder}/`)
  );
}

function extractMarkers(
  file: TFile,
  content: string,
  kind: MarkerKind
): MarkerItem[] {
  const markers: MarkerItem[] = [];
  const commentRegex = /%%\s*(TODO|FIXME|IDEA)\s*:?\s*([\s\S]*?)\s*%%/g;
  let match: RegExpExecArray | null;

  while ((match = commentRegex.exec(content)) !== null) {
    if (match[1] !== kind) {
      continue;
    }

    markers.push({
      kind,
      file,
      line: getLineNumber(content, match.index),
      text: normalizeMarkerText(match[2])
    });
  }

  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const lineMarker = lines[index].match(
      /^\s*(?:\/\/|<!--)\s*(TODO|FIXME|IDEA)\s*:?\s*(.*?)\s*(?:-->)?\s*$/
    );
    if (!lineMarker || lineMarker[1] !== kind) {
      continue;
    }

    markers.push({
      kind,
      file,
      line: index + 1,
      text: normalizeMarkerText(lineMarker[2])
    });
  }

  return markers;
}

function getLineNumber(content: string, index: number): number {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (content[cursor] === "\n") {
      line += 1;
    }
  }
  return line;
}

function normalizeMarkerText(text: string): string {
  return text.trim().replace(/\s+/g, " ") || "(내용 없음)";
}

function getMarkerTitle(kind: MarkerKind): string {
  switch (kind) {
    case "TODO":
      return "TODO";
    case "FIXME":
      return "FIXME";
    case "IDEA":
      return "IDEA";
  }
}

export async function openMarker(app: App, marker: MarkerItem): Promise<void> {
  const leaf = app.workspace.getLeaf(false);
  await leaf.openFile(marker.file);

  if (leaf.view instanceof MarkdownView) {
    const line = Math.max(marker.line - 1, 0);
    leaf.view.editor.setCursor({ line, ch: 0 });
    leaf.view.editor.scrollIntoView(
      {
        from: { line, ch: 0 },
        to: { line, ch: 0 }
      },
      true
    );
  }
}

function openDashboardFile(app: App, file: TFile): void {
  void app.workspace.getLeaf(false).openFile(file).catch(() => {
    new Notice("IhateTemplate could not open the note.");
  });
}
