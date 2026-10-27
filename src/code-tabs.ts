import { MarkdownRenderChild, Notice, loadPrism, setIcon, setTooltip } from "obsidian";
import type { TokenStream } from "prismjs";
import { parseCodeExamples, type CodeExample } from "./code-tabs-parser";

export const CODE_TABS_CODE_BLOCK = "ihate-template-code";

type Prism = typeof import("prismjs");

export class CodeTabsBlock extends MarkdownRenderChild {
  private readonly blockId = `ihate-template-code-${crypto.randomUUID()}`;
  private examples: readonly CodeExample[] = [];
  private tabs: HTMLButtonElement[] = [];
  private panel!: HTMLPreElement;
  private codeEl!: HTMLElement;
  private copyButton!: HTMLButtonElement;
  private selectedIndex = 0;
  private prism: Prism | null = null;
  private active = false;
  private copyResetTimer: number | null = null;

  constructor(containerEl: HTMLElement, private readonly source: string) {
    super(containerEl);
  }

  onload(): void {
    this.active = true;
    this.containerEl.empty();
    this.containerEl.addClass("ihate-template-code-block");

    try {
      this.examples = parseCodeExamples(this.source);
    } catch (error) {
      this.containerEl.createDiv({
        cls: "ihate-template-code-error",
        text: error instanceof Error ? error.message : "Invalid code tabs."
      });
      return;
    }

    const toolbar = this.containerEl.createDiv({ cls: "ihate-template-code-toolbar" });
    const tabList = toolbar.createDiv({
      cls: "ihate-template-code-tabs",
      attr: { role: "tablist", "aria-label": "Code examples" }
    });

    this.tabs = this.examples.map((example, index) => {
      const tab = tabList.createEl("button", {
        cls: "ihate-template-code-tab",
        text: example.label,
        attr: {
          type: "button",
          role: "tab",
          id: `${this.blockId}-tab-${index}`,
          "aria-controls": `${this.blockId}-panel`,
          title: `${example.label} (${example.language})`
        }
      });
      this.registerDomEvent(tab, "click", (event) => {
        event.stopPropagation();
        this.selectTab(index);
      });
      this.registerDomEvent(tab, "keydown", (event) => this.onTabKeydown(event, index));
      return tab;
    });

    this.copyButton = toolbar.createEl("button", {
      cls: "ihate-template-code-copy clickable-icon",
      attr: { type: "button", "aria-label": "Copy code" }
    });
    setIcon(this.copyButton, "copy");
    setTooltip(this.copyButton, "Copy code");
    this.registerDomEvent(this.copyButton, "click", (event) => {
      event.stopPropagation();
      void this.copyCode();
    });

    this.panel = this.containerEl.createEl("pre", {
      cls: "ihate-template-code-panel",
      attr: { id: `${this.blockId}-panel`, role: "tabpanel", tabindex: "0" }
    });
    this.codeEl = this.panel.createEl("code");
    this.selectTab(0);
    void this.loadHighlighter();
  }

  onunload(): void {
    this.active = false;
    this.clearCopyTimer();
  }

  private selectTab(index: number): void {
    this.selectedIndex = index;
    this.tabs.forEach((tab, tabIndex) => {
      tab.setAttribute("aria-selected", String(tabIndex === index));
      tab.tabIndex = tabIndex === index ? 0 : -1;
    });
    this.panel.setAttribute("aria-labelledby", this.tabs[index].id);
    this.clearCopyTimer();
    setIcon(this.copyButton, "copy");
    this.copyButton.setAttribute("aria-label", "Copy code");
    this.renderCode();
    this.panel.scrollTop = 0;
    this.panel.scrollLeft = 0;
  }

  private onTabKeydown(event: KeyboardEvent, index: number): void {
    let next: number;
    switch (event.key) {
      case "ArrowRight": next = (index + 1) % this.tabs.length; break;
      case "ArrowLeft": next = (index + this.tabs.length - 1) % this.tabs.length; break;
      case "Home": next = 0; break;
      case "End": next = this.tabs.length - 1; break;
      default: return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.selectTab(next);
    this.tabs[next].focus({ preventScroll: true });
    this.tabs[next].scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  private async loadHighlighter(): Promise<void> {
    try {
      const prism: Prism = await loadPrism();
      if (this.active) {
        this.prism = prism;
        this.renderCode();
      }
    } catch {
      // Plain text remains usable when the host cannot load its highlighter.
    }
  }

  private renderCode(): void {
    const example = this.examples[this.selectedIndex];
    this.codeEl.className = `language-${example.language}`;
    this.codeEl.textContent = example.code;

    const grammar = this.prism?.languages[example.language];
    if (!this.prism || !grammar || typeof grammar !== "object") {
      return;
    }

    try {
      const fragment = this.codeEl.ownerDocument.createDocumentFragment();
      appendTokens(fragment, this.prism.tokenize(example.code, grammar), this.codeEl.ownerDocument);
      this.codeEl.replaceChildren(fragment);
    } catch {
      // A broken language grammar must not hide the original code.
    }
  }

  private async copyCode(): Promise<void> {
    const index = this.selectedIndex;
    this.copyButton.disabled = true;
    try {
      const clipboard = this.containerEl.ownerDocument.defaultView?.navigator.clipboard;
      if (!clipboard) {
        throw new Error("Clipboard unavailable");
      }
      await clipboard.writeText(this.examples[index].code);
      if (this.active && index === this.selectedIndex) {
        this.clearCopyTimer();
        setIcon(this.copyButton, "check");
        this.copyButton.setAttribute("aria-label", "Copied");
        this.copyResetTimer = window.setTimeout(() => {
          setIcon(this.copyButton, "copy");
          this.copyButton.setAttribute("aria-label", "Copy code");
          this.copyResetTimer = null;
        }, 1500);
      }
    } catch {
      if (this.active) {
        new Notice("IhateTemplate could not copy the code.");
      }
    } finally {
      if (this.active) {
        this.copyButton.disabled = false;
      }
    }
  }

  private clearCopyTimer(): void {
    if (this.copyResetTimer !== null) {
      window.clearTimeout(this.copyResetTimer);
      this.copyResetTimer = null;
    }
  }
}

function appendTokens(parent: Node, tokens: TokenStream, document: Document): void {
  if (typeof tokens === "string") {
    parent.appendChild(document.createTextNode(tokens));
  } else if (Array.isArray(tokens)) {
    for (const token of tokens) {
      appendTokens(parent, token, document);
    }
  } else {
    const span = document.createElement("span");
    const aliases = typeof tokens.alias === "string" ? [tokens.alias] : tokens.alias ?? [];
    span.classList.add("token", tokens.type, ...aliases);
    appendTokens(span, tokens.content, document);
    parent.appendChild(span);
  }
}
