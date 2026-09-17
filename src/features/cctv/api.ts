import "server-only";

import { beHeaders } from "@/features/_shared/be-headers";

import type { BeCctvReading } from "./mapper";
import { toCctvReading } from "./mapper";
import type { CctvReading } from "./types";

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://backend:8080";

/**
 * BE `GET /api/cctv/{id}` 를 서버 사이드에서 부른다.
 *
 * ⚠️ **실패 시 `null` 반환** — 팝업 컴포넌트가 로딩/에러 상태를 자체 표시. 없는 CCTV id 조회는
 *    BE 가 404 를 준다 (§docs/api.md 오류) — 그것도 null 로 흡수해 UI 에서 "판독 결과 없음" 표시.
 * ⚠️ 3초 timeout — 팝업은 사용자가 클릭한 순간 즉시 응답이 와야 한다. 지연되면 팝업이 계속 로딩만.
 */
export async function fetchCctvReading(id: string): Promise<CctvReading | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3_000);
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/cctv/${encodeURIComponent(id)}`, {
      cache: "no-store",
      signal: controller.signal,
      headers: beHeaders(false),
    });
    if (!res.ok) {
      // 404 는 정상 (없는 id) · 그 외는 경고
      if (res.status !== 404) {
        console.warn(`[cctv:${id}] fetch failed: HTTP ${res.status}`);
      }
      return null;
    }
    const raw = (await res.json()) as BeCctvReading;
    return toCctvReading(raw);
  } catch (err) {
    const name = err instanceof Error ? err.name : "unknown";
    console.warn(`[cctv:${id}] fetch error: ${name}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
