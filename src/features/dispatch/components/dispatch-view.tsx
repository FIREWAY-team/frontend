"use client";

import { useEffect, useMemo, useState } from "react";
import { MapMarker, Polyline } from "react-kakao-maps-sdk";

import { KakaoCanvas } from "@/components/map/kakao-canvas";
import type { NoGoArea } from "@/features/no-go/types";
import type { Scenario } from "@/features/scenarios/types";
import type { Vehicle } from "@/features/vehicles/types";

import { FIRE_STATION, useRealRoutes } from "../hooks/use-real-routes";
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
  // 차량 선택 — 시나리오의 vehicleHint 를 기본값으로 하고 사용자가 상단 셀렉트로 바꿀 수 있다.
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const scenario = scenarios.find((s) => s.id === selectedId) ?? null;
  // BE 진입곤란 도로 (§staticdata PR #21). 통과확률 계산에 쓴다.
  const [noGoAreas, setNoGoAreas] = useState<NoGoArea[]>([]);
  useEffect(() => {
    let alive = true;
    fetch("/api/no-go", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<NoGoArea[]>) : []))
      .then((data) => {
        if (alive) setNoGoAreas(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  // 시나리오가 바뀌면 그 힌트 차량으로 선택 초기화. 사용자가 이후 직접 바꾸면 그 선택 유지.
  const activeVehicleId = selectedVehicleId ?? scenario?.vehicleHint ?? vehicles[0]?.id ?? "";
  const vehicle = useMemo(
    () => vehicles.find((v) => v.id === activeVehicleId) ?? null,
    [vehicles, activeVehicleId],
  );
  const vehicleWidthM = vehicle?.width ?? 2.5;

  // 실 Valhalla 서버가 붙기 전 임시: 프론트가 OSRM alternatives 로 소방서→화점 3개 경로를 실계산.
  // 진입곤란 도로와의 근사 겹침으로 통과확률을 매기고 골든타임 5분 우선 정렬. ETA/거리는 OSRM 값.
  const routes = useRealRoutes({
    destination: scenario ? scenario.location : null,
    noGoAreas,
    vehicleWidthM,
  });
  const decision: RouteCandidate | null =
    routes.find((r) => r.rank === decisionRank) ?? routes[0] ?? null;
  const candidates = routes.filter((r) => r.rank !== decisionRank);
  const previewing = previewingRank !== null ? routes.find((r) => r.rank === previewingRank) : null;

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
            {decision && (
              <Polyline
                path={toKakaoPath(decision.coordinates)}
                strokeWeight={6}
                // 통과 가능한 결정 경로는 파랑, 진입불가 경로만 남았을 때 (모두 우회 불가) 는 빨강.
                strokeColor={decision.passableForVehicle === false ? "#ef4444" : "#6B9BD1"}
                strokeOpacity={0.95}
                strokeStyle={decision.passableForVehicle === false ? "shortdash" : "solid"}
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
