# BE 팀 전달 · 본선 (2026-10-17) 전 FE 가 임시로 메꾼 자리들

> 📌 **본선 D-9.** FE 는 상황실·상황 브리핑 재구성을 끝냈고 (develop) 지금 세 지점이 BE 응답을 기다리고 있습니다. 모두 **본선 전 결정 가능** 하면 좋고, 안 되는 건 FE 가 지금 임시로 메꾼 상태 그대로 발표 갑니다. 임시 조치가 어떤 모양인지 아래에 다 적어 둡니다.
>
> 각 항목 끝에 **임시 조치** / **원하는 BE 응답** / **차선책** 세 블록. BE 쪽에서 어떤 걸 어디까지 할 수 있는지 알려 주시면 FE 는 그에 맞춰 매퍼만 고칩니다.

---

## 1. 신고 상태 필드 (`status`) · **우선순위 상 (심사원 눈에 직접 보임)**

본선 심사에서 "접수된 신고 리스트 그대로 쌓여 있다 → 운영 중인 시스템 느낌 안 남" 이 될 수 있어 **처리 완료 신고 숨김** 이 필요합니다. 지금은 FE 가 처리 완료 여부를 모릅니다.

**임시 조치 (현재 상태)**

- `/scenarios` 응답을 그대로 전부 카드 그리드에 뿌림
- `src/features/dispatch/components/incident-list-view.tsx` · 모든 응답을 상황실에 렌더
- 처리 완료 여부 FE 안에서 판단 불가

**원하는 BE 응답**
`Scenario` DTO 에 `status: "pending" | "dispatched" | "completed"` 추가 또는 `/scenarios?status=pending` 쿼리 필터.

**차선책 (BE 수정 못 하면)**
`/scenarios/{id}/status` PATCH 1 개만. FE 가 세션 메모리에 상태 들고 있다가 다음 fetch 때 반영.

---

## 2. 신고 상세 intake 필드 · **우선순위 중 (지금 FE 가 매핑 테이블로 메꾸는 중)**

상황실 신고 카드가 보여야 하는 필드가 BE 응답에 없습니다. BE `/scenarios` 응답은 지금 `scenarioId · title · fireLat · fireLon · vehicleHint` 다섯 개뿐.

필요한 필드:

```ts
reporterName:        string;
reporterPhone?:      string;
reportedAt:          string;        // ISO8601
severity:            "small" | "medium" | "large";
estimatedAreaM2?:    number;
buildingType:        string;        // "4층 오피스텔" 같은 자유형식
casualtiesReported:  boolean;
notes?:              string;
```

**임시 조치 (현재 상태)**

- `src/features/scenarios/intake-overrides.ts` 가 `scenarioId` 를 키로 하드코딩 매핑
- 3 개 BE 시나리오 (bank-01, sangdaewon-01, moran-01) 에 수동으로 지어 넣음
- 매핑에 없는 id 는 `buildFallbackIntake()` 로 "접수 중 · 상세 정보 수신 대기"
- **문제** · BE 가 시나리오 추가하면 FE 매핑 안 업데이트되어 fallback 으로 떨어짐

**원하는 BE 응답**
위 8 개 필드를 `Scenario` DTO 에 추가. FE 는 `intake-overrides.ts` 통째로 삭제하고 매퍼 `withIntake` 만 간소화.

**차선책**
BE 데이터는 그대로 두고 `/scenarios/{id}/intake` 별도 엔드포인트. 상세 로드할 때만 호출.

---

## 3. 차량별 라우팅 응답 · **우선순위 중 (영상 보기엔 티 안 나지만 아키텍처상 중요)**

본선 "소/중/대 차량이 각각 어떤 경로로 가느냐" 가 핵심 메시지인데, 지금 FE 는 가장 큰 차량 (대형 펌프차) 기준 1 개 경로만 받아 **3 대가 같은 경로를 공유**합니다.

**임시 조치 (현재 상태)**

