# IhateTemplate

IhateTemplate은 단순하고 명시적인 markdown 템플릿으로 Obsidian 문서를 만들고 적용하는 플러그인입니다.

이 플러그인은 Templater 확장이 아닙니다. JavaScript, Templater 블록, Mustache 문법을 실행하지 않습니다. 예측 가능한 문서 생성, 명시적인 템플릿 규칙, 일관된 속성과 태그, 다시 문서를 찾기 위한 작은 workflow view에 집중합니다.

English documentation: [README.md](README.md)

## 기능

- **명시적인 템플릿**: `%{{...}}` placeholder만 렌더링합니다. JavaScript, Templater 블록, Mustache 문법은 실행하지 않습니다.
- **문서 생성**: Command Palette나 오른쪽 클릭 메뉴에서 템플릿으로 새 문서를 만들고, 에디터에 삽입하고, 빈 파일에 적용합니다.
- **추적되는 속성**: 생성된 `created` 값은 저장 시 복구되고, `%{{now...}}` 필드는 저장 시 갱신되며, `%{{page}}`는 파일명 변경을 따라갑니다.
- **질문과 규칙**: select, multi-select, date, string-list 질문을 inline 또는 `.ihate.json` 규칙 파일로 선언하고, 필수 속성과 날짜 속성도 함께 둡니다.
- **상태와 Smart Tags**: 기본 상태 집합과, vault에서 이미 쓰는 표기를 재사용하며 중복을 막는 태그 편집기를 제공합니다.
- **노트 상태 점검**: 빠진 속성, 잘못된 status, 잘못 저장된 tags, 잘못된 날짜를 찾고, 수정 버튼을 누른 항목만 바꿉니다.
- **Workspace 패널**: 현재 문서의 목차, 속성, 태그, TODO/FIXME/IDEA marker, 상태 점검 요약을 오른쪽 사이드바에 보여줍니다.
- **대시보드**: 실행 코드 없이 status, marker, health, YAML query block이 실시간으로 갱신됩니다.
- **코드 탭과 표 자동 맞춤**: 여러 언어 예제를 탭형 코드 블록으로 보여주고, 내용이 넘치는 표만 본문 폭 밖으로 확장합니다.

## 빠른 시작

