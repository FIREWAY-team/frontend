/**
 * 상황 브리핑 상수 · 색상 · 규모→차량 매핑 · 애니메이션 타이밍.
 *
 * ⚠️ **차량별 색상 (Q4 확정 2026-10-08)** · 소형 파랑 · 중형 노랑 · 대형 빨강.
 * ⚠️ **애니메이션 1분 기준** · 심사 데모 영상 60초 안에 전체 흐름이 들어가야 함.
 * ⚠️ **차량별 라우팅은 BFF `VEHICLE_ROUTE_PROFILE` 이 처리** (§#54 BE 팀장 2026-10-08).
 *    차량마다 `/api/route` 를 Promise.all 로 병렬 호출하면 서로 다른 OSRM 경로가 나온다.
 * ⚠️ **배정은 4대 그대로, 같은 길이면 같은 색** · 중형·대형·굴절이 같은 길(a1·a41 이 같은 도로 위)이어도
 *    차량을 빼지 않는다. 지도·카드에서는 `routeLeaders` 로 묶어 한 색 · 한 선으로 그린다.
 */

export const VEHICLE_COLOR: Record<string, string> = {
  "pump-3.5": "#3b82f6", // 소형 · 파랑
  "pump-8": "#eab308", // 중형 · 노랑
  "pump-15": "#ef4444", // 대형 · 빨강
  "aerial-25": "#9333ea", // 굴절 · 보라 (혹시 쓰일 때)
};

export const VEHICLE_LABEL: Record<string, string> = {
  "pump-3.5": "소형 소방차",
  "pump-8": "중형 소방차",
  "pump-15": "대형 소방차",
  "aerial-25": "25m 굴절차",
};

export const VEHICLE_SHORT: Record<string, string> = {
  "pump-3.5": "소형",
  "pump-8": "중형",
  "pump-15": "대형",
  "aerial-25": "굴절",
};

const ALL_VEHICLES = ["pump-3.5", "pump-8", "pump-15", "aerial-25"];

/**
 * 신고 규모별 출동 차량 조합. 중·대 규모는 관할 4대 전부, 소규모는 소형 1대.
 * 같은 길로 가는 차량을 여기서 빼면 배정 자체가 줄어 보인다 — 묶음은 `routeLeaders` 가 한다.
 */
export function vehiclesForSeverity(severity: "small" | "medium" | "large" | undefined): string[] {
  if (severity === "large" || severity === "medium") return ALL_VEHICLES;
  return ["pump-3.5"];
}

/** 같은 묶음 안에서 대표로 세울 차량 순서. 재탐색·색 규칙이 소형(파랑)·대형(빨강) 기준이다. */
const LEADER_PRIORITY = ["pump-3.5", "pump-15"];

type Coords = ReadonlyArray<readonly [number, number]>;

/**
 * 두 경로가 사실상 같은 길인가. 경유지가 같은 도로 위 다른 점이면 OSRM 좌표가 한두 점만 다르다
 * (중형 a1 · 대형 a41 이 정확히 이 경우). 점 개수가 같고 ~10m 넘게 다른 점이 2개 이하면 같은 길.
 */
function sameRoute(a: Coords, b: Coords): boolean {
  if (a.length !== b.length) return false;
  let differ = 0;
  for (let i = 0; i < a.length; i++) {
    const [ax, ay] = a[i]!;
    const [bx, by] = b[i]!;
    if (Math.abs(ax - bx) > 1e-4 || Math.abs(ay - by) > 1e-4) differ++;
    if (differ > 2) return false;
  }
  return true;
}

/**
 * 차량 → 같은 길 묶음의 대표 차량. 같은 대표를 가진 차량은 한 색 · 한 선으로 그린다.
 * 대표는 묶음에 소형·대형이 있으면 그 차량, 없으면 배정 순서상 첫 차량. 경로가 없으면 자기 자신.
 */
export function routeLeaders(
  vehicles: string[],
  routes: Record<string, { coordinates: Coords } | null | undefined>,
): Record<string, string> {
  const groups: string[][] = [];
  for (const vid of vehicles) {
    const coords = routes[vid]?.coordinates;
    const group =
      coords &&
      groups.find((g) => {
        const other = routes[g[0]!]?.coordinates;
        return other && sameRoute(coords, other);
      });
    if (group) group.push(vid);
    else groups.push([vid]);
  }
  const leaders: Record<string, string> = {};
  for (const group of groups) {
    const leader = LEADER_PRIORITY.find((v) => group.includes(v)) ?? group[0]!;
    for (const vid of group) leaders[vid] = leader;
  }
  return leaders;
}

/** 애니메이션 전체 지속 시간 (ms). */
export const ANIMATION_TOTAL_MS = 60_000;

/** 애니메이션 틱 간격 (ms). */
export const ANIMATION_TICK_MS = 100;

/** SSE 재탐색 트리거 시점 (전체 애니메이션 중 몇 % 지점). · 대형 펌프차에만 적용. */
export const REROUTE_TRIGGER_RATIO = 0.4;

/** 도착지 CCTV 를 노출하는 거리 (m). · 각 차량이 이 거리 안에 들어오면 자동 표시. */
export const ARRIVAL_CCTV_RADIUS_M = 100;
