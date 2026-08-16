# 제작 과정 — 냥토피아 공업구역

## 1. 프로젝트 목표

OpenAI GAME BUILDERS SEOUL 2026 출품을 목표로, 고양이 도시의 생활 인프라와 자동화 생산망을 함께 설계하는 브라우저 기반 2D/2.5D 도시 건설 게임을 제작한다.

핵심 소재:

- 캣닢 재배와 혼합 농장
- 사료 공장과 고양이 가구 공방
- 발전·송전, 취수·정수·배수
- 숙소·광장·행복도
- 도로와 생산 동선
- 고양이 작업자와 도시의 일상

## 2. 첫 프로토타입

첫 버전은 빠른 플레이 가능성 검증을 위해 Vite + React + TypeScript + Canvas 2D로 구현했다.

구현 범위:

- 20×14 정사각 타일 격자
- 클릭 기반 건물/도로/전선/수도관 배치
- 전력·수도 연결 판정
- 캣닢→사료, 목재→가구 생산
- 자원·행복·인구·목표 UI
- localStorage 저장
- 데스크톱/모바일 반응형 화면

복구 지점:

- Git commit: `63e983e563681a7e99c8ed9ea1a188abb98c8dab`
- Branch: `feat/nekopolis-foundry`
- 이 커밋은 private GitHub 원격에도 푸시되어 있다.

이 버전은 기능 검증에는 성공했지만, 시각적으로 작은 정사각 타일과 아이콘 중심이어서 사용자가 원하는 SimCity/Endfield 계열의 공간 설계 감각에는 부족했다.

## 3. Grok 아트 제작

사용자 요청에 따라 Grok 4.5를 이번 명령에만 격리된 1회성 아트 작업자로 사용했다. 지속 모델 라우팅은 변경하지 않았다.

제작된 오리지널 SVG:

- `public/art/cat-mascot.svg` — 안전모를 쓴 주황색 고양이 기술자
- `public/art/title-mark.svg` — 산업 배관·기어·고양이 귀 모티프 타이틀 장식

과정:

1. 건물 9종 스프라이트와 마스코트·타이틀을 한 번에 요청했다.
2. 첫 호출은 provider SSE stream이 60초 정지해 실패했다.
3. 파일 단위로 작업을 분할해 마스코트와 타이틀을 완성했다.
4. 건물 스프라이트 호출은 재차 스트림 정지하여 중단했다.
5. SVG는 XML 파싱, Chromium 래스터 변환, 시각 검토를 거쳤다.
6. 타이틀 장식의 기하학적 한글 가독성이 낮아 실제 제목은 HTML 텍스트로 별도 제공했다.
7. 두 SVG에 `<script>`와 외부 `href/src`가 없음을 검사했다.

## 4. v1 UX 개선과 검증

초기 UI가 단순하다는 피드백 이후 다음을 추가했다.

- 건설 팔레트 카테고리
- 시설 선택·관제 패널
- 전력망/수도망 오버레이
- 활동 로그와 생산률
- 도시 지령
- 시설별 절차적 Canvas 아트
- 모바일 레이아웃 수정

검증 결과:

- `npm test`: 3/3 통과
- `npm run typecheck`: 통과
- `npm run build`: 통과
- 데스크톱/390px 모바일 콘솔 오류: 0
- 수평 오버플로: 0px
- 자동 플레이 시나리오: 16개 시설·인프라 배치 및 저장 성공

독립 reviewer gate는 `REQUEST_CHANGES`를 반환했다. 도로가 전력과 수도를 전달하는 숨은 전도체로 취급되어, 전선·관로를 직접 연결한다는 게임 약속과 일치하지 않는다는 지적이었다. 병합은 중단했고 strict utility network로 수정하는 방향을 채택했다.

## 5. 구조적 재설계 결정

사용자는 v1을 “너무 픽셀 픽셀하고 저차원적”이라고 평가했고, 클릭 한 칸 배치보다 드래그 연결과 더 높은 시각적 완성도를 요청했다.

따라서 부분 스타일 수정이 아니라 다음 구조를 교체한다.

- 정사각 orthographic 타일 → 부드러운 2.5D isometric 좌표계
- 한 칸 클릭 → 마우스·터치 드래그 연속 시공
- 작은 아이콘 건물 → 다중 타일 벡터 건물과 그림자
- 빈 격자 → 강, 풀, 나무, 구획, 작업자, 운반 카트가 있는 지형
- 전선·수도관 → 흐름이 보이는 별도 오버레이
- 고정 화면 → 확대·축소·카메라 이동
- 단순 누적 → 입력·출력·병목이 보이는 자동화 생산 체인

## 6. 공식 레퍼런스 확인

외형이나 고유 UI를 복제하지 않고, 공식 1차 자료에서 시스템·UX 원칙만 추출했다.

### Arknights: Endfield 공식 사이트

- URL: https://endfield.gryphline.com/en-us
- 공식 사이트는 AIC를 장비, 배터리, 전술 아이템과 기타 재료를 효율적으로 자동 생산하는 복합 시스템으로 설명한다.
- 공식 AIC 이미지에서 넓은 시설 부지, 멀리서도 읽히는 생산 라인, 자연 지형과 산업 설비의 대비를 참고했다.

### SimCity 공식 EA 사이트

- URL: https://www.ea.com/games/simcity
- 공식 사이트는 도시가 커질수록 복잡해지고, 시민 행복과 스카이라인이 플레이어의 선택에 반응하는 점을 강조한다.
- 공식 이미지에서 강·숲·도로·고밀도 스카이라인의 계층, 도시 풍경 자체가 보상이 되는 구성을 참고했다.

적용 원칙:

1. 화면의 주인공은 HUD가 아니라 도시 풍경이다.
2. 인프라는 드래그로 빠르고 자연스럽게 설계한다.
3. 자동화 흐름과 병목은 줌아웃 상태에서도 읽혀야 한다.
4. 자연 지형과 산업 시설이 대비되어야 한다.
5. 고양이 시민의 이동과 행복이 도시 성장의 피드백이 되어야 한다.
6. 레퍼런스 게임의 에셋, 로고, 고유 UI, 명칭은 복사하지 않는다.

## 7. Git 복구 전략

중복 소스 폴더를 남기지 않고 Git 기록을 단일 복구 원장으로 사용한다.

v1 확인:

```bash
git show 63e983e
```

v1을 별도 작업 폴더로 복구:

```bash
git worktree add ../nekopolis-v1 63e983e
```

현재 작업과 v1 비교:

```bash
git diff 63e983e..HEAD
```

private 원격의 보존 브랜치 확인:

```bash
git ls-remote --heads origin feat/nekopolis-foundry
```

## 8. v2 구현과 검증 결과

