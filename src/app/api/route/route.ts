import { NextResponse } from "next/server";

import { fetchRoute } from "@/features/dispatch/api";
import type { RouteRequest } from "@/features/dispatch/types";

/**
 * `/api/route` BFF — 브라우저 클릭 시 POST · 서버 사이드에서 BE 로 프록시.
 *
 * ⚠️ `dynamic = 'force-dynamic'` — POST 는 원래 dynamic 이지만 명시적으로.
 * ⚠️ 요청 body 최소 검증 — `vehicle_id`·`from`·`to` 없으면 400. BE 도 검증하지만 프록시가
 *    먼저 걸러 BE 왕복을 아낀다.
 * ⚠️ BE 실패 시 프록시가 502 를 준다 — 호출부(`useRealRoutes`)가 이걸 잡아 OSRM 폴백으로 넘어간다.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "MALFORMED_REQUEST" } }, { status: 400 });
  }
  const req = parseRouteRequest(body);
  if (!req) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "vehicleId · from · to 필수" } },
      { status: 400 },
    );
  }
  const result = await fetchRoute(req);
  if (!result) {
    return NextResponse.json(
      { error: { code: "EXTERNAL_SYSTEM_ERROR", message: "BE 라우팅 응답 실패" } },
      { status: 502 },
    );
  }
  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store, no-cache, must-revalidate" },
  });
}

/**
 * 클라이언트 body 는 camelCase 로 보낸다 (JS 관례) — BE 매퍼가 snake 로 변환.
 * 필수 필드만 스키마 체크. 옵션은 그대로 통과 (BE 가 검증).
 */
function parseRouteRequest(raw: unknown): RouteRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.vehicleId !== "string" || r.vehicleId.trim() === "") return null;
  const from = parseCoord(r.from);
  const to = parseCoord(r.to);
  if (!from || !to) return null;
  const req: RouteRequest = { vehicleId: r.vehicleId, from, to };
  if (typeof r.k === "number") req.k = r.k;
  if (typeof r.overlapThreshold === "number") req.overlapThreshold = r.overlapThreshold;
  if (typeof r.goldenTimeSec === "number") req.goldenTimeSec = r.goldenTimeSec;
  return req;
}

function parseCoord(v: unknown): { lat: number; lon: number } | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Record<string, unknown>;
  if (typeof c.lat !== "number" || typeof c.lon !== "number") return null;
  return { lat: c.lat, lon: c.lon };
}
