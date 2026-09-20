import "server-only";

import { beHeaders } from "@/features/_shared/be-headers";
import type { LiveRouteResult } from "@/features/live/use-live-routes";

import type { RouteCandidate } from "./types";

/**
 * BE 컨테이너 이름 (docker-compose 네트워크 별칭). 도커 밖 로컬 dev 에서는 `.env.local` 로 오버라이드.
 * ⚠️ **서버 전용** — 브라우저는 이 URL 을 몰라야 한다.
 */
const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://backend:8080";

/**
 * BE `/api/route` snake_case 응답 shape. backend PR #24 이후 3층 의사결정 필드가 추가됐다.
 * 옛 응답과 호환 — 새 필드가 없어도 안전 fallback.
 */
interface BeRouteCandidate {
  rank: number;
  coordinates: number[][];
  polyline?: string;
  eta_sec: number;
  distance_m: number;
  passable_prob: number;
  meets_golden_time: boolean;
  passable_for_vehicle?: boolean;
  unlocked_by_cctv?: string[];
  has_unresolved_static_no_go?: boolean;
  explanation?: string;
  excluded_reasons?: Array<{
    edge_id?: string;
    polygon_id?: string;
    reason?: string;
    evidence_url?: string;
  }>;
}

interface BeRouteResponse {
  routes?: BeRouteCandidate[];
  cctv_assessments?: Array<{
    edge_id: string;
    coordinates: [number, number][];
    verdict: string;
    cctv_id: string | null;
    confidence: number;
  }>;
  warnings?: string[];
  calc_time_ms?: number;
  alternatives_status?: string;
  no_go_considered?: number;
  valhalla_mocked?: boolean;
  no_go_mocked?: boolean;
}

export interface RoutePlanInput {
  vehicleId: string;
  from: { lat: number; lon: number };
  to: { lat: number; lon: number };
  k?: number;
}

/**
 * BE `POST /api/route` 를 서버 사이드에서 부른다. BFF — 브라우저는 backend 컨테이너에 직접 못 붙는다.
 *
 * ⚠️ 실패 시 빈 배열 반환 — 지도가 비는 대신 상황실이 "경로 계산 실패" 상태로 뜬다.
 * ⚠️ 10초 timeout — Valhalla 콜드 스타트나 CCTV 조회 지연에 여유. 시연에서 넉넉히.
 * ⚠️ 통과확률·통과여부·CCTV unlock 근거 등 3층 의사결정 결과를 BE 가 이미 매긴다 — 프론트는
 *    렌더만 (§backend PR #24).
 */
export async function fetchRoutes(input: RoutePlanInput): Promise<RouteCandidate[]> {
  try {
    return (await fetchRoutePlan(input)).routes;
  } catch {
    return [];
  }
}

export async function fetchRoutePlan(input: RoutePlanInput): Promise<LiveRouteResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/route`, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: beHeaders(true),
      body: JSON.stringify({
        vehicle_id: input.vehicleId,
        from: input.from,
        to: input.to,
        k: input.k ?? 3,
      }),
    });
    if (!res.ok) {
      throw new Error(`Route service returned HTTP ${res.status}`);
    }
    const raw = (await res.json()) as BeRouteResponse;
    const routes = Array.isArray(raw.routes) ? raw.routes : [];
    return {
      routes: routes.map(toRouteCandidate),
      assessments: (raw.cctv_assessments ?? []).map((a) => ({
        edgeId: a.edge_id,
        coordinates: a.coordinates,
        verdict: a.verdict,
        cctvId: a.cctv_id,
        confidence: a.confidence,
      })),
      warnings: raw.warnings ?? [],
    };
  } catch (err) {
    const name = err instanceof Error ? err.name : "unknown";
    console.warn(`[route] fetch error: ${name}`);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function toRouteCandidate(be: BeRouteCandidate): RouteCandidate {
  const coords = (be.coordinates ?? []).filter(
    (pt): pt is [number, number] =>
      Array.isArray(pt) &&
      pt.length === 2 &&
      typeof pt[0] === "number" &&
      typeof pt[1] === "number",
  );
  return {
    rank: be.rank,
    coordinates: coords,
    etaSec: be.eta_sec,
    distanceM: be.distance_m,
    passableProb: be.passable_prob,
    passableForVehicle: be.passable_for_vehicle === true,
    unlockedByCctv: be.unlocked_by_cctv ?? [],
    hasUnresolvedStaticNoGo: be.has_unresolved_static_no_go ?? true,
    explanation: be.explanation ?? "",
    excludedReasons: (be.excluded_reasons ?? []).map((r) => ({
      edgeId: r.edge_id ?? r.polygon_id ?? "",
      reason: r.reason ?? "",
      evidenceUrl: r.evidence_url,
    })),
  };
}