구조적 재설계를 실제 코드에 반영했다.

- 2.5D 아이소메트릭 좌표 변환과 중앙 카메라 구성
- anchor 기반 2×2 footprint와 종속 셀 철거
- pointer capture와 ref 기반 연속 드래그 시공
- 시설별 벡터 실루엣, 그림자, 터빈·물류·고양이 작업자 애니메이션
- 발전 용량→취수→정수→도로·노동→농업→가공→인구·행복 순서의 결정적 시뮬레이션
- 전력·정수·도로·노동·원료 병목과 입출력·처리량 인스펙터
- 자동 저장·불러오기와 v1 저장 마이그레이션
- 일반 휠 스크롤과 `Ctrl+휠` 지도 확대 분리

최종 상호작용 테스트:

- 11/11 통과: footprint, 경계/비용, 드래그 보간, 도로 비전도, 시설 비전도, 전선/관로 분리, 무전력 정수 차단, 전력·정수 용량, 도로 접근, 사료 원료 소비, 숙소·식량 인구 제한
- TypeScript 검사 통과
- Vite production build 통과
- 데스크톱/390px 모바일 수평 오버플로 0px
- 브라우저 콘솔 오류 0건
- 일반 휠: 페이지 `0→191px`, 지도 `100%` 유지
- `Ctrl+휠`: 페이지 `0px` 유지, 지도 `100→130%`, 브라우저 배율 1.0 유지
- 실제 포인터 드래그: 연속 도로 6칸 시공, 18코인 정확히 차감
- 새로고침 후 배치·코인 상태 보존
- `Shift+클릭` 철거와 환급 확인

첫 2.5D 시각 후보도 도시가 하단에 작게 몰려 `BLOCK` 처리했다. 맵 중심과 축 비율을 재조정한 뒤 데스크톱 화면은 중앙 도시 풍경, 모바일은 지도→팔레트→인스펙터 순서로 접근 가능하도록 수정했다.

## 9. 최종 완료 조건

- [x] 드래그로 도로·전선·관로를 연속 시공할 수 있다.
- [x] 2.5D 도시가 빈 픽셀 격자보다 풍부하고 부드럽게 보인다.
- [x] 다중 타일 건물과 지형이 겹치지 않고 명확히 읽힌다.
- [x] 도로는 전력/수도 전도체로 작동하지 않는다.
- [x] 생산 체인과 병목이 관제 UI와 화면 오버레이에 일치한다.
- [x] 마우스와 터치 기반 Pointer Events를 지원한다.
- [x] 테스트, 타입 검사, 빌드, 데스크톱/모바일 브라우저 QA가 통과한다.
- [x] 독립 exact-snapshot reviewer gate의 `APPROVE`를 받았다.
- [x] private GitHub topic branch의 로컬·원격 SHA 일치를 확인했다. `main` 미병합이므로 Pages 배포는 의도적으로 실행하지 않았다.

## 10. 연속 지형 아트 패스

사용자 피드백에서 기존 지형의 개별 마름모 칸이 서로 분리돼 보이고, 강과 산이 픽셀 타일처럼 단순하다는 문제가 확인됐다. `feat/continuous-terrain`에서는 시뮬레이션 좌표계를 유지하면서 렌더링만 다음처럼 재구성했다.

- 전체 맵을 한 장의 연속된 아이소메트릭 landmass와 절벽 측면으로 렌더링
- 유휴 격자 투명도를 3.5%로 낮추고 hover/건설 중에만 22% 가이드 표시
- 취수장 옆에서 도시 가장자리를 따라 흐르는 연속 Bézier 강
- 깊은 물·얕은 물·흙 둑·수면 흐름·거품·갈대와 반사 레이어
- 여러 셀을 걸치는 산 능선, 암면 명암, 능선 하이라이트, 산기슭 관목
- 결정적 수목·바위·초지·토양 패치로 중간 크기 지형 디테일 추가
- 시설별 마름모 받침 제거, 흙/잔디 전이 패치와 접지 그림자로 교체
- 도로·전선·수도관을 지면 위 연결 스트립과 animated pulse로 복구
- 720px 이하 화면은 기본 지도 배율을 120%로 높여 터치 배치 가독성을 확보하고, 데스크톱은 100% 유지

검증:

- `npm test`: 13/13 통과
- `npm run typecheck`: 통과
- `npm run build`: 통과
- 데스크톱/390px 브라우저 콘솔 오류 0건, 실패 요청 0건, 수평 오버플로 0px
- 390px 기본 지도 배율 120%, 산·강·스타터 시설·줌 컨트롤 clipping 없음
- 시각 증거: `qa-art/continuous-terrain-desktop-final.png`, `qa-art/continuous-terrain-mobile-final.png` (Git 비추적)

## 2026-08-14 — 거시 시스템·UI 통합 리디자인

### 왜 국소 패치를 중단했는가

- 첫 화면에 자원 9개와 건설 도구 12개가 같은 중요도로 노출되어 다음 행동을 알 수 없었다.
- 390×844 첫 화면에서는 건설 도구가 하나도 보이지 않았고 지도와 팔레트가 긴 페이지로 분리됐다.
- 문서는 도시 단계와 해금을 약속했지만 실제로는 모든 시설이 처음부터 열려 있었다.
- 사료는 생산됐지만 시민이 소비하지 않아 생산망을 한 번만 돌리면 되는 죽은 경제였다.
- 2×2 건물은 보이는 footprint와 달리 앵커 셀 연결만 인정해 불공정한 단절이 발생했다.
- Canvas의 부드러운 지형, 절차적 건물, 차가운 HTML 대시보드, Grok 마스코트가 서로 다른 제품처럼 보였다.

### 채택한 통합 해법

- `docs/COHESIVE_REDESIGN.md`에 지도 우선, 점진적 복잡도, 행동-결과 직결 원칙과 실패 게이트를 먼저 고정했다.
- 기반선→첫 수확→정착→자립의 4개 단조 증가 계약과 단계별 영구 해금을 simulation에 구현했다.
- 시민은 매 생산 사이클 `ceil(인구/4)` 사료를 소비하고, 부족하면 행복과 인구가 하락한다.
- 노동의 숨은 고정 순서를 플레이어가 선택하는 균형/식량/재료 우선 교대로 노출했다.
- 취수장은 실제 동쪽 강변에서만 건설되며, 2×2 시설은 footprint 어느 면에 닿아도 연결된다.
- 3열 대시보드를 map-first command bar + 임무 overlay + 하단 dock + context inspector로 교체했다.
- Unicode 팔레트 아이콘을 동일 stroke의 인라인 SVG 아이콘으로 교체하고 Grok 마스코트를 현장 감독으로 실제 UI에 연결했다.
- 모바일은 100svh 안에서 지도·임무·건설 dock을 동시에 유지하고 주요 조작을 최소 44px로 맞췄다.

