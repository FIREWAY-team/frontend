"use client";

import { useMemo, useState } from "react";
import { MapMarker, Polyline } from "react-kakao-maps-sdk";

import { KakaoCanvas } from "@/components/map/kakao-canvas";
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

/** 성남 중원구 대략 중심. 시나리오가 선택되지 않았을 때 지도 초기 위치. */
const DEFAULT_CENTER = { lat: 37.432, lon: 127.145 };

/**
 * `/dispatch` 화면 클라이언트 오케스트레이터.
 *
 * ⚠️ 실 BE 연결 시 `MOCK_ROUTES` 룩업이 `POST /api/route` 훅으로 대체된다. 화면 상태 흐름은
 *    그대로 유지 (§CLAUDE.md Mock → Live 격리막).
 * ⚠️ **BE `POST /api/route` 응답은 단일 경로 + waypoints**로 확인됨(§FE-BE 리포트 §🔴 §1).
 *    지금 후보 카드·순위 스왑 UX는 **팀장 답변 대기** — 답 오면 화면 재구성.
 */
export function DispatchView({ scenarios, vehicles }: DispatchViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewingRank, setPreviewingRank] = useState<number | null>(null);
  const [decisionRank, setDecisionRank] = useState<number>(1);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const scenario = scenarios.find((s) => s.id === selectedId) ?? null;
  const routes = scenario ? (MOCK_ROUTES[scenario.id]?.routes ?? []) : [];
  const decision: RouteCandidate | null =
    routes.find((r) => r.rank === decisionRank) ?? routes[0] ?? null;
  const candidates = routes.filter((r) => r.rank !== decisionRank);
  const previewing = previewingRank !== null ? routes.find((r) => r.rank === previewingRank) : null;
  const vehicle = useMemo(
    () => (scenario ? (vehicles.find((v) => v.id === scenario.vehicleHint) ?? null) : null),
    [scenario, vehicles],
  );

  const center = scenario ? scenario.location : DEFAULT_CENTER;

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
          <KakaoCanvas center={center} level={scenario ? 4 : 6}>
            {scenario && (
              <MapMarker
                position={{ lat: scenario.location.lat, lng: scenario.location.lon }}
                title={scenario.title}
              />
            )}
            {decision && (
              <Polyline
                path={toKakaoPath(decision.coordinates)}
                strokeWeight={6}
                strokeColor="#6B9BD1"
                strokeOpacity={0.95}
                strokeStyle="solid"
              />
            )}
            {previewing && (
              <Polyline
                path={toKakaoPath(previewing.coordinates)}
                strokeWeight={4}
                strokeColor="#8FB4E3"
                strokeOpacity={0.7}
                strokeStyle="dash"
              />
            )}
          </KakaoCanvas>

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

/**
 * MOCK_ROUTES는 `[lon, lat]` GeoJSON 관례로 저장 · Kakao는 `{lat, lng}` 객체를 원함. 변환.
 *
 * ⚠️ 이 변환을 한 곳에 몰아둬야 좌표 순서 사고를 막는다. 지도에 넣는 자리마다 순서를 새로
 *    쓰기 시작하면 어느 시점에 실수 하나로 폴리라인이 태평양에 그려진다.
 */
function toKakaoPath(coords: Array<[number, number]>) {
  return coords.map(([lon, lat]) => ({ lat, lng: lon }));
}
