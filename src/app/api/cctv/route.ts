import { NextResponse } from "next/server";

import { fetchCctvMarkers } from "@/features/cctv/api";

/**
 * `/api/cctv` BFF — 지도 위 CCTV 마커 목록. BE `GET /api/cctv` 프록시.
 *
 * ⚠️ 브라우저는 backend 컨테이너에 직접 못 붙는다 · BFF 로 릴레이.
 * ⚠️ 실패 시 빈 배열 반환 — 지도가 비는 대신 마커만 안 뜬다.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const markers = await fetchCctvMarkers();
  return NextResponse.json(markers, {
    headers: { "Cache-Control": "private, no-store, no-cache, must-revalidate" },
  });
}
