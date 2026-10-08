import { LayoutDashboard } from "lucide-react";

import { ConnectionBanner } from "@/components/common/connection-banner";
import { AppHeader } from "@/components/layout/app-header";
import { IncidentListView } from "@/features/dispatch/components/incident-list-view";
import { fetchIncidentsAsScenarios } from "@/features/incidents/to-scenario";

export const metadata = { title: "상황실" };

/**
 * `/dispatch` — 상황실 (접수된 신고 리스트).
 *
 * ⚠️ **역할 재정의 (2026-10-08)** · 지도·차량선택·경로결정은 상황 브리핑(`/live?incident=...`)
 *    으로 이전. 상황실은 CAD 연동으로 들어온 신고를 카드 그리드로 보여주고 · 클릭 시 해당
 *    신고의 상황 브리핑으로 이동하는 역할만 담당.
 * ⚠️ **데이터 소스 전환 (§D5, 2026-10-08)** · `/api/scenarios` (BE 하드코딩 3건 mock) 에서
 *    `/api/incidents` 로 전환. CLOSED·CANCELLED 는 FE 가 필터링. 어댑터로 Scenario shape 유지.
 * ⚠️ **서버 컴포넌트로 데이터 fetch**, 상호작용은 `IncidentListView`(client)로 분리
 *    (§CLAUDE.md 핵심 4원칙).
 * ⚠️ **연동 상태를 배너로 노출** — fallback 일 때만 상단에 "연동 대기 중".
 */
export default async function DispatchPage() {
  const scenariosResult = await fetchIncidentsAsScenarios();

  return (
    <>
      <AppHeader title="상황실" icon={LayoutDashboard} />
      {scenariosResult.source === "fallback" && (
        <ConnectionBanner domain="신고" reason={scenariosResult.reason} />
      )}
      <IncidentListView initialIncidents={scenariosResult.data} />
    </>
  );
}
