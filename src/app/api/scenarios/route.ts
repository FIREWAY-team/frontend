import { NextResponse } from "next/server";

import { fetchScenarios } from "@/features/scenarios/api";

/**
 * `/api/scenarios` BFF — 브라우저 fetch 대상. 서버 사이드에서 BE 컨테이너로 프록시.
 *
 * ⚠️ `dynamic = 'force-dynamic'` — Next 가 build-time 로 SSG 하지 않게 못박음(§/api/no-go 관례).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const scenarios = await fetchScenarios();
  return NextResponse.json(scenarios, {
    headers: { "Cache-Control": "private, no-store, no-cache, must-revalidate" },
  });
}
