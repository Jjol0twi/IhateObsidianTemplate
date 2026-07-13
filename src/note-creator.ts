import {
  App,
  Editor,
  Notice,
  TFile
} from "obsidian";
import type { IhateTemplateSettings } from "./settings";
import {
  pickTemplate,
  readTemplateContent
} from "./template-picker";
import type { TemplateTrackerHandle } from "./template-tracker";
import { requestNoteTitle } from "./title-modal";
import { renderTemplateWithPrompts } from "./template-renderer";
import { IS_DEV } from "./constants";
import {
  createMarkdownFile,
  findAvailableMarkdownPath,
  getActiveMarkdownTitle,
  resolveTargetFolder
} from "./vault-paths";
import { getSmartDefaultTagsForFolder } from "./smart-tags";
import {
  applyTemplateTitleRule,
  createAppliedTemplateRule,
  readTemplateRule
} from "./template-rules";
import { isPromptCancelled } from "./prompt-cancellation";

export interface CreateNoteOptions {
  contextFolder?: string;
}

export async function createNoteFromTemplate(
  app: App,
  settings: IhateTemplateSettings,
  tracker: TemplateTrackerHandle,
  options: CreateNoteOptions = {}
): Promise<TFile | null> {
  let createdFile: TFile | null = null;

  try {
    const template = await pickTemplate(app, settings.templateFolder);
    if (!template) {
      return null;
    }

    const rule = await readTemplateRule(app, template);

    const title = await requestNoteTitle(app, template.label);
    if (!title) {
      return null;
    }

    const noteTitle = applyTemplateTitleRule(
      title,
      rule,
      settings.datetimeFormat
    );
    const parentFolder = resolveTargetFolder(app, settings, options.contextFolder);
    const templateContent = await readTemplateContent(app, template);
    const rendered = await renderTemplateWithPrompts(
      app,
      templateContent,
      noteTitle,
      settings,
      getSmartDefaultTagsForFolder(app, parentFolder.path),
      rule
    );

    const path = await findAvailableMarkdownPath(app, parentFolder.path, noteTitle);
    const file = await createMarkdownFile(app, path, rendered.content);
    createdFile = file;

    const appliedRule = createAppliedTemplateRule(template.path, rule);
    await tracker.track(
      file.path,
      rendered.nowFields,
      rendered.pageTokenUsed ? noteTitle : undefined,
      rendered.protectedFields,
      appliedRule
    );

    await app.workspace.getLeaf(false).openFile(file);
    new Notice(`Created ${file.path}`);
    return file;
  } catch (error) {
    if (isPromptCancelled(error)) {
      return null;
    }
    if (IS_DEV) {
      console.error("IhateTemplate failed to create note", error);
    }
    if (createdFile) {
      new Notice(`Created ${createdFile.path}, but post-processing failed.`);
      return createdFile;
    }
    new Notice("IhateTemplate could not create the note. Check the template and rule file.");
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
    const activeFile = app.workspace.getActiveFile();
    const tags = getSmartDefaultTagsForFolder(
      app,
      activeFile?.parent?.path ?? ""
    );
    const templateContent = await readTemplateContent(app, template);
    const rule = await readTemplateRule(app, template);
    const rendered = await renderTemplateWithPrompts(
      app,
      templateContent,
      title,
      settings,
      tags,
      rule
    );

    editor.replaceSelection(rendered.content);
  } catch (error) {
    if (isPromptCancelled(error)) {
      return;
    }
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
  let templateApplied = false;

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
    const templateContent = await readTemplateContent(app, template);
    const rule = await readTemplateRule(app, template);
    const rendered = await renderTemplateWithPrompts(
      app,
      templateContent,
      title,
      settings,
      getSmartDefaultTagsForFolder(app, file.parent?.path ?? ""),
      rule
    );

    await app.vault.modify(file, rendered.content);
    templateApplied = true;

    const appliedRule = createAppliedTemplateRule(template.path, rule);
    await tracker.track(
      file.path,
      rendered.nowFields,
      rendered.pageTokenUsed ? title : undefined,
      rendered.protectedFields,
      appliedRule
    );

    await app.workspace.getLeaf(false).openFile(file);
    new Notice(`Applied template to ${file.path}`);
  } catch (error) {
    if (isPromptCancelled(error)) {
      return;
    }
    if (IS_DEV) {
      console.error("IhateTemplate failed to apply template to empty file", error);
    }
    if (templateApplied) {
      new Notice(`Applied template to ${file.path}, but tracking failed.`);
      return;
    }
    new Notice("IhateTemplate failed to apply template.");
  }
}
