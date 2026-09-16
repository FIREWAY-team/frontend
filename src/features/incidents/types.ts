/**
 * 신고 접수 · 저장된 경로 UI 계약 — BE `/api/incidents/*` (backend #28 · #34 병합 · 2026-09-15).
 *
 * ⚠️ **정본은 BE 실코드**. `IncidentStatus` 는 BE `IncidentStatus.java` enum 과 이름을 맞춘다.
 * ⚠️ 저장 경로 후보는 `dispatch/types.ts` 의 `RouteCandidate` 와 **필드가 겹치되 완전 동일 X**
 *    — BE 가 이 endpoint 에서 추가로 `recommended` · `unlockedByCctv` · `vehicleId` 를 준다.
 *    Live 시연·근거 저장 UX 에만 쓰인다.
 */

/** BE `IncidentStatus.java` · 상태 전이는 서버 강제. */
export const INCIDENT_STATUS = {
  RECEIVED: "RECEIVED",
  DISPATCHED: "DISPATCHED",
  ON_SCENE: "ON_SCENE",
  CLOSED: "CLOSED",
  CANCELLED: "CANCELLED",
} as const;

export type IncidentStatus = (typeof INCIDENT_STATUS)[keyof typeof INCIDENT_STATUS];

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  RECEIVED: "접수됨",
  DISPATCHED: "출동지령",
  ON_SCENE: "현장도착",
  CLOSED: "종결",
  CANCELLED: "취소",
};

/** BE `IncidentResponse` UI 계약. wire snake_case → camel. */
export interface Incident {
  /** BE 자체 발급 접수 번호 (예: `INC-2026-000123`). URL·저장 키로 사용. */
  incidentNo: string;
  status: IncidentStatus;
  address: string;
  lat: number;
  lon: number;
  summary?: string;
  /** ISO8601 (KST). BE 는 `LocalDateTime` 을 문자열로 직렬화. */
  receivedAt: string;
  closedAt: string | null;
}

/** POST 요청 body — 클라이언트에서 BFF 로 보낼 때 camel · BFF 가 snake 로 변환. */
export interface CreateIncidentRequest {
  address: string;
  lat: number;
  lon: number;
  summary?: string;
}

/**
 * BE `/api/incidents/{no}/routes` 응답 항목 UI 계약.
 * ⚠️ `polygonId` 는 `no_go_areas.ext_id` — 재임포트해도 안 바뀌므로 근거 링크가 유지된다.
 * ⚠️ `recommended` 는 1순위 && 실제 통과 가능일 때만 true. 순위 1이어도 차량이 못 지나면 false.
 */
export interface StoredRoute {
  rank: number;
  recommended: boolean;
  vehicleId: string;
  passableForVehicle: boolean;
  meetsGoldenTime: boolean;
  passableProb: number;
  explanation: string;
  excludedReasons: StoredExcludedReason[];
  unlockedByCctv: string[];
}

export interface StoredExcludedReason {
  polygonId: string;
  reason: string;
}

/** POST `/api/incidents/{no}/routes` 요청 body — 도착지는 신고 좌표라 안 받는다. */
export interface CreateStoredRoutesRequest {
  vehicleId: string;
  fromLat: number;
  fromLon: number;
}

/* ─────────────────────────────────────────────────────────────
 * 파일 업로드 · 신고 첨부 (backend #36 · #37 · 2026-09-16)
 * ─────────────────────────────────────────────────────────────
 */

/**
 * BE 허용 업로드 타입 · `docs/api.md` "파일 업로드" 절.
 * ⚠️ 문자열은 S3 presigned URL 서명 대상 · 상수로 고정.
 */
export const UPLOAD_CONTENT_TYPES = {
  IMAGE_JPEG: "image/jpeg",
  IMAGE_PNG: "image/png",
  IMAGE_WEBP: "image/webp",
  VIDEO_MP4: "video/mp4",
  VIDEO_QUICKTIME: "video/quicktime",
} as const;

export type UploadContentType = (typeof UPLOAD_CONTENT_TYPES)[keyof typeof UPLOAD_CONTENT_TYPES];

/** 업로드 상한 (byte). BE 코드와 동일. */
export const UPLOAD_MAX_BYTES = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  VIDEO: 50 * 1024 * 1024, // 50MB
} as const;

/** 파일 종류 판정 유틸 · 업로드 상한 계산용. */
export function isVideoContentType(t: UploadContentType): boolean {
  return t === UPLOAD_CONTENT_TYPES.VIDEO_MP4 || t === UPLOAD_CONTENT_TYPES.VIDEO_QUICKTIME;
}

/**
 * `POST /api/files/upload-url` 응답 UI 계약.
 * ⚠️ `uploadUrl` 은 S3 presigned PUT · 5분 만료 · 발급 후 즉시 사용.
 * ⚠️ `key` 형식은 `uploads/<YYYY-MM-DD>/<uuid>` — BE 가 형식 검증 (3단계 첨부 확정 시 422).
 */
export interface UploadUrl {
  uploadUrl: string;
  key: string;
  expiresInSeconds: number;
}

export interface CreateUploadUrlRequest {
  contentType: UploadContentType;
}

/**
 * BE `/api/incidents/{no}/attachments` 응답 항목 UI 계약.
 * ⚠️ `downloadUrl` 은 **10분 TTL** — 화면 열 때마다 목록 재조회 (§CLAUDE.md 지도·이미지·CCTV 스틸).
 * ⚠️ `contentType` · `sizeBytes` 는 프론트 값이 아니라 BE 가 S3 HEAD 로 재조회한 값.
 */
export interface Attachment {
  key: string;
  contentType: string;
  sizeBytes: number;
  downloadUrl: string;
  createdAt: string;
}

/** `POST /api/incidents/{no}/attachments` 요청 body. */
export interface CreateAttachmentRequest {
  key: string;
}
