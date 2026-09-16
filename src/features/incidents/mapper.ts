import type {
  Attachment,
  CreateIncidentRequest,
  CreateStoredRoutesRequest,
  CreateUploadUrlRequest,
  Incident,
  IncidentStatus,
  StoredExcludedReason,
  StoredRoute,
  UploadUrl,
} from "./types";
import { INCIDENT_STATUS } from "./types";

/**
 * BE `IncidentResponse` wire shape · Jackson snake_case.
 * ⚠️ 실 코드로 확인 (backend/src/.../IncidentResponse.java · 2026-09-15).
 */
export interface BeIncident {
  incident_no: string;
  status: string;
  address: string;
  lat: number;
  lon: number;
  summary?: string | null;
  received_at: string;
  closed_at: string | null;
}

/**
 * BE `RouteCandidate` (incident 저장본) · Jackson snake_case.
 * ⚠️ 실 코드 · PR #34 예시 응답 · 2026-09-15 확인.
 */
export interface BeStoredRoute {
  rank: number;
  recommended: boolean;
  vehicle_id: string;
  passable_for_vehicle: boolean;
  meets_golden_time: boolean;
  passable_prob: number;
  explanation: string;
  excluded_reasons: BeStoredExcludedReason[];
  unlocked_by_cctv: string[];
}

export interface BeStoredExcludedReason {
  polygon_id: string;
  reason: string;
}

/** BE 신고 → UI 계약. status 는 알 수 없는 값이면 `RECEIVED` 로 폴백 (BE 스키마 변경 방어). */
export function toIncident(be: BeIncident): Incident {
  return {
    incidentNo: be.incident_no,
    status: parseIncidentStatus(be.status),
    address: be.address,
    lat: be.lat,
    lon: be.lon,
    summary: be.summary ?? undefined,
    receivedAt: be.received_at,
    closedAt: be.closed_at,
  };
}

/**
 * BE enum 문자열 → `IncidentStatus`. 알 수 없는 값은 `RECEIVED` 로 관용 폴백.
 * ⚠️ 관용 폴백 이유 — 시연 중 BE 가 새 status (예: `PAUSED`) 를 추가해도 화면이 죽지 않는다.
 *    미확인 status 는 의도적으로 접수로 둔 뒤 · 배지 라벨만 raw 값 노출 검토 (v2).
 */
export function parseIncidentStatus(raw: string): IncidentStatus {
  const known = INCIDENT_STATUS[raw as keyof typeof INCIDENT_STATUS];
  return known ?? INCIDENT_STATUS.RECEIVED;
}

/** UI 요청 (camel) → BE 요청 body (snake). */
export function toBeIncidentRequest(req: CreateIncidentRequest): Record<string, unknown> {
  const body: Record<string, unknown> = {
    address: req.address,
    lat: req.lat,
    lon: req.lon,
  };
  if (req.summary !== undefined && req.summary !== "") body.summary = req.summary;
  return body;
}

/** BE 저장 경로 항목 → UI 계약. */
export function toStoredRoute(be: BeStoredRoute): StoredRoute {
  return {
    rank: be.rank,
    recommended: be.recommended ?? false,
    vehicleId: be.vehicle_id,
    passableForVehicle: be.passable_for_vehicle ?? false,
    meetsGoldenTime: be.meets_golden_time ?? false,
    passableProb: be.passable_prob ?? 0,
    explanation: be.explanation ?? "",
    excludedReasons: (be.excluded_reasons ?? []).map(toStoredExcludedReason),
    unlockedByCctv: be.unlocked_by_cctv ?? [],
  };
}

export function toStoredExcludedReason(be: BeStoredExcludedReason): StoredExcludedReason {
  return {
    polygonId: be.polygon_id,
    reason: be.reason,
  };
}

/**
 * UI 요청 (camel) → BE 경로 산출 요청 body (snake).
 * ⚠️ 도착지는 신고 좌표를 BE 가 이미 알고 있어 요청에 없다 — 실수 방지.
 */
export function toBeStoredRoutesRequest(req: CreateStoredRoutesRequest): Record<string, unknown> {
  return {
    vehicle_id: req.vehicleId,
    from_lat: req.fromLat,
    from_lon: req.fromLon,
  };
}

/* ─────────────────────────────────────────────────────────────
 * 파일 업로드 · 신고 첨부 (BE #36 · #37 · 2026-09-16)
 * ─────────────────────────────────────────────────────────────
 */

export interface BeUploadUrl {
  upload_url: string;
  key: string;
  expires_in_seconds: number;
}

export interface BeAttachment {
  key: string;
  content_type: string;
  size_bytes: number;
  download_url: string;
  created_at: string;
}

export function toUploadUrl(be: BeUploadUrl): UploadUrl {
  return {
    uploadUrl: be.upload_url,
    key: be.key,
    expiresInSeconds: be.expires_in_seconds,
  };
}

export function toBeUploadUrlRequest(req: CreateUploadUrlRequest): Record<string, unknown> {
  return {
    content_type: req.contentType,
  };
}

export function toAttachment(be: BeAttachment): Attachment {
  return {
    key: be.key,
    contentType: be.content_type,
    sizeBytes: be.size_bytes,
    downloadUrl: be.download_url,
    createdAt: be.created_at,
  };
}
