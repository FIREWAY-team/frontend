/**
 * 상황 브리핑 상수 · 색상 · 규모→차량 매핑 · 애니메이션 타이밍.
 *
 * ⚠️ **차량별 색상 (Q4 확정 2026-10-08)** · 소형 파랑 · 중형 노랑 · 대형 빨강.
 * ⚠️ **애니메이션 1분 기준** · 심사 데모 영상 60초 안에 전체 흐름이 들어가야 함.
 * ⚠️ **차량별 라우팅은 BFF `VEHICLE_ROUTE_PROFILE` 이 처리** (§#54 BE 팀장 2026-10-08).
 *    차량마다 `/api/route` 를 Promise.all 로 병렬 호출하면 서로 다른 OSRM 경로가 나온다.
 * ⚠️ **중형·대형이 같은 길** (BE 확인 · a1·a41 이 같은 도로 위) · large 는 2대 (소형+대형).
 */

export const VEHICLE_COLOR: Record<string, string> = {
  "pump-3.5": "#3b82f6", // 소형 · 파랑
  "pump-8": "#eab308", // 중형 · 노랑
  "pump-15": "#ef4444", // 대형 · 빨강
  "aerial-25": "#9333ea", // 굴절 · 보라 (혹시 쓰일 때)
};

export const VEHICLE_LABEL: Record<string, string> = {
  "pump-3.5": "소형 소방차",
  "pump-8": "중형 소방차",
  "pump-15": "대형 소방차",
  "aerial-25": "25m 굴절차",
};

export const VEHICLE_SHORT: Record<string, string> = {
  "pump-3.5": "소형",
  "pump-8": "중형",
  "pump-15": "대형",
  "aerial-25": "굴절",
};

/**
 * 신고 규모별 출동 차량 조합.
 *
 * ⚠️ **large 는 소형+대형 2대** (§#54) · 중형·대형이 같은 길이라 중형 제외.
 * ⚠️ medium·small 은 당분간 소형 1대 · 녹화 시나리오는 모란 (large) 하나.
 */
export function vehiclesForSeverity(severity: "small" | "medium" | "large" | undefined): string[] {
  if (severity === "large") return ["pump-3.5", "pump-15"];
  if (severity === "medium") return ["pump-3.5", "pump-15"];
  return ["pump-3.5"];
}

/** 애니메이션 전체 지속 시간 (ms). */
export const ANIMATION_TOTAL_MS = 60_000;

/** 애니메이션 틱 간격 (ms). */
export const ANIMATION_TICK_MS = 100;

/** SSE 재탐색 트리거 시점 (전체 애니메이션 중 몇 % 지점). · 대형 펌프차에만 적용. */
export const REROUTE_TRIGGER_RATIO = 0.4;

/** 도착지 CCTV 를 노출하는 거리 (m). · 각 차량이 이 거리 안에 들어오면 자동 표시. */
export const ARRIVAL_CCTV_RADIUS_M = 100;