### 폐기한 대안

- 기존 9개 자원 카드와 좌우 패널을 CSS로만 미화: 정보 구조 문제를 보존하므로 폐기.
- 모든 시설을 유지한 채 추천 배지만 추가: 실제 해금과 단계감이 없어 폐기.
- 사료 재고 존재 여부만 인구 조건으로 사용: 반복 생산 병목이 생기지 않아 폐기.
- 모바일에 데스크톱 패널을 세로로 재배치: 지도와 도구가 다시 분리되어 폐기.

### 검증 기준선

- 자동 테스트 22개: 네트워크 의미, 전선·수도관 양방향 분리와 교차 endpoint 거부, 거리 가격, footprint 연결, 강변 제한, 실제 사료 소비, 단계 영속성, 노동 우선순위 포함.
- 1440×900에서 Canvas가 viewport 약 65%, 페이지 수평 overflow 0.
- 390×844에서 Canvas·임무·하단 dock이 한 화면에 있고 페이지 높이 844px, 수평 overflow 0.
- 잠긴 캣닢 밭은 계약 1에서 비활성, 잘못된 취수 위치는 강변 필요 메시지 표시.
- 실제 전선 시공 후 발전소 송전 체크와 PWR 생산량이 동일 사이클에 반영됨.
- 전선·수도관은 서로 endpoint로도 인정하지 않으며 양방향 비전도 회귀 테스트로 고정함.
- 선로는 평상시 숨기고 발전소·정수장 선택 시 연결된 동일 종류 망만 glow하며, 해당 도구 시공 중에는 저채도 preview를 표시함.
- 도로·전선·수도관 가격은 드래그 기하 거리 × 단가를 `Math.floor` 처리하며 시설 endpoint는 거리점으로만 사용함.
- 시각 증거: `qa-art/cohesive-desktop-default.png`, `qa-art/cohesive-mobile-default.png`, `qa-art/cohesive-desktop-play.png`, `qa-art/networks-hidden.png`, `qa-art/power-network-glow.png`, `qa-art/water-network-glow.png` (Git 비추적).

## 11. 도로 연결과 하천 자연화 수정

후속 플레이 피드백에서 도로가 셀마다 끊겨 보이고, 강이 굵은 외곽선과 반복 점선 때문에 인공 수로처럼 보이는 문제가 확인됐다. 렌더링의 원인을 다음처럼 수정했다.

- 도로를 셀별 짧은 가로선으로 그리지 않고 실제 상하좌우 인접 도로의 중심을 직접 연결
- 직선·코너·분기·교차로가 같은 넓은 노면 스트립을 공유하도록 변경
- 도로 셀마다 있던 타원 패드를 제거해 캡슐 체인처럼 보이던 문제 해소
- 강을 landmass 경계로 clip해 지도 밖의 둥근 stroke 끝이 보이지 않도록 변경
- 강 경로를 동쪽 저지대와 취수장 옆을 지나는 완만한 흐름으로 재설계
- 주황색에 가까운 둑과 도로 중앙선처럼 보이던 반복 수면 점선을 제거
- 굽이별 갈대·바위·드문 반사광만 남겨 자연 하천의 밀도와 방향감을 표현

검증:

- 분기 도로 QA 상태에서 모든 인접 셀의 center-to-center 연결과 코너·교차로 연속성 확인
- 데스크톱/390px 콘솔 오류 0건, 실패 요청 0건, 수평 오버플로 0px
- 일반 휠 페이지 스크롤과 Ctrl+휠 지도 확대를 분리 확인
- `npm test` 13/13, `npm run typecheck`, `npm run build`, `git diff --check` 통과
- 시각 증거: `qa-art/roads-river-connected-desktop.png`, `qa-art/roads-river-connected-mobile.png`, `qa-art/road-network-final2.png` (Git 비추적)

## 12. 직선 관로·외부 도시·고양이 회관

후속 플레이 피드백에서 관로가 타일 픽셀에 묶이고, 2×2 점유 면적과 고양이 인구/노동 구조가 불명확한 문제가 확인됐다. 다음 구조로 교체했다.

- 전선·수도관을 `grid` 점유 셀에서 별도 직선 segment graph로 이전
- 시작점과 끝점만 같은 종류 선로를 연결하며, 중간 타일·건물·반대 관로를 관통
- 기하 교차는 연결되지 않고 shared endpoint만 연결되는 네트워크 판정
- 설치 중 endpoint-to-endpoint 밝은 glow, 평상시 숨김, 시설 선택 시 해당 연결망만 glow
- 기존 grid 기반 전선·수도관 저장을 vector segment로 자동 마이그레이션
- 서쪽 경계에 철거 불가 바깥 도시 도로 관문 추가
- 관문부터 연속 연결된 도로만 시설 접근과 숙소 이주를 인정
- 현재 고양이, 최대 고양이, 가용 노동력을 별도 자원과 HUD로 분리
- 외부도로 연결 숙소마다 노동력 +2, 회관 레벨마다 최대 고양이 +4
- 고양이 회관 LV.1–3과 코인·가용 전력·정수·노동·외부도로 업그레이드 게이트
- 2×2 hover 4칸 채색, 완공 기초판, 선택 4칸 outline, 회관 레벨 표기

검증:

- `npm test`: 24/24 통과
- `npm run typecheck`: 통과
- `npm run build`: 통과
- 실제 전선 드래그: grid utility 0개, 단일 vector segment, 8 거리·16코인 정확히 차감
- 회관 UI 업그레이드: LV.1→2, 네 footprint 셀 동기화, 최대 8→12, 120코인 차감
- 데스크톱/390px 수평 오버플로 0px, 모바일 최소 버튼 44px, 콘솔 오류 0건
- 시각 증거: `qa-art/vector-wire-preview.png`, `qa-art/vector-power-glow.png`, `qa-art/hall-footprint-hover.png`, `qa-art/hall-inspector.png`, `qa-art/hall-upgraded-lv2.png`, `qa-art/vector-mobile.png` (Git 비추적)

## 13. 숙소 이주와 2×2 격자 정렬 수정

후속 실제 플레이에서 숙소를 정상 연결해도 고양이가 늘지 않고, 2×2 건물 본체가 네 점유 칸 대신 anchor 한 칸 중심에 치우쳐 보이는 문제가 확인됐다.

원인:

- 최대 고양이 수가 회관으로만 증가해, 숙소가 온라인이어도 기본 최대치 4에 막혔다.
- 2×2 건물 렌더링 중심이 anchor 좌표를 그대로 사용해 네 footprint 셀의 기하 중앙과 달랐다.
- 평상시 footprint가 너무 희미해 완공 후 점유 칸을 읽기 어려웠다.

