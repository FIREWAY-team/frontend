/**
 * 진입불가 도로/폴리곤 UI 계약.
 *
 * ⚠️ BE 실계약(2026-09-13 backend `main` 병합분) 반영 — 대부분 도로 중심선(LineString)이고
 *    V2_1 픽스처 2건만 Polygon. 좌표는 GeoJSON 표준대로 `[lon, lat]` 순으로 UI 안에서도
 *    유지한다(BE의 breaking change 그대로). Kakao Map 넘길 때만 `{lat,lng}` 로 스왑.
 * ⚠️ `verificationStatus === "unverified"` 는 지도상 미확인 34건 — 라우팅 계산에서는 제외되지만
 *    상황실 확인용으로 지도에는 표시한다 (§staticdata PR #21 본문). 프론트는 점선/약한 색으로
 *    구분해서 그린다.
 * ⚠️ `layer` 는 데이터 소스: 1 = 정적 PDF(중원구청 관내도), 3 = CCTV 판독. 오버레이 토글이
 *    이 값으로 필터링(§FRONTEND_SPEC §5-3).
 */
export interface NoGoArea {
  id: number;
  /** 원본 임포트 식별자 (`<동>-impassable-<번호>`). 픽스처 행은 `null`. */
  extId: string | null;
  /** 행정동/도엽 명 (예: `은행1동`, `상대원1동1`). */
  dong: string;
  /** 진입곤란 사유 (예: `소방차 진입곤란 지정`, `공사 중`). */
  reason: string;
  /** 데이터 소스 레이어. 1 = 정적 PDF, 3 = CCTV 판독. */
  layer: number;
  /** `ok` = 판정 확정 · `unverified` = 위성 대조에서 실제 도로가 아닌 것으로 확인된 34건. */
  verificationStatus: "ok" | "unverified";
  /** 현장 사유. 대부분 빈 문자열. `unverified` 34건만 "지도상 미확인" 표기. */
  note: string;
  /** 기하 유형. LineString 이 압도적, V2_1 픽스처 2건만 Polygon. */
  geometryType: "LineString" | "Polygon";
  /** 좌표 배열, GeoJSON 순서 `[lon, lat]` 그대로. Kakao 로 넘기려면 스왑. */
  path: Array<[number, number]>;
}

/**
 * @deprecated 옛 계약. `NoGoArea` 로 이관됨. 임시 alias 로 유지해 다른 파일 컴파일이 깨지지 않게 한다.
 * ⚠️ 새 코드에서는 `NoGoArea` 를 쓴다.
 */
export type NoGoPolygon = NoGoArea;
