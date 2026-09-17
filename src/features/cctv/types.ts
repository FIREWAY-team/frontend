/**
 * CCTV 판독 UI 계약 — BE `GET /api/cctv/{id}` 응답.
 *
 * ⚠️ **AI handoff 09-18 확장** — measurement_status · media_status · content_type · scenario · demo_assignment
 *    필드가 붙을 예정 (BE 계약 확정 대기). null URL · 미매핑 · 서명 만료 케이스도 처리.
 * ⚠️ `verdict.status` 로 판정 상태 (`PASS · UNCERTAIN · FAIL · UNKNOWN`). BE 가 판정 근거를
 *    별도 키로 함께 넣을 수 있어 Map 으로 열어 뒀다.
 * ⚠️ **pump-15 는 원본 판정 없음** — verdict map 에 키가 없으면 `UNKNOWN` (§handoff frontend.md G).
 *    다른 차종 판정을 pump-15 로 복사 금지.
 */
export interface CctvReading {
  id: string;
  /**
   * 미디어 URL (BE 프리사인드 GET · 서명 만료 10분).
   * ⚠️ **null · undefined 허용** — 미등록·서명 실패 시 `<img>` 대신 안내 문구 표시.
   * ⚠️ 확장자로 image/video 판별 금지 · `contentType` 사용 (§handoff frontend.md D).
   */
  stillPublicUrl: string | null;
  /** MIME 타입 (`image/jpeg`, `image/png`, `video/mp4`, `video/quicktime` 등). 미상이면 undefined. */
  contentType?: string;
  /** m 단위. 도로 벽 사이 폭. */
  wallWidthM: number;
  /** m 단위. 감지된 장애물 총 폭. */
  obstacleWidthM: number;
  /** m 단위. 벽 폭에서 장애물을 뺀 실 통과 가능 폭. */
  effectiveWidthM: number;
  /** BE 산정 판정 · `status` 키 · 차종별 판정 · pump-15 는 없으면 UNKNOWN. */
  verdict: CctvVerdict;
  /** 0~1. 판독 신뢰도. */
  confidence: number;
  /**
   * 측정 상태 (§handoff frontend.md F).
   * - `computed` · 정상 측정 · 폭·판정 유효
   * - `unavailable` · 이번 시도 실패 · 이전 값 보존 · **최신 측정으로 표시 금지**
   */
  measurementStatus?: MeasurementStatus;
  /** measurement_status=unavailable 시 · 마지막 시도 시각 · 이전 값 시각과 구분. */
  measurementFailureAt?: string;
  /**
   * 미디어 상태 (§handoff frontend.md F).
   * - `registered` · 미디어 정상
   * - `not_registered` · 아직 업로드 안 됨 · "미디어 준비 중" 안내
   * - `failed` · 서명·GET 실패 · "미디어 오류" 안내 (판정은 유지)
   */
  mediaStatus?: MediaStatus;
  /** 측정 시각 (KST ISO8601). null 이면 미측정. */
  measuredAt?: string;
  /**
   * 시연 시나리오 배정 (§handoff frontend.md · 원본 vs 데모 구분).
   * ⚠️ **데모 재사용 표시 필수** — "동일 영상 재사용 시연" 문구 노출.
   * ⚠️ 5개 독립 도로 검증 성공으로 표현 금지.
   */
  demoAssignment?: DemoAssignment;
}

export type MeasurementStatus = "computed" | "unavailable";
export type MediaStatus = "registered" | "not_registered" | "failed";

/**
 * verdict 판정 · 차종별 key (`pump-3.5`, `pump-8`) + `status` 종합.
 * pump-15 는 원본 판정 없음 · 없으면 UNKNOWN.
 */
export interface CctvVerdict {
  status: VerdictStatus;
  [vehicleId: string]: string;
}

export type VerdictStatus = "PASS" | "FAIL" | "UNCERTAIN" | "UNKNOWN";

/**
 * 특정 차종 판정 조회 · 없으면 UNKNOWN.
 * ⚠️ pump-15 는 원본 판정 자리 없음 · 임의로 PASS 부여하지 않는다.
 */
export function verdictForVehicle(verdict: CctvVerdict, vehicleId: string): VerdictStatus {
  const raw = verdict[vehicleId];
  if (raw === "PASS" || raw === "FAIL" || raw === "UNCERTAIN") return raw;
  return "UNKNOWN";
}

/**
 * AI 데모 배정 정보 — 원본 CCTV 가 다른 CCTV 위치에 영상 재사용된 시연 시나리오.
 */
export interface DemoAssignment {
  /** 재사용된 원본 CCTV id (예: A41). */
  evidenceCctvId: string;
  /** 이 자리 CCTV 실 위치 판정으로 표현 X. */
  sharedPassFootage: boolean;
  /** true = 재배정된 시연 자리 · false = 원본. */
  reassigned: boolean;
}