1. 플러그인을 설치합니다. 커뮤니티 디렉터리에 등록되기 전에는 최신 [release](https://github.com/Jjol0twi/IhateObsidianTemplate/releases)의 `main.js`, `manifest.json`, `styles.css`를 `<vault>/.obsidian/plugins/ihate-template/`에 복사하고 켭니다. 플러그인은 로드 시 vault에 아무것도 쓰지 않습니다.
2. `IhateTemplate: Install default templates` 명령 또는 설정 탭의 버튼으로 번들 템플릿을 `_templates` 폴더에 설치합니다. 대신 `Template folder` 설정을 직접 만든 템플릿 폴더로 지정해도 됩니다.
3. `IhateTemplate: Create note from template`을 실행해 템플릿을 고르고 제목을 입력합니다.
4. 필요하면 `IhateTemplate: Create dashboard`로 status와 marker 현황을, `IhateTemplate: Open workspace panel`로 현재 문서의 목차, 속성, 상태 점검을 봅니다.

## 사용법

### 새 문서 만들기

Command Palette에서 실행합니다.

```txt
IhateTemplate: Create note from template
```

또는 파일 탐색기에서 폴더/파일을 오른쪽 클릭하고 선택합니다.

```txt
New note from IhateTemplate
```

흐름:

```txt
템플릿 선택 -> 제목 입력 -> 문서 생성
```

제목 입력칸을 비우면 기본 제목을 사용합니다.

```txt
New Page
```

같은 제목의 파일이 이미 있으면 `New Page 2.md`처럼 숫자 suffix가 붙습니다.

### 현재 에디터에 삽입

Command Palette에서 실행합니다.

```txt
IhateTemplate: Insert template
```

또는 에디터에서 오른쪽 클릭하고 선택합니다.

```txt
Insert IhateTemplate
```

렌더링된 템플릿이 cursor 위치에 삽입됩니다. 제목은 묻지 않고 현재 파일명을 사용합니다.

### 빈 파일에 템플릿 적용

파일 탐색기에서 markdown 파일을 오른쪽 클릭하고 선택합니다.

```txt
Apply IhateTemplate if empty
```

파일에 공백 외에 아무 내용도 없을 때만 템플릿을 적용합니다. 제목은 묻지 않습니다. 기존 파일명이 `%{{title}}`과 `%{{page}}` 값으로 사용됩니다. 내용이 있는 파일은 덮어쓰지 않습니다.

### 나중에 상태 변경

Command Palette에서 실행합니다.

```txt
IhateTemplate: Change current file status
```

또는 markdown 파일을 오른쪽 클릭하고 선택합니다.

```txt
Change IhateTemplate status
```

이 기능은 기본 상태 선택창으로 해당 파일의 `status` frontmatter 필드를 갱신합니다.

### Smart Tags

아래 명령을 실행합니다.

```txt
IhateTemplate: Edit current file tags
```

vault에서 이미 사용하는 태그를 색인하고 현재 파일 경로와 제목에 가까운 태그를 우선 추천합니다. `back-end`, `backend`, `Backend`처럼 같은 의미로 볼 수 있는 표기는 하나의 identity로 취급합니다. 기존 노트는 자동으로 일괄 변경하지 않습니다.

폴더에서 생성하는 `%{{tags}}`도 vault에서 가장 많이 사용하는 일치 표기를 재사용합니다.

### 노트 상태 점검

아래 명령을 실행합니다.

```txt
IhateTemplate: Check note health
```

점검 화면은 문제를 먼저 보여주고 각 항목의 수정 버튼을 누른 경우에만 문서를 변경합니다. 기본 status 값, tags 저장 형식과 대표 표기, 템플릿 규칙의 필수 속성과 날짜 속성을 검사합니다.

### Workspace 패널

아래 명령을 실행합니다.

```txt
IhateTemplate: Open workspace panel
```

오른쪽 패널은 현재 markdown 파일을 따라가며 목차, status/priority/due 빠른 수정, tags, TODO/FIXME/IDEA marker, 상태 점검 요약을 제공합니다. 목차나 marker를 누르면 원문의 해당 줄로 이동합니다.

## 설정

- `Template folder`: markdown 템플릿이 있는 vault 폴더입니다. 기본값은 `_templates`입니다.
- `New note location`: `Current folder` 또는 `Vault root`입니다.
- `Datetime format`: 기본값은 `YYYY.MM.DD.HH:mm`입니다.
- `Auto-fit tables` (표 너비 자동 조절): 기본값은 켜짐입니다. 읽기 모드와 Live Preview에서 내용에 필요한 너비가 본문 폭을 넘는 일반 Markdown 표만 바깥으로 확장합니다. 본문 안에 들어가는 표는 행이 많아도 본문과 같은 시작 위치를 유지합니다. 확장은 문서 영역의 여유 너비까지이며 일반 본문 폭은 유지합니다. 그 이상은 셀의 긴 글, URL, 인라인 코드를 가로 스크롤 대신 줄바꿈합니다. 창 너비가 바뀌면 자동으로 다시 배치합니다. 끄면 테마의 원래 표 배치로 즉시 돌아가며 별도 표 문법은 필요하지 않습니다.

## 템플릿 문법

지원 placeholder:

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

지원하지 않는 문법:

```md
<% ... %>
{{title}}
```

Templater 문법은 실행하지 않습니다. 일반 Mustache 문법도 지원하지 않습니다.

### 커스텀 선택창

Templater JavaScript 대신 IhateTemplate의 안전한 select 문법을 사용합니다.

```md
status: "%{{select:status|작업 중=#status/draft|검토 중=#status/review|작성 완료=#status/done}}"
```

형식:

```md
%{{select:field|Label=value|Label=value}}
```

`field` 이름은 선택창 label로 사용됩니다. 선택된 `value`가 템플릿에 삽입됩니다.

### Prompt placeholder

추가 prompt placeholder:

```md
due: "%{{datepick:due}}"
source: "%{{property:source}}"
```

- `%{{multi:field|A|B|C}}`: 여러 값을 선택하고 YAML inline list로 렌더링합니다.
- `%{{datepick:field}}`: 날짜를 입력받고 `Datetime format`의 날짜 부분으로 렌더링합니다.
- `%{{property:field}}`: 현재 활성 파일의 frontmatter 값을 복사합니다.

### Placeholder 동작

- `%{{title}}`: 문서 제목으로 한 번 치환됩니다.
- `%{{page}}`: 문서 제목으로 치환되고, 파일명 변경 시 갱신 대상으로 추적됩니다.
- `%{{status}}`: 생성 시 `#status/draft`로 치환됩니다.
- `%{{tags}}`: 생성/적용 위치의 바로 상위 폴더명을 YAML block list로 렌더링합니다. 생성 시 따로 묻지 않습니다.
- `%{{multi:...}}`, `%{{datepick:...}}`, `%{{property:...}}`: 일반 placeholder 치환 전에 interactive prompt 값을 렌더링합니다.
- `%{{field:...}}`: 선택적 `.ihate.json` 규칙 파일에서 입력받은 값을 사용합니다.
- `%{{datetime}}`: `Datetime format`으로 한 번 치환됩니다.
- `%{{date}}`: `Datetime format`의 날짜 부분으로 한 번 치환됩니다.
- `%{{time}}`: `HH:mm` 형식으로 한 번 치환됩니다.
- `%{{nowdatetime}}`: 생성 시 치환되고, frontmatter 필드에서 사용된 경우 저장 시 갱신됩니다.
- `%{{nowdate}}`: 생성 시 `Datetime format`의 날짜 부분으로 치환되고, frontmatter 필드에서 사용된 경우 저장 시 갱신됩니다.
- `%{{nowtime}}`: 생성 시 치환되고, frontmatter 필드에서 사용된 경우 저장 시 갱신됩니다.

`now` placeholder는 IhateTemplate으로 생성하거나 적용한 문서의 frontmatter 필드에서 발견된 경우에만 추적됩니다. 템플릿 파일 자체는 tracker가 수정하지 않습니다.

`created`는 Obsidian Properties UI에서 입력 자체를 잠글 수는 없지만, IhateTemplate으로 생성/적용한 문서에서는 생성된 값을 추적하고 저장 시 원래 값으로 복구합니다. `updated`도 추적된 `%{{now...}}` placeholder를 쓰면 저장 시 플러그인이 관리합니다.

### 템플릿 규칙 파일

markdown 템플릿과 같은 이름의 선택적 JSON 규칙 파일을 둘 수 있습니다.

```txt
_templates/Daily Note.md
_templates/Daily Note.ihate.json
```

예시:

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
        { "label": "낮음", "value": "low" },
        { "label": "높음", "value": "high" }
      ]
    },
    { "field": "due", "label": "due", "type": "date" }
  ]
}
```

markdown에서는 `priority: "%{{field:priority}}"`, `due: "%{{field:due}}"`처럼 사용합니다. 규칙 prompt type은 `select`, `multi-select`, `date`, `string-list`를 지원합니다. `"titlePrefix": "date"`로 파일 제목 앞에 날짜를 붙일 수도 있습니다. 알 수 없는 필드, 지원하지 않는 prompt type, 잘못된 JSON, 실행 코드는 거부합니다.

기존 inline prompt placeholder는 호환성을 위해 계속 지원합니다.

### 기본 상태값

템플릿에 `%{{status}}`가 있으면 IhateTemplate은 기본값 `#status/draft`를 씁니다. 상태는 나중에 명령 또는 파일 오른쪽 클릭 메뉴에서 변경할 수 있습니다.

