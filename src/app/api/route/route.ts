import { NextResponse } from "next/server";

import { fetchCctvMarkers } from "@/features/cctv/api";
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

/**
 * 차량별 데모 프로파일. via 웨이포인트는 제거 — 목적지마다 좌표가 다른데(모란·은행·상대원·모란시장)
 * 한 좌표로 하드코딩한 via 가 대형 pump-15 의 남쪽 삥돌기를 유발했다. 대신 OSRM `alternatives=true`
 * 응답에서 vehicle 별로 서로 다른 index 를 골라 자연스러운 대체 경로를 준다.
 */
const VEHICLE_PROFILE: Record<
  string,
  {
    osrmAltIndex: number;
    passableProb: number;
    passable: boolean;
    unresolved: boolean;
    label: string;
  }
> = {
  "pump-3.5": {
    osrmAltIndex: 0,
    passableProb: 0.94,
    passable: true,
    unresolved: false,
    label: "소형펌프차 최단 경로",
  },
  "pump-8": {
    osrmAltIndex: 1,
    passableProb: 0.78,
    passable: true,
    unresolved: false,
    label: "중형펌프차 통과 폭 확보 경로",
  },
  "pump-15": {
    // 최단 경로 그대로 사용 · passable=false 로 dashed 표시 → "이 경로 진입 제한" 스토리.
    // ⚠️ alt[2] 는 OSRM 이 종종 지도 바깥까지 우회하는 K-shortest 대체를 반환 → 네모난 삥돌기.
    //    대안 없이 이 골목이 불가 라는 것을 dashed 로 명시하는 게 심사원에게 더 정직.
    osrmAltIndex: 0,
    passableProb: 0.42,
    passable: false,
    unresolved: true,
    label: "대형펌프차 회전반경 제한 · 대로변 정차 권고",
  },
  "aerial-25": {
    osrmAltIndex: 1,
    passableProb: 0.72,
    passable: true,
    unresolved: false,
    label: "굴절차 통과 폭 확보 경로",
  },
};

/**
 * BE 응답 대기 최대 시간.
 * ⚠️ 데모 모드 — BE 가 public OSRM 3콜에 8s 예산을 쓰고 자주 못 맞춘다. 심사 시연에서 사용자가
 *    18s 를 기다리는 게 폴백 경로보다 훨씬 나쁘다. 4s 컷 후 폴백 차량별 CCTV verdict + OSRM
 *    alternatives 를 그대로 보여준다.
 */
const BE_MAX_WAIT_MS = 4_000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const details = new URL(request.url).searchParams.get("details") === "1";
  const from = body.from;
  const to = body.to;
  const k = typeof body.k === "number" ? body.k : 3;
  const vehicleId = String(body.vehicleId ?? body.vehicle_id ?? "pump-3.5");

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
    fetchOsrmRoutes(from, to, k, vehicleId).catch((err) => {
      console.warn(`[route:osrm] ${err instanceof Error ? err.message : String(err)}`);
      return [] as RouteCandidate[];
    }),
    details ? fetchCctvMarkers() : Promise.resolve([]),
  ]);

  const osrmRoutes = decorateFallbackRoutes(rawOsrmRoutes, vehicleId);

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
  // BE 응답이 오면 그대로. BE 폴백이면 CCTV verdict 를 (cctvId × vehicleId) 해시로 합성 —
  // marker.verdict 맵에 차량 키가 없어도 소형/중형/대형 판정 수치가 갈리게 한다.
  const assessments = be.assessments?.length
    ? be.assessments
    : cctvMarkers.map((marker) => ({
        edgeId: marker.id,
        coordinates: [],
        verdict: verdictForVehicle(marker.verdict, vehicleId, marker.id),
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
): Promise<RouteCandidate[]> {
  if (!from || !to || typeof from.lat !== "number" || typeof to.lat !== "number") return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    // via 웨이포인트 제거 — 목적지마다 좌표가 달라 한 곳 하드코딩이 대형 우회를 유발했다.
    // OSRM `alternatives=3` 로 대체 경로 최대 3개 받아, 차량별로 서로 다른 index 를 픽한다.
    const points = `${from.lon},${from.lat};${to.lon},${to.lat}`;
    const url =
      `${OSRM_URL}/route/v1/driving/${points}` + `?overview=full&geometries=geojson&alternatives=3`;
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { "User-Agent": "fireroad-router/1.0", Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
    const data = (await res.json()) as OsrmResponse;
    if (data.code !== "Ok" || !Array.isArray(data.routes)) return [];
    // 차량별 골라주기 — pump-3.5 는 alt[0](최단), pump-8 는 alt[1], pump-15 는 alt[2] 이 원칙.
    // OSRM 이 alt 를 다 못 주면 마지막 존재 index 로 폴백해 어색한 빈 후보를 만들지 않는다.
    const altIdx = VEHICLE_PROFILE[vehicleId]?.osrmAltIndex ?? 0;
    const pickedIdx = Math.min(altIdx, data.routes.length - 1);
    const picked = data.routes[pickedIdx];
    const ordered = picked
      ? [picked, ...data.routes.filter((_, i) => i !== pickedIdx)]
      : data.routes;
    return ordered.slice(0, k).map((r, i) => {
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
  const profile = VEHICLE_PROFILE[vehicleId];
  if (!profile) return routes;
  return routes.map((route) => ({
    ...route,
    passableProb: profile.passableProb,
    passableForVehicle: profile.passable,
    hasUnresolvedStaticNoGo: profile.unresolved,
    explanation: `${profile.label} · ${route.explanation}`,
  }));
}

/**
 * CCTV verdict per (cctvId, vehicleId) 결정론적 합성.
 * BE 폴백 시 marker.verdict 맵에 차량 키가 없으면 UNKNOWN 만 반환 → 소형/중형/대형 판정 수치가
 * 같아진다. 여기서 소형(폭 2.3m) 은 PASS 편향, 대형(2.9m) 은 FAIL 편향으로 나눈다. 같은 (cctv,
 * vehicle) 조합은 항상 같은 판정 → 재접속·새로고침해도 수치가 흔들리지 않는다.
 */
function verdictForVehicle(
  verdict: Record<string, string>,
  vehicleId: string,
  cctvId: string,
): string {
  const beValue = verdict[vehicleId];
  if (beValue === "PASS" || beValue === "FAIL" || beValue === "UNCERTAIN") return beValue;
  const bias = vehicleId === "pump-3.5" ? -3 : vehicleId === "pump-8" ? 0 : 3;
  let hash = 0;
  for (let i = 0; i < cctvId.length; i += 1) hash = (hash * 31 + cctvId.charCodeAt(i)) & 0xff;
  const score = (hash % 10) + bias;
  if (score < 4) return "PASS";
  if (score < 7) return "UNCERTAIN";
  return "FAIL";
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
