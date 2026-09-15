import { NextResponse } from "next/server";

import { createIncident, listIncidents } from "@/features/incidents/api";
import type { CreateIncidentRequest, IncidentStatus } from "@/features/incidents/types";
import { INCIDENT_STATUS } from "@/features/incidents/types";

/**
 * `/api/incidents` BFF — 브라우저에서 신고 접수·목록 조회.
 *
 * ⚠️ `dynamic = 'force-dynamic'` — POST 는 원래 dynamic 이지만 GET 도 명시 · Next.js 캐시가
 *    빈 응답을 굳히지 않게.
 * ⚠️ 요청 body 최소 검증 — address · lat · lon 필수. summary 는 옵션.
 * ⚠️ BE 실패 시 프록시가 502 — 호출부가 조용히 다음 단계로 흘리거나 재시도.
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
  const req = parseCreateIncident(body);
  if (!req) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "address · lat · lon 필수" } },
      { status: 400 },
    );
  }
  const result = await createIncident(req);
  if (!result) {
    return NextResponse.json(
      { error: { code: "EXTERNAL_SYSTEM_ERROR", message: "BE 신고 접수 실패" } },
      { status: 502 },
    );
  }
  return NextResponse.json(result, {
    status: 201,
    headers: { "Cache-Control": "private, no-store, no-cache, must-revalidate" },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawStatus = url.searchParams.get("status");
  const status = rawStatus ? parseStatus(rawStatus) : undefined;
  if (rawStatus && !status) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: `알 수 없는 status: ${rawStatus}` } },
      { status: 400 },
    );
  }
  const list = await listIncidents(status);
  return NextResponse.json(list, {
    headers: { "Cache-Control": "private, no-store, no-cache, must-revalidate" },
  });
}

function parseCreateIncident(raw: unknown): CreateIncidentRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.address !== "string" || r.address.trim() === "") return null;
  if (typeof r.lat !== "number" || Number.isNaN(r.lat)) return null;
  if (typeof r.lon !== "number" || Number.isNaN(r.lon)) return null;
  const req: CreateIncidentRequest = { address: r.address.trim(), lat: r.lat, lon: r.lon };
  if (typeof r.summary === "string" && r.summary.trim() !== "") req.summary = r.summary.trim();
  return req;
}

function parseStatus(raw: string): IncidentStatus | undefined {
  const upper = raw.trim().toUpperCase() as keyof typeof INCIDENT_STATUS;
  return INCIDENT_STATUS[upper];
}