수정:

- 숙소마다 최대 고양이 +2를 제공한다.
- 전력·정수·바깥 도시 도로가 모두 연결된 숙소는 사료 생산 전에도 숙소 보장 인구까지 이주를 시작한다.
- 사료가 있으면 숙소와 회관이 합산한 전체 최대치까지 성장한다.
- 2×2 건물 중심을 `(anchor x + 0.5, anchor y + 0.5)`로 이동한다.
- 네 칸을 감싸는 외곽선과 내부 2×2 분할선을 상시 표시하고 선택 시 강조한다.

검증:

- 자동 테스트 26/26, TypeScript 검사, production build 통과
- 실제 브라우저에서 `CATS 4→5→6`, `MAX 4→6`, `LAB 2→4` 확인
- 숙소 진단: 전력·정수·외부도로 모두 online, 콘솔 오류 0건
- 시각 증거: `qa-art/dorm-grid-alignment-final.png`, `qa-art/dorm-grid-alignment-selected.png` (Git 비추적)

## 14. 배경 지형 격자 경계 수정

2×2 footprint 정렬 후 실제 화면에서 배경 지형 격자가 땅 외곽과 반 칸 이상 어긋난 문제가 드러났다.

원인과 수정:

- 유효 셀 중심은 `x=0..19`, `y=0..13`인데 땅 외곽은 `-0.55..20.55`, `-0.55..14.55`로 과도하게 확장되어 있었다.
- 격자선이 셀 경계가 아닌 정수 좌표의 셀 중심을 통과했다.
- 지형과 격자의 공통 경계를 `x=-0.5..19.5`, `y=-0.5..13.5`로 통일했다.
- 시설을 선택한 뒤 남은 hover로 전체 격자가 켜지지 않도록, 빈 칸 배치 hover에서만 밝은 건설 격자를 표시한다.

검증:

- 자동 테스트 27/27, TypeScript 검사, production build 통과
- idle·빈 칸 hover·숙소 선택 세 상태에서 지형 외곽과 격자 정렬 비교
- 선택 상태에서는 배경 격자가 꺼지고 로컬 2×2 footprint만 유지
- 데스크톱 수평 overflow 0, 콘솔 오류 0건
- 시각 증거: `qa-art/terrain-grid-idle-fixed.png`, `qa-art/terrain-grid-hover-fixed.png`, `qa-art/terrain-grid-selected-fixed.png` (Git 비추적)

## 15. 도로·시설 UI·애니메이션 폴리시와 순환 콘텐츠

후속 요청에서 도로 이음새, 작은 시설 실루엣, 평면적인 건설/시설 UI와 부족한 후반 콘텐츠를 함께 개선했다. 기능 수를 무작정 늘리지 않고 기존 캣닢→사료, 목재→가구 체인의 surplus와 부산물이 다시 도시 생활로 돌아오도록 범위를 제한했다.

시각·UI:

- 도로를 링크별 capsule 대신 전체망 underlay→body→center highlight→junction 순서로 합성해 코너·T자·교차 이음새 제거
- 원형 받침을 footprint와 같은 isometric diamond deck으로 교체하고 건물 실루엣 확대
- 시뮬레이션 tick과 분리된 30fps Canvas 루프 추가
- 발전소 연기, 정수장 수면, 사료 호퍼, 공방 크레인, 숙소 창문, 회관 깃발, 찻집 증기, 재활용 컨베이어 애니메이션
- inspector에 상태/처리량/연결/입출력 계층과 flow meter 추가
- build dock 대비·선택 상태·카드 밀도 개선, 모바일 배송 카드를 44px action이 있는 compact strip으로 축소

콘텐츠:

- 신규 자원 `SCRAP`: 사료 공장과 가구 공방이 각 1 생산
- 재활용 공방: 부산물 3 + 전력 3 + 노동 2 → 목재 2 + 4코인
- 캣닢 찻집: 캣닢 2 + 전력 1 + 정수 1 + 노동 1 → 행복 +6 + 3코인
- 황혼 배송: 사료 3 + 가구 1 → 90코인, 12 tick cooldown과 누적 배송 횟수
- 계약 4에서 신규 두 시설과 배송을 해금하고 이전 localStorage는 신규 상태 기본값으로 마이그레이션

Grok 아트:

- 사용자 승인에 따라 `xai-oauth/grok-4.5`를 지속 route 변경 없이 격리된 1회성 아트 작업자로 사용
- 화면 진단과 오리지널 찻집·재활용 공방·배송 비콘 SVG를 생성
- `public/art/grok-content-reference.svg`는 `<script>`·외부 이미지 없이 XML/Chromium 검증 후 전체 배경 rect를 제거해 투명 reference sheet로 보존
- 런타임 Canvas는 SVG의 주전자형 찻집, 이중 컨베이어 재활용 공방, ring beacon 실루엣을 절차적으로 재해석

검증:

- `npm test`: 34/34 통과
- `npm run typecheck`: 통과
- `npm run build`: 통과
- 450ms 간 Canvas frame SHA 상이: 시뮬레이션 tick 전에도 애니메이션 갱신
- 실제 stage-4 fixture에서 찻집·재활용 공방 전력/정수/도로/노동 진단 online
- 한 교대 SCRAP `+2 생성 -3 소비 = -1`, 찻집 행복 +6, 두 시설 수익 누적
- 배송 `929→1019₩`, 사료 `19→16`, 가구 `4→3`, 배송 1회, 즉시 재배송 11 tick 남음
- 데스크톱/390×844 가로 overflow 0, 모바일 보이는 버튼 최소 44px, 브라우저 콘솔 오류 0건
- 시각 증거: `qa-art/polish-stage4-desktop.png`, `qa-art/polish-teahouse-inspector.png`, `qa-art/polish-stage4-mobile.png` (Git 비추적)

독립 exact-snapshot reviewer는 첫 검토에서 취수·정수 노동이 생산 시설 뒤에 배정되면서, 정수장 진단은 offline인데 clean-water capacity가 먼저 생기는 문제를 발견해 `REQUEST_CHANGES`를 반환했다. 자동화 취수장은 공유 노동 0, 정수장은 노동 1을 소비 시설보다 먼저 배정하고, 실제 online 정수장만 정수를 생산하도록 수정했다. 노동 부족 정수장과 하류 밭이 모두 offline이며 물·캣닢이 증가하지 않는 회귀 테스트를 추가했다.

