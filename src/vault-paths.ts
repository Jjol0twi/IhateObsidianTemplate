import {
  App,
  MarkdownView,
  TFile,
  TFolder,
  normalizePath
} from "obsidian";
import { IhateTemplateSettings } from "./settings";

export function getFolderFromFileMenuTarget(target: unknown): string | undefined {
  if (target instanceof TFolder) {
    return target.path;
  }

  if (target instanceof TFile) {
    return target.parent?.path;
  }

  return undefined;
}

export function resolveTargetFolder(
  app: App,
  settings: IhateTemplateSettings,
  contextFolder?: string
): TFolder {
  if (settings.newNoteLocation === "vault-root") {
    return app.vault.getRoot();
  }

  if (contextFolder !== undefined) {
    const target = app.vault.getAbstractFileByPath(contextFolder);
    if (target instanceof TFolder) {
      return target;
    }

    return app.vault.getRoot();
  }

  const activeFile = app.workspace.getActiveFile();
  if (!activeFile) {
    return app.vault.getRoot();
  }

  return app.fileManager.getNewFileParent(activeFile.path, `${activeFile.basename}.md`);
}

export async function findAvailableMarkdownPath(
  app: App,
  folder: string,
  rawTitle: string
): Promise<string> {
  const safeTitle = sanitizeFileName(rawTitle);
  if (!safeTitle) {
    throw new Error(`Invalid note title after sanitizing: ${rawTitle}`);
  }

  const normalizedFolder = normalizeFolderPath(folder);
  const basePath = normalizePath(
    normalizedFolder ? `${normalizedFolder}/${safeTitle}` : safeTitle
  );
  let candidate = `${basePath}.md`;
  let index = 2;

  while (app.vault.getAbstractFileByPath(candidate) !== null) {
    candidate = `${basePath} ${index}.md`;
    index += 1;
  }

  return candidate;
}

export async function createMarkdownFile(
  app: App,
  path: string,
  content: string
): Promise<TFile> {
  const parentPath = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  if (parentPath && app.vault.getAbstractFileByPath(parentPath) === null) {
    throw new Error(`Parent folder does not exist: ${parentPath}`);
  }

  const file = await app.vault.create(path, content);
  if (!(file instanceof TFile)) {
    throw new Error("Created object is not a TFile.");
  }

  return file;
}

export function getActiveMarkdownTitle(app: App): string {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  return view?.file?.basename ?? "Untitled";
}

function sanitizeFileName(title: string): string {
  return title
    .trim()
    .replace(/[\\/#^[\]|:*?<>"]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/\.+$/g, "")
    .trim();
}

function normalizeFolderPath(folder: string): string {
  const normalized = normalizePath(folder);
  return normalized === "/" ? "" : normalized;
}
