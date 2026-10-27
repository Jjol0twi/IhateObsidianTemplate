# IhateTemplate 개발

English documentation: [DEVELOPMENT.md](DEVELOPMENT.md)

## 준비

이 저장소는 개발용 vault 안에 `<vault>/ihate-template`로 두는 구성을 전제로 합니다. 개발 빌드가 그 vault의 플러그인 폴더에 바로 쓰기 때문입니다. 실제 문서가 있는 vault는 쓰지 마세요.

```bash
npm install
npm run dev
```

개발 빌드는 Obsidian이 로드할 파일을 아래 위치에 씁니다.

```txt
../.obsidian/plugins/ihate-template/
```

빌드 후 Obsidian에서 플러그인을 reload해야 합니다. 개발 빌드는 로드 Notice를 띄우고 설정과 추적 데이터를 콘솔에 남기는 `Health check` 명령을 추가하며, 둘 다 릴리즈 빌드에는 들어가지 않습니다.

```bash
npm test
npm run typecheck
```

## 소스 구조

- `main.ts`: plugin lifecycle, command 등록, menu 등록, vault event 처리
- `default-templates.ts`: bundled default template 파일의 typed registry
- `note-creator.ts`: 새 문서 생성, 삽입, 빈 파일 적용의 상위 workflow
- `template-engine.ts`: 순수 placeholder 렌더링과 frontmatter 추출
- `template-renderer.ts`: custom select 같은 interactive render prompt 처리
- `template-rules.ts`: 검증된 `.ihate.json` 규칙과 규칙 기반 prompt 처리
- `template-picker.ts`, `title-modal.ts`, `status.ts`: modal UI 경계
- `template-tracker.ts`: `updated`, 보호된 `created`, `%{{page}}` rename 갱신 추적
- `smart-tags.ts`: vault tag 색인, 대표 표기 결정, tag 편집기
- `note-health.ts`: 상태 점검, 명시적 수정, health dashboard block
- `workspace-view.ts`: 현재 문서의 오른쪽 사이드 패널
- `vault-paths.ts`: Obsidian vault path와 파일 생성 helper
- `dashboard.ts`: 기본 dashboard 생성
- `dashboard-query.ts`: 검증된 실시간 dashboard query
- `code-tabs-parser.ts`, `code-tabs.ts`: 코드 블록 파싱과 선택한 예제만 표시하는 탭 렌더러
- `templates/*.md`, `templates/*.ihate.json`: bundled template 본문과 규칙의 source of truth

## 릴리즈 빌드

```bash
npm run version:set -- 0.3.0
npm test
npm run typecheck
npm run build
npm run release:check
```

기본 빌드는 개발 vault의 플러그인 폴더에 씁니다. `IHATE_OUT_DIR=.`를 주면 저장소 루트에 `main.js`를 만들며(`.gitignore` 대상), `release:check`도 같은 변수를 읽습니다.

`version:set`은 기존 `versions.json` 기록을 보존하면서 `package.json`, `package-lock.json`, `manifest.json`, `versions.json`의 버전을 함께 변경합니다.
릴리즈 모드는 `main.js`를 minify하고 개발용 Notice, verbose log, health check command를 제외합니다.
`release:check`는 `package.json`, `manifest.json`, `versions.json`의 버전 일치 여부와 release bundle에 개발용 console artifact가 남았는지 확인합니다.

GitHub release에 올릴 파일은 아래 세 개입니다.

- `main.js`
- `manifest.json`
- `styles.css`

`.github/workflows/release.yml`은 버전과 같은 이름의 tag를 push하면 테스트, 타입체크, 릴리즈 빌드, `release:check`를 거쳐 위 세 파일을 첨부한 draft release를 만듭니다. GitHub에서 draft를 확인하고 publish하면 됩니다.

```bash
git tag 0.3.0 && git push origin 0.3.0
```

수동 설치 시에는 위 파일을 아래 폴더에 복사합니다.

