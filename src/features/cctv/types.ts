/**
 * CCTV 판독 UI 계약 — BE `GET /api/cctv/{id}` 응답 (docs/api.md · 2026-09-14 · verdict Map 병합 반영).
 *
 * ⚠️ `verdict.status` 로 판정 상태(`PASS` · `UNCERTAIN` · `FAIL` 등)를 읽는다. BE 가 판정 근거를
 *    별도 키로 함께 넣을 수 있어 Map 으로 열어 뒀다. 프론트에서는 `status` 만 UI 배지에 쓴다.
 * ⚠️ `edgeId` · `detectedObjects` 필드는 현재 BE 응답에 없음 — DB 컬럼은 있으나 컨트롤러가 노출 안 함.
 *    지도 마커·객체 chip 이 필요해지면 팀장에게 BE 필드 노출 요청 (`/api/cctv/{id}` 확장 or 별도 endpoint).
 */
export interface CctvReading {
  id: string;
  /** CloudFront 정적 이미지 URL. */
  stillPublicUrl: string;
  /** m 단위. 도로 벽 사이 폭. */
  wallWidthM: number;
  /** m 단위. 감지된 장애물 총 폭. */
  obstacleWidthM: number;
  /** m 단위. 벽 폭에서 장애물을 뺀 실 통과 가능 폭. */
  effectiveWidthM: number;
  /** BE 가 산정한 판정 · `status` 키에 `PASS`/`UNCERTAIN`/`FAIL`. 그 외 근거 필드 여지. */
  verdict: CctvVerdict;
  /** 0~1. 판독 신뢰도. */
  confidence: number;
}

export interface CctvVerdict {
  status: string;
  [key: string]: string;
}
