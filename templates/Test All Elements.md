---
status: "%{{status}}"
priority: "%{{field:priority}}"
tags: %{{tags}}
created: "%{{datetime}}"
updated: "%{{nowdatetime}}"
date: "%{{date}}"
time: "%{{time}}"
due: "%{{field:due}}"
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

- [ ] Verify default draft status
- [ ] Verify priority select
- [ ] Verify due date picker
- [ ] Verify folder-based tags
- [ ] Verify created protection
- [ ] Verify updated refresh on save
