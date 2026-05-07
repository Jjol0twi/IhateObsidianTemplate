import { App, TFile } from "obsidian";
import { STATUS_OPTIONS } from "./status";

const DASHBOARD_PATH = "IhateTemplate Dashboard.md";
const STATUS_BOARD_CODE_BLOCK = "ihate-template-status-board";

export async function ensureDashboardPage(app: App): Promise<void> {
  if (await app.vault.adapter.exists(DASHBOARD_PATH)) {
    return;
  }

  await app.vault.create(DASHBOARD_PATH, buildDashboardContent(app));
}

export async function createOrOpenDashboardPage(app: App): Promise<void> {
  if (await app.vault.adapter.exists(DASHBOARD_PATH)) {
    const existing = app.vault.getAbstractFileByPath(DASHBOARD_PATH);
    if (existing instanceof TFile) {
      await app.vault.modify(existing, buildDashboardContent(app));
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
      item.onClickEvent(async () => {
        await app.workspace.getLeaf(false).openFile(file);
      });
    }
  }
}

export { STATUS_BOARD_CODE_BLOCK };

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
