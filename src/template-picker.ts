import { App, Notice, SuggestModal, TFile, TFolder, normalizePath } from "obsidian";

export interface TemplateChoice {
  file: TFile;
  label: string;
}

export async function pickTemplate(
  app: App,
  templateFolder: string
): Promise<TemplateChoice | null> {
  const choices = getTemplateChoices(app, templateFolder);
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
): TemplateChoice[] {
  const normalizedFolder = normalizePath(templateFolder);
  const folder = app.vault.getAbstractFileByPath(normalizedFolder);

  if (!(folder instanceof TFolder)) {
    return [];
  }

  return folder.children
    .filter((child): child is TFile => child instanceof TFile)
    .filter((file) => file.extension === "md")
    .sort((a, b) => a.basename.localeCompare(b.basename))
    .map((file) => ({
      file,
      label: file.basename
    }));
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
    el.createEl("small", { text: choice.file.path });
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