| 표시 이름 | 저장 값 |
| --- | --- |
| 작업 중 | `#status/draft` |
| 검토 중 | `#status/review` |
| 작성 완료 | `#status/done` |
| 업데이트 중 | `#status/updating` |
| 업데이트 필요 | `#status/outdated` |

상태 변경 명령에서 쓰는 선택창에는 사람이 읽는 한국어 label을 보여주고, frontmatter에는 관리용 정규화 값이 저장됩니다. IhateTemplate은 label과 value를 함께 코드에서 관리하므로, 나중에 대시보드와 관리 기능에서 같은 상태 범주를 일관되게 재사용할 수 있습니다.

## 대시보드

대시보드 페이지는 자동으로 만들지 않습니다. 아래 명령을 실행하거나 설정 탭의 **Create dashboard** 버튼을 누르면 vault 루트에 생성됩니다.

```txt
IhateTemplate Dashboard.md
```

명령:

```txt
IhateTemplate: Create dashboard
```

이미 있으면 로컬 수정을 덮어쓰지 않고 열기만 합니다. 대시보드는 IhateTemplate 전용 markdown code block으로 status와 marker block을 렌더링합니다. frontmatter에는 정규화된 status 값을 저장하고, 대시보드 화면에는 한국어 status label을 보여줍니다.

