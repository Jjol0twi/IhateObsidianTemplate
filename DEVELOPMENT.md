# Developing IhateTemplate

한국어 문서: [DEVELOPMENT-KR.md](DEVELOPMENT-KR.md)

## Setup

This repository is designed to sit inside a development vault as `<vault>/ihate-template`, so the development build can write straight into that vault's plugin folder. Do not use a vault that holds real notes.

```bash
npm install
npm run dev
```

The development build writes the files Obsidian loads to:

```txt
../.obsidian/plugins/ihate-template/
```

Reload the plugin in Obsidian after each rebuild. The development build shows a load notice and adds a `Health check` command that logs settings and tracking data to the console; neither is included in release builds.

```bash
npm test
npm run typecheck
```

## Source structure

- `main.ts`: plugin lifecycle, command registration, menu registration, vault events.
- `default-templates.ts`: typed registry for bundled default template files.
- `note-creator.ts`: high-level create/insert/apply workflows.
- `template-engine.ts`: pure placeholder rendering and frontmatter extraction.
- `template-renderer.ts`: interactive rendering prompts such as custom selects.
- `template-rules.ts`: validated `.ihate.json` rules and rule-defined prompts.
- `template-picker.ts`, `title-modal.ts`, `status.ts`: modal UI boundaries.
- `template-tracker.ts`: tracked updates for `updated`, protected `created`, and `%{{page}}` rename changes.
- `smart-tags.ts`: vault tag index, canonicalization, and tag editor.
- `note-health.ts`: health scanning, explicit fixes, and health dashboard block.
- `workspace-view.ts`: right sidebar for the active note.
- `vault-paths.ts`: Obsidian vault path and file creation helpers.
- `dashboard.ts`: default dashboard generation.
- `dashboard-query.ts`: validated live dashboard queries.
- `code-tabs-parser.ts`, `code-tabs.ts`: fenced-code parsing and the compact tabbed renderer.
- `templates/*.md` and `templates/*.ihate.json`: source of truth for bundled templates and rules.

## Release build

```bash
npm run version:set -- 0.3.0
npm test
npm run typecheck
npm run build
npm run release:check
```

The default build writes into the development vault's plugin folder. Set `IHATE_OUT_DIR=.` to emit `main.js` in the repository root instead (it is gitignored); `release:check` reads the same variable.

`version:set` updates `package.json`, `package-lock.json`, `manifest.json`, and `versions.json` together while preserving previous `versions.json` entries.
Release mode minifies `main.js` and excludes development-only notices, verbose logs, and the health check command.
`release:check` verifies version consistency between `package.json`, `manifest.json`, and `versions.json`, and checks the generated release bundle for development-only console artifacts.

The GitHub release assets are:

- `main.js`
- `manifest.json`
- `styles.css`

`.github/workflows/release.yml` runs the tests, typecheck, release build, and `release:check` when a tag matching the manifest version is pushed, then creates a draft GitHub release with those three files attached. Review the draft on GitHub and publish it.

```bash
git tag 0.3.0 && git push origin 0.3.0
```

For manual installation, copy those files into:

```txt
Vault/.obsidian/plugins/ihate-template/
```

For an official Obsidian community plugin submission, the repository also needs `README.md`, `LICENSE`, `manifest.json`, and `versions.json`. The release tag must match the `version` in `manifest.json`.

## Manual test checklist

- Plugin loads and settings tab appears.
- Template folder markdown files are listed.
- Canceling the title modal creates no file.
- Empty title creates `New Page.md`.
- New notes can be created in the vault root and current folder.
- Duplicate titles receive a numeric suffix.
- File explorer right-click can create a note.
- Editor right-click can insert a template.
- Empty markdown files can receive a template without title prompt.
- Non-empty markdown files are not overwritten by empty-file apply.
- Status can be changed later from the command palette or file context menu.
- Smart Tags suggests existing tags and prevents equivalent duplicates.
- Note Health finds invalid status, tag, date, and required-property issues without changing notes automatically.
- The workspace panel follows the active note and opens outline headings and markers at their source line.
- `.ihate.json` rules render `%{{field:...}}` values and invalid rules stop note creation safely.
- Meeting Note, Summary Note, and Daily Note templates are listed.
- Custom `%{{select:...}}` prompts render selected values.
- `Test All Elements.md` can render all supported placeholders and prompt types.
- The plugin writes nothing to the vault on load: no dashboard page, template folder, or template files appear until a command or settings button is used.
- `IhateTemplate: Install default templates` creates the template folder and bundled templates when the folder has no markdown templates, adds missing rule files, and reports what it created.
- `IhateTemplate: Create dashboard` creates `IhateTemplate Dashboard.md` when missing and opens it when present.
- `ihate-template-health` and `ihate-template-query` blocks update after metadata changes.
- Query blocks filter by status, tag, and folder, then honor sort, order, limit, and layout.
- Code tabs show only the selected example in full, without a height limit or internal vertical scrolling.
- Code-tab keyboard navigation, current-tab copy, unknown languages, and literal HTML work in Reading view and Live Preview.
- Auto-fit tables default to on. Tables that fit stay in the text column; only tables needing more width expand, while paragraphs retain their width. Resize the pane to check that long text, URLs, and inline code wrap without horizontal scrolling. Toggling off or unloading restores the original layout; test with `examples/Wide Tables.md`.
- `%{{title}}`, `%{{page}}`, `%{{status}}`, `%{{datetime}}`, `%{{date}}`, and `%{{time}}` render.
- Prompt placeholders render: `%{{multi:...}}`, `%{{datepick:...}}`, `%{{property:...}}`.
- `%{{page}}` updates when a tracked note is renamed.
- Generated `created` values are restored on save for tracked notes.
- Frontmatter `updated: "%{{nowdatetime}}"` updates on save for created/applied notes.
- Template files are not rewritten by the tracker.
- Release build hides development-only notices, logs, and commands.

## Extension ideas

- Settings UI for editing built-in status labels and values.
- A custom review board view with drag-and-drop status changes.
- Previewed property migrations when a template rule changes.
- Settings UI for defining additional canonical tag aliases.
- Safer built-in functions such as `%{{folder}}`, `%{{filepath}}`, `%{{slug}}`, or `%{{uuid}}`.
