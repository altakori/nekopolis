# Nekopolis Foundry — 후속 수정 상태

업데이트: 2026-08-17

## 저장소

- Repository: `https://github.com/altakori/nekopolis-foundry`
- Branch: `feat/playable-3d-v2`
- Base HEAD: `df00b820470b4935896291d17adbeb333f39ddc1`
- `main` 미병합
- 승인된 2D 이야기·위생·주거 확장 위에서 정적 3D 비교본을 완전 플레이 가능한 별도 3D surface로 확장

## 현재 확장

- 네 계약을 폭우 뒤 강변 복구 이야기의 네 장으로 연결하고, 장 진행 track·감독 대사·구체적인 `NEXT` 행동·게임 방법 overlay를 추가했다.
- 산지 전용 모래 원석 채석장과 공정수 기반 고양이 모래 공장을 추가했다. 시민은 위생 모래를 소비하며 부족 시 행복도가 하락한다.
- 숙소 LV.1/2/3을 각각 단독 주택·발코니 빌라·고층 아파트로 다시 그렸다.
- `v2.html`은 `simulation.ts`를 2D와 함께 사용하는 완전 플레이 가능한 Three.js 버전이다. 건설·utility·계약·생산·이주·업그레이드·작업 정책·배송·저장 기능을 제공하며 `npm run dev:v2`로 5172 포트에서 실행한다. 5174는 다른 게임용으로 보존한다.
- 68/68 tests, typecheck, 2D+v2 production build, 실제 3D 도로·전선·수도관·시설·철거·저장 조작과 desktop/mobile/WebGL 브라우저 QA를 통과했다.

## 사용자 교정

1. 숙소는 최대 고양이 수가 아니라 실제 사용 가능한 고양이 수를 늘린다.
2. 회관이 `MAX CAT`을 늘린다.
3. 전체 지도를 움직일 때 발생하는 큰 FPS 하락을 제거한다.

## 구현

### 숙소와 회관 역할 분리

- 도시 max는 기본 4이며 회관 레벨당 +4로만 증가한다.
- 숙소는 max 계산에서 제외했다.
- 전력·정수·외부도로가 연결된 숙소가 실제 resident target을 제공한다.
  - LV.1: 실제 고양이 +2
  - LV.2: 실제 고양이 +4
  - LV.3: 실제 고양이 +7
- 실제 목표 인구는 `min(회관 max, 4 + online dorm resident slots)`이다.
- 회관이 없으면 연결 숙소가 있어도 기본 max 4를 넘지 않는다.
- 미연결 숙소는 실제 주민을 추가하지 않는다.
- 숙소 upgrade는 max를 직접 변경하지 않고 simulation cycle을 통해 주민과 가용 노동을 늘린다.
- UI/README/game brief의 숙소 문구는 `실제 고양이`, 회관 문구는 `최대 고양이`로 구분했다.

### Map pan FPS

기존 root cause:

- `pointermove`마다 `setPan()` 호출
- 매 event마다 React render와 geometry callback 재생성
- terrain/dynamic Canvas 반복 redraw
- pointer interaction이 full Canvas 60fps budget을 강제
- pan commit마다 `ResizeObserver`가 재등록되어 terrain이 한 번 더 redraw

수정:

- drag 중 React state를 바꾸지 않는다.
- 두 Canvas layer에 동일한 GPU `translate3d` preview를 적용한다.
- pointer-up에서 누적 delta를 `setPan()` 한 번으로 commit한다.
- commit 시 terrain/dynamic을 새 좌표로 한 번 그리고 임시 transform을 해제한다.
- `terrainLatest` ref를 사용해 ResizeObserver를 mount 시 1회만 등록한다.
- mouse·touch·pen 모두 연속 `clientX/Y` 좌표 차이를 사용한다.
- `.map-layer`에 `will-change: transform`을 적용한다.

### 첫 계약 지도 내 안내

