# IhateTemplate

IhateTemplate is an Obsidian plugin for creating and applying notes from simple, explicit markdown templates.

It is intentionally not a Templater extension. IhateTemplate does not execute JavaScript, Templater blocks, or Mustache syntax. It focuses on predictable note creation, explicit template rules, consistent properties and tags, and small workflow views that help you find notes again.

## Features

- Create a new note from a selected markdown template.
- Insert a selected template into the active editor.
- Apply a template to an existing markdown file only when the file is empty.
- Add file explorer context menu actions.
- Add editor context menu insertion.
- Track `%{{page}}` in created/applied notes and update it when the note is renamed.
- Render `%{{status}}` as the default management value `#status/draft`.
- Change the `status` frontmatter field later from a command or file context menu.
- Use custom select prompts with `%{{select:field|Label=value|...}}`.
- Automatically create an `IhateTemplate Dashboard.md` page on load and open it from the command palette.
- Protect generated `created` frontmatter values by restoring them on save.
- Track frontmatter fields that use `%{{nowdatetime}}`, `%{{nowdate}}`, or `%{{nowtime}}` and update them on save.
- Keep template syntax explicit with `%{{...}}`.
- Canonicalize folder-based tags against tags already used in the vault.
- Edit tags with searchable suggestions while preventing spelling variants and duplicates.
- Check note health for missing properties, invalid statuses, malformed tags, and rule-defined date formats.
- Open a right sidebar with the current note's outline, properties, tags, markers, and health summary.
- Keep template prompts and validation metadata in optional `.ihate.json` sidecar files.
- Build live dashboard blocks with safe YAML filters instead of executable query code.
- Display multiple language examples in one compact, tabbed code block.

## Usage

### Create A New Note

Run the command:

```txt
IhateTemplate: Create note from template
```

or right-click a folder/file in the file explorer and choose:

```txt
New note from IhateTemplate
```

Flow:

```txt
Choose template -> enter title -> create note
```

If the title field is empty, the plugin uses:

```txt
New Page
```

Duplicate note titles receive a numeric suffix, such as `New Page 2.md`.

### Insert Into The Current Editor

Run:

```txt
IhateTemplate: Insert template
```

or right-click inside the editor and choose:

```txt
Insert IhateTemplate
```

This inserts the rendered template at the cursor position. It does not ask for a title; the active file name is used.

### Apply To An Empty File

Right-click a markdown file in the file explorer and choose:

```txt
Apply IhateTemplate if empty
```

The plugin applies a selected template only when:

```ts
content.trim().length === 0
```

It does not ask for a title. The existing file name is used for `%{{title}}` and `%{{page}}`. Non-empty files are not overwritten.

### Change Status Later

Run:

```txt
IhateTemplate: Change current file status
```

or right-click a markdown file and choose:

```txt
Change IhateTemplate status
```

This updates the file's `status` frontmatter field using the built-in status picker.

### Smart Tags

Run:

```txt
IhateTemplate: Edit current file tags
```

The picker indexes tags already used in the vault, favors tags related to the current file path and title, and treats spelling variants such as `back-end`, `backend`, and `Backend` as the same identity. Existing notes are never rewritten automatically.

Folder-derived `%{{tags}}` values also reuse the most common matching spelling from the vault.

### Note Health

Run:

```txt
IhateTemplate: Check note health
```

The health view reports issues first and changes a note only when its fix button is pressed. It checks built-in status values, tag storage and canonical spelling, required properties from template rules, and rule-defined date properties.

### Workspace Panel

Run:

```txt
IhateTemplate: Open workspace panel
```

The right sidebar follows the current markdown file and provides its outline, editable status/priority/due values, tags, TODO/FIXME/IDEA markers, and health summary. Clicking an outline heading or marker moves to that source line.

## Settings

- `Template folder`: vault folder containing markdown templates. Default: `_templates`
- `New note location`: `Current folder` or `Vault root`
- `Datetime format`: default `YYYY.MM.DD.HH:mm`
- `Auto-fit tables`: enabled by default. In Reading view and Live Preview, standard Markdown tables expand beyond the text column only when their content needs more width. Tables that fit stay aligned with the text column, even if they have many rows. Wider tables use the available note pane width without widening paragraphs; cell text, long URLs, and inline code wrap at that limit instead of requiring horizontal scrolling. The layout adapts when the pane is resized. Turn it off to restore the theme's table layout immediately. No special table syntax is needed.

## Template Syntax

Supported placeholders:

```md
%{{title}}
%{{page}}
%{{status}}
%{{datetime}}
%{{date}}
%{{time}}
%{{nowdatetime}}
%{{nowdate}}
%{{nowtime}}
%{{multi:field|A|B|C}}
%{{datepick:field}}
%{{property:field}}
%{{field:field}}
```

