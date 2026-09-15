/**
 * 예선 라이브 시연 시나리오 데이터 — 성남 중원구 둔촌대로69번길 8 (모란기름골목).
 * 좌표 · 문구 · 5단계 흐름은 팀 협의 (윤종호 · 유강현) 결과 그대로.
 *
 * ⚠️ L1~L5 골목 좌표와 판정, 경로 A/B/C 폴리라인은 시연용 정합 좌표 (실측 아님).
 *    실측 좌표로 교체할 때 이 파일만 손보면 된다.
 */

export type StepId = 1 | 2 | 3 | 4 | 5;

export const STEP_CONFIG: Record<
  StepId,
  { center: { lat: number; lon: number }; level: number; title: string; caption: string }
> = {
  1: {
    center: { lat: 37.4292, lon: 127.132 },
    level: 4,
    title: "1단계 · 화재 발생 및 119 상황 접수",
    caption: "경기 성남시 중원구 둔촌대로69번길 8 일대 (모란기름골목) 화재 발생 및 연기 확산",
  },
  2: {
    center: { lat: 37.4305, lon: 127.1272 },
    level: 3,
    title: "2단계 · 현장 도착 · 골목 선택 딜레마",
    caption: "대로 도착 5분. 어느 골목으로?",
  },
  3: {
    center: { lat: 37.4305, lon: 127.1268 },
    level: 2,
    title: "3단계 · AI 5개 골목 판정",
    caption: "AI 판정 3초 · 각 골목을 클릭해 차량별 진입 가능 여부 확인",
  },
  4: {
    center: { lat: 37.43, lon: 127.129 },
    level: 3,
    title: "4단계 · 최적 진입 확정 (골든레인)",
    caption: "pump-3.5 확정 경로: L1 → L2 (실질 5.5분)",
  },
  5: {
    center: { lat: 37.43, lon: 127.13 },
    level: 3,
    title: "5단계 · 대안 경로 시나리오 비교",
    caption: "AI 없음 8분 · 갇힘 15분+",
  },
};

/** 화점 (모란기름골목 안쪽). */
export const FIRE_POINT = { lat: 37.4295, lon: 127.129 } as const;

/** 성남소방서 (출발). */
export const FIRE_STATION = { lat: 37.4283, lon: 127.1394 } as const;

export type Verdict = "PASS" | "UNCERTAIN" | "FAIL";
export type AlleyVerdictByVehicle = Record<"pump-3.5" | "pump-8", Verdict>;

export interface Alley {
  id: "L1" | "L2" | "L3" | "L4" | "L5";
  label: string;
  /** [lon, lat] pairs. */
  path: Array<[number, number]>;
  verdict: AlleyVerdictByVehicle;
  note: string;
}

/**
 * 5개 골목 — L1(둔촌대로 접속부) → L2(주골목) 조합이 골든레인. L3/L4/L5 는 진입 불가/UNCERTAIN.
 * 좌표는 시연용 정합 (실측 좌표로 교체 필요).
 */
export const ALLEYS: Alley[] = [
  {
    id: "L1",
    label: "L1 · 둔촌대로 접속부",
    path: [
      [127.1272, 37.4305],
      [127.1281, 37.4302],
    ],
    verdict: { "pump-3.5": "PASS", "pump-8": "PASS" },
    note: "대로에서 골목으로 진입하는 안전 접속부. 노폭 여유.",
  },
  {
    id: "L2",
    label: "L2 · 주골목",
    path: [
      [127.1281, 37.4302],
      [127.1287, 37.4298],
      [127.129, 37.4295],
    ],
    verdict: { "pump-3.5": "PASS", "pump-8": "UNCERTAIN" },
    note: "펌프차 3.5t 은 여유, 8t 는 실측 필요 (경계 폭).",
  },
  {
    id: "L3",
    label: "L3 · 기름골목 협소부",
    path: [
      [127.1281, 37.4302],
      [127.1278, 37.4308],
    ],
    verdict: { "pump-3.5": "UNCERTAIN", "pump-8": "UNCERTAIN" },
    note: "협소 구간 · 양쪽 좌판 · CCTV 판독 uncertain.",
  },
  {
    id: "L4",
    label: "L4 · 1톤 배차 불법주차",
    path: [
      [127.1281, 37.4302],
      [127.1275, 37.4298],
    ],
    verdict: { "pump-3.5": "FAIL", "pump-8": "FAIL" },
    note: "실시간 CCTV 로 1톤 트럭 불법 정차 확인 · 진입 불가.",
  },
  {
    id: "L5",
    label: "L5 · 시장 내부 통로",
    path: [
      [127.1272, 37.4305],
      [127.1272, 37.4295],
    ],
    verdict: { "pump-3.5": "FAIL", "pump-8": "FAIL" },
    note: "시장 내부 · 노점 밀집 · 소방차 진입 불가.",
  },
];

/** 3후보 대안 경로 — A(골든레인, L1→L2), B(대로 정차 후 도보), C(잘못된 골목 진입 후 후진). */
export interface AlternativeRoute {
  id: "A" | "B" | "C";
  label: string;
  color: string;
  strokeStyle: "solid" | "dash" | "shortdash";
  /** [lon, lat] pairs. */
  path: Array<[number, number]>;
  etaMin: number;
  distanceKm: number;
  verdict: "GOLDEN" | "SAFE_FALLBACK" | "STUCK";
  summary: string;
}

export const ALT_ROUTES: AlternativeRoute[] = [
  {
    id: "A",
    label: "A · 골든레인 (L1 → L2)",
    color: "#22c55e",
    strokeStyle: "solid",
    path: [
      [FIRE_STATION.lon, FIRE_STATION.lat],
      [127.135, 37.4293],
      [127.1298, 37.4302],
      [127.1281, 37.4302],
      [127.1287, 37.4298],
      [FIRE_POINT.lon, FIRE_POINT.lat],
    ],
    etaMin: 5.5,
    distanceKm: 1.5,
    verdict: "GOLDEN",
    summary: "AI 골목 판정 성공 · 골든타임 방어",
  },
  {
    id: "B",
    label: "B · 대로 정차 후 도보 진입",
    color: "#eab308",
    strokeStyle: "dash",
    path: [
      [FIRE_STATION.lon, FIRE_STATION.lat],
      [127.135, 37.4293],
      [127.1298, 37.4302],
      [127.1272, 37.4305],
    ],
    etaMin: 8,
    distanceKm: 1.2,
    verdict: "SAFE_FALLBACK",
    summary: "AI 없을 때 안전 선택 · 골든타임 초과",
  },
  {
    id: "C",
    label: "C · 잘못된 골목 진입 후 후진",
    color: "#ef4444",
    strokeStyle: "shortdash",
    path: [
      [FIRE_STATION.lon, FIRE_STATION.lat],
      [127.135, 37.4293],
      [127.1298, 37.4302],
      [127.1281, 37.4302],
      [127.1275, 37.4298],
      [127.1281, 37.4302],
    ],
    etaMin: 15,
    distanceKm: 1.4,
    verdict: "STUCK",
    summary: "L4 진입 후 갇힘 · 후진 필요 · 골든타임 소실",
  },
];
