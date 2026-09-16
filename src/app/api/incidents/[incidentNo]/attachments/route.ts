import { NextResponse } from "next/server";

import { attachToIncident, fetchAttachments } from "@/features/incidents/api";

/**
 * `/api/incidents/[incidentNo]/attachments` BFF — 신고 첨부 확정 · 목록 조회.
 *
 * ⚠️ **BE #37 계약** · POST body `{ "key": "uploads/<YYYY-MM-DD>/<uuid>" }` · 응답 201 `Attachment`.
 *    브라우저가 S3 PUT 마친 뒤 이 endpoint 를 호출 · BE 가 S3 HEAD 로 존재·크기 재확인.
 * ⚠️ GET · `downloadUrl` 은 10분 TTL · 저장 금지 · 화면 열 때마다 재조회.
 * ⚠️ 실패 코드
 *    - 422 · key 형식 오류 or S3 미존재 or 크기 초과 (초과분은 BE 가 S3 에서 삭제)
 *    - 409 · 같은 key 재첨부
 *    - 404 · 없는 incidentNo
 * ⚠️ BFF 는 BE 실패를 502 로 통일 — 세부 상태는 BE 응답을 그대로 프록시하는 게 심사에 더 유리
 *    할 수 있으나 v1 은 단순화 · v2 에서 status 프록시 검토.
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
  const key = parseKey(body);
  if (!key) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "key 는 uploads/<YYYY-MM-DD>/<uuid> 형식" } },
      { status: 400 },
    );
  }
  const result = await attachToIncident(incidentNo, key);
  if (!result) {
    return NextResponse.json(
      { error: { code: "EXTERNAL_SYSTEM_ERROR", message: "BE 첨부 확정 실패" } },
      { status: 502 },
    );
  }
  return NextResponse.json(result, {
    status: 201,
    headers: { "Cache-Control": "private, no-store, no-cache, must-revalidate" },
  });
}

export async function GET(_request: Request, { params }: Params) {
  const { incidentNo } = await params;
  if (!incidentNo) {
    return NextResponse.json({ error: { code: "VALIDATION_ERROR" } }, { status: 400 });
  }
  const list = await fetchAttachments(incidentNo);
  return NextResponse.json(list, {
    headers: { "Cache-Control": "private, no-store, no-cache, must-revalidate" },
  });
}

/**
 * `uploads/<YYYY-MM-DD>/<uuid>` 형식 최소 검증.
 * ⚠️ BE 가 최종 검증 · FE 는 명백한 오탈자만 튕기고 넘김 (BE 규칙이 정본).
 */
function parseKey(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.key !== "string") return null;
  const key = r.key.trim();
  if (key === "") return null;
  if (!/^uploads\/\d{4}-\d{2}-\d{2}\/[a-zA-Z0-9-]+$/.test(key)) return null;
  return key;
}
