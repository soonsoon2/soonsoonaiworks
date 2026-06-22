# Layout Map Studio

AI와 사람이 같은 레이아웃 맵을 보면서 화면 배치를 조정하기 위한 공용 작업대다.

## Purpose
- 캔버스에서 레이아웃 영역을 눈으로 확인한다.
- 같은 구조를 JSON 기반 `layoutMap`으로 유지해 AI가 읽고 수정하기 쉽게 만든다.
- CSS/class 규칙을 `l-`, `c-`, `is-`, `u-` 계약으로 제한한다.
- UI 템플릿 프로젝트의 밀도와 패널 감각을 참고하되, 실제 작업대 기능을 먼저 검증한다.

## Reuse Model
- 이 도구는 최종 UI 빌더가 아니라, 구현 전에 레이아웃 구조를 정하는 공용 작업대다.
- 다른 프로젝트에는 코드 전체보다 `layout-map.json`, `layout-preview.png`, `layout-brief.md`를 우선 전달한다.
- 실제 구현 에이전트는 JSON을 구조의 원본으로, PNG를 눈으로 보는 비율 기준으로, brief를 짧은 작업 지시로 사용한다.
- 완성된 UI 코드는 대상 프로젝트의 프레임워크, 토큰, 컴포넌트 규칙에 맞춰 새로 작성한다.

## MVP Features
- 좌측 패널: 선택 요소 Inspector와 전체 Hierarchy tree.
- Hierarchy에서 같은 부모 아래 항목 순서를 드래그 또는 위/아래 버튼으로 변경하고, region id를 자동 재정렬한다.
- 중앙: 빈 상태에서 시작하는 16:9 preview canvas.
- 하단 패널: AI가 그대로 읽을 map, class rules, prompt view.
- 우측 패널: SAM Agent Chat으로 현재 맵 리뷰, 역할 정리, 안전한 재정리 제안을 실행한다.
- SAM Agent patch는 `memo`, `finalRole`, `flex`, split `gap`, `selectedId`, preview ratio를 실제 값으로 반영한다.
- 맨 아래 Foot 영역: Undo/Redo와 최근 이벤트 히스토리를 확인한다.
- 상단 `Load Project`는 서버가 지정한 프로젝트 폴더의 저장 map을 다시 캔버스에 불러온다.
- 상단 `PNG`는 현재 캔버스를 `layout-preview.png`로 내보낸다.
- 상단 `Bundle`은 `layout-map.json`, `layout-brief.md`, `layout-preview.png`를 함께 내보낸다.
- 상단 `Save Project`는 같은 3개 파일을 서버가 지정한 프로젝트 폴더에 저장한다.
- preview ratio는 우측 상단 컨트롤에서 선택한다.
- 좌측 사이드바, 하단 AI View, 우측 Agent Chat은 드래그로 크기를 조정한다.
- 캔버스 내부 도구 dock은 기본 숨김으로 둔다.
- 선택 영역 기준 vertical / horizontal split.
- region 추가, 복제, 삭제, 다음 영역 선택.
- inspector에서 id, purpose memo, area override, flex, split gap, final role 조정.
- 주요 레이아웃 변경은 Undo/Redo로 복원한다.
- AI View에서 map, class rules, prompt snippet 확인.
- tool dock 위치를 bottom / left로 전환.
- 단축키: `V`, `H`, `A`, `D`, `Backspace`, `Tab`, `Cmd/Ctrl + E`.

## Run

SAM Agent까지 확인할 때는 로컬 프록시 서버를 사용한다. API key는 `SAM_API_KEY` 환경변수나 `.env`에서 읽으며 브라우저 코드에 넣지 않는다.

```sh
cd resources/layout-map-studio
LAYOUT_MAP_EXPORT_DIR=/path/to/project/tests/layout-map-exports LAYOUT_MAP_PROJECT_SLUG=pixel-editor node server.mjs --port 4175
```

Then open `http://localhost:4175/`.

If `4175` is already occupied, use another port:

```sh
node server.mjs --port 4176
```

