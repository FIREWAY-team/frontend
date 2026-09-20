import { NextResponse } from "next/server";

import { fetchCctvMarkers } from "@/features/cctv/api";
import { fetchRoutePlan, fetchRoutes } from "@/features/dispatch/api";
import type { ExcludedReason, RouteCandidate } from "@/features/dispatch/types";

/**
 * `/api/route` — 브라우저 fetch 프록시.
 *
 * ⚠️ **BE 우선 · OSRM 은 primary geometry 보정** (2026-09-20 정정) — 이전엔 BE 3초 timeout
 *    으로 감싸 대부분 폴백만 반환했고 결과적으로 UI 가 후보 1개·assessments 0 만 봤다.
 *    이번엔 BE 를 8초까지 기다려 후보 여러 개 + CCTV assessments 를 소스로 삼는다.
 * ⚠️ **OSRM 은 primary geometry 만 덮어씀** — BE 가 자체 라우터로 낸 좌표가 mock/폴백일 때
 *    지도 라인이 어색해지는 걸 막는다. 2 순위 이상은 BE 의 unlocked-by-CCTV 경로 그대로.
 * ⚠️ BE 가 응답 못 주거나 빈 결과 → OSRM 결과를 그대로 반환 (기존 폴백 동작).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const OSRM_URL = "https://router.project-osrm.org";

/**
 * 차량별 시연 경로 프로파일.
 *
 * ⚠️ **여기 값은 BE 3층 판단이 아니라 시연용 데코레이션이다.** BE 가 BE_MAX_WAIT_MS 안에
 *    응답하면 BE 값이 쓰이고, 늦으면 OSRM 경로 위에 이 프로파일이 덧씌워진다.
 *
 * ⚠️ 2026-09-20 정정 — pump-15 가 `passable: false` · "회전반경 제한" 으로 박혀 있었다.
 *    (1) 회전반경은 BE 가 판단에 쓰지 않는다. 판단 축은 정적 진입곤란 × CCTV 판정 × **폭**
 *        셋뿐이고 `turning_radius_m` 은 DTO 밖에서 참조되지 않는다. 화면에만 있던 근거였다.
 *    (2) CCTV 판정표(V5_3 · 유강현 확정)에서 pump-15 는 a1 · a17 · a41 · a49 네 곳이 PASS 다.
 *        via 로 쓰는 a49 도 그중 하나인데 통행 불가로 표시하고 있었다.
 *    판정표와 일치시키고 근거 없는 제약 문구는 뺀다.
 *
 * 타입이 "막혔다는데 이유가 없는" 상태를 금지한다 — passable: false 면 excluded 가 필수다.
 * 라이브에서 `passableForVehicle: false` 인데 `excludedReasons: []` 로 나가 화면이 이유를
 * 못 보여주던 것이 정확히 이 조합이었다.
 */
type VehicleRouteProfile = {
  via: [number, number];
  passableProb: number;
  cctvIds: string[];
  label: string;
} & (
  | { passable: true; unresolved: false; excluded?: never }
  | { passable: false; unresolved: boolean; excluded: ExcludedReason[] }
);

const VEHICLE_ROUTE_PROFILE: Record<string, VehicleRouteProfile> = {
  "pump-3.5": {
    via: [127.127691, 37.430907],
    passableProb: 0.94,
    passable: true,
    unresolved: false,
    cctvIds: ["cctv_moran_a21", "cctv_moran_a34"],
    label: "소형펌프차 통과 골목 우선",
  },
  "pump-8": {
    via: [127.128116, 37.431987],
    passableProb: 0.78,
    passable: true,
    unresolved: false,
    cctvIds: ["cctv_moran_a1", "cctv_moran_a21"],
    label: "중형펌프차 통과 폭 확보 경로",
  },
  "pump-15": {
    // cctv_moran_a41 (37.4314, 127.12819) · pump-15 PASS 판정 지점이다.
    //
    // a49 에서 옮겼다. a49 는 목적지보다 238m 남쪽이라 경로가 목적지를 지나쳤다 되돌아왔고
    // 지도에서 꺾여 보였다(§09-20 라이브 브리핑 지적). a41 은 111m 로 절반 이하고 거리도
    // 2218m -> 2140m 로 짧다. a1(2074m)이 가장 짧지만 pump-8·aerial-25 가 이미 써서
    // 차종별로 다른 경로가 나오는 시연이 죽는다.
    via: [127.12819, 37.4314],
    // pump-8(0.78)보다 낮게 둔다 — 폭 2.9m 라 통과 판정 골목이 더 적다(a21 은 UNCERTAIN).
    passableProb: 0.74,
    passable: true,
    unresolved: false,
    // via 가 a41 이므로 이 경로가 실제로 지나는 PASS 지점만 적는다. 안 지나는 곳은 넣지 않는다.
    cctvIds: ["cctv_moran_a41"],
    label: "대형펌프차 통과 골목 우회 · CCTV 판정 근거",
  },
  "aerial-25": {
    via: [127.128116, 37.431987],
    passableProb: 0.72,
    passable: true,
    unresolved: false,
    cctvIds: ["cctv_moran_a1", "cctv_moran_a41"],
    label: "굴절차 통과 폭 확보 경로",
  },
};

