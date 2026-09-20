"use client";

import { useMemo, useState } from "react";
import { MapMarker, Polyline } from "react-kakao-maps-sdk";

import { KakaoCanvas } from "@/components/map/kakao-canvas";
import type { Scenario } from "@/features/scenarios/types";
import type { Vehicle } from "@/features/vehicles/types";

import { FIRE_STATION, useBackendRoutes } from "../hooks/use-backend-routes";
import type { RouteCandidate } from "../types";
import { CandidateCard } from "./candidate-card";
import { DecisionBanner } from "./decision-banner";
import { EvidenceSheet } from "./evidence-sheet";
import { IntakeOverlay } from "./intake-overlay";
import { ScenarioList } from "./scenario-list";

interface DispatchViewProps {
  scenarios: Scenario[];
  vehicles: Vehicle[];
}

/** 성남 중원구 대략 중심. 시나리오가 선택되지 않았을 때 지도 초기 위치. */
const DEFAULT_CENTER = { lat: 37.432, lon: 127.145 };

/**
 * 경로 순위별 색. rank 1 = 결정(파랑), 2 = 주황, 3 = 초록, 그 이하 = 회색 폴백.
 * ⚠️ CandidateCard 배지 색과 맞추면 사용자가 카드-지도 대응을 눈으로 잇는다.
 */
const ROUTE_COLORS = ["#6B9BD1", "#f59e0b", "#10b981"];

/**
 * `/dispatch` 화면 클라이언트 오케스트레이터.
 *
 * ⚠️ 실 BE 연결 시 `MOCK_ROUTES` 룩업이 `POST /api/route` 훅으로 대체된다. 화면 상태 흐름은
 *    그대로 유지 (§CLAUDE.md Mock → Live 격리막).
 * ⚠️ **BE `POST /api/route` 응답은 단일 경로 + waypoints**로 확인됨(§FE-BE 리포트 §🔴 §1).
 *    지금 후보 카드·순위 스왑 UX는 **팀장 답변 대기** — 답 오면 화면 재구성.
 */
