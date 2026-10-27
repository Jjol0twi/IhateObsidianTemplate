import {
  Menu,
  Notice,
  Plugin,
  TAbstractFile,
  TFile,
  TFolder,
  normalizePath
} from "obsidian";
import {
  DEFAULT_TEMPLATE_FOLDER,
  IS_DEV,
  LEGACY_DEFAULT_TEMPLATE_FOLDER
} from "./constants";
import { DEFAULT_TEMPLATES } from "./default-templates";
import {
  DEFAULT_SETTINGS,
  IhateTemplateSettings,
  IhateTemplateSettingTab
} from "./settings";
import {
  applyTemplateToEmptyFile,
  createNoteFromTemplate,
  insertTemplateIntoEditor
} from "./note-creator";
import {
  DEFAULT_DATA,
  IhateTemplateData,
  TemplateTracker
} from "./template-tracker";
import { changeFileStatus } from "./status";
import {
  FIXME_CODE_BLOCK,
  IDEA_CODE_BLOCK,
  createOrOpenDashboardPage,
  ensureDashboardPage,
  isDashboardPath,
  MarkerDashboardBlock,
  StatusBoardDashboardBlock,
  StatusDashboardBlock,
  STATUS_BOARD_CODE_BLOCK,
  STATUS_CODE_BLOCK,
  TODO_CODE_BLOCK
} from "./dashboard";
import { getFolderFromFileMenuTarget } from "./vault-paths";
import { editFileTags } from "./smart-tags";
import { getTemplateRulePath } from "./template-rules";
import {
  HEALTH_CODE_BLOCK,
  NoteHealthDashboardBlock,
  showNoteHealth
} from "./note-health";
import {
  IhateTemplateWorkspaceView,
  WORKSPACE_VIEW_TYPE
} from "./workspace-view";
import { DashboardQueryBlock, QUERY_CODE_BLOCK } from "./dashboard-query";
import { CODE_TABS_CODE_BLOCK, CodeTabsBlock } from "./code-tabs";
import { WideTableLayout } from "./wide-tables";

export default class IhateTemplatePlugin extends Plugin {
  settings: IhateTemplateSettings = { ...DEFAULT_SETTINGS };
  data: IhateTemplateData = structuredClone(DEFAULT_DATA);
  tracker!: TemplateTracker;
  private shouldMigrateLegacyTemplateFolder = false;
  private wideTableLayout?: WideTableLayout;

  async onload(): Promise<void> {
    await this.loadSettings();
    await this.loadPluginData();

    this.wideTableLayout = this.addChild(
      new WideTableLayout(this.app.workspace, this.settings.wideTables)
    );

    this.tracker = new TemplateTracker(
      this.app,
      this.settings,
      this.data,
      () => this.savePluginData()
    );

    this.registerView(
      WORKSPACE_VIEW_TYPE,
      (leaf) => new IhateTemplateWorkspaceView(leaf, {
        getSettings: () => this.settings,
        tracker: this.tracker
      })
    );
    this.addRibbonIcon("layout-panel-right", "Open IhateTemplate panel", () => {
      this.runBackground(this.activateWorkspaceView(), "open workspace panel");
    });
    this.addSettingTab(new IhateTemplateSettingTab(this.app, this));
    this.registerCommands();
    this.registerMenus();
    this.registerMarkdownProcessors();
    this.registerFileEvents();
    await this.migrateLegacyTemplateFolder();
    await this.ensureDefaultTemplates();
    await ensureDashboardPage(this.app);

    if (IS_DEV) {
      new Notice("IhateTemplate loaded in development mode.");
      this.addCommand({
        id: "health-check",
        name: "Health check",
        callback: () => {
          console.log("IhateTemplate health check", {
            settings: this.settings,
            data: this.data
          });
          new Notice("IhateTemplate health check logged to console.");
        }
      });
    }
  }

