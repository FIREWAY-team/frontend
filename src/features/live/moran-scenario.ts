/**
 * Live 시연 목적지 — **모란 A34 인접 화점**. 차량별 통행 판정이 갈리는 고정 좌표.
 *
 * ⚠️ 이전 (main #16 hotfix) · "둔촌대로69번길 2-1" · 09-18 handoff 로 갈아엎어짐.
 * ⚠️ 좌표 · Kakao Geocoder.addressSearch 로 확인된 대표점. 출입구·소방차 진입점 검증 별개.
 * ⚠️ 반경 200m 안에 CCTV 12개 · handoff `configs/moran_destination.json` 정본.
 * ⚠️ Geocoder 가 실패해도 폴백 좌표 있게 · `LIVE_DESTINATION_COORDS` 상수 병존.
 */
export const LIVE_ADDRESS = "경기 성남시 중원구 성남동 4423번지";
export const LIVE_DESTINATION_NAME = "모란 A34 인접 화점";
export const LIVE_DESTINATION_COORDS = { lat: 37.43159, lon: 127.12609 } as const;
export const LIVE_DESTINATION_RADIUS_M = 200;

export { FIRE_STATION } from "@/features/dispatch/hooks/use-backend-routes";
export type StepId = 1 | 2 | 3 | 4 | 5;
export const STEPS: StepId[] = [1, 2, 3, 4, 5];
export const STEP_TITLES = [
  "신고 접수",
  "차량별 동시 분석",
  "CCTV 통행 판정",
  "통합 경로",
  "차량별 상세",
];
export const LIVE_VEHICLES = [
  { id: "pump-3.5", label: "소형 소방차" },
  { id: "pump-8", label: "중형 소방차" },
  { id: "pump-15", label: "대형 소방차" },
] as const;
