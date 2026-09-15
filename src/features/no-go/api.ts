import "server-only";

import type { BeNoGoItem } from "./mapper";
import { toNoGoArea } from "./mapper";
import type { NoGoArea } from "./types";

/**
 * BE 컨테이너 이름 (docker-compose 네트워크 별칭). 도커 밖(로컬 dev)에서는 `.env.local` 로 오버라이드.
 * ⚠️ **서버 전용** — 브라우저는 이 URL 을 알 수도 없고 알아서도 안 된다. 파일 상단 `server-only`.
 */
const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://backend:8080";

/**
 * BE `/api/no_go` 를 서버 사이드에서 부른다. BFF 패턴 — 브라우저가 백엔드 컨테이너에 직접 못 붙는다.
 *
 * ⚠️ **실패 시 빈 배열** — 지도 렌더링을 blocking 하지 않는다. 로그는 서버 콘솔에.
 * ⚠️ **5초 timeout** — t3.micro 부팅 중이거나 blue-green 전환 순간에 붙잡히지 않는다.
 * ⚠️ 응답이 커도(1,274건 ≈ 321KB 무압축) BE 가 gzip 을 켜 놨고(§backend PR #21), fetch 는 자동 압축 해제.
 * ⚠️ `revalidate` 대신 `no-store` — 진입곤란 도로가 CCTV 판독 결과로 실시간 뒤집힐 수 있어서
 *    (§layer=3) 캐시하면 오히려 위험. 지도 로드마다 새로 받는다.
 */
export async function fetchNoGoAreas(): Promise<NoGoArea[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/no_go`, {
      cache: "no-store",
      signal: controller.signal,
      headers: { Accept: "application/json" },
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
