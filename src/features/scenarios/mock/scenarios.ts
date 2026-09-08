import type { Scenario } from "../types";

/**
 * 목 시나리오 — 성남 중원구 3개 동.
 * ⚠️ 좌표는 중원구 실제 좌표대에서 뽑았다 (WGS84). 지도 초기 진입 시 이 값들이 화면 내에
 *    들어와야 한다.
 * ⚠️ **"지금 접수됨" 같은 라이브 문구를 붙이지 않는다** (§CLAUDE.md).
 */
export const MOCK_SCENARIOS: Scenario[] = [
  {
    id: "eun1-234-5",
    title: "은행1동 234-5 주택 화재",
    address: "성남시 중원구 은행로 12-3",
    location: { lat: 37.43, lon: 127.14 },
    vehicleHint: "pump-8",
  },
  {
    id: "sd1-102",
    title: "상대원1동 102 상가 화재",
    address: "성남시 중원구 상대원로 45-1",
    location: { lat: 37.4291, lon: 127.1445 },
    vehicleHint: "pump-3.5",
  },
  {
    id: "hd-45-2",
    title: "하대원 45-2 공장 화재",
    address: "성남시 중원구 하대원로 88",
    location: { lat: 37.4342, lon: 127.1502 },
    vehicleHint: "pump-15",
  },
];
