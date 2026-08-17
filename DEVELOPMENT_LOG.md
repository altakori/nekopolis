# DEVELOPMENT LOG

## 2026-08-17 — 2D·3D 도로 교차로 및 화면 전환 강조

### 목표
- 2D와 3D에서 코너·T자·십자 교차로가 끊기거나 솟아 보이지 않게 한다.
- 게임의 핵심 차별점인 2D↔3D 상태 공유 전환을 첫 화면에서 명확히 드러낸다.

### 변경
- 2D 도로를 개별 입체 타일 중첩 대신 연속된 평면 stroke network로 렌더링한다.
- 2D 중앙선을 링크별 점선으로 바꾸고 코너·교차로 진입 전에 끊어 밝은 X/T 표시를 제거했다.
- 3D 교차로의 돌출 원형 hub를 제거하고 center pad와 연결 arm을 같은 높이로 맞췄다.
- 3D 중앙선은 직선·막다른길에만 짧게 표시하고, 연결되지 않은 변에만 연석을 배치한다.
- 2D의 `3D로 전환 / 입체 도시 체험` CTA를 고대비·대형 버튼으로 강조했다.
- 3D의 복귀 링크를 `← 2D로 돌아가기`로 명확히 구분했다.
- 1440px에서 CTA가 잘리지 않도록 상단 바의 2행 반응형 전환 기준을 1500px로 조정했다.

### 검증
- `npm test`: 87/87 통과
- `npm run typecheck`: 통과
- `npm run build`: 통과
- `git diff --check`: 통과
- 격리 QA 포트 `5172` (`npm run dev:test`)에서 1440×1000 2D·3D와 390×844 2D 렌더링 확인
- 메인 개발 서버는 `5173 --strictPort`로 고정
- 390px 모바일: CTA 영역 86×44px, 문서 가로 overflow 없음 (`scrollWidth=390`)

### 증거
- `qa-art/road-intersections-natural-2d.png`
- `qa-art/road-intersections-natural-3d.png`
- `qa-art/road-intersections-natural-mobile-2d.png`

## 2026-08-17 — 챕터 인구·생선 사료망·전 건물 업그레이드

### 게임 규칙
- 최대 고양이를 CH.1/2/3/4의 4/8/12/16으로 고정하고 회관 레벨의 중복 인원 가산을 제거했다.
- 동쪽 강변 전용 `강변 낚시터`가 생선 4를 생산하고, 사료 공장이 생선 3을 사료 3과 부산물 1로 가공한다.
- 캣닢은 사료 투입에서 제거하고 찻집의 행복·생활 수익 기호품으로만 사용한다.
- 도로·전선·수도관을 제외한 모든 건물을 LV.3까지 업그레이드할 수 있다. 코인·필수 연결·가용 노동 1명을 검사하며 노동은 즉시 복귀한다.
- 생산·전력·취수·정수·행복 효과에 LV.1/2/3 = 1.0×/1.5×/2.0× 효율을 적용했다.

### 2D·3D 표현
- 회관을 LV.1 주민 사무소, LV.2 발코니·시계 행정 회관, LV.3 좌우 동·중앙 타워·깃발 시청으로 구분했다.
- 모래 공장의 과도한 지붕을 줄이고 세척 드럼·탱크·건조 덕트·호퍼를 드러냈다.
- 낚시터에 목재 선착장, 오두막, 어망·어획 표시, 상자·통과 계류 기둥을 추가했다.
- 일반 업그레이드 건물은 절제된 레벨 배지·트림·조명·옥상 설비로 레벨을 표시한다.

### 검증
- `npm test`: 87/87 통과. 챕터 인원 상한, fish migration, 강변 배치, 생선→사료, 캣닢 보존, 전체 건물 upgradeability, 생산·전력·정수 배율을 포함한다.
- `npm run typecheck`, `npm run build`, `git diff --check`: 통과
- 1440×1000 2D·3D 상태 전환: CH.4, fishery 존재, hallLevels `[1,2,3]` 유지
- 320×568 3D: 상단 바 right=312, controls right=305, viewport/scrollWidth=320으로 잘림·가로 overflow 없음
- 390×844 2D: 3D CTA 86×44, viewport/scrollWidth=390
- 실제 회관 선택: 범용 upgrade panel, 105₩, 노동 즉시 복귀, 연결 부족 시 비활성화 확인

### 증거
- `qa-art/integrated-economy-2d-desktop.png`
- `qa-art/integrated-economy-3d-desktop.png`
- `qa-art/integrated-economy-3d-mobile-320.png`
- `qa-art/integrated-economy-2d-mobile-390.png`
