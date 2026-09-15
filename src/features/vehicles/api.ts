import "server-only";

import type { BeVehicle } from "./mapper";
import { toVehicle } from "./mapper";
import { MOCK_VEHICLES } from "./mock/vehicles";
import type { Vehicle } from "./types";

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://backend:8080";

/**
 * BE `/api/vehicles` 응답 · 데이터 + 연동 상태 (§scenarios/api.ts 와 동일 규약).
 */
export interface VehiclesResult {
  data: Vehicle[];
  source: "live" | "fallback";
  reason?: string;
}

/**
 * BE `/api/vehicles` 를 서버 사이드에서 부른다.
 *
 * ⚠️ **실패 시 mock 폴백 · source="fallback"** — 화면이 정직하게 연동 대기 중 배너를 띄운다.
 */
export async function fetchVehicles(): Promise<VehiclesResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/vehicles`, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.warn(`[vehicles] fetch failed: HTTP ${res.status}`);
      return { data: MOCK_VEHICLES, source: "fallback", reason: `HTTP ${res.status}` };
    }
    const raw = (await res.json()) as BeVehicle[];
    if (!Array.isArray(raw) || raw.length === 0) {
      console.warn(`[vehicles] fetch returned empty/non-array`);
      return { data: MOCK_VEHICLES, source: "fallback", reason: "empty" };
    }
    return { data: raw.map(toVehicle), source: "live" };
  } catch (err) {
    const name = err instanceof Error ? err.name : "unknown";
    console.warn(`[vehicles] fetch error: ${name} · using mock fallback`);
    return { data: MOCK_VEHICLES, source: "fallback", reason: name };
  } finally {
    clearTimeout(timeout);
  }
}