- 실제 전력·원수 연결 판정에서 다음 행동을 파생하는 `firstContractGuide()`를 추가했다.
- 발전소→취수장 전선, 정수장 배치, 정수장 전력, 취수장→정수장 원수관, 정수 생산 관찰 순서로 안내한다.
- 연결 단계는 지도 위 시작·도착 비콘과 점선 경로를 표시하고, 배치 단계는 안쪽의 유효한 2×2 추천 footprint만 표시한다.
- 현재 필요한 건설 도구를 dock에서 강조하고 notice를 실제 다음 행동과 동기화한다.
- 정수장 계약 문구와 체크를 전력·원수의 독립 실제 판정에 맞췄다.
- Chrome의 첫 navigation `/favicon.ico` 404를 기존 오리지널 타이틀 SVG 자산으로 제거했다.

## 테스트

정적/자동:

- `npm test`: 63/63 통과
- `npm run typecheck`: 통과
- `npm run build`: 통과
- `git diff --check`: 통과
- 첫 계약 가이드 브라우저 QA: desktop/mobile × 4단계, 안내 도구 1개 강조, horizontal overflow 0, console/HTTP 오류 0

Simulation regression:

- 회관만 max를 높임
- 회관 없이 숙소만 있어도 population/max 4 유지
- 회관 LV.1 + 연결 숙소 LV.1에서 실제 고양이 6까지 증가
- 미연결 숙소는 주민을 추가하지 않음
- 숙소 LV.2에서 실제 고양이 8까지 증가하지만 max 8 유지
- 숙소 upgrade 비용·footprint·노동 요구조건 유지
- paused 구 저장은 stale dorm capacity를 폐기하고 hall level로 max를 즉시 재계산하며 population·labor도 max 이하로 정규화
- max 초과 주민은 노동 배정 전에 조정하고, 숙소 offline 퇴거는 전원이 근무 중일 때 다음 shift로 보류해 production·diagnostics·HUD의 할당 합계를 일치시킴

Dorm browser QA:

- footprint 4칸 모두 LV.2
- population `6 → 6 → 8`
- max `8 → 8 → 8`
- coin 90, power 2, water 1 비용
- inspector `실제 고양이 +2/+3`
- console 오류 0

Desktop pan QA:

- compositor transform 24회
- 두 Canvas layer transform 일치
- drag 중 terrain redraw 0
- commit terrain redraw 1
- commit latency 1ms
- transform 정상 해제
- 이동 전후 Canvas hash 변화
- console 오류 0

CPU 4× mobile touch pan QA (390×844, DPR 3 device):

- 실제 `touchStart/touchMove/touchEnd` 사용
- compositor transform 23회
- drag 중 terrain redraw 0
- commit terrain redraw 1
- commit latency 5.4ms
- main-thread 40.2%
- 29.5 FPS, adaptive `low`, Canvas DPR 1.5
- horizontal overflow 0
- console 오류 0

전체 browser regression:

- bridge QA 통과: bridge stroke 4, overflow 0
- warning/network QA 통과
- interaction QA: background 31.0fps, active 60.4fps, p95 19.9ms, paused drag p95 17.6ms
- polish QA: stage-4 animation/production/delivery/mobile layout 통과
- living-city QA: mission compact/toggle, network selection, reduced-motion 통과
- 모든 fixture console 오류 0

## 재현 가능한 QA script

Commit 대상:

- `qa-art/dorm-upgrade-qa.cjs`
- `qa-art/pan-performance-qa.cjs`
- `qa-art/mobile-pan-performance-qa.cjs`

스크린샷, 임시 exact checkout, stale review manifest는 commit하지 않는다.

## 완료된 절차

1. 최종 정적 검증과 브라우저 QA 완료
2. 의도한 7개 파일만 stage하고 worktree/index byte equality 확인
3. staged tree와 cached diff SHA-256 기록
4. clean staged-tree export에서 test/typecheck/build 통과
5. fresh independent reviewer `APPROVE`
6. 승인된 tree를 `f629122`로 commit하고 `origin/feat/guided-first-contract`에 push
7. 로컬·원격 commit SHA 일치 확인, `main` 미병합 유지

Commit 형식은 `<gitmoji> type(scope): summary`이며 robot emoji는 사용하지 않는다.