후속 reviewer는 reduced-motion Canvas 시간이 `s.tick`에 연결되어 simulation tick마다 정지 화면이 바뀌는 문서-구현 불일치를 발견했다. reduced-motion의 animation time을 상수 0으로 분리해 실제 시간과 simulation tick 모두에서 미세 애니메이션이 완전히 고정되도록 수정했고, 1초 simulation tick을 넘기는 브라우저 frame hash 검증을 추가로 수행했다.

다음 reviewer는 Canvas와 transition이 정지해도 배송 beacon의 CSS keyframe animation이 남는 접근성 누락을 발견했다. reduced-motion media query에서 CSS animation과 transition을 모두 전역 비활성화하고, 실제 브라우저 computed style에서 배송 beacon의 `animation-name: none`을 검증하도록 gate를 강화했다.

## 2026-08-16 · 모바일 렌더 예산과 노동력 일관성 개선

실측 baseline에서 desktop은 31.3fps였지만 DPR 3·CPU 4× 모바일은 16.7fps로 하락했다. 모바일 Canvas DPR을 1.5, desktop을 2로 제한하고 정적 지형과 동적 도시를 두 Canvas layer로 분리했다. 도로·utility 연결 모델은 React render 단위로 cache하고, 1.5초 draw rate에 따라 high/balanced/low 품질을 자동 선택한다. rAF loop는 최신 draw callback을 ref로 읽어 pointer hover마다 취소·재등록하지 않는다. 평상시에는 30fps budget을 유지하지만 최근 pointer 입력 140ms 동안만 16ms interactive budget으로 전환하고, 같은 타일의 동일 drag path는 React state를 다시 만들지 않는다. paused/reduced-motion에서도 변경된 preview만 dirty frame 한 번으로 갱신한다. slow mobile은 low tier에 고정해 36ms background frame budget, 고양이 3마리, 카트 1대, utility pulse·동적 강물결 0개로 조절한다. 도로에는 인구 기반 고양이 보행자와 화물 카트를 추가하고 연결된 전선·관에는 faint trace와 흐름 pulse를 추가했다. `?perf=1`에서 FPS·quality·DPR HUD를 노출한다.

사용자 피드백으로 노동 모델을 별도 감사했다. 숙소 수가 인구와 무관하게 노동 +2를 만들던 모델을 제거하고 총 노동을 실제 population으로 계산한다. `laborUsed`와 가용 노동을 분리해 HUD는 `가용/총원`, inspector는 `배정/필요`를 표시한다. 자동화 취수장 0명·정수장 1명을 먼저 배정하고, 원료·utility가 부족한 시설은 노동을 점유하지 않는다. 같은 종류 시설은 교대마다 round-robin으로 배정하며 회관 upgrade는 현재 가용 노동을 검사하고 승인 시 표시된 전력·물·노동·코인을 모두 현재 교대 예산에서 차감한다. 온라인 숙소 하나가 미연결 숙소의 물리적 capacity까지 활성화해 유령 이주·노동을 만들던 경로도 차단했다. 구 저장은 `laborUsed=0`으로 이전하고 current-format 저장은 현재 교대 사용량을 총 노동 범위로 검증해 보존한다.

상단 자원 HUD는 `MAX CAT`으로 의미를 명확히 하고 PWR·H₂O도 LAB처럼 `가용/총용량`으로 표시한다. hover title에는 파생 사용량을 함께 제공한다(예: PWR `18/24`, `사용 6`). paused save에서도 총용량이 사라지지 않도록 검증된 rates를 round-trip하고 비정상 값은 제한한다. 전선과 전선 preview는 수도관의 청색과 즉시 구분되는 노란색 `#f2c94c` 계열로 통일했다. 생활 애니메이션은 보행 고양이의 상하 보폭·꼬리 흔들림과 운송차의 차체 진동·바퀴 회전을 추가했다. 전선은 노란 전류, 수도관은 파란 유량 marker가 연결 방향으로 흐르며, low tier에서도 network당 pulse 1개를 남겨 모바일에서 애니메이션이 완전히 사라지지 않게 했다.

검증:

- `npm test`: 51/51 통과
- `npm run typecheck`: 통과
- `npm run build`: 통과
- stage-4 desktop/mobile 기능 QA와 콘솔 오류 0건
- DPR 3 기기에서 desktop Canvas DPR 2, 390px mobile Canvas DPR 1.5
- unpaused CPU 4×·390×844·stage-4: 27.4fps, main-thread 56.0%, adaptive `low`, utility pulse 1/network
- desktop interaction QA: background 31.0fps → pointer 이동 63.7fps, active p95 21.8ms, paused drag event-to-frame p95 17.5ms, 7/7 preview frame 갱신
- production HUD fixture: PWR `18/24` (`사용 6`), H₂O `7/12` (`사용 5`), `MAX CAT 4`, power token `#f2c94c`
- 모바일 horizontal overflow 0, 보이는 버튼 최소 44px

## 2026-08-16 · 관통 utility 연결과 다중 시설 경고

전선·수도관 선분이 시설 footprint 타일 아래를 지나면 endpoint가 아니어도 해당 시설에 연결된다. source 시설도 선분 관통으로 망을 활성화할 수 있다. 같은 종류 선분끼리는 shared endpoint뿐 아니라 중간 grid cell의 겹침·교차도 junction으로 전도한다. 전선과 수도관 layer는 계속 독립이며 기존 endpoint 인접 연결도 유지한다.

단일 `!` 표식은 첫 bottleneck만 보여 여러 원인을 숨겼다. simulation diagnostics가 `power`, `water`, `labor`, `road`, `input`을 독립적으로 모두 기록하고 Canvas는 `⚡!`, `💧!`, `🐈!`, `🛣!`, `📦!` 색상 배지를 시설 옆에 수직 적층한다. 지도 상단에서는 stack 방향을 아래로 바꿔 clipping을 피한다.

검증:

- `npm test`: 51/51, typecheck, production build 통과
- browser utility fixture: 선 중간 아래 plant→feed 전력 연결, intake→purifier 원수 연결
- browser warning fixture: 5개 배지 동일 x축, 서로 다른 5개 y축, console 오류 0
- screenshot: `qa-art/warning-stack.png`에서 겹침·clipping 없이 경고 구분
- CPU 4×·390×844: 27.3fps, main-thread 69.7%, DPR 1.5, overflow 0
- interaction: 62.7fps, active p95 21.1ms, paused drag p95 18.3ms, 7/7 preview 갱신

## 2026-08-16 · 확장 마을, 숙소 progression, 주민 개체성

플레이 구역을 20×14에서 24×18로 확장했다. 기존 저장은 reset하지 않고 old-width 좌표를 새 cell anchor와 utility endpoint index로 remap한다. 확대된 world에서 건물이 작아지지 않도록 desktop/mobile 기본 zoom을 각각 120%/135%로 조정하고 pan/zoom을 유지했다.

