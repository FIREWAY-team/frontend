import type { Scenario, ScenarioIntake } from "./types";

/**
 * BE `/api/scenarios` 응답은 아직 `scenarioId · title · lat · lon · vehicleHint` 5개 필드뿐이다.
 * 상황실 신고 카드에서 보여줘야 하는 상세 정보(신고자·연락처·접수시각·규모·건물구조·화재범위·
 * 인명피해·특이사항) 가 BE 에 없어서, FE 가 `scenarioId` 를 키로 임시 매핑해 보강한다.
 *
 * ⚠️ **임시 조치** · BE 가 scenarios 응답에 intake 필드를 추가하면 이 파일 통째로 삭제.
 * ⚠️ 매핑에 없는 id (예: '신고 받기' 테스트 버튼으로 추가되는 가짜 신고) 는 `buildFallbackIntake` 로
 *    범용 기본값을 돌려준다. 사용자가 화면에서 "미확인" 공란을 만나지 않게.
 */

const INTAKE_BY_ID: Record<string, ScenarioIntake> = {
  "bank-01": {
    reporterName: "조OO (신고자)",
    reporterPhone: "010-****-5245",
    reportedAt: "2026-10-08T15:34:00+09:00",
    severity: "large",
    estimatedAreaM2: 242,
    buildingType: "4층 오피스텔",
    casualtiesReported: true,
    notes: "가연물 다량 · 골목 진입 어려움",
  },
  "sangdaewon-01": {
    reporterName: "박OO (상가 점주)",
    reporterPhone: "010-****-3187",
    reportedAt: "2026-10-08T15:12:00+09:00",
    severity: "medium",
    estimatedAreaM2: 85,
    buildingType: "5층 상가 (1층 음식점)",
    casualtiesReported: false,
    notes: "튀김기 발화 · 초기 진화 시도 중",
  },
  "moran-01": {
    reporterName: "이OO (인근 상인)",
    reporterPhone: "010-****-2914",
    reportedAt: "2026-10-08T14:48:00+09:00",
    severity: "medium",
    estimatedAreaM2: 45,
    buildingType: "1층 상가 (기름집)",
    casualtiesReported: false,
    notes: "가연물 다량 · 폭 2.6m 골목 진입 · 좌우 적치물",
  },
};

/**
 * BE scenario 에 intake 를 보강해 돌려준다. 매핑이 없으면 fallback intake 를 붙여
 * 카드가 빈 필드로 뜨지 않게 한다.
 */
export function withIntake(scenario: Scenario): Scenario {
  const intake = INTAKE_BY_ID[scenario.id] ?? buildFallbackIntake();
  return { ...scenario, intake };
}

function buildFallbackIntake(): ScenarioIntake {
  return {
    reporterName: "익명",
    reportedAt: new Date().toISOString(),
    severity: "medium",
    buildingType: "확인 중",
    casualtiesReported: false,
    notes: "접수 중 · 상세 정보 수신 대기",
  };
}

/**
 * '신고 받기(테스트용)' 버튼으로 상황실에 추가될 더미 신고 풀.
 * 클릭할 때마다 이 중 하나를 꺼내 리스트 맨 앞에 꽂는다.
 */
export const TEST_INCIDENT_POOL: Scenario[] = [
  {
    id: "test-sinheung-02",
    title: "신흥2동 아파트 화재",
    location: { lat: 37.4367, lon: 127.1512 },
    vehicleHint: "pump-15",
    address: "성남시 중원구 성남대로 123",
    intake: {
      reporterName: "김OO (아파트 주민)",
      reporterPhone: "010-****-9821",
      reportedAt: new Date().toISOString(),
      severity: "large",
      estimatedAreaM2: 180,
      buildingType: "15층 아파트 · 7층 세대",
      casualtiesReported: true,
      notes: "검은 연기 다량 · 세대 내 거주자 있음",
    },
  },
  {
    id: "test-geumkwang-04",
    title: "금광2동 다세대 주택 화재",
    location: { lat: 37.4452, lon: 127.1623 },
    vehicleHint: "pump-8",
    address: "성남시 중원구 금광로 44-6",
    intake: {
      reporterName: "장OO (이웃 주민)",
      reporterPhone: "010-****-1572",
      reportedAt: new Date().toISOString(),
      severity: "medium",
      estimatedAreaM2: 65,
      buildingType: "3층 다세대 · 2층",
      casualtiesReported: false,
      notes: "주차 차량 다수 · 소방차 접근 좁음",
    },
  },
  {
    id: "test-dochon-05",
    title: "도촌동 창고 화재",
    location: { lat: 37.4418, lon: 127.1685 },
    vehicleHint: "pump-15",
    address: "성남시 중원구 도촌동 234",
    intake: {
      reporterName: "익명",
      reportedAt: new Date().toISOString(),
      severity: "large",
      estimatedAreaM2: 420,
      buildingType: "1층 창고 · 철골조",
      casualtiesReported: false,
      notes: "유증기 · 폭발 위험 · 인근 작업자 대피 완료",
    },
  },
  {
    id: "test-hadaewon-06",
    title: "하대원동 음식점 화재",
    location: { lat: 37.4312, lon: 127.1498 },
    vehicleHint: "pump-3.5",
    address: "성남시 중원구 하대원로 88",
    intake: {
      reporterName: "최OO (점주)",
      reporterPhone: "010-****-6612",
      reportedAt: new Date().toISOString(),
      severity: "small",
      estimatedAreaM2: 30,
      buildingType: "2층 상가 · 1층 음식점",
      casualtiesReported: false,
      notes: "조리 중 발화 · 초기 진화 성공 추정",
    },
  },
];
