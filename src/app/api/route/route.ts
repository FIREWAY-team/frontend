import { NextResponse } from "next/server";

import { fetchRoutePlan, fetchRoutes } from "@/features/dispatch/api";
import type { RouteCandidate } from "@/features/dispatch/types";

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
/** BE 응답 대기 최대 시간. BE 자체 라우팅 예산 (~8s) + 오버헤드 + FE 여유. */
const BE_MAX_WAIT_MS = 8_000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const details = new URL(request.url).searchParams.get("details") === "1";
  const from = body.from;
  const to = body.to;
  const k = typeof body.k === "number" ? body.k : 3;

  const beFallback = details
    ? { routes: [] as RouteCandidate[], assessments: [] as unknown[], warnings: [] as string[] }
    : ([] as RouteCandidate[]);
  const [beResult, osrmRoutes] = await Promise.all([
    Promise.race([
      (details ? fetchRoutePlan : fetchRoutes)({
        vehicleId: String(body.vehicleId ?? body.vehicle_id ?? "pump-3.5"),
        from,
        to,
        k,
      }).catch(() => beFallback),
      new Promise((resolve) => setTimeout(() => resolve(beFallback), BE_MAX_WAIT_MS)),
    ]) as Promise<typeof beFallback>,
    fetchOsrmRoutes(from, to, k).catch((err) => {
      console.warn(`[route:osrm] ${err instanceof Error ? err.message : String(err)}`);
      return [] as RouteCandidate[];
    }),
  ]);

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
  if (!beRoutes.length && osrmRoutes.length) {
    warnings.push(
      "route_source: BE 응답 없음 · OSRM 공개 라우터 (fireroad-router) 만 사용 · CCTV 판정 미반영.",
    );
  } else if (osrmRoutes.length) {
    warnings.push("route_source: BE 3층 결정 + OSRM primary geometry 보정 (fireroad-router).");
  }
  return NextResponse.json(
    { routes, assessments: be.assessments ?? [], warnings },
    { headers: noStoreHeaders },
  );
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
): Promise<RouteCandidate[]> {
  if (!from || !to || typeof from.lat !== "number" || typeof to.lat !== "number") return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const url =
      `${OSRM_URL}/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}` +
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
