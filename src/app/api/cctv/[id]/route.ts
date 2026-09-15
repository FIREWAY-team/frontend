import { NextResponse } from "next/server";

import { fetchCctvReading } from "@/features/cctv/api";

/**
 * `/api/cctv/[id]` BFF — 지도 마커 클릭 시 팝업이 부른다.
 *
 * ⚠️ Next 15+ · `params` 는 Promise 로 감싸져 있다. `await` 필요.
 * ⚠️ 없는 id (BE 404) 는 프록시도 404 로 · 팝업이 "판독 결과 없음" 표시.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const reading = await fetchCctvReading(id);
  if (!reading) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }
  return NextResponse.json(reading, {
    headers: { "Cache-Control": "private, no-store, no-cache, must-revalidate" },
  });
}
