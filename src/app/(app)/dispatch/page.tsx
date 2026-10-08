import { LayoutDashboard } from "lucide-react";

import { ConnectionBanner } from "@/components/common/connection-banner";
import { AppHeader } from "@/components/layout/app-header";
import { IncidentListView } from "@/features/dispatch/components/incident-list-view";
import { fetchScenarios } from "@/features/scenarios/api";

export const metadata = { title: "상황실" };

/**
 * `/dispatch` — 상황실 (접수된 신고 리스트).
 *
 * ⚠️ **역할 재정의 (2026-10-08)** · 지도·차량선택·경로결정은 상황 브리핑(`/live?incident=...`)
 *    으로 이전. 상황실은 CAD 연동으로 들어온 신고를 카드 그리드로 보여주고 · 클릭 시 해당
 *    신고의 상황 브리핑으로 이동하는 역할만 담당.
 * ⚠️ **서버 컴포넌트로 데이터 fetch**, 상호작용은 `IncidentListView`(client)로 분리
 *    (§CLAUDE.md 핵심 4원칙). BE 실 API 를 서버 사이드에서 호출 · 실패 시 mock 폴백(§api.ts).
 * ⚠️ **연동 상태를 배너로 노출** — mock 폴백일 때만 상단에 "연동 대기 중" (§ConnectionBanner).
 */
export default async function DispatchPage() {
  const scenariosResult = await fetchScenarios();

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
