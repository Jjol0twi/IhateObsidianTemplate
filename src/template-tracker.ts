import { App, TFile } from "obsidian";
import type { IhateTemplateSettings } from "./settings";
import { NowTemplateToken, renderNowToken } from "./template-engine";
import type { AppliedTemplateRule } from "./template-rules";

export interface NowFieldRecord {
  fields: Record<string, NowTemplateToken>;
}

export interface PageTitleRecord {
  previousTitle: string;
}

export interface ProtectedFieldRecord {
  fields: Record<string, string>;
}

export interface IhateTemplateData {
  nowFields: Record<string, NowFieldRecord>;
  pageTitles: Record<string, PageTitleRecord>;
  protectedFields: Record<string, ProtectedFieldRecord>;
  appliedRules: Record<string, AppliedTemplateRule>;
}

export const DEFAULT_DATA: IhateTemplateData = {
  nowFields: {},
  pageTitles: {},
  protectedFields: {},
  appliedRules: {}
};

export interface TemplateTrackerHandle {
  track(
    path: string,
    fields: Record<string, NowTemplateToken>,
    pageTitle?: string,
    protectedFields?: Record<string, string>,
    appliedRule?: AppliedTemplateRule
  ): Promise<void>;
  getAppliedRule(path: string): AppliedTemplateRule | undefined;
}

export class TemplateTracker implements TemplateTrackerHandle {
  private app: App;
  private settings: IhateTemplateSettings;
  private data: IhateTemplateData;
  private saveData: () => Promise<void>;
  private updating = new Set<string>();

  constructor(
    app: App,
    settings: IhateTemplateSettings,
    data: IhateTemplateData,
    saveData: () => Promise<void>
  ) {
    this.app = app;
    this.settings = settings;
    this.data = data;
    this.saveData = saveData;
  }

  async track(
    path: string,
    fields: Record<string, NowTemplateToken>,
    pageTitle?: string,
    protectedFields?: Record<string, string>,
    appliedRule?: AppliedTemplateRule
  ): Promise<void> {
    if (Object.keys(fields).length > 0) {
      this.data.nowFields[path] = { fields };
    } else {
      delete this.data.nowFields[path];
    }

    if (pageTitle !== undefined) {
      this.data.pageTitles[path] = { previousTitle: pageTitle };
    } else {
      delete this.data.pageTitles[path];
    }

    if (protectedFields && Object.keys(protectedFields).length > 0) {
      this.data.protectedFields[path] = { fields: protectedFields };
    } else {
      delete this.data.protectedFields[path];
    }

    if (appliedRule) {
      this.data.appliedRules[path] = appliedRule;
    } else {
      delete this.data.appliedRules[path];
    }

    await this.saveData();
  }

  getAppliedRule(path: string): AppliedTemplateRule | undefined {
    return this.data.appliedRules[path];
  }

