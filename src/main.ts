import {
  Menu,
  Notice,
  Plugin,
  TAbstractFile,
  TFile,
  TFolder,
  normalizePath
} from "obsidian";
import { IS_DEV } from "./constants";
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
  createOrOpenDashboardPage,
  ensureDashboardPage,
  isDashboardPath,
  renderStatusBoard,
  STATUS_BOARD_CODE_BLOCK
} from "./dashboard";
import { getFolderFromFileMenuTarget } from "./vault-paths";

export default class IhateTemplatePlugin extends Plugin {
  settings: IhateTemplateSettings = { ...DEFAULT_SETTINGS };
  data: IhateTemplateData = structuredClone(DEFAULT_DATA);
  tracker!: TemplateTracker;

  async onload(): Promise<void> {
    await this.loadSettings();
    await this.loadPluginData();

    this.tracker = new TemplateTracker(
      this.app,
      this.settings,
      this.data,
      () => this.savePluginData()
    );

    this.addSettingTab(new IhateTemplateSettingTab(this.app, this));
    this.registerCommands();
    this.registerMenus();
    this.registerMarkdownProcessors();
    this.registerFileEvents();
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
    if (IS_DEV) {
      console.log("IhateTemplate unloaded");
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData({
      ...this.settings,
      __pluginData: this.data
    });
  }

  async loadPluginData(): Promise<void> {
    const loaded = await this.loadData();
    this.data = Object.assign(
      {},
      structuredClone(DEFAULT_DATA),
      loaded?.__pluginData ?? {}
    );
  }

  async savePluginData(): Promise<void> {
    await this.saveData({
      ...this.settings,
      __pluginData: this.data
    });
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
      STATUS_BOARD_CODE_BLOCK,
      (_source, el) => {
        renderStatusBoard(this.app, el);
      }
    );
  }

  private registerFileEvents(): void {
    this.registerEvent(
      this.app.vault.on("modify", async (file) => {
        if (file instanceof TFile && file.extension === "md") {
          if (!isDashboardPath(file.path)) {
            await this.tracker.update(file);
          }
        }
      })
    );

    this.registerEvent(
      this.app.vault.on("rename", async (file, oldPath) => {
        if (file instanceof TFile) {
          await this.tracker.rename(oldPath, file.path);
        }
      })
    );

    this.registerEvent(
      this.app.vault.on("delete", async (file) => {
        if (file instanceof TFile) {
          await this.tracker.delete(file.path);
        }
      })
    );
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

    const hasMarkdownTemplate = this.app.vault
      .getMarkdownFiles()
      .some((file) => file.parent?.path === folderPath);

    if (hasMarkdownTemplate) {
      return;
    }

    for (const template of DEFAULT_TEMPLATES) {
      const { fileName, content } = template;
      const path = normalizePath(`${folderPath}/${fileName}`);
      if (!(await this.app.vault.adapter.exists(path))) {
        await this.app.vault.create(path, content);
      }
    }
  }
}
