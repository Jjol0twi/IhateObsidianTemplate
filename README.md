# IhateTemplate

IhateTemplate is an Obsidian plugin for creating and applying notes from simple, explicit markdown templates.

It is intentionally not a Templater extension. IhateTemplate does not execute JavaScript, Templater blocks, or Mustache syntax. It focuses on predictable placeholders, note creation, empty-note templating, and small automatic updates for page titles and timestamps.

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

## Settings

- `Template folder`: vault folder containing markdown templates. Default: `templates`
- `New note location`: `Current folder` or `Vault root`
- `Datetime format`: default `YYYY.MM.DD.HH:mm`

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
tags: %{{multi:tags|obsidian|plugin|typescript}}
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
- `%{{multi:...}}`, `%{{datepick:...}}`, `%{{property:...}}`: render interactive prompt values before normal placeholders.
- `%{{datetime}}`: rendered once using `Datetime format`.
- `%{{date}}`: rendered once using the date portion of `Datetime format`.
- `%{{time}}`: rendered once as `HH:mm`.
- `%{{nowdatetime}}`: rendered at creation and tracked when used in frontmatter fields.
- `%{{nowdate}}`: rendered at creation using the date portion of `Datetime format` and tracked when used in frontmatter fields.
- `%{{nowtime}}`: rendered at creation and tracked when used in frontmatter fields.

`now` placeholders are tracked only when they appear in frontmatter fields of notes created or applied by IhateTemplate. Template files themselves are not updated by the tracker.

`created` is not locked in Obsidian's Properties UI, but IhateTemplate tracks the generated value for created/applied notes and restores it on save. `updated` is similarly controlled when it uses a tracked `%{{now...}}` placeholder.

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

If the page already exists, the command refreshes the default dashboard code block and opens it. The dashboard uses an IhateTemplate markdown code block to render a status board with page buttons. Notes store normalized status values in frontmatter, while the board displays Korean status labels.

## Built-In Templates

- `Meeting Note.md`
- `Summary Note.md`
- `Daily Note.md`
- `Test All Elements.md`

The practical templates use only the elements proven in `Test All Elements.md`: title/page, optional status, optional priority select, fixed tag arrays, string-list fields such as meeting attendees, due date picker, and date/time placeholders. Meeting notes prefix the created file title with the current date.

## Example Template

```md
---
status: "#status/done"
tags: []
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
- `template-picker.ts`, `title-modal.ts`, `status.ts`: modal UI boundaries.
- `template-tracker.ts`: tracked updates for `updated`, protected `created`, and `%{{page}}` rename changes.
- `vault-paths.ts`: Obsidian vault path and file creation helpers.
- `dashboard.ts`: default dashboard generation.
- `templates/*.md`: source of truth for bundled default template content.

## Extension Ideas

- Settings UI for editing built-in status labels and values.
- A template metadata schema for default status, default folder, or required prompts.
- A custom review board view with drag-and-drop status changes.
- Safer built-in functions such as `%{{folder}}`, `%{{filepath}}`, `%{{slug}}`, or `%{{uuid}}`.

## Release Build

```bash
npm run build
npm run release:check
```

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
- Meeting Note, Summary Note, and Daily Note templates are listed.
- Custom `%{{select:...}}` prompts render selected values.
- `Test All Elements.md` can render all supported placeholders and prompt types.
- `IhateTemplate Dashboard.md` is created on load when missing, and `IhateTemplate: Create dashboard` opens it when present.
- `%{{title}}`, `%{{page}}`, `%{{status}}`, `%{{datetime}}`, `%{{date}}`, and `%{{time}}` render.
- Prompt placeholders render: `%{{multi:...}}`, `%{{datepick:...}}`, `%{{property:...}}`.
- `%{{page}}` updates when a tracked note is renamed.
- Generated `created` values are restored on save for tracked notes.
- Frontmatter `updated: "%{{nowdatetime}}"` updates on save for created/applied notes.
- Template files are not rewritten by the tracker.
- Release build hides development-only notices, logs, and commands.
# IhateObsidianTemplate