  onunload(): void {
    this.app.workspace.detachLeavesOfType(WORKSPACE_VIEW_TYPE);
    if (IS_DEV) {
      console.log("IhateTemplate unloaded");
    }
  }

  async loadSettings(): Promise<void> {
    const loaded = await this.loadData() as unknown;
    const stored = isRecord(loaded) ? loaded : {};
    const templateFolder = getStoredTemplateFolder(stored.templateFolder);
    this.settings = {
      templateFolder,
      newNoteLocation: stored.newNoteLocation === "vault-root"
        ? "vault-root"
        : "current-folder",
      datetimeFormat: typeof stored.datetimeFormat === "string"
        ? stored.datetimeFormat.trim() || DEFAULT_SETTINGS.datetimeFormat
        : DEFAULT_SETTINGS.datetimeFormat,
      wideTables: typeof stored.wideTables === "boolean"
        ? stored.wideTables
        : DEFAULT_SETTINGS.wideTables
    };
    this.shouldMigrateLegacyTemplateFolder =
      templateFolder === LEGACY_DEFAULT_TEMPLATE_FOLDER;

    if (this.shouldMigrateLegacyTemplateFolder) {
      this.settings.templateFolder = DEFAULT_TEMPLATE_FOLDER;
    }
  }

  async saveSettings(): Promise<void> {
    this.wideTableLayout?.setEnabled(this.settings.wideTables);
    await this.saveData({
      ...this.settings,
      __pluginData: this.data
    });
  }

  async loadPluginData(): Promise<void> {
    const loaded = await this.loadData() as unknown;
    const stored = isRecord(loaded) && isRecord(loaded.__pluginData)
      ? loaded.__pluginData
      : {};
    this.data = {
      nowFields: getStoredRecord(stored.nowFields),
      pageTitles: getStoredRecord(stored.pageTitles),
      protectedFields: getStoredRecord(stored.protectedFields),
      appliedRules: getStoredRecord(stored.appliedRules)
    };
  }

  async savePluginData(): Promise<void> {
    await this.saveData({
      ...this.settings,
      __pluginData: this.data
    });
  }

  async changeTemplateFolder(nextFolder: string): Promise<void> {
    const currentFolder = normalizeTemplateFolderPath(this.settings.templateFolder);
    const normalizedNextFolder = normalizeTemplateFolderPath(nextFolder);

    if (currentFolder !== normalizedNextFolder) {
      await this.moveTemplateFiles(currentFolder, normalizedNextFolder);
    }

    this.settings.templateFolder = normalizedNextFolder;
    await this.saveSettings();
    await this.ensureDefaultTemplates();
  }

  private registerCommands(): void {
    this.addCommand({
      id: "create-note-from-template",
      name: "Create note from template",
      callback: async () => {
        await createNoteFromTemplate(this.app, this.settings, this.tracker);
      }
    });

    this.addCommand({
      id: "insert-template",
      name: "Insert template",
      editorCallback: async (editor) => {
        await insertTemplateIntoEditor(this.app, editor, this.settings);
      }
    });

    this.addCommand({
      id: "change-current-file-status",
      name: "Change current file status",
      callback: async () => {
        const file = this.app.workspace.getActiveFile();
        if (file) {
          await changeFileStatus(this.app, file.path);
        }
      }
    });

    this.addCommand({
      id: "create-dashboard",
      name: "Create dashboard",
      callback: async () => {
        await createOrOpenDashboardPage(this.app);
      }
    });

    this.addCommand({
      id: "edit-current-file-tags",
      name: "Edit current file tags",
      callback: async () => {
        const file = this.app.workspace.getActiveFile();
        if (file) {
          await editFileTags(this.app, file);
        }
      }
    });

    this.addCommand({
      id: "check-note-health",
      name: "Check note health",
      callback: () => {
        showNoteHealth(this.app, this.settings, this.tracker);
      }
    });

    this.addCommand({
      id: "open-workspace-panel",
      name: "Open workspace panel",
      callback: async () => {
        await this.activateWorkspaceView();
      }
    });
  }

