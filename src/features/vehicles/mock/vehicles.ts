import type { Vehicle } from "../types";
import { VEHICLE_SIZE } from "../types";

/**
 * 목 차량 명단 — 성남소방서 관할 예선 시연용 3대.
 * ⚠️ BE `/vehicles` 응답 shape을 그대로 시뮬. 실 연동 시 이 파일은 지우거나 dev-only로 옮긴다.
 */
export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: "pump-3.5",
    name: "소형펌프차",
    size: VEHICLE_SIZE.SMALL,
    width: 2.3,
    height: 3.0,
    length: 7.0,
    weight: 3.5,
    turningRadius: 6.5,
  },
  {
    id: "pump-8",
    name: "중형펌프차",
    size: VEHICLE_SIZE.MID,
    width: 2.5,
    height: 3.3,
    length: 8.0,
    weight: 8.0,
    turningRadius: 8.0,
  },
  {
    id: "pump-15",
    name: "대형펌프차",
    size: VEHICLE_SIZE.LARGE,
    width: 2.9,
    height: 3.6,
    length: 9.5,
    weight: 15.0,
    turningRadius: 10.5,
  },
];
