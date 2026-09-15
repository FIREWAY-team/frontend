import { LayoutDashboard } from "lucide-react";

import { ConnectionBanner } from "@/components/common/connection-banner";
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
 * ⚠️ **연동 상태를 배너로 노출** — mock 폴백일 때만 상단에 "연동 대기 중" (§ConnectionBanner).
 */
export default async function DispatchPage() {
  const [scenariosResult, vehiclesResult] = await Promise.all([fetchScenarios(), fetchVehicles()]);

  const fallbackDomains: string[] = [];
  const reasons: string[] = [];
  if (scenariosResult.source === "fallback") {
    fallbackDomains.push("시나리오");
    if (scenariosResult.reason) reasons.push(`scenarios · ${scenariosResult.reason}`);
  }
  if (vehiclesResult.source === "fallback") {
    fallbackDomains.push("차량");
    if (vehiclesResult.reason) reasons.push(`vehicles · ${vehiclesResult.reason}`);
  }

  return (
    <>
      <AppHeader title="상황실" icon={LayoutDashboard} />
      {fallbackDomains.length > 0 && (
        <ConnectionBanner
          domain={fallbackDomains.join(" · ")}
          reason={reasons.join(" / ") || undefined}
        />
      )}
      <DispatchView scenarios={scenariosResult.data} vehicles={vehiclesResult.data} />
    </>
  );
}
