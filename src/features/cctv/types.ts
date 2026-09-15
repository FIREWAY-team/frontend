/**
 * CCTV 판독 UI 계약.
 *
 * ⚠️ BE 계약(§FE-BE 리포트)이 우리 이전 스펙과 다름 — `detected_objects` · 차량별 통과확률
 *    필드가 **없다**. 대신 `verdict` · `confidence` · 벽·장애물·유효 폭 세 수치가 있다.
 *    팝업 UI는 이 계약에 맞춰 재구성이 필요하나 이번 이슈 스코프 밖(§🔴 답변 대기).
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
  /** BE가 산정한 결과 (`PASS` · `FAIL` · `WARN` 등). enum은 BE 확정 후 좁힘. */
  verdict: string;
  /** 0~1. 판독 신뢰도. */
  confidence: number;
}