숙소 LV.1–3 증축을 추가했다. 승인 시 코인·전력·물·가용 노동을 원자적으로 검사·차감하고 수용량은 2/4/7로 증가한다. 지도 sprite도 층수·창문·LV 표기가 함께 커진다.

첫 밝은 잔디 pass는 사용자 피드백상 과도하게 밝아 즉시 폐기하고, 중간 명도 세이지 팔레트로 내렸다. 새 24×18 지형에는 강·산·나무·꽃·울타리·밭고랑을 재배치했다. 시설 본체를 확대하고 검은 기초판은 따뜻한 돌/흙 deck으로 바꾸며 기능 pictogram을 추가했다. 고양이는 치즈태비·턱시도·회색·삼색·크림 5 profile과 안전모·목도리·우편가방·정원모자, 체형·속도 차이를 갖는다.

검증 결과:

- `npm test`: 53/53 통과
- `npm run typecheck`, `npm run build`, `git diff --check`: 통과
- legacy 20×14 save 좌표 migration 및 current 24×18 utility browser fixture: 통과
- 숙소 browser flow: LV.1→2, footprint 4칸 모두 LV.2, 90₩·전력 2·물 1·노동 1 차감, capacity +2
- warning browser fixture: 5개 배지 동일 x축·서로 다른 y축, 관통 plant→feed 및 intake→purifier 연결, console 오류 0
- CPU 4×·390×844: 27.4fps, main-thread 60.5%, adaptive `low`, DPR 1.5, horizontal overflow 0
- desktop interaction: 61.8fps, active p95 18.1ms, paused drag p95 17.8ms, 7/7 preview frame 갱신
- desktop/mobile final screenshot: 중간 명도 세이지, 밝은 기초판, 확대 시설, 경고 배지 가독성, release-blocking clipping 없음

## 2026-08-16 · Volumetric cat-city art pass

사용자 피드백에서 큰 마름모 기초판 위의 수평 facade가 지형의 isometric 축과 어긋나고 건물이 평면 아이콘처럼 보이는 문제가 확인됐다. 상시 기초판을 제거하고 선택·건설 시에만 footprint guide를 표시한다. 모든 주요 시설은 동일 광원의 top/left/right 면, 지붕, 창문, 출입구, 탱크, 굴뚝을 갖춘 prism 조합으로 재구성했다. 2×2 시설은 footprint를 실제로 점유하도록 폭을 확대했다.

도로는 shadow side→side wall→top surface→highlight 네 층으로 높이를 만들었다. 강 위 road cell은 raised deck, plank, 난간, 교각이 있는 다리로 자동 렌더링한다. 도로 연결 시설에는 입체 진입로를 만들고, 생산 관계 시설 간 BFS 도로 경로를 고양이 화물차가 왕복해 건물 입구까지 진입한다. 화물차도 body/cab/wheel이 분리된 prism 형태다.

Claude Code bounded graphics pass로 고양이 도시의 창의성을 보강했다. 고양이 귀·발바닥·수염·물고기·꼬리 motif를 floating emoji가 아닌 roof, facade, rail, tank, pipe 구조에 통합했다. 발전소·취수/정수·사료·가구·재활용·찻집·숙소·회관·광장이 각기 다른 고양이 문화와 기능을 드러내도록 유지했다.

검증 결과:

- `npm test`: 55/55 통과
- `npm run typecheck`, `npm run build`, `git diff --check`: 통과
- bridge fixture: 실제 강 횡단, raised deck·난간·교각·plank, overflow 0, console 오류 0
- utility fixture: 전선·수도관 중간 junction 전도, 전선/수도관 layer 분리, 5종 warning stack 통과
- dorm browser flow: LV.1→2와 4칸 footprint·비용·용량 회귀 통과
- desktop interaction: 61.4fps, active p95 17.9ms, paused drag p95 17.8ms, 7/7 preview 갱신
- CPU 4×·390×844: 27.3fps, main-thread 70.5%, adaptive `low`, DPR 1.5, horizontal overflow 0
- desktop/mobile screenshot: cat motif, volumetric face, warm build dock, HUD `가용고양이/마을고양이`, release-blocking clipping 없음

## 2026-08-16 · Living-city interaction과 연결성 pass

세 개의 독립 read-only 리뷰를 SimCity interaction, animation/performance, isometric connectivity 관점에서 병렬 수행했다. 공통 권고에 따라 새 actor나 particle 수를 늘리지 않고 기존 render budget 안에서 원인→행동→결과 연결을 강화했다. 시설은 raw grid index 대신 projected depth로 정렬한다. 도로와 맞닿은 footprint edge에서 실제 door midpoint를 계산하고, 진입로·화물차·주민 경로가 footprint 중심이 아니라 해당 출입구를 사용한다. 화물차는 door→도로 BFS→door를 왕복하며 양 끝에서 하역하고, 주민은 연결 시설 사이를 이동한 뒤 출입구에서 대기한다.

시설 animation 시간은 diagnostics의 `online` 상태에 연결했다. offline 시설은 silhouette과 경고를 유지하지만 연기·물 흐름·conveyor·steam·창문 activity를 멈추고 dim 처리한다. 선택한 시설이 전력·정수 소비자여도 관련 network를 자동 강조하며, 건물 벽면에는 연결 상태를 보여주는 service riser/terminal을 그린다. utility pulse는 segment마다 복제하지 않고 network 전체 high/balanced/low `3/2/1`개로 제한한다. 모바일 mission card는 기본 compact이며 44px `임무 보기/접기` control로 확장할 수 있다. reduced-motion media query 변경을 runtime에 구독해 continuous frame scheduling도 즉시 멈춘다.

검증 결과:

- `npm test`: 57/57 통과
- `npm run typecheck`, `npm run build`, `git diff --check`: 통과
- bridge, warning/network, dorm upgrade, interaction, polish browser regression fixture: 모두 통과, console 오류 0
- living-city fixture: 390×844 compact 기본, toggle 44px, `aria-expanded` 전환, compact/expanded overflow 0
- 선택 전력망 Canvas 계측: power stroke 1→2, 강조 stroke 2, 선택 전후 frame hash 변화
- reduced-motion runtime 전환: idle frame 0, pointer input 후 dirty frame 정확히 1
- desktop interaction: background 30.4fps, pointer 58.3fps, active p95 29.3ms, paused drag p95 17.7ms
- CPU 4×·390×844 반복 측정은 headless host 부하에 따라 16.7–27.4fps로 변동했으며, clean repeat에서 기존 27.4fps baseline을 재현; adaptive `low`, DPR 1.5, overflow 0
- desktop/mobile/selected-network screenshot 직접 검사: mission occlusion 개선, service terminal과 warning badge 비중첩, door apron cart 배치, release-blocking clipping 없음