```txt
Vault/.obsidian/plugins/ihate-template/
```

Obsidian 커뮤니티 플러그인으로 공식 제출하려면 repository root에 `README.md`, `LICENSE`, `manifest.json`, `versions.json`이 필요합니다. release tag는 `manifest.json`의 `version`과 같아야 합니다.

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
- Smart Tags가 기존 태그를 추천하고 같은 identity의 중복 태그를 막습니다.
- Note Health가 노트를 자동 변경하지 않고 status, tags, date, 필수 속성 문제를 찾습니다.
- Workspace 패널이 현재 문서를 따라가고 목차와 marker의 원문 줄을 엽니다.
- `.ihate.json` 규칙이 `%{{field:...}}` 값을 렌더링하고 잘못된 규칙은 안전하게 생성을 중단합니다.
- Meeting Note, Summary Note, Daily Note 템플릿이 목록에 표시됩니다.
- 커스텀 `%{{select:...}}` prompt가 선택 값을 치환합니다.
- `Test All Elements.md`로 모든 지원 placeholder와 prompt 타입을 검증할 수 있습니다.
- 플러그인은 로드 시 vault에 아무것도 쓰지 않습니다. 명령이나 설정 버튼을 쓰기 전에는 대시보드, 템플릿 폴더, 템플릿 파일이 생기지 않습니다.
- `IhateTemplate: Install default templates`는 폴더에 markdown 템플릿이 없을 때 템플릿 폴더와 번들 템플릿을 만들고, 빠진 규칙 파일을 추가하며, 만든 항목 수를 알려줍니다.
- `IhateTemplate: Create dashboard`는 `IhateTemplate Dashboard.md`가 없으면 만들고 있으면 엽니다.
- `ihate-template-health`, `ihate-template-query` block이 metadata 변경 뒤 갱신됩니다.
- Query block이 status, tag, folder를 필터링하고 sort, order, limit, layout을 적용합니다.
- 코드 탭은 선택한 예제만 전체 길이로 표시하며 높이 제한과 내부 세로 스크롤은 없습니다.
- 읽기 보기와 Live Preview에서 키보드 탭 전환, 현재 탭 복사, 알 수 없는 언어, HTML 원문 표시가 동작합니다.
- Auto-fit tables는 기본 켜짐입니다. 본문에 들어가는 표는 본문 안에 유지되고 너비가 부족한 표만 확장하며, 일반 본문 폭은 유지합니다. 창 너비를 바꿔 긴 글, URL, 인라인 코드가 가로 스크롤 없이 줄바꿈하는지 확인합니다. 끄거나 플러그인을 해제하면 원래 배치로 돌아가는지 `examples/Wide Tables.md`로 확인합니다.
- `%{{title}}`, `%{{page}}`, `%{{status}}`, `%{{datetime}}`, `%{{date}}`, `%{{time}}`이 치환됩니다.
- Prompt placeholder가 치환됩니다: `%{{multi:...}}`, `%{{datepick:...}}`, `%{{property:...}}`.
- 추적된 문서의 파일명을 바꾸면 `%{{page}}`로 생성된 제목이 갱신됩니다.
- 추적된 문서의 생성된 `created` 값은 저장 시 복구됩니다.
- 생성/적용된 문서의 frontmatter `updated: "%{{nowdatetime}}"`이 저장 시 갱신됩니다.
- 템플릿 파일 자체는 tracker가 수정하지 않습니다.
- release build에는 개발용 Notice, log, command가 노출되지 않습니다.

## 추가하기 좋은 기능

- 기본 status label/value를 수정하는 settings UI
- drag-and-drop으로 status를 바꿀 수 있는 custom review board view
- 템플릿 규칙 변경 시 속성 migration 미리보기
- 추가 tag alias를 정의하는 settings UI
- `%{{folder}}`, `%{{filepath}}`, `%{{slug}}`, `%{{uuid}}` 같은 안전한 built-in 함수
