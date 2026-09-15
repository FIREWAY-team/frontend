/**
 * 시연 시나리오 UI 계약.
 *
 * ⚠️ 정본은 BE `/scenarios` 응답 (§CLAUDE.md 시연 시나리오 데이터). 프론트에 시나리오 배열을
 *    하드코딩하지 않는다 — 시연장에서 시나리오 하나 늘리려면 BE·FE 두 곳을 고쳐야 한다.
 * ⚠️ 목 단계에서도 `mock/scenarios.ts` 시드 배열을 통해서만 접근 · 화면은 훅으로만 소비.
 */

export interface Scenario {
  /** BE 식별자 (예: `eun1-234-5`). URL·상세 조회 파라미터로 쓴다. */
  id: string;
  title: string;
  /** 화재 발생 위치 (KAKAO Map WGS84). */
  location: { lat: number; lon: number };
  /**
   * 추천 차량 id (`Vehicle.id`) — BE가 화재 규모로 판정한 힌트.
   * ⚠️ **다중 차량 로직은 팀확정 대기** (§FRONTEND_SPEC §10-9). MVP는 한 대만.
   */
  vehicleHint: string;
  /** 화면 좌측 카드에 붙는 도로명 요약. */
  address: string;
  /**
   * 접수 정보 — 상황실이 출동 확정 전 훑는 신고 컨텍스트.
   * ⚠️ 전 필드 optional. BE `/scenarios` 미제공이면 UI 가 "미확인" 폴백.
   * ⚠️ **라이브 표기 금지** — `reportedAt` 있어도 "지금 접수" 문구 금지 (§CLAUDE.md).
   */
  intake?: ScenarioIntake;
}

export interface ScenarioIntake {
  /** 신고자 표시명 — 익명 신고면 "익명". */
  reporterName?: string;
  /** 마스킹된 연락처 (예: "010-****-5678"). BE 가 마스킹해서 내려줌. */
  reporterPhone?: string;
  /** 접수 시각 (ISO8601). UI 는 "HH:mm 접수" 고정, 상대시간 금지. */
  reportedAt?: string;
  /** 소방청 3단계. 배지 색: small=blue · medium=amber · large=red. */
  severity?: "small" | "medium" | "large";
  /** 추정 화재 범위 (m²). */
  estimatedAreaM2?: number;
  /** 건물 구조 자유 문자열 (예: "5층 상가", "단독주택"). */
  buildingType?: string;
  /** 인명 피해 신고 여부. */
  casualtiesReported?: boolean;
  /** 특이사항 1줄 (예: "가스 누출 냄새"). */
  notes?: string;
}