  async update(file: TFile): Promise<void> {
    const nowRecord = this.data.nowFields[file.path];
    const protectedRecord = this.data.protectedFields[file.path];
    if ((!nowRecord && !protectedRecord) || this.updating.has(file.path)) {
      return;
    }

    this.updating.add(file.path);
    try {
      await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
        if (protectedRecord) {
          for (const [field, value] of Object.entries(protectedRecord.fields)) {
            frontmatter[field] = value;
          }
        }

        if (nowRecord) {
          for (const [field, token] of Object.entries(nowRecord.fields)) {
            frontmatter[field] = renderNowToken(
              token,
              this.settings.datetimeFormat
            );
          }
        }
      });
    } finally {
      this.updating.delete(file.path);
    }
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    let changed = false;
    const nowRecord = this.data.nowFields[oldPath];
    if (nowRecord) {
      delete this.data.nowFields[oldPath];
      this.data.nowFields[newPath] = nowRecord;
      changed = true;
    }

    const pageRecord = this.data.pageTitles[oldPath];
    if (pageRecord) {
      delete this.data.pageTitles[oldPath];
      const file = this.app.vault.getAbstractFileByPath(newPath);
      const nextTitle = file instanceof TFile ? file.basename : basenameFromPath(newPath);
      await this.updatePageTitle(newPath, pageRecord.previousTitle, nextTitle);
      this.data.pageTitles[newPath] = { previousTitle: nextTitle };
      changed = true;
    }

    const protectedRecord = this.data.protectedFields[oldPath];
    if (protectedRecord) {
      delete this.data.protectedFields[oldPath];
      this.data.protectedFields[newPath] = protectedRecord;
      changed = true;
    }

    const appliedRule = this.data.appliedRules[oldPath];
    if (appliedRule) {
      delete this.data.appliedRules[oldPath];
      this.data.appliedRules[newPath] = appliedRule;
      changed = true;
    }

    if (changed) {
      await this.saveData();
    }
  }

  async delete(path: string): Promise<void> {
    const hasNowFields = path in this.data.nowFields;
    const hasPageTitle = path in this.data.pageTitles;
    const hasProtectedFields = path in this.data.protectedFields;
    const hasAppliedRule = path in this.data.appliedRules;
    if (!hasNowFields && !hasPageTitle && !hasProtectedFields && !hasAppliedRule) {
      return;
    }

    delete this.data.nowFields[path];
    delete this.data.pageTitles[path];
    delete this.data.protectedFields[path];
    delete this.data.appliedRules[path];
    await this.saveData();
  }

  async renameFolder(oldPath: string, newPath: string): Promise<void> {
    const changed = [
      remapDescendantPaths(this.data.nowFields, oldPath, newPath),
      remapDescendantPaths(this.data.pageTitles, oldPath, newPath),
      remapDescendantPaths(this.data.protectedFields, oldPath, newPath),
      remapDescendantPaths(this.data.appliedRules, oldPath, newPath)
    ].some(Boolean);

    if (changed) {
      await this.saveData();
    }
  }

  async deleteFolder(path: string): Promise<void> {
    const changed = [
      deleteDescendantPaths(this.data.nowFields, path),
      deleteDescendantPaths(this.data.pageTitles, path),
      deleteDescendantPaths(this.data.protectedFields, path),
      deleteDescendantPaths(this.data.appliedRules, path)
    ].some(Boolean);

    if (changed) {
      await this.saveData();
    }
  }

  private async updatePageTitle(
    path: string,
    previousTitle: string,
    nextTitle: string
  ): Promise<void> {
    if (!previousTitle || previousTitle === nextTitle) {
      return;
    }

    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      return;
    }

    const content = await this.app.vault.read(file);
    const nextContent = replaceTrackedPageTitle(content, previousTitle, nextTitle);
    if (nextContent === content) {
      return;
    }

    await this.app.vault.modify(file, nextContent);
  }
}

function replaceTrackedPageTitle(
  content: string,
  previousTitle: string,
  nextTitle: string
): string {
  return content
    .split(/\r?\n/)
    .map((line) => replaceLineTitle(line, previousTitle, nextTitle))
    .join(content.includes("\r\n") ? "\r\n" : "\n");
}

function replaceLineTitle(
  line: string,
  previousTitle: string,
  nextTitle: string
): string {
  const heading = line.match(/^(#{1,6}\s+)(.*)$/);
  if (heading && heading[2] === previousTitle) {
    return `${heading[1]}${nextTitle}`;
  }

  const pageListItem = line.match(/^(\s*-\s+page:\s+)(.*)$/);
  if (pageListItem && pageListItem[2] === previousTitle) {
    return `${pageListItem[1]}${nextTitle}`;
  }

  return line;
}

function basenameFromPath(path: string): string {
  const name = path.split("/").pop() ?? path;
  return name.endsWith(".md") ? name.slice(0, -3) : name;
}

function remapDescendantPaths<T>(
  records: Record<string, T>,
  oldFolderPath: string,
  newFolderPath: string
): boolean {
  const oldPrefix = `${oldFolderPath}/`;
  let changed = false;

  for (const [path, record] of Object.entries(records)) {
    if (!path.startsWith(oldPrefix)) {
      continue;
    }

    const nextPath = `${newFolderPath}/${path.slice(oldPrefix.length)}`;
    delete records[path];
    records[nextPath] = record;
    changed = true;
  }

  return changed;
}

function deleteDescendantPaths<T>(
  records: Record<string, T>,
  folderPath: string
): boolean {
  const prefix = `${folderPath}/`;
  let changed = false;

  for (const path of Object.keys(records)) {
    if (path.startsWith(prefix)) {
      delete records[path];
      changed = true;
    }
  }

  return changed;
}
