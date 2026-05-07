import { App, ButtonComponent, Modal, Setting } from "obsidian";

const FALLBACK_TITLE = "New Page";

export async function requestNoteTitle(
  app: App,
  initialTitle: string
): Promise<string | null> {
  return new Promise((resolve) => {
    const modal = new TitleModal(app, initialTitle, resolve);
    window.setTimeout(() => modal.open(), 0);
  });
}

class TitleModal extends Modal {
  private readonly initialTitle: string;
  private readonly resolveTitle: (title: string | null) => void;
  private inputEl: HTMLInputElement | null = null;
  private resolved = false;

  constructor(
    app: App,
    initialTitle: string,
    resolveTitle: (title: string | null) => void
  ) {
    super(app);
    this.initialTitle = initialTitle;
    this.resolveTitle = resolveTitle;
  }

  onOpen(): void {
    this.titleEl.setText("New note title");
    this.contentEl.empty();
    this.contentEl.addClass("ihate-template-title-modal");

    new Setting(this.contentEl)
      .setName("Title")
      .addText((text) => {
        this.inputEl = text.inputEl;
        text.setValue(this.initialTitle);
        text.setPlaceholder("Note title");
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            this.submit();
          }
        });
        window.setTimeout(() => {
          text.inputEl.focus();
          text.inputEl.select();
        }, 0);
      });

    const actions = this.contentEl.createDiv({
      cls: "ihate-template-title-actions"
    });

    new ButtonComponent(actions)
      .setButtonText("Cancel")
      .onClick(() => this.close());

    new ButtonComponent(actions)
      .setButtonText("Create")
      .setCta()
      .onClick(() => this.submit());
  }

  onClose(): void {
    if (!this.resolved) {
      this.resolved = true;
      this.resolveTitle(null);
    }
  }

  private submit(): void {
    const title = this.inputEl?.value.trim() || FALLBACK_TITLE;

    this.resolved = true;
    this.resolveTitle(title);
    this.close();
  }
}
