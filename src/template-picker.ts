import { App, Notice, SuggestModal, TFile, TFolder, normalizePath } from "obsidian";

export interface TemplateChoice {
  file?: TFile;
  path: string;
  label: string;
}

export async function pickTemplate(
  app: App,
  templateFolder: string
): Promise<TemplateChoice | null> {
  const choices = await getTemplateChoices(app, templateFolder);
  if (choices.length === 0) {
    new Notice(`No markdown templates found in ${templateFolder}.`);
    return null;
  }

  return new Promise((resolve) => {
    const modal = new TemplatePickerModal(app, choices, resolve);
    modal.open();
  });
}

export function getTemplateChoices(
  app: App,
  templateFolder: string
): Promise<TemplateChoice[]> {
  const normalizedFolder = normalizePath(templateFolder);
  const folder = app.vault.getAbstractFileByPath(normalizedFolder);

  if (folder instanceof TFolder) {
    const indexedChoices = folder.children
      .filter((child): child is TFile => child instanceof TFile)
      .filter((file) => file.extension === "md")
      .sort((a, b) => a.basename.localeCompare(b.basename))
      .map((file) => ({
        file,
        path: file.path,
        label: file.basename
      }));

    if (indexedChoices.length > 0) {
      return Promise.resolve(indexedChoices);
    }
  }

  return getAdapterTemplateChoices(app, normalizedFolder);
}

export async function readTemplateContent(
  app: App,
  template: TemplateChoice
): Promise<string> {
  if (template.file) {
    return app.vault.read(template.file);
  }

  return app.vault.adapter.read(template.path);
}

async function getAdapterTemplateChoices(
  app: App,
  templateFolder: string
): Promise<TemplateChoice[]> {
  if (!(await app.vault.adapter.exists(templateFolder))) {
    return [];
  }

  const listed = await app.vault.adapter.list(templateFolder);
  return listed.files
    .filter((path) => path.toLowerCase().endsWith(".md"))
    .filter((path) => getParentPath(path) === templateFolder)
    .sort((a, b) => getBaseName(a).localeCompare(getBaseName(b)))
    .map((path) => ({
      path,
      label: getBaseName(path)
    }));
}

function getParentPath(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

function getBaseName(path: string): string {
  const fileName = path.slice(path.lastIndexOf("/") + 1);
  return fileName.endsWith(".md") ? fileName.slice(0, -3) : fileName;
}

class TemplatePickerModal extends SuggestModal<TemplateChoice> {
  private choices: TemplateChoice[];
  private resolveChoice: (choice: TemplateChoice | null) => void;
  private resolved = false;
  private closeTimer: number | null = null;

  constructor(
    app: App,
    choices: TemplateChoice[],
    resolveChoice: (choice: TemplateChoice | null) => void
  ) {
    super(app);
    this.choices = choices;
    this.resolveChoice = resolveChoice;
    this.setPlaceholder("Choose a template");
  }

  getSuggestions(query: string): TemplateChoice[] {
    const lowered = query.toLowerCase();
    return this.choices.filter((choice) =>
      choice.label.toLowerCase().includes(lowered)
    );
  }

  renderSuggestion(choice: TemplateChoice, el: HTMLElement): void {
    el.createEl("div", { text: choice.label });
    el.createEl("small", { text: choice.path });
  }

  onChooseSuggestion(choice: TemplateChoice): void {
    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    this.resolved = true;
    this.resolveChoice(choice);
    this.close();
  }

  onClose(): void {
    if (!this.resolved) {
      this.closeTimer = window.setTimeout(() => {
        if (!this.resolved) {
          this.resolveChoice(null);
        }
      }, 100);
    }
  }
}
