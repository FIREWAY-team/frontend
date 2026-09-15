import { NextResponse } from "next/server";

import { createStoredRoutes, fetchStoredRoutes } from "@/features/incidents/api";
import type { CreateStoredRoutesRequest } from "@/features/incidents/types";

/**
 * `/api/incidents/[incidentNo]/routes` BFF — 신고별 경로 산출/조회.
 *
 * ⚠️ POST 는 새 경로 산출 + 저장 (BE #34) · **이전 결과 통째로 대체**. 차량 바뀔 때마다 호출.
 * ⚠️ GET 은 저장된 최신 경로 재조회 — 새로고침해도 근거 유지.
 * ⚠️ 도착지는 신고 좌표라 요청에 없음 · vehicle_id · from_lat · from_lon 만 필수.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface Params {
  params: Promise<{ incidentNo: string }>;
}

export async function POST(request: Request, { params }: Params) {
  const { incidentNo } = await params;
  if (!incidentNo) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR" } }, { status: 400 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "MALFORMED_REQUEST" } }, { status: 400 });
  }
  const req = parseCreateStoredRoutes(body);
  if (!req) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "vehicleId · fromLat · fromLon 필수" } },
      { status: 400 },
    );
  }
  const result = await createStoredRoutes(incidentNo, req);
  if (!result) {
    return NextResponse.json(
      { error: { code: "EXTERNAL_SYSTEM_ERROR", message: "BE 경로 산출 실패" } },
      { status: 502 },
    );
  }
  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store, no-cache, must-revalidate" },
  });
}

export async function GET(_request: Request, { params }: Params) {
  const { incidentNo } = await params;
  if (!incidentNo) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR" } }, { status: 400 });
  }
  const routes = await fetchStoredRoutes(incidentNo);
  return NextResponse.json(routes, {
    headers: { "Cache-Control": "private, no-store, no-cache, must-revalidate" },
  });
}

function parseCreateStoredRoutes(raw: unknown): CreateStoredRoutesRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.vehicleId !== "string" || r.vehicleId.trim() === "") return null;
  if (typeof r.fromLat !== "number" || Number.isNaN(r.fromLat)) return null;
  if (typeof r.fromLon !== "number" || Number.isNaN(r.fromLon)) return null;
  return {
    vehicleId: r.vehicleId.trim(),
    fromLat: r.fromLat,
    fromLon: r.fromLon,
  };
}