정적 화면만 확인할 때는 Python 서버도 가능하다. 이 경우 Agent는 로컬 fallback으로만 응답한다.

```sh
cd resources/layout-map-studio
python3 -m http.server 4175
```

## Export Bundle
- `Export`: 현재 AI View의 map JSON을 클립보드에 복사한다.
- `Load Project`: `LAYOUT_MAP_EXPORT_DIR/{project-slug}/`에 저장된 map을 현재 캔버스로 복원한다.
- `PNG`: 현재 캔버스를 AI 확인용 이미지로 다운로드한다.
- `Bundle`: 아래 3개 파일을 내려받는다.
- `Save Project`: 아래 3개 파일을 `LAYOUT_MAP_EXPORT_DIR/{project-slug}/`에 저장한다.
- `{name}-layout-map.json`: 레이아웃 구조의 단일 원본.
- `{name}-layout-preview.png`: 영역 비율, 순서, 선택 상태를 보는 이미지.
- `{name}-layout-brief.md`: 다른 에이전트에게 줄 짧은 작업 지시.

`Save Project`의 기본 저장 위치는 도구 폴더의 `exports/{map-name}/`이다.
프로젝트별 고정 저장 위치가 필요하면 서버 실행 시 `LAYOUT_MAP_EXPORT_DIR`와 `LAYOUT_MAP_PROJECT_SLUG`를 지정한다.

## Agent Prompt Example
다른 프로젝트에서 이 결과물을 쓰게 할 때는 아래처럼 짧게 지시한다.

```md
첨부한 `layout-map.json`, `layout-preview.png`, `layout-brief.md`를 함께 사용해라.

JSON을 구조의 원본으로 삼고, PNG로 실제 화면 비율과 영역 순서를 확인해라.
brief의 class contract(`l-`, `c-`, `is-`, `u-`)를 유지하되,
실제 코드는 현재 프로젝트의 프레임워크, 디자인 토큰, 컴포넌트 규칙에 맞춰 작성해라.

먼저 한 화면만 구현하고 브라우저에서 겹침, 가로 오버플로우, 콘솔 에러를 확인해라.
```

## Check
- 캔버스와 AI View의 `layoutMap`이 같은 구조를 보여야 한다.
- split, add, duplicate, delete 후 hierarchy와 inspector가 갱신되어야 한다.
- hierarchy drag/move 후 캔버스 위치와 region id가 같이 갱신되어야 한다.
- split, inspector 편집, Agent patch 후 Foot 이벤트가 추가되고 Undo/Redo가 동작해야 한다.
- Agent의 Review, Roles, Refine 버튼이 현재 맵을 읽고 응답해야 한다.
- Agent에게 값 변경을 요청하면 허용된 patch 필드가 실제 Inspector/AI View/Canvas에 반영되어야 한다.
- Load Project 후 저장된 map의 노드 수, 선택 영역, 캔버스 비율이 복원되어야 한다.
- Area override는 Auto일 때 자동 추론을 쓰고, split에 지정하면 하위 region이 상속해야 한다.
- Purpose memo는 캔버스, Hierarchy, AI View, brief에 같이 반영되어야 한다.
- PNG와 Bundle 내보내기 후 파일명이 map name 기준으로 생성되어야 한다.
- Save Project 후 지정된 프로젝트 폴더에 JSON, brief, PNG가 생성되어야 한다.
- SAM 프록시가 없거나 실패해도 fallback 응답으로 화면 테스트가 끊기지 않아야 한다.
- 단축키가 입력 필드 포커스 중에는 실행되지 않아야 한다.
- desktop과 좁은 폭에서 버튼, dock, canvas가 겹치지 않아야 한다.
- 콘솔 에러와 가로 오버플로우가 없어야 한다.

## Keep Or Remove
- Keep: AI가 JSON map을 보고 레이아웃 수정 방향을 안정적으로 제안할 수 있을 때.
- Revise: 캔버스는 좋은데 inspector나 단축키 흐름이 느릴 때.
- Remove: 실제 프론트엔드 구현보다 도구 유지 비용이 커질 때.
