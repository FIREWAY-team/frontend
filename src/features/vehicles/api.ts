import "server-only";

import type { BeVehicle } from "./mapper";
import { toVehicle } from "./mapper";
import { MOCK_VEHICLES } from "./mock/vehicles";
import type { Vehicle } from "./types";

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://backend:8080";

/**
 * BE `/api/vehicles` 를 서버 사이드에서 부른다.
 *
 * ⚠️ **실패 시 mock 폴백** — 차량 목록은 화면 필수 · BE 다운 시에도 3종 시연 데이터 유지.
 *    BE seed 는 2종 (pump-3.5·pump-8), 우리 mock 은 3종 (pump-15 포함) — mock 폴백 시 시연 확장.
 */
export async function fetchVehicles(): Promise<Vehicle[]> {
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
      return MOCK_VEHICLES;
    }
    const raw = (await res.json()) as BeVehicle[];
    if (!Array.isArray(raw) || raw.length === 0) {
      console.warn(`[vehicles] fetch returned empty/non-array`);
      return MOCK_VEHICLES;
    }
    return raw.map(toVehicle);
  } catch (err) {
    const name = err instanceof Error ? err.name : "unknown";
    console.warn(`[vehicles] fetch error: ${name} · using mock fallback`);
    return MOCK_VEHICLES;
  } finally {
    clearTimeout(timeout);
  }
}
