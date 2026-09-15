import { NextResponse } from "next/server";

import { fetchIncident } from "@/features/incidents/api";

/**
 * `/api/incidents/[incidentNo]` BFF — 단건 조회.
 * ⚠️ Next 15+ · `params` 는 Promise.
 * ⚠️ 404 는 명확히 · BE 가 null 을 준 상황과 구분해 UI 가 "존재하지 않음" 을 표시할 수 있게.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Params {
  params: Promise<{ incidentNo: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { incidentNo } = await params;
  if (!incidentNo) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR" } }, { status: 400 });
  }
  const incident = await fetchIncident(incidentNo);
  if (!incident) {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }
  return NextResponse.json(incident, {
    headers: { "Cache-Control": "private, no-store, no-cache, must-revalidate" },
  });
}