export function DispatchView({ scenarios, vehicles }: DispatchViewProps) {
  // ⚠️ 초기 접속 즉시 첫 시나리오 자동 선택. 심사원이 "확정 가능한 경로가 없습니다" 를 먼저 보면
  //    시스템이 꺼진 것처럼 읽힌다 (§09-20 URL 심사 대응). 사용자가 직접 다른 시나리오를 눌러
  //    바꾸면 그 선택이 유지된다.
  const [selectedId, setSelectedId] = useState<string | null>(scenarios[0]?.id ?? null);
  const [previewingRank, setPreviewingRank] = useState<number | null>(null);
  const [decisionRank, setDecisionRank] = useState<number>(1);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  // 차량 선택 — 시나리오의 vehicleHint 를 기본값으로 하고 사용자가 상단 셀렉트로 바꿀 수 있다.
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const scenario = scenarios.find((s) => s.id === selectedId) ?? null;
  // 시나리오가 바뀌면 그 힌트 차량으로 선택 초기화. 사용자가 이후 직접 바꾸면 그 선택 유지.
  const activeVehicleId = selectedVehicleId ?? scenario?.vehicleHint ?? vehicles[0]?.id ?? "";
  const vehicle = useMemo(
    () => vehicles.find((v) => v.id === activeVehicleId) ?? null,
    [vehicles, activeVehicleId],
  );

  // BE 가 3층 의사결정(정적 no-go × CCTV verdict × 차량 폭)을 이미 매겨서 내려준다 (§backend PR #24).
  // 프론트는 렌더만. 옛 프론트-계산 훅(use-real-routes / use-osrm-enrich) 은 backend PR #24 로 함께 걷혔다.
  const { routes, loading } = useBackendRoutes({
    destination: scenario ? scenario.location : null,
    vehicleId: activeVehicleId,
  });
  const decision: RouteCandidate | null =
    routes.find(
      (r) => r.rank === decisionRank && r.passableForVehicle === true && !r.hasUnresolvedStaticNoGo,
    ) ??
    routes.find((r) => r.passableForVehicle === true && !r.hasUnresolvedStaticNoGo) ??
    null;
  const candidates = routes.filter((r) => r.rank !== decision?.rank);

  const center = scenario ? scenario.location : DEFAULT_CENTER;

  function handleSelect(id: string) {
    setSelectedId(id);
    setDecisionRank(1);
    setPreviewingRank(null);
    setEvidenceOpen(false);
    setSelectedVehicleId(null); // 새 시나리오는 해당 힌트 차량으로 자동 리셋
  }

  function handlePreview(rank: number) {
    setPreviewingRank((cur) => (cur === rank ? null : rank));
  }

  function handlePromote(rank: number) {
    if (
      !routes.some(
        (r) => r.rank === rank && r.passableForVehicle === true && !r.hasUnresolvedStaticNoGo,
      )
    )
      return;
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
        {/* 차량 선택 — 폭 기준으로 경로가 재계산된다. 시나리오 힌트 차량이 기본. */}
        {scenario && (
          <div className="border-border bg-surface flex items-center gap-3 rounded-md border px-3 py-2">
            <span className="text-muted-foreground text-[11.5px]">차량</span>
            <div className="flex gap-1.5">
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setSelectedVehicleId(v.id);
                    setDecisionRank(1);
                    setPreviewingRank(null);
                  }}
                  className={
                    v.id === activeVehicleId
                      ? "border-primary bg-primary/10 rounded border px-2.5 py-1 text-[11.5px]"
                      : "border-border text-muted-foreground hover:bg-surface-2 rounded border px-2.5 py-1 text-[11.5px]"
                  }
                >
                  {v.name} · {v.width}m
                </button>
              ))}
            </div>
          </div>
        )}
        <DecisionBanner
          decision={decision}
          loading={loading}
          vehicleName={vehicle?.name}
          onOpenEvidence={() => setEvidenceOpen(true)}
        />

        <div className="relative flex min-h-0 flex-1 flex-col">
          <KakaoCanvas center={center} level={scenario ? 5 : 6}>
            {/* 소방서(출발점) — 시나리오가 선택된 순간부터 항상 표시해서 파란 경로의 시작점이
                시각적으로 확인되게 한다. 실서비스에서는 화점에 가장 가까운 관할 소방서를 BE 가 선택. */}
            {scenario && (
              <MapMarker
                position={{ lat: FIRE_STATION.lat, lng: FIRE_STATION.lon }}
                title="성남소방서 (출발)"
                image={{
                  src: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='40' viewBox='0 0 32 40'%3E%3Cpath d='M16 0C7.2 0 0 7.2 0 16c0 12 16 24 16 24s16-12 16-24C32 7.2 24.8 0 16 0z' fill='%23dc2626'/%3E%3Ccircle cx='16' cy='16' r='6' fill='white'/%3E%3C/svg%3E",
                  size: { width: 32, height: 40 },
                  options: { offset: { x: 16, y: 40 } },
                }}
              />
            )}
            {scenario && (
              <MapMarker
                position={{ lat: scenario.location.lat, lng: scenario.location.lon }}
                title={scenario.title}
              />
            )}
            {/* 후보 경로 전부 rank 별 색으로 렌더 — 사용자가 카드를 안 눌러도 대안이 지도에
                한번에 보이게. 결정 경로(rank 1) 를 마지막에 그려 위로 올라오게 한다. */}
            {routes
              .slice()
              .sort((a, b) => b.rank - a.rank)
              .map((r) => {
                const isDecision = r.rank === decisionRank;
                const isPreview = previewingRank === r.rank;
                const impassable = r.passableForVehicle === false;
                return (
                  <Polyline
                    key={r.rank}
                    path={toKakaoPath(r.coordinates)}
                    strokeWeight={isDecision ? 6 : isPreview ? 5 : 4}
                    strokeColor={impassable ? "#ef4444" : (ROUTE_COLORS[r.rank - 1] ?? "#94a3b8")}
                    strokeOpacity={isDecision ? 0.95 : isPreview ? 0.85 : 0.55}
                    strokeStyle={impassable ? "shortdash" : isDecision ? "solid" : "dash"}
                  />
                );
              })}
          </KakaoCanvas>

          {scenario && <IntakeOverlay scenario={scenario} />}

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
