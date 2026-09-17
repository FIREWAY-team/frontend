import { NextResponse } from "next/server";

import type { BBox } from "@/features/no-go/api";
import { fetchNoGoAreas } from "@/features/no-go/api";

/**
 * `/api/no-go` — 클라이언트가 브라우저에서 부르는 프록시. 이 안에서 서버 사이드로 BE 컨테이너
 * `http://backend:8080/api/no_go` 를 호출해 JSON 그대로 돌려준다.
 *
 * ⚠️ 왜 이 경로가 필요한가 — 브라우저는 docker 네트워크 안의 BE 컨테이너에 직접 못 붙는다.
 *    Server Component 안에서만 fetch 하는 방식은 Next.js 가 build-time SSG 로 뽑아버려
 *    empty 결과가 static HTML 로 굳는 사고가 있었다. Route Handler 는 무조건 요청마다 실행
 *    되므로 그 함정이 없다.
 * ⚠️ `dynamic = 'force-dynamic'` 명시 — 프리렌더 방지.
 * ⚠️ **`?bbox=minLon,minLat,maxLon,maxLat`** (§BE PR #38 · 2026-09-17) — 지도 시야 부분 조회.
 *    미지정 시 · 전량 (기존 동작 유지). 파싱 오류 시 · 조용히 전량으로 폴백 (지도가 안 죽게).
 * ⚠️ GeoJSON 관례 · lon 이 먼저. BE 의 `BoundingBox` 는 lat 이 먼저지만 BE 가 알아서 뒤집는다.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawBbox = url.searchParams.get("bbox");
  const bbox = rawBbox ? parseBbox(rawBbox) : undefined;
  const areas = await fetchNoGoAreas(bbox);
  // 진입곤란 응답은 종종 300KB 근처까지 커진다. 클라이언트가 뒤로가기/새로고침에서 캐시해서 잠깐이라도
  // 뒤늦게 검증된 판정을 보지 않게 no-store 로 못박는다.
  return NextResponse.json(areas, {
    headers: { "Cache-Control": "private, no-store, no-cache, must-revalidate" },
  });
}

/**
 * `?bbox=minLon,minLat,maxLon,maxLat` 파싱. 오탈자 · 순서 뒤집힘 · NaN 은 undefined 로 폴백해
 * BE 전량 조회로 넘어가게 한다 — 지도가 안 죽게 하는 것이 최우선.
 */
function parseBbox(raw: string): BBox | undefined {
  const parts = raw.split(",").map((s) => Number(s.trim()));
  if (parts.length !== 4) return undefined;
  const [minLon, minLat, maxLon, maxLat] = parts as [number, number, number, number];
  if ([minLon, minLat, maxLon, maxLat].some((n) => !Number.isFinite(n))) return undefined;
  if (minLon >= maxLon || minLat >= maxLat) return undefined;
  return { minLon, minLat, maxLon, maxLat };
}