대시보드는 block 기반이라 필요한 block만 남기거나 직접 추가할 수 있습니다.

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
title: 진행 중인 AWS 노트
status: [draft, review]
tag: aws
folder: Projects
sort: updated
order: desc
limit: 12
layout: grid
```
````

지원하는 dashboard block:

- `ihate-template-status-board`: 기본 status 전체를 하나의 board로 렌더링합니다.
- `ihate-template-status`: status 하나만 렌더링합니다. block 안에는 `draft`, `review`, `done`, `updating`, `outdated`를 씁니다.
- `ihate-template-todo`: `%% TODO: ... %%` marker를 렌더링합니다.
- `ihate-template-fixme`: `%% FIXME: ... %%` marker를 렌더링합니다.
- `ihate-template-idea`: `%% IDEA: ... %%` marker를 렌더링합니다.
- `ihate-template-health`: 현재 vault의 상태 점검 요약과 review 진입점을 렌더링합니다.
- `ihate-template-query`: 검증된 YAML 속성으로 실시간 문서 목록을 렌더링합니다.

Query block은 `title`, `status`, `tag`, `folder`, `sort`, `order`, `limit`, `layout`을 지원합니다. `status`와 `tag`는 문자열 또는 YAML 문자열 목록을 받습니다. sort는 `name`, `created`, `updated`, `due`, layout은 `list`, `grid`, limit은 1부터 200까지 사용할 수 있습니다. 알 수 없는 속성은 거부합니다.

## 코드 탭

`ihate-template-code`를 사용하면 여러 언어의 예제를 하나의 코드 영역으로 표시합니다. 선택한 탭의 코드는 전체 길이로 보이고, 나머지 예제는 문서 공간을 차지하지 않습니다. 높이 제한이나 내부 세로 스크롤은 없습니다. 탭이 많아지면 줄바꿈 대신 가로로 스크롤합니다.

바깥 블록은 백틱 네 개, 각 예제는 백틱 세 개로 작성합니다.

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

내부 코드 블록의 첫 단어는 언어 ID이고, 그 뒤의 문자열은 선택적인 탭 이름입니다. 탭 이름을 생략하면 언어 ID가 표시됩니다. 같은 언어의 예제도 여러 개 넣을 수 있습니다. 예제 자체에 백틱 세 개짜리 블록이 있으면 내부 구분자를 더 길게 쓰고, 바깥 구분자는 그보다 더 길게 작성합니다.

- 탭 클릭 또는 탭에 포커스한 상태에서 좌우 방향키, Home, End로 전환합니다.
- 복사 버튼은 현재 선택한 예제만 복사합니다.
- Obsidian에 포함된 Prism 문법으로 구문을 강조하며, 모르는 언어는 일반 텍스트로 표시합니다.
- HTML이나 실행형 플러그인의 언어를 넣어도 코드를 실행하지 않습니다.
- 읽기 보기와 렌더링된 Live Preview에서는 탭으로 보입니다. 소스 모드나 블록 편집 중에는 전체 Markdown 원문이 보입니다. 탭 표시는 플러그인이 켜져 있어야 동작합니다.

전체 예제는 [Code Tabs.md](examples/Code%20Tabs.md)에 있습니다. 기존 문서와 템플릿은 자동 변경하지 않습니다.

## 기본 템플릿

- `Meeting Note.md`
- `Summary Note.md`
- `Daily Note.md`
- `Test All Elements.md`

번들된 템플릿은 로드 시 vault에 쓰지 않습니다. 아래 명령 또는 설정 탭의 **Install default templates** 버튼으로 템플릿 폴더에 설치합니다.

```txt
IhateTemplate: Install default templates
```

이 명령은 필요하면 템플릿 폴더를 만들고, 폴더에 markdown 템플릿이 하나도 없을 때만 번들 템플릿을 복사하며, 이미 있는 번들 템플릿 옆에 `.ihate.json` 규칙 파일이 없으면 추가합니다. 기존 파일은 덮어쓰지 않습니다.

실사용 템플릿은 `Test All Elements.md`에서 검증한 요소만 사용합니다: title/page, 폴더 기반 tags, 선택적 status, 선택적 priority select, meeting attendees 같은 문자열 목록 필드, due 날짜 선택, date/time placeholder. 미팅 노트는 생성되는 파일 제목 앞에 현재 날짜를 붙입니다.

### 예시 템플릿

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

## 목표

## 절차

## 확인
```

## 개발

```bash
npm install
npm run dev
```

`npm test`는 단위 테스트를, `npm run typecheck`는 TypeScript 컴파일러를 실행합니다. 개발 vault 구성, 소스 구조, 릴리즈 절차, 수동 테스트 체크리스트는 [DEVELOPMENT-KR.md](DEVELOPMENT-KR.md)를 보세요.

## 라이선스

MIT

코드 탭 파싱에는 MIT 라이선스의 [Marked](https://github.com/markedjs/marked)를 사용합니다. 구문 강조는 Obsidian이 제공하는 Prism 인스턴스를 사용합니다.
