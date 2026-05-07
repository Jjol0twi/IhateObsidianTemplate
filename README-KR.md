# IhateTemplate

IhateTemplate은 단순하고 명시적인 markdown 템플릿으로 Obsidian 문서를 만들고 적용하는 플러그인입니다.

이 플러그인은 Templater 확장이 아닙니다. JavaScript, Templater 블록, Mustache 문법을 실행하지 않습니다. 예측 가능한 placeholder, 문서 생성, 빈 문서에 템플릿 적용, 페이지 제목과 timestamp의 작은 자동 갱신에 집중합니다.

## 기능

- 선택한 markdown 템플릿으로 새 문서를 만듭니다.
- 선택한 템플릿을 현재 에디터에 삽입합니다.
- 기존 markdown 파일이 완전히 비어 있을 때만 템플릿을 적용합니다.
- 파일 탐색기 오른쪽 클릭 메뉴를 제공합니다.
- 에디터 오른쪽 클릭 삽입 메뉴를 제공합니다.
- 생성/적용된 문서의 `%{{page}}`를 추적하고 파일명이 바뀌면 갱신합니다.
- `%{{status}}`는 기본 관리값 `#status/draft`로 치환합니다.
- 나중에 명령 또는 파일 오른쪽 클릭 메뉴로 `status` frontmatter 필드를 변경할 수 있습니다.
- `%{{select:field|Label=value|...}}` 문법으로 커스텀 선택창을 만들 수 있습니다.
- 플러그인 로드 시 `IhateTemplate Dashboard.md` 페이지를 자동 생성하고, Command Palette에서 열 수 있습니다.
- 생성된 `created` frontmatter 값을 저장 시 원래 값으로 복구합니다.
- `%{{nowdatetime}}`, `%{{nowdate}}`, `%{{nowtime}}`을 사용한 frontmatter 필드를 저장 시 갱신합니다.
- `%{{...}}` 형태의 명시적인 템플릿 문법만 사용합니다.

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

아래 조건일 때만 템플릿을 적용합니다.

```ts
content.trim().length === 0
```

제목은 묻지 않습니다. 기존 파일명이 `%{{title}}`과 `%{{page}}` 값으로 사용됩니다. 내용이 있는 파일은 덮어쓰지 않습니다.

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

## 설정

- `Template folder`: markdown 템플릿이 있는 vault 폴더입니다. 기본값은 `templates`입니다.
- `New note location`: `Current folder` 또는 `Vault root`입니다.
- `Datetime format`: 기본값은 `YYYY.MM.DD.HH:mm`입니다.

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
tags: %{{multi:tags|obsidian|plugin|typescript}}
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
- `%{{multi:...}}`, `%{{datepick:...}}`, `%{{property:...}}`: 일반 placeholder 치환 전에 interactive prompt 값을 렌더링합니다.
- `%{{datetime}}`: `Datetime format`으로 한 번 치환됩니다.
- `%{{date}}`: `Datetime format`의 날짜 부분으로 한 번 치환됩니다.
- `%{{time}}`: `HH:mm` 형식으로 한 번 치환됩니다.
- `%{{nowdatetime}}`: 생성 시 치환되고, frontmatter 필드에서 사용된 경우 저장 시 갱신됩니다.
- `%{{nowdate}}`: 생성 시 `Datetime format`의 날짜 부분으로 치환되고, frontmatter 필드에서 사용된 경우 저장 시 갱신됩니다.
- `%{{nowtime}}`: 생성 시 치환되고, frontmatter 필드에서 사용된 경우 저장 시 갱신됩니다.

`now` placeholder는 IhateTemplate으로 생성하거나 적용한 문서의 frontmatter 필드에서 발견된 경우에만 추적됩니다. 템플릿 파일 자체는 tracker가 수정하지 않습니다.

`created`는 Obsidian Properties UI에서 입력 자체를 잠글 수는 없지만, IhateTemplate으로 생성/적용한 문서에서는 생성된 값을 추적하고 저장 시 원래 값으로 복구합니다. `updated`도 추적된 `%{{now...}}` placeholder를 쓰면 저장 시 플러그인이 관리합니다.

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

IhateTemplate은 로드 시 아래 페이지가 없으면 자동으로 생성합니다.

```txt
IhateTemplate Dashboard.md
```

Command Palette에서도 실행할 수 있습니다.

```txt
IhateTemplate: Create dashboard
```

이미 있으면 현재 기본 대시보드 형식으로 갱신한 뒤 엽니다. 대시보드는 IhateTemplate 전용 markdown code block으로 status board를 렌더링합니다. frontmatter에는 정규화된 status 값을 저장하고, 대시보드 화면에는 한국어 status label을 보여줍니다.

## 기본 템플릿

- `Meeting Note.md`
- `Summary Note.md`
- `Daily Note.md`
- `Test All Elements.md`