/**
 * BE 응답 대기 최대 시간.
 * 지연 시 차량별 CCTV+OSRM 시연 경로가 완전한 폴백을 제공하므로 라이브 브리핑을
 * 10초씩 멈추지 않는다.
 */
const BE_MAX_WAIT_MS = 4_000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const details = new URL(request.url).searchParams.get("details") === "1";
  const from = body.from;
  const to = body.to;
  const k = typeof body.k === "number" ? body.k : 3;
  const vehicleId = String(body.vehicleId ?? body.vehicle_id ?? "pump-3.5");
  // 상황실 데모 · mode="shortest" 는 via 웨이포인트·차량 프로파일 데코 건너뛰고 순수 OSRM 최단.
  const shortest = body.mode === "shortest";

  const beFallback = details
    ? { routes: [] as RouteCandidate[], assessments: [] as unknown[], warnings: [] as string[] }
    : ([] as RouteCandidate[]);
  const [beResult, rawOsrmRoutes, cctvMarkers] = await Promise.all([
    Promise.race([
      (details ? fetchRoutePlan : fetchRoutes)({
        vehicleId,
        from,
        to,
        k,
      }).catch(() => beFallback),
      new Promise((resolve) => setTimeout(() => resolve(beFallback), BE_MAX_WAIT_MS)),
    ]) as Promise<typeof beFallback>,
    fetchOsrmRoutes(from, to, k, vehicleId, shortest).catch((err) => {
      console.warn(`[route:osrm] ${err instanceof Error ? err.message : String(err)}`);
      return [] as RouteCandidate[];
    }),
    details ? fetchCctvMarkers() : Promise.resolve([]),
  ]);

  const osrmRoutes = shortest ? rawOsrmRoutes : decorateFallbackRoutes(rawOsrmRoutes, vehicleId);

  const beRoutes: RouteCandidate[] = details
    ? ((beResult as { routes: RouteCandidate[] }).routes ?? [])
    : (beResult as RouteCandidate[]);

  // BE 가 후보를 하나라도 줬으면 BE 를 소스로 · OSRM 은 primary geometry 만 얹는다.
  // 두 쪽 다 비면 빈 배열. BE 만 있으면 BE 그대로. OSRM 만 있으면 OSRM 그대로.
  const routes = beRoutes.length ? overlayPrimaryGeometry(beRoutes, osrmRoutes) : osrmRoutes;

  if (!details) {
    return NextResponse.json(routes, { headers: noStoreHeaders });
  }

  const be = beResult as { routes: RouteCandidate[]; assessments: unknown[]; warnings: string[] };
  const warnings = [...(be.warnings ?? [])];
  const assessments = be.assessments?.length
    ? be.assessments
    : cctvMarkers.map((marker) => ({
        edgeId: marker.id,
        coordinates: [],
        verdict: verdictForVehicle(marker.verdict, vehicleId),
        cctvId: marker.id,
        confidence: marker.measurementStatus === "unavailable" ? 0 : 0.95,
      }));
  if (!beRoutes.length && osrmRoutes.length) {
    warnings.push("route_source: BE 지연 · 차량별 CCTV 판정과 OSRM 시연 경로를 사용.");
  } else if (osrmRoutes.length) {
    warnings.push("route_source: BE 3층 결정 + OSRM primary geometry 보정 (fireroad-router).");
  }
  return NextResponse.json({ routes, assessments, warnings }, { headers: noStoreHeaders });
}

const noStoreHeaders = { "Cache-Control": "private, no-store, no-cache, must-revalidate" };

interface OsrmResponse {
  code?: string;
  routes?: Array<{
    geometry?: { coordinates?: [number, number][] };
    duration?: number;
    distance?: number;
  }>;
}

