import { LayoutDashboard } from "lucide-react";

import { AppHeader } from "@/components/layout/app-header";
import { DispatchView } from "@/features/dispatch/components/dispatch-view";
import { fetchScenarios } from "@/features/scenarios/api";
import { fetchVehicles } from "@/features/vehicles/api";

export const metadata = { title: "상황실" };

/**
 * `/dispatch` — 상황실 대시보드 (얼굴 화면).
 *
 * ⚠️ **서버 컴포넌트로 데이터 fetch**, 상호작용은 `DispatchView`(client)로 분리
 *    (§CLAUDE.md 핵심 4원칙). BE 실 API 를 서버 사이드에서 호출 · 실패 시 mock 폴백(§api.ts).
 * ⚠️ `POST /api/route` 는 클라이언트 시나리오 클릭 시점에 별도 호출 (§useRealRoutes).
 */
export default async function DispatchPage() {
  const [scenarios, vehicles] = await Promise.all([fetchScenarios(), fetchVehicles()]);

  return (
    <>
      <AppHeader title="상황실" icon={LayoutDashboard} />
      <DispatchView scenarios={scenarios} vehicles={vehicles} />
    </>
  );
}