  private registerMenus(): void {
    this.registerEvent(
      this.app.workspace.on(
        "file-menu",
        (menu: Menu, target: TAbstractFile) => {
          if (!(target instanceof TFile) && !(target instanceof TFolder)) {
            return;
          }

          menu.addItem((item) => {
            item
              .setTitle("New note from IhateTemplate")
              .setIcon("file-plus")
              .onClick(async () => {
                await createNoteFromTemplate(
                  this.app,
                  this.settings,
                  this.tracker,
                  {
                    contextFolder: getFolderFromFileMenuTarget(target)
                  }
                );
              });
          });

          if (target instanceof TFile && target.extension === "md") {
            menu.addItem((item) => {
              item
                .setTitle("Apply IhateTemplate if empty")
                .setIcon("file-check")
                .onClick(async () => {
                  await applyTemplateToEmptyFile(
                    this.app,
                    target,
                    this.settings,
                    this.tracker
                  );
                });
            });

            menu.addItem((item) => {
              item
                .setTitle("Change IhateTemplate status")
                .setIcon("list-checks")
                .onClick(async () => {
                  await changeFileStatus(this.app, target.path);
                });
            });

            menu.addItem((item) => {
              item
                .setTitle("Edit IhateTemplate tags")
                .setIcon("tags")
                .onClick(async () => {
                  await editFileTags(this.app, target);
                });
            });
          }
        }
      )
    );

    this.registerEvent(
      this.app.workspace.on("editor-menu", (menu, editor) => {
        menu.addItem((item) => {
          item
            .setTitle("Insert IhateTemplate")
            .setIcon("document")
            .onClick(async () => {
              await insertTemplateIntoEditor(this.app, editor, this.settings);
            });
        });
      })
    );
  }

  private registerMarkdownProcessors(): void {
    this.registerMarkdownCodeBlockProcessor(
      CODE_TABS_CODE_BLOCK,
      (source, el, context) => {
        context.addChild(new CodeTabsBlock(el, source));
      }
    );

    this.registerMarkdownCodeBlockProcessor(
      STATUS_BOARD_CODE_BLOCK,
      (_source, el, context) => {
        context.addChild(new StatusBoardDashboardBlock(this.app, el));
      }
    );

    this.registerMarkdownCodeBlockProcessor(
      STATUS_CODE_BLOCK,
      (source, el, context) => {
        context.addChild(new StatusDashboardBlock(this.app, el, source));
      }
    );

    this.registerMarkdownCodeBlockProcessor(
      TODO_CODE_BLOCK,
      (_source, el, context) => {
        context.addChild(new MarkerDashboardBlock(
          this.app,
          el,
          "TODO",
          () => this.settings.templateFolder
        ));
      }
    );

    this.registerMarkdownCodeBlockProcessor(
      FIXME_CODE_BLOCK,
      (_source, el, context) => {
        context.addChild(new MarkerDashboardBlock(
          this.app,
          el,
          "FIXME",
          () => this.settings.templateFolder
        ));
      }
    );

    this.registerMarkdownCodeBlockProcessor(
      IDEA_CODE_BLOCK,
      (_source, el, context) => {
        context.addChild(new MarkerDashboardBlock(
          this.app,
          el,
          "IDEA",
          () => this.settings.templateFolder
        ));
      }
    );

    this.registerMarkdownCodeBlockProcessor(
      QUERY_CODE_BLOCK,
      (source, el, context) => {
        context.addChild(new DashboardQueryBlock(
          this.app,
          el,
          source,
          this.settings.templateFolder
        ));
      }
    );

    this.registerMarkdownCodeBlockProcessor(
      HEALTH_CODE_BLOCK,
      (_source, el, context) => {
        context.addChild(new NoteHealthDashboardBlock(
          this.app,
          el,
          () => this.settings,
          this.tracker
        ));
      }
    );
  }