## 2026-08-16 · 숙소/회관 역할 교정과 compositor pan

사용자 플레이에서 숙소가 `MAX CAT`을 늘리고 회관과 역할이 겹치는 문제를 확인했다. 현행 규칙은 이 문서의 이전 숙소-capacity 기록을 대체한다. 도시 최대 고양이는 기본 4에서 시작해 회관 레벨당 +4로만 증가한다. 전력·정수·외부도로가 연결된 숙소는 회관 최대치 안에서 LV.1/2/3별 실제 고양이 +2/+4/+7의 주민 목표를 제공한다. 숙소 증축은 최대치를 바꾸지 않으며 simulation cycle을 거쳐 실제 주민과 가용 노동이 증가한다. 미연결 숙소와 회관 없는 숙소는 추가 주민을 만들지 않는다.

지도 pan의 FPS 하락은 `pointermove`마다 `setPan()`을 호출해 React render, geometry callback 재생성, terrain/dynamic Canvas redraw가 연쇄된 것이 원인이었다. drag 중에는 React state를 바꾸지 않고 두 Canvas layer에 동일한 GPU `translate3d` preview를 적용한다. pointer-up에서 누적 delta를 한 번 commit하고 새 좌표로 terrain/dynamic을 다시 그린 뒤 transform을 해제한다. mouse·touch·pen에서 `movementX/Y` 대신 연속 `clientX/Y` 차이를 사용한다. `ResizeObserver`도 renderer ref를 읽는 mount-once 구조로 바꿔 pan commit 때 중복 terrain redraw가 발생하지 않게 했다.

검증 결과:

- `npm test`: 60/60 통과
- `npm run typecheck`, `npm run build`, `git diff --check`: 통과
- 숙소 browser flow: LV.1→2, 실제 population `6→6→8`, max `8→8→8`, footprint 4칸 LV.2, console 오류 0
- paused 구 저장 migration: stale dorm capacity를 폐기하고 hall level로 max를 즉시 재계산하며 population·labor도 max 이하로 정규화
- max 초과 주민은 노동 배정 전에 조정하고, 숙소 offline으로 목표가 낮아져도 모든 주민이 근무 중이면 퇴거를 다음 shift로 보류해 생산·시설 diagnostics·HUD 노동 합계를 일치시킴
- desktop pan: compositor transform 24회, drag 중 terrain redraw 0, commit redraw 1, commit latency 1ms
- CPU 4×·390×844 touch pan: compositor transform 23회, drag 중 terrain redraw 0, commit redraw 1, commit latency 5.4ms, main-thread 40.2%, 29.5fps, adaptive `low`, DPR 1.5, overflow 0
- bridge, warning/network, interaction, polish, living-city browser regression: 모두 통과, console 오류 0
- desktop interaction: background 31.0fps, pointer 60.4fps, active p95 19.9ms, paused drag p95 17.6ms

## 2026-08-16 · guided first-contract onboarding

첫 계약에서 플레이어가 연결 순서를 추측하지 않도록 실제 `utilityConnected`/`facilityServed` 결과에서 다음 안내 단계와 추천 정수장 footprint를 파생했다. 단계는 발전소→취수장 전선, 정수장 배치, 정수장 전력, 취수장 원수관, 깨끗한 물 관찰 순서이며, 미션 문구도 정수장에 전력과 원수가 모두 필요하다는 시뮬레이션 규칙과 일치시켰다. 지도에는 저대비 점선 경로와 시작/도착 beacon을 그리되 reduced-motion에서는 정적인 표시만 사용한다. 도구 카드는 현재 단계의 도구만 시각 강조하고 자동 선택하지 않는다.

버린 대안은 UI에 별도 connectivity boolean을 저장하는 방식과 고정된 “전선을 선택하세요” notice를 유지하는 방식이다. 둘 다 실제 배선·시설 상태와 어긋날 수 있어 채택하지 않았으며, 폐기한 prototype 코드는 남기지 않았다.

검증 결과:

- `npm test`: 63/63 통과
- `npm run typecheck`: 통과
- `npm run build`: 통과
- `git diff --check`: 통과
- 데스크톱·모바일에서 전선, 정수장 배치, 정수장 전력, 원수관의 4개 안내 단계를 검증했다. 각 단계의 안내 도구는 정확히 1개만 강조됐고 horizontal overflow와 console/HTTP 오류는 0이었다.
- reduced-motion에서는 애니메이션 없이 정적 beacon·경로·추천 footprint가 유지됐다.

## 2026-08-17 · 이야기·위생 생산망·주거 리디자인과 3D 비교본

첫 계약 안내 이후에도 플레이어가 왜 시설을 짓는지 이해하도록 네 계약을 폭우 뒤 강변 복구 이야기의 네 장으로 재구성했다. 임무 카드에는 장 진행 track, 현장 감독 먀오의 짧은 이야기, 완료 개수, 현재 행동 하나만 표시하는 `NEXT`를 넣고 별도 게임 방법 overlay를 추가했다. 전체 체크리스트만 먼저 보여 주는 방식은 대시보드처럼 느껴져 폐기했다.

정착 단계에는 북쪽 산기슭에서만 배치할 수 있는 모래 원석 채석장과, 전력·정수·도로·노동을 사용해 원석을 세척·건조하고 위생 모래와 부산물을 만드는 고양이 모래 공장을 추가했다. 시민은 사료와 별개로 위생 모래를 소비하며 부족 시 행복도가 떨어진다. 광맥 위치를 임의 자원 boolean으로 저장하는 대신 지도 좌표와 실제 2×2 footprint·도로·utility 판정에서 생산 상태를 파생한다.

건물 아트는 현대 수처리 시설의 낮은 녹색 매스·필터 루버·식재 지붕과 현대 산업 건물의 톱니형 채광 지붕·사일로를 참고해 아이소메트릭 형태를 세분화했다. 숙소는 단순 높이 변화 대신 LV.1 단독 주택(경사지붕·현관), LV.2 빌라(3층·발코니·옥상정원), LV.3 아파트(고층·반복 발코니·옥상 태양광)로 완전히 다른 실루엣을 사용한다.

본편 교체 위험을 피하기 위해 Three.js 비교본은 `v2.html`과 `src/v2.ts`에 격리했다. `npm run dev:v2`가 다른 게임과 충돌하지 않는 5172 포트에서 WebGL 장면을 띄우며 산지 채석→세척·건조→생활 위생 흐름과 주택·빌라·아파트 버튼 전환을 제공한다. 5174는 다른 게임용으로 보존하며, 폐기한 중간 prototype은 현재 파일에 남기지 않는다.

