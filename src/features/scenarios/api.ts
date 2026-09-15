import "server-only";

import type { BeScenario } from "./mapper";
import { toScenario } from "./mapper";
import { MOCK_SCENARIOS } from "./mock/scenarios";
import type { Scenario } from "./types";

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://backend:8080";

/**
 * BE `/api/scenarios` 응답 · 데이터 + 연동 상태.
 *
 * ⚠️ **연동 상태를 화면까지 노출** (§2026-09-15 팀 방침 변경) — mock 폴백이 조용히 화면을
 *    채우는 이전 동작은 심사 링크에서 "실 API 붙은 것처럼" 보이게 만들었다. 이제는 fallback
 *    이면 화면 상단에 `연동 대기 중` 배너를 띄운다 — 어디가 문제인지 팀·심사위원이 즉시 안다.
 */
export interface ScenariosResult {
  data: Scenario[];
  source: "live" | "fallback";
  reason?: string;
}

/**
 * BE `/api/scenarios` 를 서버 사이드에서 부른다. BFF 패턴 — 브라우저는 백엔드 컨테이너에 직접 못 붙는다.
 *
 * ⚠️ **실패 시 mock 폴백 · 단 source="fallback"** 을 함께 반환해 화면이 정직하게 표시한다.
 * ⚠️ 5초 timeout — t3.micro 부팅 · 블루-그린 전환 순간에 붙잡히지 않는다.
 */
export async function fetchScenarios(): Promise<ScenariosResult> {
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
      return { data: MOCK_SCENARIOS, source: "fallback", reason: `HTTP ${res.status}` };
    }
    const raw = (await res.json()) as BeScenario[];
    if (!Array.isArray(raw) || raw.length === 0) {
      console.warn(`[scenarios] fetch returned empty/non-array`);
      return { data: MOCK_SCENARIOS, source: "fallback", reason: "empty" };
    }
    return { data: raw.map(toScenario), source: "live" };
  } catch (err) {
    const name = err instanceof Error ? err.name : "unknown";
    console.warn(`[scenarios] fetch error: ${name} · using mock fallback`);
    return { data: MOCK_SCENARIOS, source: "fallback", reason: name };
  } finally {
    clearTimeout(timeout);
  }
}