- `src/features/live/components/briefing-view.tsx:82` · `POST /api/route` 를 "biggest vehicle" 한 번만 호출
- 받은 경로를 소/중/대 모두에 공유 · 지도에서 1 색만 보이던 문제가 있어 **FE 가 lat 방향 ~9m 평행 오프셋** 으로 평행선처럼 그려 시각화 (PR #51)
- 실제로는 모두 같은 길을 가고 있고, 차량별 통행 가능 여부가 반영 안 됨

**원하는 BE 응답**
`POST /api/route` 에 `vehicleIds: string[]` 받고 응답에 `routesByVehicle: Record<string, RouteCandidate>` 추가. 각 차량별로 OSRM + no-go 계산.

**차선책**
`POST /api/route` 를 차량 수만큼 반복 호출. 지금 1 회 호출 시간이 8~10초라 3 회면 30초. 심사 영상 1 분 안에 못 넣음. **이건 BE 가 꼭 해 주셔야 합니다.**

---

## 4. SSE 재탐색 트리거 · **우선순위 하 (심사 시연 전용 효과 · 가짜여도 티 안 남)**

본선 핵심 어필 중 하나가 "출동 중 CCTV 가 통행 불가 감지 → 자동 재탐색" 메시지입니다.

**임시 조치 (현재 상태)**

- FE 가 애니메이션 **40 % 지점에서 자동 트리거** (briefing-view.tsx:118-135)
- 대형 펌프차 경로만 중간 좌표를 북동쪽으로 shift 해 우회 polyline 생성
- "대형 소방차 재탐색 · 중간 지점 CCTV 가 통행 불가 감지" 토스트
- 실제 CCTV 데이터와 연결 안 됨 · 시간 기반 트리거

**원하는 BE 응답**
`GET /api/dispatch/{id}/events` (SSE) 로 `{ type: "reroute", vehicleId, reason, newRoute }` push.

**차선책**
현상 유지. 심사 영상에서는 "CCTV 가 감지했다" 는 메시지가 전달되는 게 중요하지 트리거가 실제인지 가짜인지는 티 안 남. 본선 끝나고 v2 로 넘김.

---

## 5. 100m 전 도착지 CCTV · **우선순위 하 (현재 하나 재활용 중)**

**임시 조치 (현재 상태)**

- 차량이 화재 지점 100m 이내 들어오면 자동 CCTV 패널 노출
- 지금 모든 사건이 **`cctv_moran_a41` 영상 하나** 재활용 (briefing-view.tsx:441)
- `incident.id → nearest CCTV id` 매핑 없음

**원하는 BE 응답**
`Scenario` DTO 에 `arrivalCctvIds: string[]` (화점 근처 1~3 개). 또는 `GET /api/scenarios/{id}/arrival-cctv`.

**차선책**
현상 유지. 각 시연 시나리오별로 FE 가 CCTV id 하드코딩. 3~5 개뿐이라 가능.

---

## 6. '신고 받기' 테스트 버튼 · **FE 전용 · BE 조치 불필요**

상황실에 "신고 받기 (테스트용)" 버튼이 있습니다. 클릭하면 FE 로컬 state 에 가짜 신고 (`TEST_INCIDENT_POOL`, 4 종) 를 prepend 합니다. BE 로 전송 안 됨.

본선에서 심사원 앞에서 "실시간 접수 느낌" 보여주기 위한 FE 전용 데모 기능. BE 가 신고 접수 엔드포인트 (`POST /scenarios`) 를 열어 주면 이 버튼을 실제 BE 호출로 바꿀 수 있지만, **본선 범위 밖** 으로 둬도 괜찮습니다.

---

## 요약 · 본선 전 BE 가 꼭 해 줬으면 하는 것

**필수 (못 하면 FE 가 임시 조치 그대로 발표)**

- [ ] **1. `status` 필드** — 접수 → 출동 → 완료 라이프사이클. 심사원에게 "운영 중" 메시지 전달에 직접 영향.
- [ ] **3. 차량별 라우팅** — 소/중/대가 서로 다른 길 가는 게 핵심 어필인데 지금은 평행 오프셋 트릭.

**있으면 좋음**

- [ ] 2. intake 필드
- [ ] 5. 도착지 CCTV 매핑

**본선 밖**

- 4. SSE 재탐색
- 6. 신고 접수 엔드포인트

---

## FE 쪽 참조 포인트

| 임시 조치 위치         | 파일                                                              |
| ---------------------- | ----------------------------------------------------------------- |
| intake 매핑            | `src/features/scenarios/intake-overrides.ts`                      |
| 차량별 polyline 오프셋 | `src/features/live/components/briefing-view.tsx` 의 `offsetPath`  |
| 재탐색 자동 트리거     | `src/features/live/components/briefing-view.tsx:118-135`          |
| 도착지 CCTV 재활용     | `src/features/live/components/briefing-view.tsx:441`              |
| 테스트 신고 pool       | `src/features/scenarios/intake-overrides.ts` `TEST_INCIDENT_POOL` |

문의 — FE 홍근
