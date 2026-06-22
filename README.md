# SoonSoon AI Works

여러 프로젝트에서 반복해서 쓰는 AI 협업 방식, 작업환경 운영 방법, 공용 리소스를 모으는 저장소다.

## Scope
- 프로젝트를 넘어서 재사용할 수 있는 작업 방법만 업데이트한다.
- 프로젝트를 넘어서 재사용할 수 있는 템플릿과 샘플은 `resources/`에 둔다.
- 특정 프로젝트의 로그, 회의 메모, 실험 기록, 임시 결정, 비밀 정보는 넣지 않는다.
- 한 프로젝트에만 필요한 규칙은 그 프로젝트의 `AGENTS.md`나 로컬 지시 문서에 둔다.
- 한 번 써본 아이디어는 바로 승격하지 않고, 여러 프로젝트에서 반복 확인된 것만 여기에 반영한다.

## AI Work Environment Method
- 각 프로젝트 루트에는 Codex, Kiro, VS Code Copilot이 함께 읽을 수 있는 `AGENTS.md`를 단일 상시 지시문으로 둔다.
- `AGENTS.md`에는 짧고 안정적이며 실행 가능한 원칙만 남긴다.
- 도구 호환 때문에 추가 파일이 필요하면 새 원칙을 복제하지 말고 `AGENTS.md`를 가리키는 얇은 연결 파일만 둔다.
- 상세 절차는 필요할 때만 읽히는 선택형 문서로 분리하고, 기본 컨텍스트에 들어오지 않게 한다.

## Recommended Layout
- `AGENTS.md`: 프로젝트 공통 원칙과 상시 작업 지시.
- `.ai/instructions/`: 선택형 상세 지시. 필요할 때만 만든다.
- `.ai/records/`: 작업 로그, 회의 메모, 실험 기록, 히스토리. 기본 참조 대상이 아니다.
- `.ai/records/archive/`: 오래되었거나 충돌하는 지시와 기록의 보관 위치.
- `docs/`: 사용자용 또는 제품/기술 문서.
- `resources/`: 여러 프로젝트에서 다시 쓸 수 있는 템플릿, 샘플, 기준 화면.

## Context GC
- 작업을 마칠 때 새 문서와 메모를 상시 지시, 선택형 지시, 기록, 사용자 문서 중 하나로 분류한다.
- 한 번짜리 결정, 실험 결과, 대화 요약은 기록으로 두고 기본 참조하지 않는다.
- 반복해서 확인된 안정적인 규칙만 상시 지시나 이 저장소로 승격한다.
- 오래되었거나 충돌하는 지시는 먼저 archive로 보낸 뒤 필요하면 삭제한다.
- 상시 지시가 길어지면 비슷한 규칙을 합치거나 조건부 지시로 강등한다.

## Resources
- `resources/ui-template/`: 도구형 UI/UX 초기 프로토타이핑 기준 화면.
- `resources/layout-map-studio/`: UI 레이아웃을 `layoutMap` JSON, preview image, brief로 정리하는 공용 작업대.

## Agent Usage Example
다른 프로젝트에서 에이전트에게 이 저장소를 쓰게 할 때는 아래처럼 짧게 지시한다.

```md
공용 작업 기준은 https://github.com/soonsoon2/soonsoonaiworks 를 참고한다.

먼저 README.md만 읽고, 필요한 리소스의 README만 추가로 읽어라.
repo 전체를 반복해서 읽지 말고, 현재 작업에 필요한 파일만 참조해라.

UI/UX 초기 프로토타입이 필요하면 resources/ui-template/README.md를 읽고,
resources/ui-template/을 기준 화면으로 삼아 필요한 패턴만 현재 프로젝트에 맞게 가져와라.

구현 전에 화면 배치부터 정해야 하면 resources/layout-map-studio/README.md를 읽고,
layoutMap을 만든 뒤 `Bundle` 또는 `Save Project`로 `layout-map.json`, `layout-preview.png`, `layout-brief.md`를 현재 프로젝트 구현 입력으로 써라.
테스트성 프로토타입은 현재 프로젝트의 tests/ 아래에 만든다.
```

## Update Rule
- 여러 프로젝트에 적용되는 작업 방식 변화만 이 저장소에 반영한다.
- 기존 섹션을 우선 수정하고, 새 파일은 문서가 읽기 어려워졌을 때만 만든다.
- 공용 리소스는 자체 README에 실행 방법, 체크 기준, 유지/제외 기준을 둔다.
- 업데이트는 이유보다 실행 규칙을 중심으로 짧게 쓴다.
