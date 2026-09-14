import type {
  AlternativesStatus,
  ExcludedReason,
  RouteCandidate,
  RouteRequest,
  RouteResponse,
} from "./types";

/**
 * BE `POST /api/route` 응답 shape (docs/api.md · 2026-09-14 확인).
 * ⚠️ snake_case · Jackson 세팅으로 이 이름 그대로 내려온다.
 */
export interface BeRouteResponse {
  routes: BeRouteCandidate[];
  calc_time_ms: number;
  k_effective: number;
  overlap_matrix: number[][];
  alternatives_status: AlternativesStatus;
}

export interface BeRouteCandidate {
  rank: number;
  coordinates: Array<[number, number]>;
  polyline: string;
  eta_sec: number;
  distance_m: number;
  passable_prob: number;
  meets_golden_time: boolean;
  explanation: string;
  excluded_reasons: BeExcludedReason[];
}

export interface BeExcludedReason {
  polygon_id: string;
  reason: string;
  evidence_url: string | null;
}

/**
 * BE 경로 응답 → UI 계약. snake→camel + `coordinates` 좌표 검증(성남 대략 범위).
 *
 * ⚠️ 좌표는 `[lon, lat]` 순서 그대로 유지 — 지도 컴포넌트에 넘길 때만 `toKakaoPath` 유틸로 스왑.
 *    한 곳에서만 스왑해야 좌표 순서 사고를 막는다(§dispatch-view.tsx 주석).
 * ⚠️ 잘못된 좌표(축 뒤집힘·성남 밖)는 해당 세그먼트만 버리지 않고 **후보 전체를 버린다** —
 *    지도에 이상한 선이 하나만 뜨는 것보다 그 후보를 아예 빼는 게 화면이 거짓말을 안 한다.
 */
export function toRouteResponse(be: BeRouteResponse): RouteResponse {
  return {
    routes: (be.routes ?? []).map(toRouteCandidate).filter((r): r is RouteCandidate => r !== null),
    calcTimeMs: be.calc_time_ms ?? 0,
    kEffective: be.k_effective ?? 0,
    overlapMatrix: be.overlap_matrix ?? [],
    alternativesStatus: be.alternatives_status ?? "normal",
  };
}

function toRouteCandidate(be: BeRouteCandidate): RouteCandidate | null {
  const coords = (be.coordinates ?? []).filter(
    (pt): pt is [number, number] =>
      Array.isArray(pt) &&
      pt.length === 2 &&
      typeof pt[0] === "number" &&
      typeof pt[1] === "number" &&
      // 성남 대략 범위 · 축 뒤집힘 방지 (§no-go/mapper.ts 승계)
      pt[0] > 126.8 &&
      pt[0] < 127.4 &&
      pt[1] > 37.2 &&
      pt[1] < 37.6,
  );
  if (coords.length < 2) return null;
  return {
    rank: be.rank,
    coordinates: coords,
    polyline: be.polyline,
    etaSec: Math.round(be.eta_sec ?? 0),
    distanceM: Math.round(be.distance_m ?? 0),
    passableProb: be.passable_prob ?? 1,
    meetsGoldenTime: be.meets_golden_time ?? false,
    explanation: be.explanation ?? "",
    excludedReasons: (be.excluded_reasons ?? []).map(toExcludedReason),
  };
}

function toExcludedReason(be: BeExcludedReason): ExcludedReason {
  return {
    polygonId: be.polygon_id,
    reason: be.reason,
    evidenceUrl: be.evidence_url ?? null,
  };
}

/**
 * UI 요청 → BE 요청 body. 필드명 camel→snake · `null`인 옵션은 아예 안 실어 보낸다.
 *
 * ⚠️ BE 는 옵션 필드가 `null`이면 기본값 (k=3 · overlap=0.65 · golden=300) 을 쓴다. 굳이 명시적으로
 *    `null` 보내지 말고 키 자체를 빼서 계약을 얇게 유지한다.
 */
export function toBeRouteRequest(req: RouteRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    vehicle_id: req.vehicleId,
    from: { lat: req.from.lat, lon: req.from.lon },
    to: { lat: req.to.lat, lon: req.to.lon },
  };
  if (req.k !== undefined) body.k = req.k;
  if (req.overlapThreshold !== undefined) body.overlap_threshold = req.overlapThreshold;
  if (req.goldenTimeSec !== undefined) body.golden_time_sec = req.goldenTimeSec;
  return body;
}
