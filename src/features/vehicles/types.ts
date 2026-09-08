/**
 * 차량 UI 계약.
 *
 * ⚠️ BE 스펙(팀장 v2 초안 §3 `GET /vehicles`) 기준. 필드가 바뀌면 매퍼만 손대고 컴포넌트는
 *    이 타입만 본다 (§CLAUDE.md Mock → Live 격리막).
 */

export const VEHICLE_SIZE = {
  SMALL: "SMALL",
  MID: "MID",
  LARGE: "LARGE",
} as const;
export type VehicleSize = (typeof VEHICLE_SIZE)[keyof typeof VEHICLE_SIZE];

export const VEHICLE_SIZE_LABEL: Record<VehicleSize, string> = {
  SMALL: "소형",
  MID: "중형",
  LARGE: "대형",
};

export interface Vehicle {
  /** BE 식별자 (예: `pump-3.5` · `pump-8`). URL·API 파라미터로 그대로 쓴다. */
  id: string;
  /** 화면 표기 이름 (예: `소형펌프차`). */
  name: string;
  /** 규격 분류 — 히트맵·필터에 쓴다. `name`과 별개인 이유: 이름은 BE 자유 문자열, 이건 enum. */
  size: VehicleSize;
  /** m 단위. 폭 · 높이 · 길이. */
  width: number;
  height: number;
  length: number;
  /** t 단위. */
  weight: number;
  /** m 단위 최소 회전반경. */
  turningRadius: number;
}
