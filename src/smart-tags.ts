import { App, Modal, Notice, TFile, getAllTags, setIcon } from "obsidian";
import { getDefaultTagsForFolder } from "./vault-paths";
import { getTagIdentity, normalizeTagValue } from "./tag-values";

export { getTagIdentity, normalizeTagValue } from "./tag-values";

const MANAGED_STATUS_PREFIX = "status/";
const MAX_SUGGESTIONS = 8;

export interface TagCandidate {
  value: string;
  count: number;
}

export function buildTagIndex(app: App): TagCandidate[] {
  const counts = new Map<string, number>();

  for (const file of app.vault.getMarkdownFiles()) {
    const cache = app.metadataCache.getFileCache(file);
    const tags = cache ? getAllTags(cache) ?? [] : [];
    const seenInFile = new Set<string>();

    for (const rawTag of tags) {
      const tag = normalizeTagValue(rawTag);
      if (!tag || isManagedStatusTag(tag) || seenInFile.has(tag)) {
        continue;
      }

      seenInFile.add(tag);
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort(compareTagCandidates);
}

export function canonicalizeTags(
  app: App,
  values: string[],
  index: TagCandidate[] = buildTagIndex(app)
): string[] {
  const candidatesByIdentity = groupCandidatesByIdentity(index);
  const result: string[] = [];
  const seen = new Set<string>();

  for (const rawValue of values) {
    const normalized = normalizeTagValue(rawValue);
    const identity = getTagIdentity(normalized);
    if (!normalized || !identity || seen.has(identity) || isManagedStatusTag(normalized)) {
      continue;
    }

    const canonical = candidatesByIdentity.get(identity)?.[0]?.value ?? normalized;
    seen.add(identity);
    result.push(canonical);
  }

  return result;
}

export function getSmartDefaultTagsForFolder(
  app: App,
  folderPath: string
): string[] {
  return canonicalizeTags(app, getDefaultTagsForFolder(folderPath));
}

export function getFrontmatterTags(app: App, file: TFile): string[] {
  const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
  return parseFrontmatterTags(frontmatter?.tags);
}

export function editFileTags(app: App, file: TFile): Promise<boolean> {
  return new Promise((resolve) => {
    new SmartTagModal(app, file, resolve).open();
  });
}

function parseFrontmatterTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map(normalizeTagValue)
      .filter(Boolean);
  }

  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/[\s,]+/)
    .map(normalizeTagValue)
    .filter(Boolean);
}

function groupCandidatesByIdentity(
  candidates: TagCandidate[]
): Map<string, TagCandidate[]> {
  const groups = new Map<string, TagCandidate[]>();

  for (const candidate of candidates) {
    const identity = getTagIdentity(candidate.value);
    const group = groups.get(identity) ?? [];
    group.push(candidate);
    group.sort(compareTagCandidates);
    groups.set(identity, group);
  }

  return groups;
}

function compareTagCandidates(left: TagCandidate, right: TagCandidate): number {
  return right.count - left.count || left.value.localeCompare(right.value);
}

function isManagedStatusTag(value: string): boolean {
  return normalizeTagValue(value).toLocaleLowerCase().startsWith(MANAGED_STATUS_PREFIX);
}

class SmartTagModal extends Modal {
  private readonly file: TFile;
  private readonly resolveResult: (changed: boolean) => void;
  private readonly index: TagCandidate[];
  private readonly selected: string[];
  private readonly selectedIdentities = new Set<string>();
  private inputEl: HTMLInputElement | null = null;
  private chipsEl: HTMLElement | null = null;
  private suggestionsEl: HTMLElement | null = null;
  private resolved = false;
  private compositionActive = false;
  private submitting = false;

  constructor(app: App, file: TFile, resolveResult: (changed: boolean) => void) {
    super(app);
    this.file = file;
    this.resolveResult = resolveResult;
    this.index = buildTagIndex(app);
    this.selected = canonicalizeTags(app, getFrontmatterTags(app, file));
    for (const tag of this.selected) {
      this.selectedIdentities.add(getTagIdentity(tag));
    }
  }

  onOpen(): void {
    this.titleEl.setText("Edit tags");
    this.contentEl.empty();
    this.contentEl.addClass("ihate-template-smart-tags");

    this.chipsEl = this.contentEl.createDiv({
      cls: "ihate-template-smart-tag-chips"
    });

    this.inputEl = this.contentEl.createEl("input", {
      type: "text",
      placeholder: "Search or add a tag"
    });
    this.inputEl.addEventListener("compositionstart", () => {
      this.compositionActive = true;
    });
    this.inputEl.addEventListener("compositionend", () => {
      this.compositionActive = false;
    });
    this.inputEl.addEventListener("input", () => this.renderSuggestions());
    this.inputEl.addEventListener("keydown", (event) => {
      if (event.isComposing || this.compositionActive) {
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        this.addFromInput();
      }
    });

    this.suggestionsEl = this.contentEl.createDiv({
      cls: "ihate-template-smart-tag-suggestions"
    });

    const actions = this.contentEl.createDiv({
      cls: "ihate-template-title-actions"
    });
    actions.createEl("button", { text: "Cancel" }).onClickEvent(() => this.close());
    actions.createEl("button", { text: "Apply", cls: "mod-cta" }).onClickEvent(() => {
      void this.submit();
    });

    this.render();
    window.setTimeout(() => this.inputEl?.focus(), 0);
  }

