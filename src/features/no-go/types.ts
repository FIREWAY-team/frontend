/**
 * 진입불가 폴리곤 UI 계약.
 *
 * ⚠️ 좌표는 `[lat, lon]` 순 (Kakao Map convention).
 * ⚠️ `layer`는 정적(1) · CCTV 판독 결과(3) 등 데이터 소스 구분. `/map` 오버레이 토글이 이 값으로
 *    필터링(§FRONTEND_SPEC §5-3).
 */
export interface NoGoPolygon {
  id: number;
  /** 행정동 명 (예: `은행1동`). */
  dong: string;
  /** 진입불가 사유 (예: `공사 중`). */
  reason: string;
  /** 데이터 소스 레이어. 1 = 정적 PDF, 3 = CCTV 판독. */
  layer: number;
  /** 폴리곤 꼭짓점 배열. `[lat, lon]` 페어. */
  polygon: Array<[number, number]>;
}
