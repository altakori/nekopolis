# UI/UX 제품 목표와 실행형 합격 계약

## 제품 목표

처음 플레이하는 사람이 별도 설명 없이 현재 목표를 이해하고, 화면의 추천 행동을 실제 게임 기능으로 수행하며, 2D와 3D 및 데스크톱·휴대폰 사이를 오가도 같은 도시를 계속 운영할 수 있어야 한다.

## 플레이어 성공 기준

1. **10초 안에 다음 행동 파악:** 현재 챕터, `NEXT`, 추천 도구가 동시에 존재하고 서로 모순되지 않는다.
2. **콘텐츠가 기능을 설명:** 전력·물·도로·노동·재료 경고는 선택한 시설의 실제 진단과 연결되고, 추천 도구는 현재 목표를 진행할 수 있는 도구다.
3. **한 도시, 두 시점:** 실제 전환 버튼으로 2D→3D→2D 이동해도 챕터, 자원, 건물, 선로, 일시정지와 작업 정책이 유지된다.
4. **폰에서도 지도 우선:** 세로 390×844와 가로 844×390에서 핵심 HUD, 지도, 임무/건설 열기, 시점 전환을 터치할 수 있고 수평 문서 넘침이 없다.
5. **행동 결과가 보임:** 버튼 클릭이나 지도 입력 뒤 저장 상태 또는 화면 상태가 실제로 바뀐다. 클릭 성공만으로 통과시키지 않는다.
6. **실패가 조용하지 않음:** 콘솔 오류, pageerror, HTTP 4xx/5xx, 잘린 핵심 제어, 저장 손실은 P0 실패다.

## 자동 검증 매트릭스

`npm run qa:uiux`는 실행 중인 지정 서버를 대상으로 다음을 검사하고 `qa-art/ui-ux-contract/`에 JSON과 스크린샷을 남긴다.

| 화면 | 뷰포트 | 필수 검증 |
|---|---:|---|
| 2D | 1440×900 | 목표/NEXT/추천 도구, 지도, 수평 넘침, 일시정지 |
| 3D | 1440×900 | 동일 목표 구조, WebGL 지도, 2D 왕복 저장 |
| 2D | 390×844 | 모바일 HUD, 지도 면적, 임무·건설 edge 제어, 36px 이상 핵심 터치 |
| 3D | 390×844 | 동일 모바일 기능, WebGL, 핵심 제어 bounds |
| 2D | 844×390 | 가로 지도 우선, 상태 유지, 임무·건설 열기 |
| 3D | 844×390 | 가로 지도 우선, 상태 유지, WebGL |

## 실행

1. 기존 메인 서버 `http://127.0.0.1:5173`을 재사용한다.
2. `npm run qa:uiux`를 실행한다.
3. 다른 서버를 검사할 때는 `NEKOPOLIS_URL=http://127.0.0.1:<port> npm run qa:uiux`를 사용한다.

검증 스크립트는 서버를 시작하거나 종료하지 않는다. 에이전트/개발자가 소유권을 확인한 서버만 사용한다.

## 판정

- 모든 자동 assertion, 테스트, typecheck, build가 통과해야 후보가 된다.
- 자동화가 통과해도 스크린샷에서 정보 위계, 겹침, 색 대비, 콘텐츠-행동 불일치가 보이면 통과가 아니다.
- 변경 후 desktop/portrait/landscape의 exact snapshot을 독립 리뷰하고 승인 전에는 병합하지 않는다.

## 귀찮음·디테일 마찰 예산

기능이 동작해도 아래 마찰이 있으면 개선 대상으로 기록한다.

1. **반복 방해:** 최초 안내는 한 화면에서 blocking dialog 1개 이하이며, `세로로 계속` 같은 선택은 저장되어 reload 때 반복되지 않는다.
2. **불필요한 단계:** 기본 루프인 `NEXT 확인 → 임무 열기 → 추천 도구 열기 → 지도 입력`에 중복 확인이나 닫기 동작을 추가하지 않는다.
3. **피드백 지연:** 임무·건설 rail과 상태 안내는 입력 후 500ms 안에 보이는 결과를 제공한다.
4. **정밀 조작 부담:** WCAG 2.2의 24×24px 최소 기준보다 엄격한 36×36px을 모바일 핵심 제어 P0로 사용한다. 주 CTA는 가능하면 44px 수준을 유지한다.
5. **시야 경쟁:** 상태 안내, 카메라 조작, 임무, 건설, inspector가 서로 겹치거나 같은 행동을 가리지 않는다. 좌표 교차 검사를 통과해도 스크린샷에서 의미상 시야를 빼앗으면 실패다.
6. **기억 부담:** `NEXT`, 추천 도구, 시설 진단을 같은 시점에 다시 찾을 수 있어야 하며 플레이어가 한 패널의 정보를 외워 다른 패널에서 추론하게 만들지 않는다.
7. **복구 가능성:** 임무·건설 패널은 같은 edge control로 즉시 닫을 수 있고, 시점 전환·회전·reload 뒤 상태를 되찾을 수 있다.

각 QA 보고서는 blocking dialog 수, panel feedback latency, 모바일 핵심 글자/target 크기, 겹침, 상태 복원 결과를 `friction` 항목에 남긴다. 자동화가 잡지 못하는 작은 불편은 desktop/portrait/landscape 스크린샷의 독립 heuristic review에서 `발견 위치 → 플레이어 비용 → 재현 → 개선안` 형식으로 기록한다.

## 외부 기준

- Nielsen Norman Group, *10 Usability Heuristics Applied to Video Games*: https://www.nngroup.com/articles/usability-heuristics-applied-video-games/
- Nielsen Norman Group, *10 Usability Heuristics for User Interface Design* (2024 review): https://www.nngroup.com/articles/ten-usability-heuristics/
- W3C, *WCAG 2.2 Understanding SC 2.5.8 Target Size (Minimum)*: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- Apple, *Human Interface Guidelines — Accessibility*: https://developer.apple.com/design/human-interface-guidelines/accessibility
