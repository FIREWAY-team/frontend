import type { Scenario } from "../types";

/**
 * 예선 라이브 시연 시나리오 — 성남 중원구 둔촌대로69번길 8 (모란기름골목).
 * 좌표·표출문구는 팀 협의(윤종호 · 유강현) 결과 그대로.
 *
 * ⚠️ 5단계 흐름 (신고 접수 → 대로 도착 → AI 판정 → 골든레인 확정 → 대안 비교) 은 별도 인터랙션
 *    작업 필요 (URL 해시 #step=1~5 · 골목 L1~L5 오버레이 · 경로 A/B/C 비교). 지금은 좌표만 반영.
 * ⚠️ `intake` 필드는 상황실 오버레이용 시연 컨텍스트 — BE `/scenarios` 미제공. optional 이라
 *    실 응답에 없어도 UI 가 "미확인" 폴백.
 */
export const MOCK_SCENARIOS: Scenario[] = [
  {
    id: "moran-oil-alley",
    title: "모란기름골목 화재 (시연 A)",
    address: "성남시 중원구 둔촌대로69번길 8 일대 (모란기름골목)",
    location: { lat: 37.4292, lon: 127.132 },
    vehicleHint: "pump-3.5",
    intake: {
      reporterName: "이OO (인근 상인)",
      reporterPhone: "010-****-2914",
      reportedAt: "2026-09-15T14:12:00+09:00",
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
      reporterName: "익명",
      reportedAt: "2026-09-15T14:18:00+09:00",
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
      reportedAt: "2026-09-15T14:05:00+09:00",
      severity: "large",
      estimatedAreaM2: 320,
      buildingType: "1층 철골 공장 (도장 라인)",
      casualtiesReported: true,
      notes: "유증기 · 잔여 인원 2명 확인 중",
    },
  },
];
