import type { NoGoPolygon } from "./types";

/**
 * BE `/api/no_go` 응답 항목 shape (`chore/domain-scaffold` 브랜치 · 2026-09-08 확인).
 * ⚠️ 미검증 · BE `main` 병합 후 재확인.
 * ⚠️ **`bbox` 쿼리 미지원** — 전체 폴리곤을 한 번에 내려주는 구조. 데이터가 커지면 서버쪽
 *    필터링 요청 필요(§FE-BE 리포트 §🔴 §4).
 */
export interface BeNoGoPolygon {
  id: number;
  dong: string;
  reason: string;
  layer: number;
  /** 각 꼭짓점 `[lat, lon]`. */
  polygon: Array<Array<number>>;
}

/**
 * BE 폴리곤 → UI 계약. 타입만 좁힘 (튜플 `[lat, lon]`).
 *
 * ⚠️ **꼭짓점 순서 검증 안 됨** — Kakao Map은 `[lat, lng]`을 기대하지만 BE 문서상 순서만
 *    있고 실제 방향은 코드로 재확인 필요(§CLAUDE.md 연동 검증). 첫 렌더 시 폴리곤이 뒤집혀
 *    보이면 여기서 swap.
 */
export function toNoGoPolygon(be: BeNoGoPolygon): NoGoPolygon {
  return {
    id: be.id,
    dong: be.dong,
    reason: be.reason,
    layer: be.layer,
    polygon: be.polygon
      .filter(
        (pt): pt is [number, number] =>
          pt.length === 2 && typeof pt[0] === "number" && typeof pt[1] === "number",
      )
      .map(([lat, lon]) => [lat, lon] as [number, number]),
  };
}
