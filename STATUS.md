# Nekopolis Foundry — 현재 상태

업데이트: 2026-08-16

## 저장소

- Repository: `https://github.com/altakori/nekopolis-foundry`
- Branch: `perf/living-city-render-budget`
- Base HEAD: `a8ee9df0d3bdbafecfd2445ad08863fdb7947d14`
- `main` 미병합
- 이 문서 작성 시점의 변경은 아직 uncommitted이며 fresh exact-snapshot review 대기 중

## 이번 변경

### 2.5D 도시와 연결성

- 모든 주요 시설을 top/left/right 면과 지붕·문·굴뚝·탱크를 갖춘 volumetric 2.5D 건물로 표현
- 고양이 귀·발바닥·수염·물고기·꼬리 motif를 구조물에 통합
- raised road, side wall, 강 위 bridge, 난간·plank·교각
- 시설을 projected depth로 정렬
- road-facing footprint edge와 road cell 사이의 midpoint를 door anchor로 사용
- 진입로와 물류 route를 footprint 중심이 아닌 visible door에 연결

### Living-city interaction

- 화물차: door→도로 BFS→door 왕복, 양 끝 하역 dwell, 이동 중에만 wheel/bob
- 고양이 주민: 연결 시설 사이 route 이동, 출입구 대기, 이동 중에만 보행 bob
- 시설 `diagnostics.online`과 연기·물 흐름·conveyor·steam·창문 activity 연동
- offline 시설 dimming, online 시설 low-cost halo
- 전력·정수 소비 시설 선택 시 관련 network 자동 강조
- 선택 건물 벽면 service riser/terminal: 연결 solid, 미연결 dashed red
- utility pulse를 segment당 복제가 아닌 network 전체 high/balanced/low `3/2/1`개로 제한
- mobile mission card 기본 compact, 44px `임무 보기/접기` toggle
- runtime reduced-motion 변경 시 continuous frame scheduling 중지

### Simulation / UI consistency

- 24×18 확장 지구 및 20×14 저장 좌표 migration
- 숙소 LV.1–3 progression과 실제 인구 기반 노동력
- utility 중간 교차/junction 연결, 전선·수도관 layer 독립
- 전력·물·노동·도로·원료 다중 warning badge
- 가용/총 전력·정수·고양이 HUD

## 검증 결과

정적/자동:

- `npm test`: 57/57 통과
- `npm run typecheck`: 통과
- `npm run build`: 통과
- `git diff --check`: 통과

Browser regression:

- `bridge-qa.cjs`: bridge 고유 stroke 4, overflow 0, console 오류 0
- `warning-network-qa.cjs`: 5종 warning stack과 utility 연결 통과
- `dorm-upgrade-qa.cjs`: LV.1→2 footprint·비용·용량 통과
- `interaction-qa.cjs`: background 30.4fps, interaction 58.3fps, active p95 29.3ms, paused drag p95 17.7ms
- `polish-qa.cjs`: stage-4 생산·배송·animation·mobile layout 통과
- `living-city-qa.cjs`:
  - mobile compact 기본
  - toggle 44px와 `aria-expanded` 전환
  - compact/expanded horizontal overflow 0
  - 선택 전력망 stroke 1→2, 강조 stroke 2, frame hash 변화
  - reduced-motion idle frame 0, pointer input 후 dirty frame 1
  - console 오류 0

Performance:

- CPU 4×·390×844 반복 측정은 host 부하에 따라 16.7–27.4fps 변동
- clean repeat에서 기존 27.4fps baseline 재현
- adaptive `low`, DPR 1.5, overflow 0

Visual evidence:

- `qa-art/living-city-mobile-compact.png`
- `qa-art/living-city-mobile-expanded.png`
- `qa-art/living-city-selected-network.png`
- 스크린샷은 로컬 evidence이며 Git commit 대상이 아님
- mobile mission occlusion 개선, service terminal/warning badge 비중첩, door apron cart 배치, release-blocking clipping 없음

## 재현 가능한 신규 QA

최종 commit에 아래 script만 강제 포함한다.

- `qa-art/bridge-qa.cjs`
- `qa-art/living-city-qa.cjs`

스크린샷과 stale reviewer manifest는 포함하지 않는다.

## 남은 절차

1. 정확한 staged tree 생성
2. cached diff SHA-256과 staged tree manifest 기록
3. clean-index checkout에서 test/typecheck/build 재검증
4. fresh independent reviewer `APPROVE`
5. topic branch commit/push
6. `main`에는 자동 merge하지 않음

Commit 형식은 `<gitmoji> type(scope): summary`이며 robot emoji는 사용하지 않는다.
