import "server-only";

import type { BeRouteResponse } from "./mapper";
import { toBeRouteRequest, toRouteResponse } from "./mapper";
import type { RouteRequest, RouteResponse } from "./types";

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://backend:8080";

/**
 * BE `POST /api/route` 서버 사이드 호출.
 *
 * ⚠️ **실패 시 `null` 반환** — 호출부(`use-real-routes.ts`)가 fallback (OSRM 로컬 계산) 로 넘어간다.
 *    mock 폴백을 여기서 넣지 않는 이유 — 경로는 화점·차량 조합마다 값이 다르고, 하나의 mock 응답을
 *    모든 요청에 돌려주면 화면이 거짓말을 한다. Fallback 은 실계산 (OSRM) 에서 해야 정직하다.
 * ⚠️ 10초 timeout — Valhalla 는 도로 그래프 계산이라 no_go 조회보다 오래 걸릴 수 있다. BE 자체
 *    상한 10초 (§docs/api.md 오류 표) 와 맞춘다.
 */
export async function fetchRoute(req: RouteRequest): Promise<RouteResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const body = toBeRouteRequest(req);
    const res = await fetch(`${BACKEND_API_URL}/api/route`, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(`[route] fetch failed: HTTP ${res.status}`);
      return null;
    }
    const raw = (await res.json()) as BeRouteResponse;
    return toRouteResponse(raw);
  } catch (err) {
    const name = err instanceof Error ? err.name : "unknown";
    console.warn(`[route] fetch error: ${name}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
