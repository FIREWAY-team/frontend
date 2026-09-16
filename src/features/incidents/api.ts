import "server-only";

import type { BeAttachment, BeIncident, BeStoredRoute, BeUploadUrl } from "./mapper";
import {
  toAttachment,
  toBeIncidentRequest,
  toBeStoredRoutesRequest,
  toBeUploadUrlRequest,
  toIncident,
  toStoredRoute,
  toUploadUrl,
} from "./mapper";
import type {
  Attachment,
  CreateIncidentRequest,
  CreateStoredRoutesRequest,
  CreateUploadUrlRequest,
  Incident,
  IncidentStatus,
  StoredRoute,
  UploadUrl,
} from "./types";

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://backend:8080";

/**
 * BE `/api/incidents/*` 서버 사이드 fetcher · BFF 경유용.
 *
 * ⚠️ **실패 시 `null`** — mock 폴백 없음. 신고 접수는 "실제 저장" 이 유일한 가치라 mock 으로
 *    가짜 접수번호를 만들면 심사 · 시연에서 거짓말이 된다 (§CLAUDE.md 정직성). 호출부가
 *    null 을 받으면 UI 에서 조용히 다음 단계로 fall-through 하거나 · 재시도 유도 배지.
 * ⚠️ 5초 timeout — 다른 도메인 (§scenarios · vehicles) 과 규약 일치.
 */

async function be<T>(
  path: string,
  init?: { method?: string; body?: Record<string, unknown>; timeoutMs?: number },
): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? 5000);
  try {
    const res = await fetch(`${BACKEND_API_URL}${path}`, {
      method: init?.method ?? "GET",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
    if (!res.ok) {
      console.warn(`[incidents] ${init?.method ?? "GET"} ${path} failed: HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    const name = err instanceof Error ? err.name : "unknown";
    console.warn(`[incidents] ${init?.method ?? "GET"} ${path} error: ${name}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * `POST /api/incidents` · 신고 접수. 성공 시 발급된 `incidentNo` 포함 응답.
 * ⚠️ 실패 (`null`) 는 라이브 시연에서 조용히 다음 단계로 넘어가는 안전망으로 처리 · 호출부 판단.
 */
export async function createIncident(req: CreateIncidentRequest): Promise<Incident | null> {
  const raw = await be<BeIncident>(`/api/incidents`, {
    method: "POST",
    body: toBeIncidentRequest(req),
  });
  return raw ? toIncident(raw) : null;
}

export async function fetchIncident(incidentNo: string): Promise<Incident | null> {
  const raw = await be<BeIncident>(`/api/incidents/${encodeURIComponent(incidentNo)}`);
  return raw ? toIncident(raw) : null;
}

export async function listIncidents(status?: IncidentStatus): Promise<Incident[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const raw = await be<BeIncident[]>(`/api/incidents${qs}`);
  if (!Array.isArray(raw)) return [];
  return raw.map(toIncident);
}

/**
 * `POST /api/incidents/{no}/routes` · 경로 산출 + 저장.
 * ⚠️ 같은 신고에 다시 호출하면 이전 결과가 통째로 대체된다 (BE #34 계약).
 * ⚠️ Valhalla + no-go 조합이라 10초 timeout — 다른 fetch 보다 여유.
 */
export async function createStoredRoutes(
  incidentNo: string,
  req: CreateStoredRoutesRequest,
): Promise<StoredRoute[] | null> {
  const raw = await be<BeStoredRoute[]>(`/api/incidents/${encodeURIComponent(incidentNo)}/routes`, {
    method: "POST",
    body: toBeStoredRoutesRequest(req),
    timeoutMs: 10_000,
  });
  if (!Array.isArray(raw)) return null;
  return raw.map(toStoredRoute);
}

export async function fetchStoredRoutes(incidentNo: string): Promise<StoredRoute[]> {
  const raw = await be<BeStoredRoute[]>(`/api/incidents/${encodeURIComponent(incidentNo)}/routes`);
  if (!Array.isArray(raw)) return [];
  return raw.map(toStoredRoute);
}

/* ─────────────────────────────────────────────────────────────
 * 파일 업로드 · 신고 첨부 (BE #36 · #37 · 2026-09-16)
 * ⚠️ **1단계 · 3단계는 BFF 경유** · 2단계 (S3 PUT) 는 브라우저 → S3 직결.
 *    따라서 이 파일은 1·3단계만 담당 · S3 PUT 은 client 코드에서.
 * ─────────────────────────────────────────────────────────────
 */

/**
 * `POST /api/files/upload-url` — presigned PUT URL 발급.
 * ⚠️ 5분 만료 · 발급 후 즉시 브라우저에서 S3 로 PUT.
 * ⚠️ Nginx IP 당 분당 5회 rate limit — 시연에서 반복 클릭 유의.
 */
export async function createUploadUrl(req: CreateUploadUrlRequest): Promise<UploadUrl | null> {
  const raw = await be<BeUploadUrl>(`/api/files/upload-url`, {
    method: "POST",
    body: toBeUploadUrlRequest(req),
  });
  return raw ? toUploadUrl(raw) : null;
}

/**
 * `POST /api/incidents/{no}/attachments` · S3 업로드 후 key 를 신고에 붙임.
 * ⚠️ **PUT 완료 후 부른다** — PUT 안 끝나고 부르면 BE 가 422 (S3 HEAD 실패).
 * ⚠️ 같은 key 재첨부 · 409. 없는 신고 · 404. 상한 초과 · 422 + S3 파일 삭제.
 */
export async function attachToIncident(
  incidentNo: string,
  key: string,
): Promise<Attachment | null> {
  const raw = await be<BeAttachment>(
    `/api/incidents/${encodeURIComponent(incidentNo)}/attachments`,
    {
      method: "POST",
      body: { key },
    },
  );
  return raw ? toAttachment(raw) : null;
}

/**
 * `GET /api/incidents/{no}/attachments` · 첨부 목록.
 * ⚠️ `downloadUrl` 은 10분 TTL — 저장하지 말고 화면 열 때마다 부른다.
 */
export async function fetchAttachments(incidentNo: string): Promise<Attachment[]> {
  const raw = await be<BeAttachment[]>(
    `/api/incidents/${encodeURIComponent(incidentNo)}/attachments`,
  );
  if (!Array.isArray(raw)) return [];
  return raw.map(toAttachment);
}