Unsupported syntax:

```md
<% ... %>
{{title}}
```

Templater syntax is not executed. Plain Mustache syntax is not supported.

### Custom Select Prompts

Use IhateTemplate's safe select syntax instead of Templater JavaScript:

```md
status: "%{{select:status|작업 중=#status/draft|검토 중=#status/review|작성 완료=#status/done}}"
```

Format:

```md
%{{select:field|Label=value|Label=value}}
```

The `field` name is used as the picker label. The selected `value` is inserted into the template.

### Prompt Placeholders

Additional prompt placeholders:

```md
due: "%{{datepick:due}}"
source: "%{{property:source}}"
```

- `%{{multi:field|A|B|C}}`: lets the user pick multiple values, then renders a YAML inline list.
- `%{{datepick:field}}`: asks for a date and renders it using the date portion of `Datetime format`.
- `%{{property:field}}`: copies a frontmatter value from the currently active file.

### Placeholder Behavior

- `%{{title}}`: rendered once with the note title.
- `%{{page}}`: rendered with the note title and tracked for rename updates.
- `%{{status}}`: renders as `#status/draft` at creation time.
- `%{{tags}}`: renders the immediate parent folder name as a YAML block list, without prompting.
- `%{{multi:...}}`, `%{{datepick:...}}`, `%{{property:...}}`: render interactive prompt values before normal placeholders.
- `%{{field:...}}`: receives a value from the template's optional `.ihate.json` rule file.
- `%{{datetime}}`: rendered once using `Datetime format`.
- `%{{date}}`: rendered once using the date portion of `Datetime format`.
- `%{{time}}`: rendered once as `HH:mm`.
- `%{{nowdatetime}}`: rendered at creation and tracked when used in frontmatter fields.
- `%{{nowdate}}`: rendered at creation using the date portion of `Datetime format` and tracked when used in frontmatter fields.
- `%{{nowtime}}`: rendered at creation and tracked when used in frontmatter fields.

`now` placeholders are tracked only when they appear in frontmatter fields of notes created or applied by IhateTemplate. Template files themselves are not updated by the tracker.

`created` is not locked in Obsidian's Properties UI, but IhateTemplate tracks the generated value for created/applied notes and restores it on save. `updated` is similarly controlled when it uses a tracked `%{{now...}}` placeholder.

### Template Rule Files

A markdown template can have an optional JSON rule file with the same base name:

```txt
_templates/Daily Note.md
_templates/Daily Note.ihate.json
```

Example:

```json
{
  "version": 1,
  "requiredProperties": ["status", "priority", "tags", "created", "updated", "due"],
  "protectedProperties": ["created"],
  "dateProperties": ["due"],
  "prompts": [
    {
      "field": "priority",
      "label": "Choose priority",
      "type": "select",
      "options": [
        { "label": "Low", "value": "low" },
        { "label": "High", "value": "high" }
      ]
    },
    { "field": "due", "label": "due", "type": "date" }
  ]
}
```

The markdown file uses `priority: "%{{field:priority}}"` and `due: "%{{field:due}}"`. Supported rule prompt types are `select`, `multi-select`, `date`, and `string-list`. A rule may also set `"titlePrefix": "date"`. Unknown fields, unsupported prompt types, invalid JSON, and executable code are rejected.

Inline prompt placeholders remain supported for backward compatibility.

### Built-In Status Values

When a template contains `%{{status}}`, IhateTemplate writes the default value `#status/draft`. Status can be changed later from a command or file context menu.

| Label | Value |
| --- | --- |
| 작업 중 | `#status/draft` |
| 검토 중 | `#status/review` |
| 작성 완료 | `#status/done` |
| 업데이트 중 | `#status/updating` |
| 업데이트 필요 | `#status/outdated` |

The status picker used by the change-status command shows user-facing Korean labels, while the frontmatter stores normalized management values. IhateTemplate keeps both label and value in code so dashboard and management features can reuse the same categories consistently.

## Dashboard

IhateTemplate creates this page on load if it does not already exist:

```txt
IhateTemplate Dashboard.md
```

You can also run:

```txt
IhateTemplate: Create dashboard
```

If the page already exists, the command opens it without overwriting local edits. The dashboard uses IhateTemplate markdown code blocks to render status and marker blocks. Notes store normalized status values in frontmatter, while the board displays Korean status labels.

The dashboard is block-based. Existing dashboard files are opened without being overwritten, so you can keep only the blocks you want.

````md
```ihate-template-status
draft
```

```ihate-template-status
review
```

```ihate-template-todo
```

```ihate-template-fixme
```

