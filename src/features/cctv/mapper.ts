import type {
  CctvReading,
  CctvVerdict,
  DemoAssignment,
  MeasurementStatus,
  MediaStatus,
  VerdictStatus,
} from "./types";

/**
 * BE `/api/cctv/{id}` 응답 shape.
 *
 * ⚠️ **handoff 09-18 확장 필드** (BE 계약 확정 대기 · optional) — measurement_status ·
 *    measurement_failure_at · media_status · content_type · measured_at · demo_assignment.
 *    현 BE 응답에 없으면 undefined 그대로.
 * ⚠️ `still_public_url` 은 null 될 수 있음 (§handoff · 미등록·서명 실패).
 */
export interface BeCctvReading {
  cctv_id: string;
  still_public_url: string | null;
  wall_width_m: number;
  obstacle_width_m: number;
  effective_width_m: number;
  verdict: Record<string, string> | string;
  confidence: number;
  /** 스펙 확정된 필드는 `media_content_type` · 옛 배포 하위 호환용 `content_type` 도 받음. */
  content_type?: string | null;
  media_content_type?: string | null;
  measurement_status?: string | null;
  measurement_failure_at?: string | null;
  media_status?: string | null;
  measured_at?: string | null;
  /** 프리사인드 미디어 URL 만료 남은 초 · 응답 시각 기준 (§handoff 스펙 09-18). */
  media_url_expires_in_seconds?: number | null;
  demo_assignment?: BeDemoAssignment | null;
}

export interface BeDemoAssignment {
  evidence_cctv_id: string;
  shared_pass_footage: boolean;
  reassigned: boolean;
}

const VERDICT_VALUES: Record<string, VerdictStatus> = {
  PASS: "PASS",
  FAIL: "FAIL",
  UNCERTAIN: "UNCERTAIN",
  UNKNOWN: "UNKNOWN",
};

const MEASUREMENT_VALUES: Record<string, MeasurementStatus> = {
  computed: "computed",
  unavailable: "unavailable",
};

const MEDIA_VALUES: Record<string, MediaStatus> = {
  registered: "registered",
  not_registered: "not_registered",
  failed: "failed",
};

/**
 * BE CCTV 판독 → UI 계약.
 *
 * ⚠️ **verdict 하위 호환** — 옛 배포가 verdict 를 문자열로 내릴 수 있어 두 shape 다 받는다.
 *    문자열이면 `{status: <값>}` 로 감싸 통일.
 * ⚠️ **null still_public_url 그대로 유지** — UI 가 mediaStatus 로 판별해 "미디어 준비 중" 표시.
 * ⚠️ **알 수 없는 status/measurement/media 값** 은 undefined 로 둔다 (BE 스키마 변경 방어).
 */
export function toCctvReading(be: BeCctvReading): CctvReading {
  return {
    id: be.cctv_id,
    stillPublicUrl: be.still_public_url ?? null,
    // 스펙은 media_content_type · 옛 배포는 content_type · 둘 다 흡수 (§brief 09-19).
    contentType: be.media_content_type ?? be.content_type ?? undefined,
    mediaUrlExpiresInSeconds:
      typeof be.media_url_expires_in_seconds === "number"
        ? be.media_url_expires_in_seconds
        : undefined,
    wallWidthM: be.wall_width_m,
    obstacleWidthM: be.obstacle_width_m,
    effectiveWidthM: be.effective_width_m,
    verdict: toCctvVerdict(be.verdict),
    confidence: be.confidence,
    measurementStatus: be.measurement_status
      ? MEASUREMENT_VALUES[be.measurement_status]
      : undefined,
    measurementFailureAt: be.measurement_failure_at ?? undefined,
    mediaStatus: be.media_status ? MEDIA_VALUES[be.media_status] : undefined,
    measuredAt: be.measured_at ?? undefined,
    demoAssignment: be.demo_assignment ? toDemoAssignment(be.demo_assignment) : undefined,
  };
}

function toCctvVerdict(raw: Record<string, string> | string | null | undefined): CctvVerdict {
  if (raw == null) return { status: "UNKNOWN" };
  if (typeof raw === "string") return { status: parseVerdictStatus(raw) };
  const status = typeof raw.status === "string" ? parseVerdictStatus(raw.status) : "UNKNOWN";
  return { ...raw, status };
}

function parseVerdictStatus(raw: string): VerdictStatus {
  return VERDICT_VALUES[raw.trim().toUpperCase()] ?? "UNKNOWN";
}

function toDemoAssignment(be: BeDemoAssignment): DemoAssignment {
  return {
    evidenceCctvId: be.evidence_cctv_id,
    sharedPassFootage: be.shared_pass_footage,
    reassigned: be.reassigned,
  };
}
