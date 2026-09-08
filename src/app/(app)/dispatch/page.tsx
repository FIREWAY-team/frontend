import { LayoutDashboard } from "lucide-react";

import { AppHeader } from "@/components/layout/app-header";
import { DispatchView } from "@/features/dispatch/components/dispatch-view";
import { MOCK_SCENARIOS } from "@/features/scenarios/mock/scenarios";
import { MOCK_VEHICLES } from "@/features/vehicles/mock/vehicles";

export const metadata = { title: "상황실" };

/**
 * `/dispatch` — 상황실 대시보드 (얼굴 화면).
 *
 * ⚠️ **서버 컴포넌트로 데이터 fetch**, 상호작용은 `DispatchView`(client)로 분리
 *    (§CLAUDE.md 핵심 4원칙). 지금은 목 직접 import, 실 연동 시 `server.ts` fetch로 교체.
 */
export default function DispatchPage() {
  const scenarios = MOCK_SCENARIOS;
  const vehicles = MOCK_VEHICLES;

  return (
    <>
      <AppHeader title="상황실" icon={LayoutDashboard} />
      <DispatchView scenarios={scenarios} vehicles={vehicles} />
    </>
  );
}
