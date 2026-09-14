import type { CctvReading, CctvVerdict } from "./types";

/**
 * BE `/api/cctv/{id}` 응답 shape (docs/api.md · 2026-09-14 · verdict Map 병합분).
 * ⚠️ `verdict` 가 v3 이후 `Map<string,string>`. 예: `{ "status": "PASS" }` (fixture 그대로).
 */
export interface BeCctvReading {
  cctv_id: string;
  still_public_url: string;
  wall_width_m: number;
  obstacle_width_m: number;
  effective_width_m: number;
  verdict: Record<string, string> | string;
  confidence: number;
}

/**
 * BE CCTV 판독 → UI 계약.
 *
 * ⚠️ **verdict 하위 호환** — 아직 옛 배포에 붙어 있는 인스턴스가 `verdict` 를 문자열로 내릴 수
 *    있어 두 shape 다 받는다. 문자열이면 `{status: <값>}` 로 감싸 통일. 이 shim 은 fix/cctv-verdict-map
 *    이 전 환경에 완전히 배포된 것 확인된 뒤 (팀장 확답 후) 제거.
 */
export function toCctvReading(be: BeCctvReading): CctvReading {
  return {
    id: be.cctv_id,
    stillPublicUrl: be.still_public_url,
    wallWidthM: be.wall_width_m,
    obstacleWidthM: be.obstacle_width_m,
    effectiveWidthM: be.effective_width_m,
    verdict: toCctvVerdict(be.verdict),
    confidence: be.confidence,
  };
}

function toCctvVerdict(raw: Record<string, string> | string | null | undefined): CctvVerdict {
  if (raw == null) return { status: "UNKNOWN" };
  if (typeof raw === "string") return { status: raw };
  const status = typeof raw.status === "string" ? raw.status : "UNKNOWN";
  return { ...raw, status };
}
