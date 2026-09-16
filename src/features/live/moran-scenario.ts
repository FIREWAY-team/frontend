/** Live destination is geocoded; there are no scripted alley verdicts or route geometries. */
export const LIVE_ADDRESS = "경기 성남시 중원구 둔촌대로69번길 2-1";
export { FIRE_STATION } from "@/features/dispatch/hooks/use-backend-routes";
export type StepId = 1 | 2 | 3 | 4 | 5;
export const STEPS: StepId[] = [1, 2, 3, 4, 5];
export const STEP_TITLES = ["신고 접수", "차량 선택", "CCTV 통행 판정", "최적 경로", "후보 비교"];
export const LIVE_VEHICLES = [
  { id: "pump-3.5", label: "소형 소방차" },
  { id: "pump-8", label: "중형 소방차" },
  { id: "pump-15", label: "대형 소방차" },
] as const;