  onClose(): void {
    if (!this.resolved) {
      this.resolved = true;
      this.resolveResult(false);
    }
  }

  private render(): void {
    this.renderChips();
    this.renderSuggestions();
  }

  private renderChips(): void {
    if (!this.chipsEl) {
      return;
    }

    this.chipsEl.empty();
    if (this.selected.length === 0) {
      this.chipsEl.createDiv({
        cls: "ihate-template-smart-tag-empty",
        text: "No tags selected"
      });
      return;
    }

    for (const tag of this.selected) {
      const chip = this.chipsEl.createDiv({
        cls: "ihate-template-smart-tag-chip"
      });
      chip.createSpan({ text: tag });
      const remove = chip.createEl("button", {
        attr: {
          "aria-label": `Remove ${tag}`,
          type: "button"
        }
      });
      setIcon(remove, "x");
      remove.onClickEvent(() => this.removeTag(tag));
    }
  }

  private renderSuggestions(): void {
    if (!this.suggestionsEl) {
      return;
    }

    this.suggestionsEl.empty();
    const suggestions = this.getSuggestions(this.inputEl?.value ?? "");
    if (suggestions.length === 0) {
      this.suggestionsEl.createDiv({
        cls: "ihate-template-smart-tag-empty",
        text: "Press Enter to add this tag"
      });
      return;
    }

    for (const suggestion of suggestions) {
      const button = this.suggestionsEl.createEl("button", {
        cls: "ihate-template-smart-tag-suggestion",
        attr: { type: "button" }
      });
      button.createSpan({ text: suggestion.value });
      button.createSpan({
        cls: "ihate-template-smart-tag-count",
        text: String(suggestion.count)
      });
      button.onClickEvent(() => this.addTag(suggestion.value));
    }
  }

  private getSuggestions(query: string): TagCandidate[] {
    const normalizedQuery = normalizeTagValue(query).toLocaleLowerCase();
    const contextTerms = getContextTerms(this.file);

    return this.index
      .filter((candidate) => !this.selectedIdentities.has(getTagIdentity(candidate.value)))
      .filter((candidate) => {
        if (!normalizedQuery) {
          return true;
        }
        return candidate.value.toLocaleLowerCase().includes(normalizedQuery);
      })
      .sort((left, right) => {
        const contextOrder = scoreContext(right.value, contextTerms) -
          scoreContext(left.value, contextTerms);
        return contextOrder || compareTagCandidates(left, right);
      })
      .slice(0, MAX_SUGGESTIONS);
  }

  private addFromInput(): void {
    const query = this.inputEl?.value ?? "";
    const suggestion = this.getSuggestions(query)[0];
    const exactSuggestion = suggestion &&
      getTagIdentity(suggestion.value) === getTagIdentity(query)
      ? suggestion.value
      : query;
    this.addTag(exactSuggestion);
  }

  private addTag(rawValue: string): void {
    const [tag] = canonicalizeTags(this.app, [rawValue], this.index);
    if (!tag) {
      return;
    }

    const identity = getTagIdentity(tag);
    if (this.selectedIdentities.has(identity)) {
      if (this.inputEl) {
        this.inputEl.value = "";
      }
      return;
    }

    this.selected.push(tag);
    this.selectedIdentities.add(identity);
    if (this.inputEl) {
      this.inputEl.value = "";
    }
    this.render();
  }

  private removeTag(tag: string): void {
    const index = this.selected.indexOf(tag);
    if (index === -1) {
      return;
    }

    this.selected.splice(index, 1);
    this.selectedIdentities.delete(getTagIdentity(tag));
    this.render();
  }

  private async submit(): Promise<void> {
    if (this.submitting) {
      return;
    }

    this.addFromInput();
    const nextTags = [...this.selected];
    this.submitting = true;
    try {
      await this.app.fileManager.processFrontMatter(this.file, (frontmatter) => {
        frontmatter.tags = nextTags;
      });
      this.resolved = true;
      this.resolveResult(true);
      this.close();
    } catch {
      new Notice("IhateTemplate could not update tags.");
    } finally {
      this.submitting = false;
    }
  }
}

function getContextTerms(file: TFile): string[] {
  return `${file.parent?.path ?? ""} ${file.basename}`
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((term) => term.length > 1);
}

function scoreContext(value: string, contextTerms: string[]): number {
  const identity = getTagIdentity(value);
  return contextTerms.some((term) => getTagIdentity(term) === identity) ? 1 : 0;
}
