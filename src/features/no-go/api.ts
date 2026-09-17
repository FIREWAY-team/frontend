import "server-only";

import { beHeaders } from "@/features/_shared/be-headers";

import type { BeNoGoItem } from "./mapper";
import { toNoGoArea } from "./mapper";
import type { NoGoArea } from "./types";

/**
 * BE 컨테이너 이름 (docker-compose 네트워크 별칭). 도커 밖(로컬 dev)에서는 `.env.local` 로 오버라이드.
 * ⚠️ **서버 전용** — 브라우저는 이 URL 을 알 수도 없고 알아서도 안 된다. 파일 상단 `server-only`.
 */
const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://backend:8080";

/**
 * bbox — 지도 시야 · GeoJSON 관례 `[minLon, minLat, maxLon, maxLat]` (lon 먼저).
 * ⚠️ BE `BoundingBox` 는 반대로 lat 먼저다 · BE 가 파싱하면서 뒤집는다. 여기서는 GeoJSON 순서 유지.
 */
export interface BBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

/**
 * BE `/api/no_go` 를 서버 사이드에서 부른다. BFF 패턴 — 브라우저가 백엔드 컨테이너에 직접 못 붙는다.
 *
 * ⚠️ **`bbox` 지정 시 부분 조회** (§BE PR #38 · 2026-09-17) — 지도 시야 안 진입곤란만 받는다.
 *    범위 밖 · 전량 1,276건 응답으로 지도가 조각조각 느려지는 것을 막는다.
 *    미지정 시 · 전량 (기존 동작 유지).
 * ⚠️ **실패 시 빈 배열** — 지도 렌더링을 blocking 하지 않는다. 로그는 서버 콘솔에.
 * ⚠️ **5초 timeout** — t3.micro 부팅 중이거나 blue-green 전환 순간에 붙잡히지 않는다.
 * ⚠️ `no-store` — 진입곤란 도로가 CCTV 판독 결과로 실시간 뒤집힐 수 있어서(§layer=3) 캐시하면
 *    오히려 위험. 지도 이동마다 새로 받는다.
 */
export async function fetchNoGoAreas(bbox?: BBox): Promise<NoGoArea[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const url = bbox
      ? `${BACKEND_API_URL}/api/no_go?bbox=${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`
      : `${BACKEND_API_URL}/api/no_go`;
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: beHeaders(false),
    });
    if (!res.ok) {
      console.warn(`[no-go] fetch failed: HTTP ${res.status}`);
      return [];
    }
    const raw = (await res.json()) as BeNoGoItem[];
    if (!Array.isArray(raw)) {
      console.warn(`[no-go] fetch returned non-array`, typeof raw);
      return [];
    }
    return raw.map(toNoGoArea).filter((x): x is NoGoArea => x !== null);
  } catch (err) {
    // AbortError · TypeError(네트워크) 다 여기로. 지도는 오버레이 없이 뜨게 둔다.
    const name = err instanceof Error ? err.name : "unknown";
    console.warn(`[no-go] fetch error: ${name}`);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
