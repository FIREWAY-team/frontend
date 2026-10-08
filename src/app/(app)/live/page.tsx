import { Siren } from "lucide-react";

import { AppHeader } from "@/components/layout/app-header";
import { fetchIncidentsAsScenarios } from "@/features/incidents/to-scenario";
import { BriefingView } from "@/features/live/components/briefing-view";

export const dynamic = "force-dynamic";
export const metadata = { title: "상황 브리핑" };

/**
 * `/live` → 상황 브리핑 · `?incident=[id]` 쿼리로 상황실에서 넘어옴.
 *
 * ⚠️ **2026-10-08 재구성** · 기존 5단계 데모 흐름을 폐기하고 · 특정 신고에 집중한 실시간 브리핑
 *    화면으로 교체. 쿼리 없이 들어오면 가장 최근 신고 자동 선택.
 * ⚠️ **데이터 소스 전환 (§D5)** · `/api/scenarios` → `/api/incidents` + 어댑터.
 */
export default async function LivePage() {
  const scenariosResult = await fetchIncidentsAsScenarios();

  return (
    <>
      <AppHeader title="상황 브리핑" icon={Siren} />
      <BriefingView incidents={scenariosResult.data} />
    </>
  );
}
