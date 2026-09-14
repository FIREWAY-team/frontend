/**
 * 경로 UI 계약 — BE `POST /api/route` 응답 shape (routing-core v3 · 2026-09-14 확인).
 *
 * ⚠️ `rank: 1`이 결정 경로. UI는 이 순위 필드로 결정 배너와 후보 카드를 가른다.
 * ⚠️ `excludedReasons`가 근거 카드의 정본. 각 항목은 `polygonId`(no-go 폴리곤) · 이유 문구 ·
 *    증거 이미지 URL(있으면).
 * ⚠️ `meetsGoldenTime`은 배너의 5분 배지 유무를 결정한다. BE가 이미 정렬 상단으로 올려 준다.
 */

export interface RouteCandidate {
  rank: number;
  /** 화면 지도에 그릴 경로 (`[lon, lat]` 배열). GeoJSON convention 유지 (BE와 동일). */
  coordinates: Array<[number, number]>;
  /** Valhalla polyline6 (`10^-6도 정밀`). 옵션 · 지도에 직접 그릴 때는 `coordinates` 우선. */
  polyline?: string;
  /** 초 단위 예상 소요 (BE 반올림 뒤 정수). */
  etaSec: number;
  /** m 단위 거리. */
  distanceM: number;
  /** 0~1 · 히트맵·카드 대문에 %로 표시. CCTV 미연동 시 BE가 1.0 placeholder. */
  passableProb: number;
  /** 골든타임 5분(300초) 만족 여부. UI 결정 배너에 배지 표시. */
  meetsGoldenTime: boolean;
  /** LLM 근거 요약 (5줄 이하). 마크다운 아님 · 평문. */
  explanation: string;
  /** 제외된 no-go 폴리곤들 — 근거 카드 하단에 리스트. */
  excludedReasons: ExcludedReason[];
}

export interface ExcludedReason {
  /**
   * 제외된 no-go 폴리곤 id (BE `polygon_id`).
   * ⚠️ 이전 계약의 `edgeId`(도로 링크)와 다르다 — BE v3 스펙 이후 폴리곤 id 로 통일됨.
   */
  polygonId: string;
  reason: string;
  /** S3 CloudFront URL. 있으면 근거 카드 팝업으로 열림. `null` 가능. */
  evidenceUrl: string | null;
}

/**
 * 라우팅 결과 상태 (BE `alternatives_status`).
 * ⚠️ `no_alternative` 는 유효 후보 0 — "대안 없음 · 대로 정차 권고" 로 표시(§CLAUDE.md 정직성).
 * ⚠️ `partial` 은 후보는 있으나 골든타임 만족 후보 0 — 상단 배너에 경고 톤으로 표시.
 */
export type AlternativesStatus = "normal" | "partial" | "no_alternative";

export interface RouteResponse {
  /** BE 는 rank 오름차순 · 프론트가 재정렬하지 않는다. `no_alternative` 면 빈 배열. */
  routes: RouteCandidate[];
  /** 서버 계산 시간(정수 밀리초). 심사·디버깅용. */
  calcTimeMs: number;
  /** 필터·정렬·K 제한 후 실제 반환 개수. 화면 하단에 "3안 중 2안 표시" 처럼 표시 가능. */
  kEffective: number;
  /** 최종 routes 순서의 k_effective × k_effective 겹침 행렬. 시각화 여지. */
  overlapMatrix: number[][];
  alternativesStatus: AlternativesStatus;
}

/**
 * `POST /api/route` 요청 body — BE 계약 (v3).
 * ⚠️ `from` 은 출발 (관할 소방서 or 차량 현위치) · `to` 는 화점 정차점.
 */
export interface RouteRequest {
  vehicleId: string;
  from: { lat: number; lon: number };
  to: { lat: number; lon: number };
  /** 반환 상한 (1~3). 생략 시 3. */
  k?: number;
  /** 후보 간 겹침 임계값 (0~1). 생략 시 0.65. */
  overlapThreshold?: number;
  /** 골든타임 초. 생략 시 300 (5분). */
  goldenTimeSec?: number;
}
