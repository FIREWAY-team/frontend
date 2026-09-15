import type { Scenario } from "./types";

/**
 * BE `/api/scenarios` 응답 항목 shape (`chore/domain-scaffold` 브랜치 · 2026-09-08 확인).
 * ⚠️ **snake_case**. Jackson 세팅으로 이 이름 그대로 내려온다.
 * ⚠️ 미검증 · BE `main` 병합 후 재확인. 필드 삭제·추가가 있을 수 있다.
 */
export interface BeScenario {
  scenario_id: string;
  title: string;
  fire_lat: number;
  fire_lon: number;
  vehicle_hint: string;
}

/**
 * BE 시나리오 → UI 계약.
 *
 * ⚠️ **`address` 없음** (§FE-BE 검증 리포트 §🔴). UI에서 좌표 폴백으로 처리 (`formatScenarioAddress`).
 * ⚠️ 좌표 평면(`fire_lat`·`fire_lon`) → 중첩(`location: {lat, lon}`) 변환. UI가 지도 API에
 *    전달할 때 나머지 필드와 분리해서 다루기 편하다.
 */
export function toScenario(be: BeScenario): Scenario {
  return {
    id: be.scenario_id,
    title: be.title,
    location: { lat: be.fire_lat, lon: be.fire_lon },
    vehicleHint: be.vehicle_hint,
    // BE는 `address`를 안 준다. 화면에서 좌표 폴백으로 채움.
    address: formatScenarioAddress(be.fire_lat, be.fire_lon),
  };
}

/**
 * 좌표를 사람이 읽기 좋은 한 줄로.
 *
 * ⚠️ **v0.2 임시 폴백**. Kakao Local API 리버스지오코딩은 §🔴 답변 후 결정. 진짜 주소가
 *    없더라도 카드가 비지 않게 두 번째 줄에 좌표라도 표시한다.
 */
export function formatScenarioAddress(lat: number, lon: number): string {
  return `위도 ${lat.toFixed(4)} · 경도 ${lon.toFixed(4)}`;
}
