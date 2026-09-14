import type { Scenario } from "../types";

/**
 * 목 시나리오 — BE seed 3건과 동일한 id·좌표 (§backend V1_1__scenarios_fixture.sql).
 *
 * ⚠️ **BE seed 와 id 를 맞춘다** — `useRealRoutes` 가 destination 좌표를 훅에 넘길 때,
 *    BE 응답이 오든 mock 폴백이 뜨든 같은 id 로 조회되게 한다.
 * ⚠️ 좌표는 BE seed 값 그대로 (검증됨).
 * ⚠️ **"지금 접수됨" 같은 라이브 문구 금지** (§CLAUDE.md).
 * ⚠️ address 는 BE 미제공 · 매퍼가 좌표 폴백으로 채운다 (§scenarios/mapper.ts). mock 은 임시 문구.
 */
export const MOCK_SCENARIOS: Scenario[] = [
  {
    id: "bank-01",
    title: "은행1동 화재",
    address: "성남시 중원구 은행1동",
    location: { lat: 37.4381, lon: 127.1422 },
    vehicleHint: "pump-3.5",
  },
  {
    id: "sangdaewon-01",
    title: "상대원1동 화재",
    address: "성남시 중원구 상대원1동",
    location: { lat: 37.4311, lon: 127.1642 },
    vehicleHint: "pump-8",
  },
  {
    id: "moran-01",
    title: "모란시장 화재",
    address: "성남시 중원구 성남동 · 모란시장",
    location: { lat: 37.4324, lon: 127.1299 },
    vehicleHint: "pump-3.5",
  },
];