```ihate-template-idea
```

```ihate-template-health
```

```ihate-template-query
title: Active AWS notes
status: [draft, review]
tag: aws
folder: Projects
sort: updated
order: desc
limit: 12
layout: grid
```
````

Supported dashboard blocks:

- `ihate-template-status-board`: renders every built-in status in one board.
- `ihate-template-status`: renders one status. Use `draft`, `review`, `done`, `updating`, or `outdated` inside the block.
- `ihate-template-todo`: renders `%% TODO: ... %%` markers.
- `ihate-template-fixme`: renders `%% FIXME: ... %%` markers.
- `ihate-template-idea`: renders `%% IDEA: ... %%` markers.
- `ihate-template-health`: renders the current vault health summary and opens the review UI.
- `ihate-template-query`: renders a live note list using validated YAML properties.

Query blocks support `title`, `status`, `tag`, `folder`, `sort`, `order`, `limit`, and `layout`. `status` and `tag` accept either a string or a YAML string list. Sort values are `name`, `created`, `updated`, and `due`; layouts are `list` and `grid`; limits must be between 1 and 200. Unknown properties are rejected.

## Code Tabs

Use `ihate-template-code` to show multiple language examples in one code area. Only the selected tab is displayed, in its full length; the other examples do not take up space in the note. There is no height limit or internal vertical scrolling. The tab bar scrolls horizontally rather than wrapping into extra rows.

Use four backticks for the outer block and three for each example:

`````md
````ihate-template-code
```kotlin Main.kt
println("Hello")
```
```python hello.py
print("Hello")
```
````
`````

The first word after an inner fence is the language ID. The remaining text is an optional tab label; without it, the language ID is the label. Multiple examples may use the same language. If an example contains triple backtick fences itself, use longer inner fences and an even longer outer fence.

- Click a tab or use Left/Right, Home, and End while a tab is focused.
- The copy button copies only the selected example.
- Highlighting uses Obsidian's bundled Prism grammars; unknown languages display as plain text.
- Code is never executed, including HTML and executable plugin languages.
- Reading view and rendered Live Preview show tabs. Source mode or editing the block shows all of its Markdown source. The plugin must be enabled to display tabs.

See [Code Tabs.md](examples/Code%20Tabs.md) for a complete example. Existing notes and templates are not rewritten.

## Built-In Templates

- `Meeting Note.md`
- `Summary Note.md`
- `Daily Note.md`
- `Test All Elements.md`

The practical templates use only the elements proven in `Test All Elements.md`: title/page, folder-based tags, optional status, optional priority select, string-list fields such as meeting attendees, due date picker, and date/time placeholders. Meeting notes prefix the created file title with the current date.

## Example Template

```md
---
status: "#status/done"
tags: %{{tags}}
created: "%{{datetime}}"
updated: "%{{nowdatetime}}"
related: []
source: []
---

>

## Goal

## Steps

## Check
```

## Development

```bash
cd ihate-template
npm install
npm run dev
```

The development build writes Obsidian load files to:

```txt
../.obsidian/plugins/ihate-template/
```

Reload the plugin in Obsidian after each rebuild.

## Source Structure

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

## Extension Ideas

- Settings UI for editing built-in status labels and values.
- A custom review board view with drag-and-drop status changes.
- Previewed property migrations when a template rule changes.
- Settings UI for defining additional canonical tag aliases.
- Safer built-in functions such as `%{{folder}}`, `%{{filepath}}`, `%{{slug}}`, or `%{{uuid}}`.

## Release Build

```bash
npm run version:set -- 0.2.0
npm test
npm run typecheck
npm run build
npm run release:check
```

`version:set` updates `package.json`, `package-lock.json`, `manifest.json`, and `versions.json` together while preserving previous `versions.json` entries.
Release mode minifies `main.js` and excludes development-only notices, verbose logs, and the health check command.
`release:check` verifies version consistency between `package.json`, `manifest.json`, and `versions.json`, and checks the generated release bundle for development-only console artifacts.

The GitHub release assets are:

- `main.js`
- `manifest.json`
- `styles.css`

For manual installation, copy those files into:

```txt
Vault/.obsidian/plugins/ihate-template/
```

For an official Obsidian community plugin submission, the repository also needs `README.md`, `LICENSE`, `manifest.json`, and `versions.json`. The release tag must match the `version` in `manifest.json`.

## License

MIT

Code-tab parsing uses [Marked](https://github.com/markedjs/marked), licensed under MIT. Syntax highlighting uses the Prism instance provided by Obsidian.

## Manual Test Checklist

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
- `IhateTemplate Dashboard.md` is created on load when missing, and `IhateTemplate: Create dashboard` opens it when present.
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
