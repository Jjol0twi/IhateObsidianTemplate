import { Component, type Workspace } from "obsidian";

const WIDE_TABLES_CLASS = "ihate-template-wide-tables";

export class WideTableLayout extends Component {
  private containers = new Set<HTMLElement>();
  private active = false;

  constructor(private readonly workspace: Workspace, private enabled: boolean) {
    super();
  }

  onload(): void {
    this.active = true;
    this.registerEvent(this.workspace.on("layout-change", () => this.refresh()));
    this.workspace.onLayoutReady(() => this.refresh());
    this.refresh();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.refresh();
  }

  onunload(): void {
    this.active = false;
    for (const container of this.containers) {
      container.classList.remove(WIDE_TABLES_CLASS);
    }
    this.containers.clear();
  }

  private refresh(): void {
    if (!this.active) {
      return;
    }

    const next = new Set(this.enabled
      ? this.workspace.getLeavesOfType("markdown").map((leaf) => leaf.view.containerEl)
      : []);

    for (const container of this.containers) {
      if (!next.has(container)) {
        container.classList.remove(WIDE_TABLES_CLASS);
      }
    }
    for (const container of next) {
      container.classList.add(WIDE_TABLES_CLASS);
    }
    this.containers = next;
  }
}
