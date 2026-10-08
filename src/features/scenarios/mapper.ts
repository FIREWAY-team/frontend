import { withIntake } from "./intake-overrides";
import type { Scenario } from "./types";

/**
 * BE `/api/scenarios` 응답 항목 shape (2026-10-08 재확인 · BE Scenario 도메인 그대로).
 * ⚠️ **snake_case**. Jackson 세팅으로 이 이름 그대로 내려온다.
 * ⚠️ **intake 상세 (신고자·연락처·접수시각 등) 는 BE 에 없음** — FE `intake-overrides.ts` 에서
 *    scenarioId 로 임시 매핑. BE 확장 시 매핑 제거.
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
 * ⚠️ **`address` 없음** · UI에서 좌표 폴백으로 처리 (`formatScenarioAddress`).
 * ⚠️ **`intake` 는 BE 미제공** · `withIntake` 가 id 매핑으로 보강 (fallback 포함).
 */
export function toScenario(be: BeScenario): Scenario {
  return withIntake({
    id: be.scenario_id,
    title: be.title,
    location: { lat: be.fire_lat, lon: be.fire_lon },
    vehicleHint: be.vehicle_hint,
    address: formatScenarioAddress(be.fire_lat, be.fire_lon),
  });
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