  private registerFileEvents(): void {
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        this.runBackground(this.handleFileModified(file), "file modify");
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        this.runBackground(this.handleFileRenamed(file, oldPath), "file rename");
      })
    );

    this.registerEvent(
      this.app.vault.on("delete", (file) => {
        this.runBackground(this.handleFileDeleted(file), "file delete");
      })
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.runBackground(this.refreshWorkspaceViews(), "active leaf change");
      })
    );

    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        if (this.app.workspace.getActiveFile()?.path === file.path) {
          this.runBackground(this.refreshWorkspaceViews(), "metadata change");
        }
      })
    );
  }

  private async handleFileModified(file: TAbstractFile): Promise<void> {
    if (!(file instanceof TFile) || file.extension !== "md") {
      return;
    }

    if (!isDashboardPath(file.path)) {
      await this.tracker.update(file);
    }
    if (this.app.workspace.getActiveFile()?.path === file.path) {
      await this.refreshWorkspaceViews();
    }
  }

  private async handleFileRenamed(
    file: TAbstractFile,
    oldPath: string
  ): Promise<void> {
    if (file instanceof TFile) {
      await this.tracker.rename(oldPath, file.path);
    } else if (file instanceof TFolder) {
      await this.tracker.renameFolder(oldPath, file.path);
    } else {
      return;
    }
    await this.refreshWorkspaceViews();
  }

  private async handleFileDeleted(file: TAbstractFile): Promise<void> {
    if (file instanceof TFile) {
      await this.tracker.delete(file.path);
    } else if (file instanceof TFolder) {
      await this.tracker.deleteFolder(file.path);
    } else {
      return;
    }
    await this.refreshWorkspaceViews();
  }

  private runBackground(task: Promise<void>, context: string): void {
    void task.catch((error) => {
      if (IS_DEV) {
        console.error(`IhateTemplate ${context} failed`, error);
      }
    });
  }

  private async activateWorkspaceView(): Promise<void> {
    await this.app.workspace.ensureSideLeaf(WORKSPACE_VIEW_TYPE, "right", {
      active: true,
      reveal: true
    });
  }

  private async refreshWorkspaceViews(): Promise<void> {
    const views = this.app.workspace
      .getLeavesOfType(WORKSPACE_VIEW_TYPE)
      .map((leaf) => leaf.view)
      .filter((view): view is IhateTemplateWorkspaceView =>
        view instanceof IhateTemplateWorkspaceView
      );
    await Promise.all(views.map((view) => view.refresh()));
  }

  private async ensureDefaultTemplates(): Promise<void> {
    const folderPath = normalizePath(this.settings.templateFolder);
    const folder = this.app.vault.getAbstractFileByPath(folderPath);

    if (folder !== null && !(folder instanceof TFolder)) {
      return;
    }

    if (folder === null && !(await this.app.vault.adapter.exists(folderPath))) {
      try {
        await this.app.vault.createFolder(folderPath);
      } catch (error) {
        if (!String(error).includes("Folder already exists")) {
          throw error;
        }
      }
    }

    const listed = await this.app.vault.adapter.list(folderPath);
    const hasMarkdownTemplate = listed.files.some((path) =>
      path.toLowerCase().endsWith(".md")
    );

    for (const template of DEFAULT_TEMPLATES) {
      const { fileName, content } = template;
      const path = normalizePath(`${folderPath}/${fileName}`);
      const templateExists = await this.app.vault.adapter.exists(path);
      if (!hasMarkdownTemplate && !templateExists) {
        await this.app.vault.create(path, content);
      }

      if (templateExists || !hasMarkdownTemplate) {
        const rulePath = getTemplateRulePath(path);
        if (!(await this.app.vault.adapter.exists(rulePath))) {
          await this.app.vault.adapter.write(
            rulePath,
            `${JSON.stringify(template.rule, null, 2)}\n`
          );
        }
      }
    }
  }

  private async migrateLegacyTemplateFolder(): Promise<void> {
    if (!this.shouldMigrateLegacyTemplateFolder) {
      return;
    }

    await this.moveTemplateFiles(
      LEGACY_DEFAULT_TEMPLATE_FOLDER,
      DEFAULT_TEMPLATE_FOLDER
    );
    await this.saveSettings();
    this.shouldMigrateLegacyTemplateFolder = false;
  }

  private async moveTemplateFiles(fromFolder: string, toFolder: string): Promise<void> {
    const sourcePath = normalizePath(fromFolder);
    const targetPath = normalizePath(toFolder);

    if (sourcePath === targetPath) {
      return;
    }

    if (!(await this.app.vault.adapter.exists(sourcePath))) {
      return;
    }

    await this.ensureFolder(targetPath);

    const listed = await this.app.vault.adapter.list(sourcePath);
    const movablePaths = listed.files.filter((path) => {
      const parent = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
      return parent === sourcePath &&
        (path.toLowerCase().endsWith(".md") || path.endsWith(".ihate.json"));
    });

    for (const sourceFilePath of movablePaths) {
      const fileName = sourceFilePath.slice(sourceFilePath.lastIndexOf("/") + 1);
      const targetFilePath = normalizePath(`${targetPath}/${fileName}`);
      const sourceFile = this.app.vault.getAbstractFileByPath(sourceFilePath);
      const existingTarget = this.app.vault.getAbstractFileByPath(targetFilePath);

      if (existingTarget instanceof TFolder) {
        continue;
      }

      const content = sourceFile instanceof TFile
        ? await this.app.vault.read(sourceFile)
        : await this.app.vault.adapter.read(sourceFilePath);

      if (existingTarget instanceof TFile) {
        await this.app.vault.modify(existingTarget, content);
      } else {
        await this.app.vault.adapter.write(targetFilePath, content);
      }

      if (sourceFile instanceof TFile) {
        await this.app.vault.delete(sourceFile);
      } else {
        await this.app.vault.adapter.remove(sourceFilePath);
      }
    }

    const source = this.app.vault.getAbstractFileByPath(sourcePath);
    if (source instanceof TFolder && source.children.length === 0) {
      await this.app.vault.delete(source);
    } else if (source === null && await this.app.vault.adapter.exists(sourcePath)) {
      const remaining = await this.app.vault.adapter.list(sourcePath);
      if (remaining.files.length === 0 && remaining.folders.length === 0) {
        await this.app.vault.adapter.rmdir(sourcePath, false);
      }
    }
  }

  private async ensureFolder(folderPath: string): Promise<void> {
    const existing = this.app.vault.getAbstractFileByPath(folderPath);
    if (existing instanceof TFolder) {
      return;
    }

    if (existing !== null) {
      throw new Error(`Template folder path is not a folder: ${folderPath}`);
    }

    if (!(await this.app.vault.adapter.exists(folderPath))) {
      await this.app.vault.createFolder(folderPath);
    }
  }

}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getStoredRecord<T>(value: unknown): Record<string, T> {
  return isRecord(value) ? value as Record<string, T> : {};
}

function getStoredTemplateFolder(value: unknown): string {
  if (typeof value !== "string") {
    return DEFAULT_TEMPLATE_FOLDER;
  }

  try {
    return normalizeTemplateFolderPath(value);
  } catch {
    return DEFAULT_TEMPLATE_FOLDER;
  }
}

function normalizeTemplateFolderPath(value: string): string {
  const normalized = normalizePath(value.trim() || DEFAULT_TEMPLATE_FOLDER);
  const segments = normalized.split("/");
  if (
    !normalized ||
    normalized === "/" ||
    segments.includes("..") ||
    normalized === ".obsidian" ||
    normalized.startsWith(".obsidian/")
  ) {
    throw new Error("Template folder must be a vault folder outside .obsidian.");
  }
  return normalized;
}
