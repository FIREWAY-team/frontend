"use client";

import { useMemo, useState } from "react";

import { MapPlaceholder } from "@/features/map/components/map-placeholder";
import type { Scenario } from "@/features/scenarios/types";
import type { Vehicle } from "@/features/vehicles/types";

import { MOCK_ROUTES } from "../mock/routes";
import type { RouteCandidate } from "../types";
import { CandidateCard } from "./candidate-card";
import { DecisionBanner } from "./decision-banner";
import { EvidenceSheet } from "./evidence-sheet";
import { ScenarioList } from "./scenario-list";

interface DispatchViewProps {
  scenarios: Scenario[];
  vehicles: Vehicle[];
}

/**
 * `/dispatch` 화면의 클라이언트 오케스트레이터 — 상태(선택된 시나리오·미리보기 후보·근거
 * 시트 열림)를 여기서만 관리한다.
 *
 * ⚠️ 실 데이터 연결 시 `MOCK_ROUTES` 룩업이 `POST /route` 훅으로 대체된다. 화면 상태 흐름은
 *    그대로 유지 — 컴포넌트 트리는 안 건드림 (§CLAUDE.md Mock → Live 격리막).
 */
export function DispatchView({ scenarios, vehicles }: DispatchViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** 후보 카드 미리보기 상태 — 어떤 카드가 지도에 겹쳐 그려지는지. `null`이면 결정만. */
  const [previewingRank, setPreviewingRank] = useState<number | null>(null);
  /** 결정 배너에 올라가 있는 경로가 무엇인지 (승격 후 스왑에 쓴다). */
  const [decisionRank, setDecisionRank] = useState<number>(1);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const scenario = scenarios.find((s) => s.id === selectedId) ?? null;
  const routes = scenario ? (MOCK_ROUTES[scenario.id]?.routes ?? []) : [];
  const decision: RouteCandidate | null =
    routes.find((r) => r.rank === decisionRank) ?? routes[0] ?? null;
  const candidates = routes.filter((r) => r.rank !== decisionRank);
  const vehicle = useMemo(
    () => (scenario ? (vehicles.find((v) => v.id === scenario.vehicleHint) ?? null) : null),
    [scenario, vehicles],
  );

  function handleSelect(id: string) {
    setSelectedId(id);
    setDecisionRank(1);
    setPreviewingRank(null);
    setEvidenceOpen(false);
  }

  function handlePreview(rank: number) {
    setPreviewingRank((cur) => (cur === rank ? null : rank));
  }

  function handlePromote(rank: number) {
    setDecisionRank(rank);
    setPreviewingRank(null);
    setEvidenceOpen(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* 좌측 · 시나리오 리스트 */}
      <aside className="border-border bg-surface w-64 shrink-0 overflow-y-auto border-r">
        <ScenarioList scenarios={scenarios} selectedId={selectedId} onSelect={handleSelect} />
      </aside>

      {/* 우측 · 결정 배너 + 지도 + 후보 카드 */}
      <section className="flex min-w-0 flex-1 flex-col gap-3 p-4">
        <DecisionBanner
          decision={decision}
          vehicleName={vehicle?.name}
          onOpenEvidence={() => setEvidenceOpen(true)}
        />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <MapPlaceholder>
            {decision && (
              <div className="text-muted-foreground pointer-events-none absolute right-4 bottom-4 rounded bg-black/40 px-2 py-1 text-[10.5px]">
                결정 경로 굵게(6px, primary) · 미리보기 반투명 4px
              </div>
            )}
          </MapPlaceholder>

          {evidenceOpen && decision && (
            <EvidenceSheet candidate={decision} onClose={() => setEvidenceOpen(false)} />
          )}
        </div>

        {candidates.length > 0 && (
          <div className="flex gap-3">
            {candidates.map((c) => (
              <CandidateCard
                key={c.rank}
                candidate={c}
                previewing={previewingRank === c.rank}
                onPreview={() => handlePreview(c.rank)}
                onPromote={() => handlePromote(c.rank)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
