import {
  App,
  Editor,
  Notice,
  TFile
} from "obsidian";
import { IhateTemplateSettings } from "./settings";
import { pickTemplate } from "./template-picker";
import { TemplateTrackerHandle } from "./template-tracker";
import { requestNoteTitle } from "./title-modal";
import { renderTemplateWithPrompts } from "./template-renderer";
import { formatDate, getDateFormatFromDatetimeFormat } from "./template-engine";
import { IS_DEV } from "./constants";
import {
  createMarkdownFile,
  findAvailableMarkdownPath,
  getActiveMarkdownTitle,
  resolveTargetFolder
} from "./vault-paths";

export interface CreateNoteOptions {
  contextFolder?: string;
}

export async function createNoteFromTemplate(
  app: App,
  settings: IhateTemplateSettings,
  tracker: TemplateTrackerHandle,
  options: CreateNoteOptions = {}
): Promise<TFile | null> {
  try {
    const template = await pickTemplate(app, settings.templateFolder);
    if (!template) {
      return null;
    }

    const title = await requestNoteTitle(app, template.label);
    if (!title) {
      return null;
    }

    const noteTitle = getNoteTitleForTemplate(template.label, title, settings);
    const templateContent = await app.vault.read(template.file);
    const rendered = await renderTemplateWithPrompts(
      app,
      templateContent,
      noteTitle,
      settings
    );

    const parentFolder = resolveTargetFolder(app, settings, options.contextFolder);
    const path = await findAvailableMarkdownPath(app, parentFolder.path, noteTitle);
    const file = await createMarkdownFile(app, path, rendered.content);

    if (Object.keys(rendered.nowFields).length > 0 || rendered.pageTokenUsed) {
      await tracker.track(
        file.path,
        rendered.nowFields,
        rendered.pageTokenUsed ? noteTitle : undefined,
        rendered.protectedFields
      );
    }

    await app.workspace.getLeaf(false).openFile(file);
    new Notice(`Created ${file.path}`);
    return file;
  } catch (error) {
    if (IS_DEV) {
      console.error("IhateTemplate failed to create note", error);
    }
    return null;
  }
}

export async function insertTemplateIntoEditor(
  app: App,
  editor: Editor,
  settings: IhateTemplateSettings
): Promise<void> {
  try {
    const template = await pickTemplate(app, settings.templateFolder);
    if (!template) {
      return;
    }

    const title = getActiveMarkdownTitle(app);
    const templateContent = await app.vault.read(template.file);
    const rendered = await renderTemplateWithPrompts(app, templateContent, title, settings);

    editor.replaceSelection(rendered.content);
  } catch (error) {
    if (IS_DEV) {
      console.error("IhateTemplate failed to insert template", error);
    }
    new Notice("IhateTemplate failed to insert template.");
  }
}

export async function applyTemplateToEmptyFile(
  app: App,
  file: TFile,
  settings: IhateTemplateSettings,
  tracker: TemplateTrackerHandle
): Promise<void> {
  try {
    const currentContent = await app.vault.read(file);
    if (currentContent.trim().length > 0) {
      new Notice("IhateTemplate only applies templates to empty files.");
      return;
    }

    const template = await pickTemplate(app, settings.templateFolder);
    if (!template) {
      return;
    }

    const title = file.basename || "New Page";
    const templateContent = await app.vault.read(template.file);
    const rendered = await renderTemplateWithPrompts(app, templateContent, title, settings);

    await app.vault.modify(file, rendered.content);

    if (Object.keys(rendered.nowFields).length > 0 || rendered.pageTokenUsed) {
      await tracker.track(
        file.path,
        rendered.nowFields,
        rendered.pageTokenUsed ? title : undefined,
        rendered.protectedFields
      );
    }

    await app.workspace.getLeaf(false).openFile(file);
    new Notice(`Applied template to ${file.path}`);
  } catch (error) {
    if (IS_DEV) {
      console.error("IhateTemplate failed to apply template to empty file", error);
    }
    new Notice("IhateTemplate failed to apply template.");
  }
}

function getNoteTitleForTemplate(
  templateLabel: string,
  title: string,
  settings: IhateTemplateSettings
): string {
  if (templateLabel !== "Meeting Note") {
    return title;
  }

  const date = formatDate(
    new Date(),
    getDateFormatFromDatetimeFormat(settings.datetimeFormat)
  );

  return `${date} ${title}`;
}
