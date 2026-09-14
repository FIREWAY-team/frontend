import "server-only";

import type { BeScenario } from "./mapper";
import { toScenario } from "./mapper";
import { MOCK_SCENARIOS } from "./mock/scenarios";
import type { Scenario } from "./types";

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://backend:8080";

/**
 * BE `/api/scenarios` 를 서버 사이드에서 부른다. BFF 패턴 — 브라우저는 백엔드 컨테이너에 직접 못 붙는다.
 *
 * ⚠️ **실패 시 mock 폴백** — 시연 중 BE 다운/타임아웃 시 화면 아예 비지 않게 mock 3건으로 채운다.
 *    무한 에러 배너 대신 조용히 데모 데이터를 보여 준다(§CLAUDE.md 정직성 — 옵션 논쟁 여지 있음).
 * ⚠️ 5초 timeout — t3.micro 부팅 · 블루-그린 전환 순간에 붙잡히지 않는다.
 */
export async function fetchScenarios(): Promise<Scenario[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/scenarios`, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.warn(`[scenarios] fetch failed: HTTP ${res.status}`);
      return MOCK_SCENARIOS;
    }
    const raw = (await res.json()) as BeScenario[];
    if (!Array.isArray(raw) || raw.length === 0) {
      console.warn(`[scenarios] fetch returned empty/non-array`);
      return MOCK_SCENARIOS;
    }
    return raw.map(toScenario);
  } catch (err) {
    const name = err instanceof Error ? err.name : "unknown";
    console.warn(`[scenarios] fetch error: ${name} · using mock fallback`);
    return MOCK_SCENARIOS;
  } finally {
    clearTimeout(timeout);
  }
}
