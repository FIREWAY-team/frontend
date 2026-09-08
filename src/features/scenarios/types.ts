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
}
