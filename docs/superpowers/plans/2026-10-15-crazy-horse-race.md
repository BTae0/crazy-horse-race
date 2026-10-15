# 엽기 경마 구현 계획

> 실행: superpowers:executing-plans (이 세션에서 직접 구현, 완료 후 독립 검토 1회)

**Goal:** 돌발 사건으로 순위가 뒤바뀌는 옆면 2D 복불복 경마 웹 게임.
**Spec:** `docs/superpowers/specs/2026-10-15-crazy-horse-race-design.md`

## Global Constraints

- 트랙 700 m, 고정 스텝 1/60초, 말 2~12마리, 시드 난수로 재현 가능
- 비밀값 하드코딩 없음, 외부 통신 없음, 한국어 UI

## Review Focus

- 말 수 경계(2, 12, 범위 밖 값 보정), 말 1마리가 먼저 도착해도 나머지 계속 진행
- 후진 사건 직후 출발선 뒤로 빠지지 않음, 같은 스텝 동시 도착의 순위 결정
- 배속/일시정지/결과 바로 보기 중 상태 꼬임, 다시 달리기 시 루프 중복
- 화면 크기 변경, localStorage 접근 불가, 말 12마리 레이아웃

## Tasks

1. 프로젝트 틀과 의존성 (완료)
2. `rng.ts`, `horses.ts` (TDD): 색 12종 고유, `clampCount`
3. `events.ts` (TDD): 10종 정의 유효성, 가중치 선택
4. `race.ts` (TDD): 완주, 재현성, 사건 발생, 경주 시간, 우승 분포, 순위 확정
5. `render/horse.ts`, `render/track.ts`, `render/renderer.ts`: 말 자세 10종 + 기본 달리기, 트랙, 카메라
6. `ui/*`, `main.ts`, `index.html`, `styles.css`: 설정, HUD, 해설, 결과
7. 검증: 전체 테스트, 빌드, Chrome 확인(데스크톱/390 px), 독립 검토 1회와 수정
