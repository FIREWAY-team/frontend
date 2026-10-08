import { NextResponse } from "next/server";

import { patchIncidentStatus } from "@/features/incidents/api";
import type { IncidentStatus } from "@/features/incidents/types";
import { INCIDENT_STATUS } from "@/features/incidents/types";

/**
 * `/api/incidents/{incidentNo}/status` BFF (§D2 · BE #41).
 *
 * 상황 브리핑 '출동 확정' 버튼이 이 엔드포인트를 쳐서 상태를 DISPATCHED 로 전이한다.
 *
 * ⚠️ BE 가 전이 규칙 강제. 되돌리기 / 종결·취소 뒤 변경 / 동시 변경 → 409 그대로 전달.
 * ⚠️ `X-Api-Token` 은 `beHeaders` 가 세션에서 꺼내 붙인다 (기존 incidents BFF 와 동일).
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ incidentNo: string }> },
) {
  const { incidentNo } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "MALFORMED_REQUEST" } }, { status: 400 });
  }
  const status = parseStatus(body);
  if (!status) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "status 는 RECEIVED·DISPATCHED·ON_SCENE·CLOSED·CANCELLED 중 하나여야 합니다",
        },
      },
      { status: 400 },
    );
  }
  const result = await patchIncidentStatus(incidentNo, status);
  if (!result) {
    return NextResponse.json(
      { error: { code: "EXTERNAL_SYSTEM_ERROR", message: "BE 상태 전이 실패" } },
      { status: 502 },
    );
  }
  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store, no-cache, must-revalidate" },
  });
}

function parseStatus(raw: unknown): IncidentStatus | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { status?: unknown };
  if (typeof r.status !== "string") return null;
  const upper = r.status.trim().toUpperCase() as keyof typeof INCIDENT_STATUS;
  return INCIDENT_STATUS[upper] ?? null;
}