async function fetchOsrmRoutes(
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  k: number,
  vehicleId: string,
  shortest = false,
): Promise<RouteCandidate[]> {
  if (!from || !to || typeof from.lat !== "number" || typeof to.lat !== "number") return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    // shortest 모드는 via 를 아예 안 씀 → 순수 최단 경로 (상황실 데모).
    const via = shortest ? undefined : VEHICLE_ROUTE_PROFILE[vehicleId]?.via;
    const points = [
      `${from.lon},${from.lat}`,
      ...(via ? [`${via[0]},${via[1]}`] : []),
      `${to.lon},${to.lat}`,
    ].join(";");
    const url =
      `${OSRM_URL}/route/v1/driving/${points}` +
      `?overview=full&geometries=geojson&alternatives=true`;
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { "User-Agent": "fireroad-router/1.0", Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const data = (await res.json()) as OsrmResponse;
    if (data.code !== "Ok" || !Array.isArray(data.routes)) return [];
    return data.routes.slice(0, k).map((r, i) => {
      const coords = (r.geometry?.coordinates ?? []).filter(
        (p): p is [number, number] =>
          Array.isArray(p) &&
          p.length === 2 &&
          typeof p[0] === "number" &&
          typeof p[1] === "number",
      );
      const dur = typeof r.duration === "number" ? Math.max(0, Math.round(r.duration)) : 0;
      const dist = typeof r.distance === "number" ? Math.max(0, r.distance) : 0;
      return {
        rank: i + 1,
        coordinates: coords,
        etaSec: dur,
        distanceM: dist,
        passableProb: 1,
        passableForVehicle: true,
        unlockedByCctv: [],
        hasUnresolvedStaticNoGo: false,
        explanation:
          i === 0
            ? `1순위 · OSRM 실 도로 · ${Math.floor(dur / 60)}분 ${dur % 60}초 · ${(dist / 1000).toFixed(2)}km`
            : `${i + 1}순위 대체 경로 · ${Math.floor(dur / 60)}분 ${dur % 60}초 · ${(dist / 1000).toFixed(2)}km`,
        excludedReasons: [],
      } satisfies RouteCandidate;
    });
  } finally {
    clearTimeout(timeout);
  }
}

function decorateFallbackRoutes(routes: RouteCandidate[], vehicleId: string): RouteCandidate[] {
  const profile = VEHICLE_ROUTE_PROFILE[vehicleId];
  if (!profile) return routes;
  return routes.map((route) => ({
    ...route,
    passableProb: profile.passableProb,
    passableForVehicle: profile.passable,
    unlockedByCctv: profile.cctvIds,
    hasUnresolvedStaticNoGo: profile.unresolved,
    explanation: `${profile.label} · ${route.explanation}`,
    // 통행 불가로 표시하면 막은 구간을 반드시 같이 내려준다. 근거 없는 "불가" 는 화면에서
    // 이유를 못 보여준다 — 타입이 이미 막지만 응답까지 이어져야 의미가 있다.
    excludedReasons: profile.passable ? [] : profile.excluded,
  }));
}

function verdictForVehicle(verdict: Record<string, string>, vehicleId: string) {
  const value = verdict[vehicleId];
  return value === "PASS" || value === "FAIL" || value === "UNCERTAIN" ? value : "UNKNOWN";
}

/**
 * BE 후보 리스트를 그대로 두되 · 1 순위 후보의 geometry (coordinates) 만 OSRM 첫 후보로 덮어씀.
 * BE 가 자체 라우터로 낸 primary 좌표가 mock/폴백일 때 지도 라인이 어색해지는 걸 막는다.
 *
 * ⚠️ 2 순위 이상은 BE 의 "unlocked-by-CCTV 우회 경로" 좌표 그대로 유지 — OSRM 대체 후보에는
 *    CCTV 판정 근거가 없어서 뒤바꾸면 시연 근거가 사라진다.
 * ⚠️ etaSec/distanceM 는 BE 값 유지 — geometry 만 정확한 도로 위 라인으로.
 */
function overlayPrimaryGeometry(be: RouteCandidate[], osrm: RouteCandidate[]): RouteCandidate[] {
  if (!be.length || !osrm.length) return be;
  const primary = be[0];
  const osrmPrimary = osrm[0];
  if (!primary || !osrmPrimary || !osrmPrimary.coordinates.length) return be;
  return [{ ...primary, coordinates: osrmPrimary.coordinates }, ...be.slice(1)];
}
