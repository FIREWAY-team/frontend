import { NextResponse } from "next/server";

import { fetchRoutes } from "@/features/dispatch/api";

/**
 * `/api/route` — 클라이언트가 브라우저에서 부르는 프록시. 이 안에서 서버 사이드로 BE 컨테이너
 * `http://backend:8080/api/route` 를 호출해서 3층 의사결정(정적 no-go × CCTV × 차량 폭) 결과를
 * 그대로 돌려준다.
 *
 * ⚠️ 왜 이 경로가 필요한가 — 브라우저는 docker 네트워크 안의 BE 컨테이너에 직접 못 붙는다.
 *    Server Component 안에서만 fetch 하는 방식은 build-time SSG 로 뽑혀 empty 로 굳는 사고가
 *    있었어서 Route Handler 로 통일.
 * ⚠️ `dynamic = 'force-dynamic'` 명시. 프리렌더 방지.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const routes = await fetchRoutes({
    vehicleId: String(body.vehicleId ?? body.vehicle_id ?? "pump-3.5"),
    from: body.from,
    to: body.to,
    k: typeof body.k === "number" ? body.k : 3,
  });
  return NextResponse.json(routes, {
    headers: { "Cache-Control": "private, no-store, no-cache, must-revalidate" },
  });
}
