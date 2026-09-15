import type { NoGoArea, NoGoPolygon } from "./types";

/**
 * BE `/api/no_go` 응답 항목 shape.
 * ⚠️ **snake_case** — Jackson 세팅으로 이 이름 그대로 내려온다.
 * ⚠️ 2026-09-13 backend `main` 병합분(PR #21) 기준. 옛 계약(`polygon`/`[lat,lon]`) 은 사라짐.
 *   좌표 순서는 GeoJSON 표준대로 `[lon, lat]`, 필드명은 `path`.
 */
export interface BeNoGoItem {
  id: number;
  ext_id: string | null;
  dong: string;
  reason: string;
  layer: number;
  verification_status: "ok" | "unverified";
  note: string;
  geometry_type: "LineString" | "Polygon";
  path: Array<Array<number>>;
}

/**
 * BE 응답 → UI 계약.
 *
 * ⚠️ 좌표 검증: 성남 대략 범위(경도 126.8~127.4 · 위도 37.2~37.6)를 벗어난 점은 축 순서가
 *    뒤집혔다는 신호 — 조용히 넘기지 않고 그 세그먼트 자체를 통째로 버린다. 임포트 스크립트가
 *    같은 조건으로 성남 밖 좌표를 거부하므로 실 데이터에는 절대 나오면 안 된다.
 */
export function toNoGoArea(be: BeNoGoItem): NoGoArea | null {
  const path = (be.path ?? [])
    .filter(
      (pt): pt is [number, number] =>
        Array.isArray(pt) &&
        pt.length === 2 &&
        typeof pt[0] === "number" &&
        typeof pt[1] === "number",
    )
    .filter(([lon, lat]) => lon > 126.8 && lon < 127.4 && lat > 37.2 && lat < 37.6);

  // LineString 은 최소 2점, Polygon 은 최소 4점(닫힌 링) 이 유효 조건. 그 이하는 그릴 수가 없다.
  const minPoints = be.geometry_type === "Polygon" ? 4 : 2;
  if (path.length < minPoints) return null;

  return {
    id: be.id,
    extId: be.ext_id,
    dong: be.dong,
    reason: be.reason,
    layer: be.layer,
    verificationStatus: be.verification_status,
    note: be.note ?? "",
    geometryType: be.geometry_type,
    path,
  };
}

/**
 * @deprecated 옛 매퍼 이름. `toNoGoArea` 로 이관됨. 다른 코드가 컴파일 되게 두는 shim.
 * ⚠️ 새 코드에서는 `toNoGoArea` 를 쓴다.
 */
export function toNoGoPolygon(be: BeNoGoItem): NoGoPolygon | null {
  return toNoGoArea(be);
}

/**
 * 옛 계약 shape (`polygon` 필드 + `[lat, lon]` 순서) — 이전 파일 import 가 깨지지 않게만 남긴다.
 * @deprecated 실제 BE 응답과 일치하지 않는다. `BeNoGoItem` 를 쓴다.
 */
export interface BeNoGoPolygon {
  id: number;
  dong: string;
  reason: string;
  layer: number;
  polygon: Array<Array<number>>;
}
