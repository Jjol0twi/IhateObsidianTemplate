---
status: "%{{status}}"
priority: "%{{select:priority|낮음=low|보통=medium|높음=high}}"
tags: ["test", "template", "ihate-template", "obsidian"]
created: "%{{datetime}}"
updated: "%{{nowdatetime}}"
date: "%{{date}}"
time: "%{{time}}"
due: "%{{datepick:due}}"
related: []
source: []
---

## %{{page}}

## Title Tokens

- title: %{{title}}
- page: %{{page}}

## Time Tokens

- datetime: %{{datetime}}
- date: %{{date}}
- time: %{{time}}
- nowdatetime: %{{nowdatetime}}
- nowdate: %{{nowdate}}
- nowtime: %{{nowtime}}

## Prompt Tokens

- priority is selected in frontmatter.
- due is selected with a date picker.

## Optional Prompt Syntax Samples

These are intentionally left as examples, not active prompts:

```md
% { {datepick:due} }
% { {property:source} }
```

## Checklist

- [ ] Verify status picker
- [ ] Verify custom select
- [ ] Verify multi select
- [ ] Verify created protection
- [ ] Verify updated refresh on save
