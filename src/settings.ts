import { App, PluginSettingTab, Setting } from "obsidian";
import IhateTemplatePlugin from "./main";
import { DEFAULT_DATETIME_FORMAT, DEFAULT_TEMPLATE_FOLDER } from "./constants";

export type NewNoteLocation = "current-folder" | "vault-root";

export interface IhateTemplateSettings {
  templateFolder: string;
  newNoteLocation: NewNoteLocation;
  datetimeFormat: string;
}

export const DEFAULT_SETTINGS: IhateTemplateSettings = {
  templateFolder: DEFAULT_TEMPLATE_FOLDER,
  newNoteLocation: "current-folder",
  datetimeFormat: DEFAULT_DATETIME_FORMAT
};

export class IhateTemplateSettingTab extends PluginSettingTab {
  plugin: IhateTemplatePlugin;

  constructor(app: App, plugin: IhateTemplatePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Template folder")
      .setDesc("Vault folder containing markdown template files.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_TEMPLATE_FOLDER)
          .setValue(this.plugin.settings.templateFolder)
          .onChange(async (value) => {
            this.plugin.settings.templateFolder =
              value.trim() || DEFAULT_TEMPLATE_FOLDER;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("New note location")
      .setDesc("Where commands create notes when no folder is selected.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("current-folder", "Current folder")
          .addOption("vault-root", "Vault root")
          .setValue(this.plugin.settings.newNoteLocation)
          .onChange(async (value) => {
            this.plugin.settings.newNoteLocation = value as NewNoteLocation;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Datetime format")
      .setDesc("Format used for datetime variables. Default: YYYY.MM.DD.HH:mm")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_DATETIME_FORMAT)
          .setValue(this.plugin.settings.datetimeFormat)
          .onChange(async (value) => {
            this.plugin.settings.datetimeFormat =
              value.trim() || DEFAULT_DATETIME_FORMAT;
            await this.plugin.saveSettings();
          })
      );
  }
}
