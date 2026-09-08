import type { CctvReading } from "./types";

/**
 * BE `/api/cctv/{id}` 응답 shape (`chore/domain-scaffold` 브랜치 · 2026-09-08 확인).
 * ⚠️ 미검증 · BE `main` 병합 후 재확인.
 * ⚠️ 파라미터 이름 `id`. 우리는 `edge_id`로 부르지만 API 계약이 정본이다.
 */
export interface BeCctvReading {
  cctv_id: string;
  still_public_url: string;
  wall_width_m: number;
  obstacle_width_m: number;
  effective_width_m: number;
  verdict: string;
  confidence: number;
}

/** BE CCTV 판독 → UI 계약. 이름만 변환. */
export function toCctvReading(be: BeCctvReading): CctvReading {
  return {
    id: be.cctv_id,
    stillPublicUrl: be.still_public_url,
    wallWidthM: be.wall_width_m,
    obstacleWidthM: be.obstacle_width_m,
    effectiveWidthM: be.effective_width_m,
    verdict: be.verdict,
    confidence: be.confidence,
  };
}
