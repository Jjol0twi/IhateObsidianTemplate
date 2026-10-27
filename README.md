# IhateTemplate

IhateTemplate is an Obsidian plugin for creating and applying notes from simple, explicit markdown templates.

It is intentionally not a Templater extension. IhateTemplate does not execute JavaScript, Templater blocks, or Mustache syntax. It focuses on predictable note creation, explicit template rules, consistent properties and tags, and small workflow views that help you find notes again.

한국어 문서: [README-KR.md](README-KR.md)

## Features

- **Explicit templates**: only `%{{...}}` placeholders are rendered. JavaScript, Templater blocks, and Mustache syntax are never executed.
- **Note creation**: create a note from a template, insert a template into the editor, or apply one to an empty file, from the command palette or context menus.
- **Tracked properties**: generated `created` values are restored on save, `%{{now...}}` fields refresh on save, and `%{{page}}` follows file renames.
- **Prompts and rules**: select, multi-select, date, and string-list prompts, declared inline or in `.ihate.json` rule files together with required and date properties.
- **Status and smart tags**: a built-in status set, plus a tag editor that reuses spellings already in the vault and blocks duplicates.
- **Note health**: finds missing properties, invalid statuses, malformed tags, and bad dates, and changes a note only when you press its fix button.
- **Workspace panel**: outline, properties, tags, TODO/FIXME/IDEA markers, and a health summary for the active note in the right sidebar.
- **Dashboards**: status, marker, health, and YAML query blocks that update live, without executable query code.
- **Code tabs and auto-fit tables**: tabbed multi-language code blocks, and tables that widen beyond the text column only when their content needs it.

## Quick start

1. Install the plugin. Until it is listed in the community directory, copy `main.js`, `manifest.json`, and `styles.css` from the latest [release](https://github.com/Jjol0twi/IhateObsidianTemplate/releases) into `<vault>/.obsidian/plugins/ihate-template/` and enable it. The plugin writes nothing to the vault on load.
2. Run `IhateTemplate: Install default templates`, or press the button in the settings tab, to add the bundled templates to the `_templates` folder. You can instead point `Template folder` at a folder of your own templates.
3. Run `IhateTemplate: Create note from template`, choose a template, and enter a title.
4. Optionally run `IhateTemplate: Create dashboard` for a status and marker overview, and `IhateTemplate: Open workspace panel` for the active note's outline, properties, and health.

## Usage

### Create a new note

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

### Insert into the current editor

Run:

```txt
IhateTemplate: Insert template
```

or right-click inside the editor and choose:

```txt
Insert IhateTemplate
```

This inserts the rendered template at the cursor position. It does not ask for a title; the active file name is used.

### Apply to an empty file

Right-click a markdown file in the file explorer and choose:

```txt
Apply IhateTemplate if empty
```

The template is applied only when the file contains nothing but whitespace. It does not ask for a title. The existing file name is used for `%{{title}}` and `%{{page}}`. Non-empty files are not overwritten.

### Change status later

Run:

```txt
IhateTemplate: Change current file status
```

or right-click a markdown file and choose:

```txt
Change IhateTemplate status
```

This updates the file's `status` frontmatter field using the built-in status picker.

### Smart tags

Run:

```txt
IhateTemplate: Edit current file tags
```

The picker indexes tags already used in the vault, favors tags related to the current file path and title, and treats spelling variants such as `back-end`, `backend`, and `Backend` as the same identity. Existing notes are never rewritten automatically.

Folder-derived `%{{tags}}` values also reuse the most common matching spelling from the vault.

### Note health

Run:

```txt
IhateTemplate: Check note health
```

The health view reports issues first and changes a note only when its fix button is pressed. It checks built-in status values, tag storage and canonical spelling, required properties from template rules, and rule-defined date properties.

### Workspace panel

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

## Template syntax

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

### Custom select prompts

Use IhateTemplate's safe select syntax instead of Templater JavaScript:

```md
status: "%{{select:status|작업 중=#status/draft|검토 중=#status/review|작성 완료=#status/done}}"
```

Format:

```md
%{{select:field|Label=value|Label=value}}
```

The `field` name is used as the picker label. The selected `value` is inserted into the template.

### Prompt placeholders

Additional prompt placeholders:

```md
due: "%{{datepick:due}}"
source: "%{{property:source}}"
```

- `%{{multi:field|A|B|C}}`: lets the user pick multiple values, then renders a YAML inline list.
- `%{{datepick:field}}`: asks for a date and renders it using the date portion of `Datetime format`.
- `%{{property:field}}`: copies a frontmatter value from the currently active file.

### Placeholder behavior

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

### Template rule files

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

### Built-in status values

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

The dashboard page is not created automatically. Run this command, or press **Create dashboard** in the settings tab, to create it in the vault root:

```txt
IhateTemplate Dashboard.md
```

Command:

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

## Code tabs

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

## Built-in templates

- `Meeting Note.md`
- `Summary Note.md`
- `Daily Note.md`
- `Test All Elements.md`

The bundled templates are not written to the vault on load. Install them into the template folder with this command or the **Install default templates** button in the settings tab:

```txt
IhateTemplate: Install default templates
```

The command creates the template folder if needed, copies the bundled templates only when the folder has no markdown templates yet, and adds a missing `.ihate.json` rule file next to any bundled template that is already present. Existing files are never overwritten.

The practical templates use only the elements proven in `Test All Elements.md`: title/page, folder-based tags, optional status, optional priority select, string-list fields such as meeting attendees, due date picker, and date/time placeholders. Meeting notes prefix the created file title with the current date.

### Example template

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
npm install
npm run dev
```

`npm test` runs the unit tests and `npm run typecheck` runs the TypeScript compiler. See [DEVELOPMENT.md](DEVELOPMENT.md) for the development vault layout, the source structure, the release process, and the manual test checklist.

## License

MIT

Code-tab parsing uses [Marked](https://github.com/markedjs/marked), licensed under MIT. Syntax highlighting uses the Prism instance provided by Obsidian.