실사용 템플릿은 `Test All Elements.md`에서 검증한 요소만 사용합니다: title/page, 선택적 status, 선택적 priority select, 고정 tag 배열, meeting attendees 같은 문자열 목록 필드, due 날짜 선택, date/time placeholder. 미팅 노트는 생성되는 파일 제목 앞에 현재 날짜를 붙입니다.

## 예시 템플릿

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

## 목표

## 절차

## 확인
```

## 개발

```bash
cd ihate-template
npm install
npm run dev
```

개발 빌드는 Obsidian이 로드할 파일을 아래 위치에 씁니다.

```txt
../.obsidian/plugins/ihate-template/
```

빌드 후 Obsidian에서 플러그인을 reload해야 합니다.

## 소스 구조

- `main.ts`: plugin lifecycle, command 등록, menu 등록, vault event 처리
- `default-templates.ts`: bundled default template 파일의 typed registry
- `note-creator.ts`: 새 문서 생성, 삽입, 빈 파일 적용의 상위 workflow
- `template-engine.ts`: 순수 placeholder 렌더링과 frontmatter 추출
- `template-renderer.ts`: custom select 같은 interactive render prompt 처리
- `template-picker.ts`, `title-modal.ts`, `status.ts`: modal UI 경계
- `template-tracker.ts`: `updated`, 보호된 `created`, `%{{page}}` rename 갱신 추적
- `vault-paths.ts`: Obsidian vault path와 파일 생성 helper
- `dashboard.ts`: 기본 dashboard 생성
- `templates/*.md`: bundled default template 본문의 source of truth

## 추가하기 좋은 기능

- 기본 status label/value를 수정하는 settings UI
- 템플릿별 기본 status, 기본 생성 폴더, 필수 prompt를 정의하는 template metadata
- drag-and-drop으로 status를 바꿀 수 있는 custom review board view
- `%{{folder}}`, `%{{filepath}}`, `%{{slug}}`, `%{{uuid}}` 같은 안전한 built-in 함수

## 릴리즈 빌드

```bash
npm run build
npm run release:check
```

릴리즈 모드는 `main.js`를 minify하고 개발용 Notice, verbose log, health check command를 제외합니다.
`release:check`는 `package.json`, `manifest.json`, `versions.json`의 버전 일치 여부와 release bundle에 개발용 console artifact가 남았는지 확인합니다.

GitHub release에 올릴 파일은 아래 세 개입니다.

- `main.js`
- `manifest.json`
- `styles.css`

수동 설치 시에는 위 파일을 아래 폴더에 복사합니다.

```txt
Vault/.obsidian/plugins/ihate-template/
```

Obsidian 커뮤니티 플러그인으로 공식 제출하려면 repository root에 `README.md`, `LICENSE`, `manifest.json`, `versions.json`이 필요합니다. release tag는 `manifest.json`의 `version`과 같아야 합니다.

## 라이선스

MIT

## 수동 테스트 체크리스트

- 플러그인이 로드되고 settings tab이 표시됩니다.
- 템플릿 폴더의 markdown 파일 목록이 표시됩니다.
- 제목 modal을 취소하면 파일을 만들지 않습니다.
- 빈 제목은 `New Page.md`로 생성됩니다.
- vault root와 current folder에 새 문서를 만들 수 있습니다.
- 중복 제목에는 숫자 suffix가 붙습니다.
- 파일 탐색기 오른쪽 클릭으로 새 문서를 만들 수 있습니다.
- 에디터 오른쪽 클릭으로 템플릿을 삽입할 수 있습니다.
- 빈 markdown 파일에 제목 질문 없이 템플릿을 적용할 수 있습니다.
- 내용이 있는 markdown 파일은 빈 파일 적용 기능으로 덮어쓰지 않습니다.
- 명령 팔레트 또는 파일 오른쪽 클릭 메뉴로 status를 나중에 변경할 수 있습니다.
- Meeting Note, Summary Note, Daily Note 템플릿이 목록에 표시됩니다.
- 커스텀 `%{{select:...}}` prompt가 선택 값을 치환합니다.
- `Test All Elements.md`로 모든 지원 placeholder와 prompt 타입을 검증할 수 있습니다.
- `IhateTemplate Dashboard.md`는 없으면 로드 시 생성되고, `IhateTemplate: Create dashboard`는 이미 있는 대시보드를 엽니다.
- `%{{title}}`, `%{{page}}`, `%{{status}}`, `%{{datetime}}`, `%{{date}}`, `%{{time}}`이 치환됩니다.
- Prompt placeholder가 치환됩니다: `%{{multi:...}}`, `%{{datepick:...}}`, `%{{property:...}}`.
- 추적된 문서의 파일명을 바꾸면 `%{{page}}`로 생성된 제목이 갱신됩니다.
- 추적된 문서의 생성된 `created` 값은 저장 시 복구됩니다.
- 생성/적용된 문서의 frontmatter `updated: "%{{nowdatetime}}"`이 저장 시 갱신됩니다.
- 템플릿 파일 자체는 tracker가 수정하지 않습니다.
- release build에는 개발용 Notice, log, command가 노출되지 않습니다.
