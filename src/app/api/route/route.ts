import { NextResponse } from "next/server";

import { fetchRoutePlan, fetchRoutes } from "@/features/dispatch/api";
import type { RouteCandidate } from "@/features/dispatch/types";

/**
 * `/api/route` — 브라우저 fetch 프록시.
 *
 * ⚠️ BE 컨테이너가 OSRM/Valhalla 공개 서버에 응답 못 받는 상태(원인 미상 · SG/DNS 추정).
 *    같은 EC2 의 FE 컨테이너는 OSRM 1.3s 로 붙어(/api/diag/osrm 확인). 시연 마감 우선으로
 *    FE 서버 사이드에서 OSRM 을 직접 불러 실 도로 geometry 를 만들고, BE 는 CCTV 판정·
 *    3층 결정 근거만 가져와서 합친다.
 *
 * ⚠️ BE 판정은 폴백 직선 기준이라 passableProb/passableForVehicle 이 실제와 어긋날 수 있다 —
 *    시연에서는 지도 라인 정확도가 우선. 자체 라우터 안정화 시 이 프록시 원복.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const OSRM_URL = "https://router.project-osrm.org";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const details = new URL(request.url).searchParams.get("details") === "1";
  const from = body.from;
  const to = body.to;
  const k = typeof body.k === "number" ? body.k : 3;

  const [beResult, osrmRoutes] = await Promise.all([
    (details ? fetchRoutePlan : fetchRoutes)({
      vehicleId: String(body.vehicleId ?? body.vehicle_id ?? "pump-3.5"),
      from, to, k,
    }).catch(() => (details ? { routes: [], assessments: [], warnings: [] } : [])),
    fetchOsrmRoutes(from, to, k).catch((err) => {
      console.warn(`[route:osrm] ${err instanceof Error ? err.message : String(err)}`);
      return [] as RouteCandidate[];
    }),
  ]);

  if (!details) {
    // 옛 계약 · RouteCandidate[] 만 (OSRM 우선, 없으면 BE 결과 유지)
    const routes = osrmRoutes.length ? mergeMetadata(osrmRoutes, beResult as RouteCandidate[]) : (beResult as RouteCandidate[]);
    return NextResponse.json(routes, { headers: noStoreHeaders });
  }

  // details=1 · LiveRouteResult
  const be = beResult as { routes: RouteCandidate[]; assessments: unknown[]; warnings: string[] };
  const merged = osrmRoutes.length ? mergeMetadata(osrmRoutes, be.routes) : be.routes;
  const warnings = [...(be.warnings ?? [])];
  if (osrmRoutes.length) warnings.push("route_source: OSRM 공개 라우터 (fireroad-router). CCTV/no-go 판정은 BE 3층 결정.");
  return NextResponse.json({
    routes: merged,
    assessments: be.assessments ?? [],
    warnings,
  }, { headers: noStoreHeaders });
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
  from: { lat: number; lon: number }, to: { lat: number; lon: number }, k: number,
): Promise<RouteCandidate[]> {
  if (!from || !to || typeof from.lat !== "number" || typeof to.lat !== "number") return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const url = `${OSRM_URL}/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}`
      + `?overview=full&geometries=geojson&alternatives=true`;
    const res = await fetch(url, {
      cache: "no-store", signal: controller.signal,
      headers: { "User-Agent": "fireroad-router/1.0", Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const data = (await res.json()) as OsrmResponse;
    if (data.code !== "Ok" || !Array.isArray(data.routes)) return [];
    return data.routes.slice(0, k).map((r, i) => {
      const coords = (r.geometry?.coordinates ?? []).filter(
        (p): p is [number, number] => Array.isArray(p) && p.length === 2 && typeof p[0] === "number" && typeof p[1] === "number",
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
        explanation: i === 0
          ? `1순위 · OSRM 실 도로 · ${Math.floor(dur / 60)}분 ${dur % 60}초 · ${(dist / 1000).toFixed(2)}km`
          : `${i + 1}순위 대체 경로 · ${Math.floor(dur / 60)}분 ${dur % 60}초 · ${(dist / 1000).toFixed(2)}km`,
        excludedReasons: [],
      } satisfies RouteCandidate;
    });
  } finally { clearTimeout(timeout); }
}

/**
 * OSRM 실 geometry 를 rank 순으로 넣되, BE 가 준 rank 1 후보의 3층 결정 근거
 * (passableProb/passableForVehicle/unlockedByCctv/hasUnresolvedStaticNoGo/explanation/excludedReasons)
 * 이 있으면 첫 후보에 얹는다.
 */
function mergeMetadata(osrm: RouteCandidate[], be: RouteCandidate[]): RouteCandidate[] {
  const bePrimary = be[0];
  if (!bePrimary || !osrm[0]) return osrm;
  osrm[0] = {
    ...osrm[0],
    passableProb: bePrimary.passableProb ?? osrm[0].passableProb,
    passableForVehicle: bePrimary.passableForVehicle ?? osrm[0].passableForVehicle,
    unlockedByCctv: bePrimary.unlockedByCctv?.length ? bePrimary.unlockedByCctv : osrm[0].unlockedByCctv,
    hasUnresolvedStaticNoGo: bePrimary.hasUnresolvedStaticNoGo ?? osrm[0].hasUnresolvedStaticNoGo,
    excludedReasons: bePrimary.excludedReasons?.length ? bePrimary.excludedReasons : osrm[0].excludedReasons,
  };
  return osrm;
}