검증 결과:

- `npm test -- --run`: 67/67 통과
- `npm run typecheck`: 통과
- `npm run build`: 2D와 v2 multi-page production build 통과
- Playwright installed Chrome QA: desktop 2D initial/story/help, stage 3 sanitation/housing, 390×844 mobile, desktop WebGL v2 통과
- 2D desktop/mobile horizontal overflow 0, `게임 방법` 모바일 접근 가능, v2 WebGL context 확인, console/page/HTTP 오류 0

## 2026-08-17 · 3D v2 전체 게임 기능 이식

정적인 건물 비교 장면은 실제 플레이 판단에 충분하지 않다는 사용자 피드백에 따라 폐기하고, 3D를 `simulation.ts`의 두 번째 완전한 화면으로 재구성했다. 2D와 규칙을 복제하지 않고 같은 `State`, `step`, `build`, `buildLinear`, `bulldoze`, 시설 진단, 회관·숙소 증축, 작업 정책, 황혼 배송, mission/guide 함수를 직접 사용한다. 3D 저장 키는 `nekopolis-v2-save`로 분리하고 기존 `nekopolis-save`를 명시적으로 복사하는 기능만 제공해 비교 플레이 중 2D 진행을 손상하지 않는다.

Three.js scene adapter는 24×18 지형·강·산지 광맥, 모든 시설 종류, utility segment, 가동/경고 beacon, 선택 ring, 유효/무효 footprint ghost, 첫 계약 시작·도착 guide beacon을 상태에서 재구성한다. 좌클릭 시설 배치, 좌클릭 드래그 도로·전선·수도관, 우클릭 카메라 회전, 휠 확대, 인스펙터 철거·증축을 구현했다. 모바일에는 도움말과 `↶ ⌂ ↷ − ＋` 카메라 버튼을 유지하고 horizontal overflow를 제거했다.

UI에는 4장 mission/NEXT, 전체 자원·변화량, pause/speed, 추천·기반망·생산·생활 도구, 해금 상태, 작업 정책, 시설 병목·연결·투입·산출, 황혼 배송, 저장·2D 가져오기·초기화를 연결했다. 폐기된 정적 v2 장면은 현재 파일에 남기지 않고 Git 기록으로만 복구한다.

Reviewer 피드백 이후 paused/imported 저장도 자원을 소비하거나 tick을 진행하지 않고 다음 교대 기준 diagnostics를 재계산하도록 보강했다. 4장의 사료·위생 모래·자립 유지 NEXT를 구체적인 행동으로 확장하고, 회관·숙소 증축 카드에 코인·전력·정수·노동·증가량 전체를 표시한다. 취수장에는 잘못된 정수관 상태를 표시하지 않으며 모바일 도움말 안에서 수동 저장과 2D 가져오기에 접근할 수 있다.

검증 결과:

- `npm test -- --run`: 68/68 통과
- `npm run typecheck`: 통과
- `npm run build`: 2D와 playable v2 multi-page production build 통과
- Installed Chrome 실조작: 도로 4칸 드래그, 전선·수도관 segment, 정수장 배치·선택·철거·재배치, 작업 정책, 저장 재로드·2D 가져오기, 4장 사료/모래 NEXT, 진단 복원, 취수장 label, 전체 증축 요구량 통과
- Desktop 1440×960 및 mobile 390×844 WebGL context, horizontal overflow 0, console/page/HTTP 오류 0

## 2026-08-17 · 2D/3D utility와 노동 생명주기 polish

장시간 자체 검수 요청에 따라 공통 simulation부터 두 화면의 입력·표현·회귀 QA까지 다시 점검했다. 순간 완료형 회관·숙소 증축이 `laborUsed`에 노동을 남겨 paused 상태에서 영구 점유처럼 보이던 원인을 제거했다. 노동은 업그레이드 가능 여부를 검사할 때만 필요하며 승인 즉시 전원 복귀한다.

전선·수도관은 다른 칸까지 드래그해야 하고 여러 선분이 이미 완전히 덮은 경로도 거부한다. 같은 종류 선로의 중간 교차점을 정식 junction으로 통일하고, 공급원에서 도달 가능한 활성 선로 칸을 공통 simulation 함수로 계산한다. 기존 선로를 일부 따라 연장하면 새 edge만 과금하며, 잘못 그은 선은 선로 위 칸을 선택해 가장 최근 선분 하나만 철거하고 남은 망에서 다시 계산한 고유 edge 시공비의 35%를 회수한다. 2D에는 유효/무효 preview·선택 marker·network legend를, 3D에는 고립망 색·전봇대/수도 밸브/junction·endpoint preview·선택 ring을 추가했다.

후속 독립 감사에서 3D occupied-cell 선택 분기가 utility drag보다 먼저 실행되는 문제를 찾아, 시설 위 drag는 선로 시작으로 처리하고 같은 위치 tap은 inspector 선택으로 분기했다. resource-only simulation tick은 grid·utility·online diagnostics·선택·guide signature가 바뀌지 않으면 `V2Scene.sync()`를 건너뛰며, pointer picking용 Raycaster/Vector2를 재사용한다. 거부된 전체 drag preview는 다음 pointer 이동 또는 tool 변경까지 유지한다. canvas에는 접근성 이름과 방향키·확대/축소·Home keyboard camera 조작을 추가했다.

검증 결과:

- `npm test -- --run`: 73/73 통과
- 회관·숙소 실제 UI 증축 후 `laborUsedDelta: 0`
- 2D/3D 선분 1개 철거, 고유 edge 기준 35% 환급, 완전 중복·단일칸 선로 차단, 겹친 연장 선로의 새 edge 과금 통과
- 2D desktop pan commit 3.2ms; 4× CPU-throttled mobile commit 13.2ms, overflow 0
- 3D desktop/mobile WebGL, 실제 touch 건설, save/import, 콘솔·page·HTTP 오류 0
- 3D 시설 위 전선 drag, utility-tool 시설 tap 선택, resource-only tick scene rebuild 0, keyboard camera 조작 통과
- 2D 320×568 short viewport: horizontal/vertical scroll 0, board 195px, dock bottom 568px
- 3D utility stress(전선 17선·수도관 20선): 60.33 FPS, 최대 frame gap 17.1ms, overflow 0, 오류 0
- 노후 QA의 4174 고정 의존을 5173 기본값과 `NEKOPOLIS_URL` override로 교체했다. 브라우저는 `NEKOPOLIS_BROWSER_PATH` override, 존재하는 Windows 표준 Chrome, Playwright 기본 브라우저 순으로 선택해 로컬 재현성과 Linux/macOS/CI portability를 함께 보존한다.
