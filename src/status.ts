import { App, Notice, SuggestModal, TFile } from "obsidian";

export interface StatusOption {
  label: string;
  value: string;
  key?: string;
}

export interface CustomSelectPrompt {
  raw: string;
  field: string;
  options: StatusOption[];
}

export const STATUS_OPTIONS: StatusOption[] = [
  {
    label: "작업 중",
    value: "#status/draft",
    key: "draft"
  },
  {
    label: "검토 중",
    value: "#status/review",
    key: "review"
  },
  {
    label: "작성 완료",
    value: "#status/done",
    key: "done"
  },
  {
    label: "업데이트 중",
    value: "#status/updating",
    key: "updating"
  },
  {
    label: "업데이트 필요",
    value: "#status/outdated",
    key: "outdated"
  }
];

export function templateNeedsStatus(template: string): boolean {
  return /%\{\{\s*status\s*}}/.test(template);
}

export async function pickStatus(app: App): Promise<StatusOption | null> {
  return pickOption(app, STATUS_OPTIONS, "Choose a status");
}

export async function pickOption(
  app: App,
  options: StatusOption[],
  placeholder: string
): Promise<StatusOption | null> {
  return new Promise((resolve) => {
    const modal = new StatusPickerModal(app, options, placeholder, resolve);
    modal.open();
  });
}

export function parseCustomSelectPrompts(template: string): CustomSelectPrompt[] {
  const prompts: CustomSelectPrompt[] = [];
  const seen = new Set<string>();
  const regex = /%\{\{select:([A-Za-z0-9_-]+)\|([^}]+)}}/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(template)) !== null) {
    if (seen.has(match[0])) {
      continue;
    }
    seen.add(match[0]);
    const options = match[2]
      .split("|")
      .map((option) => option.trim())
      .filter(Boolean)
      .map(parseOption)
      .filter((option): option is StatusOption => option !== null);

    if (options.length === 0) {
      continue;
    }

    prompts.push({
      raw: match[0],
      field: match[1],
      options
    });
  }

  return prompts;
}

export async function changeFileStatus(app: App, filePath: string): Promise<void> {
  const file = app.vault.getAbstractFileByPath(filePath);
  if (!(file instanceof TFile) || file.extension !== "md") {
    return;
  }

  const selected = await pickStatus(app);
  if (!selected) {
    return;
  }

  try {
    await app.fileManager.processFrontMatter(file, (frontmatter) => {
      frontmatter.status = selected.value;
    });
  } catch {
    new Notice("IhateTemplate could not update the status.");
  }
}

class StatusPickerModal extends SuggestModal<StatusOption> {
  private options: StatusOption[];
  private resolveStatus: (status: StatusOption | null) => void;
  private resolved = false;
  private closeTimer: number | null = null;

  constructor(
    app: App,
    options: StatusOption[],
    placeholder: string,
    resolveStatus: (status: StatusOption | null) => void
  ) {
    super(app);
    this.options = options;
    this.resolveStatus = resolveStatus;
    this.setPlaceholder(placeholder);
  }

  getSuggestions(query: string): StatusOption[] {
    const lowered = query.toLowerCase();
    return this.options.filter((status) => {
      return (
        status.label.toLowerCase().includes(lowered) ||
        status.value.toLowerCase().includes(lowered)
      );
    });
  }

  renderSuggestion(status: StatusOption, el: HTMLElement): void {
    el.createEl("div", { text: status.label });
  }

  onChooseSuggestion(status: StatusOption): void {
    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }

    this.resolved = true;
    this.resolveStatus(status);
    this.close();
  }

  onClose(): void {
    if (!this.resolved) {
      this.closeTimer = window.setTimeout(() => {
        if (!this.resolved) {
          this.resolveStatus(null);
        }
      }, 100);
    }
  }
}

function parseOption(option: string): StatusOption | null {
  const separatorIndex = option.indexOf("=");
  if (separatorIndex === -1) {
    return {
      label: option,
      value: option
    };
  }

  const label = option.slice(0, separatorIndex).trim();
  const value = option.slice(separatorIndex + 1).trim();
  if (!label || !value) {
    return null;
  }

  return {
    label,
    value
  };
}
