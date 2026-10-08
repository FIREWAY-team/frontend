import type { Scenario } from "../types";

/**
 * 상황실 시연 시나리오 — 성남 중원구 모란·상대원·하대원 3개 화점.
 *
 * ⚠️ moran-oil-alley 좌표는 라이브 시연(성남동 4423 · A34 인접) 과 정렬. 화점이 같으니
 *    상황실 진입 시 지도에서 같은 지점을 본다.
 * ⚠️ `intake` 는 시연 컨텍스트 — BE `/scenarios` 미제공. optional 이라 실 응답에 없어도
 *    UI 가 "미확인" 폴백. 시연 화면이 항상 채워 보이도록 3개 다 값 채움.
 */
export const MOCK_SCENARIOS: Scenario[] = [
  {
    id: "moran-oil-alley",
    title: "모란 A34 인접 화재",
    address: "성남시 중원구 성남동 4423 (모란 A34 골목)",
    location: { lat: 37.43159, lon: 127.12609 },
    vehicleHint: "pump-3.5",
    intake: {
      reporterName: "이OO (인근 상인)",
      reporterPhone: "010-****-2914",
      reportedAt: "2026-09-20T14:12:00+09:00",
      severity: "medium",
      estimatedAreaM2: 45,
      buildingType: "1층 상가 (기름집)",
      casualtiesReported: false,
      notes: "가연물 다량 · 폭 2.6m 골목 진입, 좌우 적치물 신고",
    },
  },
  {
    id: "sd1-102",
    title: "상대원1동 102 상가 화재",
    address: "성남시 중원구 상대원로 45-1",
    location: { lat: 37.4291, lon: 127.1445 },
    vehicleHint: "pump-8",
    intake: {
      reporterName: "김OO (건물 관리인)",
      reporterPhone: "010-****-6017",
      reportedAt: "2026-09-20T14:18:00+09:00",
      severity: "small",
      estimatedAreaM2: 25,
      buildingType: "5층 상가 (1층 음식점)",
      casualtiesReported: false,
      notes: "튀김기 화재, 초기 진화 시도 중",
    },
  },
  {
    id: "hd-45-2",
    title: "하대원 45-2 공장 화재",
    address: "성남시 중원구 하대원로 88",
    location: { lat: 37.4342, lon: 127.1502 },
    vehicleHint: "pump-15",
    intake: {
      reporterName: "박OO (공장장)",
      reporterPhone: "010-****-7788",
      reportedAt: "2026-09-20T14:05:00+09:00",
      severity: "large",
      estimatedAreaM2: 320,
      buildingType: "1층 철골 공장 (도장 라인)",
      casualtiesReported: true,
      notes: "유증기 · 잔여 인원 2명 확인 중",
    },
  },
];
