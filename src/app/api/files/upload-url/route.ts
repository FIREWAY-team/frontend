import { NextResponse } from "next/server";

import { createUploadUrl } from "@/features/incidents/api";
import type { UploadContentType } from "@/features/incidents/types";
import { UPLOAD_CONTENT_TYPES } from "@/features/incidents/types";

/**
 * `/api/files/upload-url` BFF — 브라우저에서 presigned S3 PUT URL 요청.
 *
 * ⚠️ **인가 · 서명은 BE 가 하고 우린 프록시만** — 브라우저 → BE 직결이면 CORS·인증 헤더 문제.
 * ⚠️ `content_type` 은 서명 대상 · 이후 S3 PUT 시 헤더가 같아야 함.
 * ⚠️ 허용 타입 화이트리스트 · BE 도 검증하지만 프록시가 먼저 걸러 왕복 절감.
 * ⚠️ IP 당 분당 5회 rate limit (Nginx) — 실제 제한은 인프라 층에서.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_TYPES = new Set<string>(Object.values(UPLOAD_CONTENT_TYPES));

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: { code: "MALFORMED_REQUEST" } }, { status: 400 });
  }
  const contentType = parseContentType(body);
  if (!contentType) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "허용되지 않는 파일 형식" } },
      { status: 400 },
    );
  }
  const result = await createUploadUrl({ contentType });
  if (!result) {
    return NextResponse.json(
      { error: { code: "EXTERNAL_SYSTEM_ERROR", message: "업로드 URL 발급 실패" } },
      { status: 502 },
    );
  }
  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-store, no-cache, must-revalidate" },
  });
}

function parseContentType(raw: unknown): UploadContentType | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const ct = r.contentType ?? r.content_type;
  if (typeof ct !== "string") return null;
  if (!ALLOWED_TYPES.has(ct)) return null;
  return ct as UploadContentType;
}
