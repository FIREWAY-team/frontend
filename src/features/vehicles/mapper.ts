import type { Vehicle, VehicleSize } from "./types";
import { VEHICLE_SIZE } from "./types";

/**
 * BE `/api/vehicles` 응답 항목 shape (`chore/domain-scaffold` 브랜치 · 2026-09-08 확인).
 * ⚠️ 미검증 · BE `main` 병합 후 재확인.
 */
export interface BeVehicle {
  vehicle_id: string;
  name: string;
  width_m: number;
  height_m: number;
  length_m: number;
  weight_ton: number;
  turning_radius_m: number;
}

/**
 * BE 차량 → UI 계약. **`size`는 BE에 없어 폭·중량 기준으로 파생**.
 *
 * ⚠️ 파생 규칙(§`deriveVehicleSize`)은 프론트 정의. BE가 나중에 `size` 필드를 주면 그 값을
 *    우선 쓰도록 여기 로직만 갈아엎는다 — UI 계약(`Vehicle.size`)은 안 바뀐다.
 */
export function toVehicle(be: BeVehicle): Vehicle {
  return {
    id: be.vehicle_id,
    name: be.name,
    size: deriveVehicleSize(be),
    width: be.width_m,
    height: be.height_m,
    length: be.length_m,
    weight: be.weight_ton,
    turningRadius: be.turning_radius_m,
  };
}

/**
 * 폭·중량 조합으로 규격을 파생. 두 축 다 봐야 정확 — 폭만 보면 대형 SUV형 소방차를 놓치고,
 * 중량만 보면 짐 없는 상태의 대형이 중형으로 밀린다.
 *
 * | 규격 | 폭 | 중량 |
 * |---|---|---|
 * | SMALL | < 2.4m | < 5t |
 * | LARGE | ≥ 2.8m 또는 ≥ 12t | |
 * | MID | 그 외 | |
 *
 * ⚠️ **임계값은 성남 관할 실제 3대(소·중·대 펌프차)를 근거로 넉넉히 잡았다.** BE가 다른
 *    차종(구급차·굴절차)을 넣기 시작하면 이 표를 재검토한다.
 */
export function deriveVehicleSize(be: Pick<BeVehicle, "width_m" | "weight_ton">): VehicleSize {
  if (be.width_m >= 2.8 || be.weight_ton >= 12) return VEHICLE_SIZE.LARGE;
  if (be.width_m < 2.4 && be.weight_ton < 5) return VEHICLE_SIZE.SMALL;
  return VEHICLE_SIZE.MID;
}
