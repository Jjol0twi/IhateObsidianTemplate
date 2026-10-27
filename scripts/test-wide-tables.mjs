import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const result = await build({
  stdin: {
    contents: 'export { WideTableLayout } from "./src/wide-tables"; export { DEFAULT_SETTINGS } from "./src/settings";',
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  define: { BUILD_MODE: JSON.stringify("test") },
  plugins: [{
    name: "obsidian-component-stub",
    setup(builder) {
      builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "test" }));
      builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({
        loader: "js",
        contents: `
          export class Component {
            events = [];
            registerEvent(event) { this.events.push(event); }
            load() { this.onload(); }
            unload() {
              this.onunload();
              for (const event of this.events) event.off();
              this.events = [];
            }
          }
          export class App {}
          export class PluginSettingTab {}
          export class Setting {}
          export class Notice {}
        `
      }));
    }
  }],
  write: false,
  logLevel: "silent"
});
const { WideTableLayout, DEFAULT_SETTINGS } = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
);
const wideClass = "ihate-template-wide-tables";

function container() {
  const classes = new Set(["workspace-leaf-content"]);
  return { classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name), contains: (name) => classes.has(name) } };
}

function workspace(initialContainers = []) {
  const listeners = new Set();
  const ready = [];
  return {
    containers: initialContainers,
    getLeavesOfType(type) {
      assert.equal(type, "markdown");
      return this.containers.map((containerEl) => ({ view: { containerEl } }));
    },
    on(name, callback) {
      assert.equal(name, "layout-change");
      listeners.add(callback);
      return { off: () => listeners.delete(callback) };
    },
    onLayoutReady(callback) { ready.push(callback); },
    ready() { ready.forEach((callback) => callback()); },
    change() { listeners.forEach((callback) => callback()); },
    listenerCount() { return listeners.size; }
  };
}

test("wide tables are enabled by default", () => {
  assert.equal(DEFAULT_SETTINGS.wideTables, true);
});

test("layout applies immediately and switching it off restores every note", () => {
  const panes = [container(), container()];
  const layout = new WideTableLayout(workspace(panes), true);
  layout.load();
  assert.ok(panes.every((pane) => pane.classList.contains(wideClass)));
  layout.setEnabled(false);
  assert.ok(panes.every((pane) => !pane.classList.contains(wideClass)));
  assert.ok(panes.every((pane) => pane.classList.contains("workspace-leaf-content")));
  layout.setEnabled(true);
  assert.ok(panes.every((pane) => pane.classList.contains(wideClass)));
  layout.unload();
});

test("new, closed, and replaced views are synchronized without retaining stale classes", () => {
  const oldPane = container();
  const otherWindow = container();
  const host = workspace([oldPane]);
  const layout = new WideTableLayout(host, true);
  layout.load();
  host.containers = [otherWindow];
  host.change();
  assert.equal(oldPane.classList.contains(wideClass), false);
  assert.equal(otherWindow.classList.contains(wideClass), true);
  host.containers = [];
  host.change();
  assert.equal(otherWindow.classList.contains(wideClass), false);
  layout.unload();
});

test("disabled layouts also leave newly opened notes unchanged", () => {
  const pane = container();
  const host = workspace();
  const layout = new WideTableLayout(host, false);
  layout.load();
  host.containers = [pane];
  host.ready();
  host.change();
  assert.equal(pane.classList.contains(wideClass), false);
  layout.unload();
});

test("unloading cleans up classes, events, and late layout-ready callbacks", () => {
  const pane = container();
  const host = workspace([pane]);
  const layout = new WideTableLayout(host, true);
  layout.load();
  layout.unload();
  host.ready();
  host.change();
  layout.setEnabled(true);
  assert.equal(pane.classList.contains(wideClass), false);
  assert.equal(host.listenerCount(), 0);
});
