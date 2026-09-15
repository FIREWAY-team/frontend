import type { Scenario } from "../types";

/**
 * 예선 라이브 시연 시나리오 — 성남 중원구 둔촌대로69번길 8 (모란기름골목).
 * 좌표·표출문구는 팀 협의(윤종호 · 유강현) 결과 그대로.
 *
 * ⚠️ 5단계 흐름 (신고 접수 → 대로 도착 → AI 판정 → 골든레인 확정 → 대안 비교) 은 별도 인터랙션
 *    작업 필요 (URL 해시 #step=1~5 · 골목 L1~L5 오버레이 · 경로 A/B/C 비교). 지금은 좌표만 반영.
 */
export const MOCK_SCENARIOS: Scenario[] = [
  {
    id: "moran-oil-alley",
    title: "모란기름골목 화재 (시연 A)",
    address: "성남시 중원구 둔촌대로69번길 8 일대 (모란기름골목)",
    location: { lat: 37.4292, lon: 127.132 },
    vehicleHint: "pump-3.5",
  },
  {
    id: "sd1-102",
    title: "상대원1동 102 상가 화재",
    address: "성남시 중원구 상대원로 45-1",
    location: { lat: 37.4291, lon: 127.1445 },
    vehicleHint: "pump-8",
  },
  {
    id: "hd-45-2",
    title: "하대원 45-2 공장 화재",
    address: "성남시 중원구 하대원로 88",
    location: { lat: 37.4342, lon: 127.1502 },
    vehicleHint: "pump-15",
  },
];
