/**
 * 경로 UI 계약 — BE `POST /route` 응답 shape 그대로.
 *
 * ⚠️ `rank: 1`이 결정 경로. UI는 이 순위 필드로 결정 배너와 후보 카드를 가른다.
 * ⚠️ `excludedReasons`가 근거 카드의 정본. 각 항목은 `edgeId`(도로 링크) · 이유 문구 ·
 *    증거 이미지 URL(있으면).
 */

export interface RouteCandidate {
  rank: number;
  /** 화면 지도에 그릴 경로 (`[lon, lat]` 배열). GeoJSON convention 유지. */
  coordinates: Array<[number, number]>;
  /** 초 단위 예상 소요. */
  etaSec: number;
  /** m 단위 거리. */
  distanceM: number;
  /** 0~1 · 히트맵·카드 대문에 %로 표시. */
  passableProb: number;
  /** LLM 근거 요약 (5줄 이하). 마크다운 아님 · 평문. */
  explanation: string;
  /** 제외된 도로 링크들 — 근거 카드 하단에 리스트. */
  excludedReasons: ExcludedReason[];
}

export interface ExcludedReason {
  edgeId: string;
  reason: string;
  /** S3 CloudFront URL. 있으면 근거 카드 팝업으로 열림. */
  evidenceUrl?: string;
}

export interface RouteResponse {
  /** BE는 순위 오름차순으로 준다 · 프론트가 재정렬하지 않는다. */
  routes: RouteCandidate[];
}
