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
  /**
   * 지금 선택된 차량이 이 경로를 통과 가능한지 — BE 가 3층 의사결정(정적 no-go × CCTV verdict ×
   * 차량 폭)으로 계산해서 내려준다 (§backend PR #24). true = 진입 가능, false = CCTV 판독으로
   * 이 차량 진입 불가 확정. 옛 mock 호환을 위해 optional.
   */
  passableForVehicle?: boolean;
  /**
   * BE 가 이 경로에서 정적 진입곤란(no-go) 을 CCTV 판독으로 unlock 한 CCTV id 목록. 카드에
   * "CCTV 042 · CCTV 073 으로 골목 2건 확인" 형태로 표시 가능. 없으면 unlock 없음(또는 옛 mock).
   */
  unlockedByCctv?: string[];
  /**
   * BE 가 이 경로에서 CCTV 판독이 없는 정적 no-go 를 마주쳤음을 표시. baseline 이 stale 일 수도
   * 있어 하드 차단은 아니지만 상황실이 "재검증 필요" 배지로 표시할 수 있게 한다.
   */
  hasUnresolvedStaticNoGo?: boolean;
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
