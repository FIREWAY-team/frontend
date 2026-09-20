"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { MapMarker, Polyline } from "react-kakao-maps-sdk";

import { KakaoCanvas } from "@/components/map/kakao-canvas";
import { AttachPanel } from "@/features/incidents/components/attach-panel";
import type { Incident } from "@/features/incidents/types";

import {
  FIRE_STATION,
  LIVE_ADDRESS,
  LIVE_DESTINATION_COORDS,
  LIVE_VEHICLES,
  STEP_TITLES,
  type StepId,
  STEPS,
} from "../moran-scenario";
import { useLiveRoutes } from "../use-live-routes";
import { LiveCctvLayer } from "./live-cctv-layer";

/** Live 시연 화점 설명 · 신고 접수 payload 로 사용 · 심사 시연에서 "실 접수" 신호. */
const LIVE_INCIDENT_SUMMARY = "라이브 시연 · 모란 A34 인접 화점 · 소방차 진입 필요";

export function LiveDemoView() {
  const step = useSyncExternalStore(subscribeHash, readStep, () => 1 as StepId);
  const [vehicleId, setVehicleId] = useState<string>("pump-3.5");
  const [revision, setRevision] = useState(0);
  const destination = LIVE_DESTINATION_COORDS;
  const smallRoutes = useLiveRoutes(destination, "pump-3.5", step >= 2, revision);
  const mediumRoutes = useLiveRoutes(destination, "pump-8", step >= 2, revision);
  const largeRoutes = useLiveRoutes(destination, "pump-15", step >= 2, revision);
  const routeQueries = {
    "pump-3.5": smallRoutes,
    "pump-8": mediumRoutes,
    "pump-15": largeRoutes,
  };
  const selectedQuery = routeQueries[vehicleId as keyof typeof routeQueries];
  const data = selectedQuery.data;
  const loading = [smallRoutes, mediumRoutes, largeRoutes].some((query) => query.loading);
  const error = selectedQuery.error;
  const routes = data?.routes ?? [];
  // 통과 가능 후보가 없으면 첫 후보를 "차선책" 으로 보여준다 · 시연 흐름 유지 (§handoff frontend.md).
  // explanation 에 라우터 폴백/제약이 그대로 실려 심사자가 상태를 알 수 있다.
  const best =
    routes.find((r) => r.passableForVehicle === true && !r.hasUnresolvedStaticNoGo) ?? routes[0];
  const vehicle = LIVE_VEHICLES.find((v) => v.id === vehicleId)!;
  const vehicleRoutes = LIVE_VEHICLES.map((item) => {
    const query = routeQueries[item.id];
    const route = bestRoute(query.data?.routes ?? []);
    return { vehicle: item, route };
  });

  // 실제 접수된 신고 · null 이면 아직 접수 전이거나 BE 실패 (조용히 fallthrough).
  const [incident, setIncident] = useState<Incident | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const go = useCallback((next: StepId) => {
    window.location.hash = `step=${next}`;
  }, []);

  /**
   * 1단계 → 2단계 진행 시 `POST /api/incidents` 실호출 → `incident_no` 저장.
   *
   * ⚠️ **BE 실패해도 시연 흐름은 이어진다** — null 로 두고 2단계 진입. 시연 신뢰성이 접수 성공보다
   *    우선 (§CLAUDE.md 정직성 · 라이브 시연 규약). 실패는 console.warn 만.
   * ⚠️ 화점 좌표는 지오코딩으로 확보한 `destination` · 없으면 안전상 접수 스킵.
   */
  const advanceFromStepOne = useCallback(async () => {
    if (!destination || submitting) {
      go(2);
      return;
    }
    if (incident) {
      // 이미 접수된 상태 · 재접수하지 않는다 (같은 시연 중 중복 방지).
      go(2);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: LIVE_ADDRESS,
          lat: destination.lat,
          lon: destination.lon,
          summary: LIVE_INCIDENT_SUMMARY,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as Incident;
        setIncident(data);
      } else {
        console.warn(`[live] 신고 접수 실패: HTTP ${res.status} · 시연 계속`);
      }
    } catch (err) {
      const name = err instanceof Error ? err.name : "unknown";
      console.warn(`[live] 신고 접수 오류: ${name} · 시연 계속`);
    } finally {
      setSubmitting(false);
      go(2);
    }
  }, [destination, incident, submitting, go]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLElement &&
        ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(event.target.tagName)
      )
        return;
      if (event.key === "ArrowRight" && step < 5) go((step + 1) as StepId);
      if (event.key === "ArrowLeft" && step > 1) go((step - 1) as StepId);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, go]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="border-border bg-surface flex flex-wrap items-center justify-between gap-3 border-b p-3">
        <nav aria-label="시연 단계" className="flex gap-2">
          {STEPS.map((s) => (
            <button
              key={s}
              onClick={() => go(s)}
              aria-current={s === step ? "step" : undefined}
              className={`rounded border px-3 py-2 text-xs ${s === step ? "border-primary bg-primary/10" : "border-border"}`}
            >
              {s}. {STEP_TITLES[s - 1]}
            </button>
          ))}
        </nav>
        <label className="flex items-center gap-2 text-sm">
          경로 상세
          <select
            aria-label="경로 상세 차량"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="border-border bg-surface rounded border p-2"
          >
            {LIVE_VEHICLES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
      </header>
      <div className="relative flex min-h-0 flex-1">
        <KakaoCanvas center={destination} level={step < 3 ? 5 : 3}>
          <MapMarker
            position={{ lat: FIRE_STATION.lat, lng: FIRE_STATION.lon }}
            title="성남소방서 · 출발"
          />
          <MapMarker
            position={{ lat: destination.lat, lng: destination.lon }}
            title={LIVE_ADDRESS}
          />
          {step >= 3 &&
            data?.assessments.map((a) => (
              <Polyline
                key={a.edgeId}
                path={a.coordinates.map(([lng, lat]) => ({ lat, lng }))}
                strokeWeight={6}
                strokeColor={
                  a.verdict === "PASS" ? "#22c55e" : a.verdict === "FAIL" ? "#ef4444" : "#eab308"
                }
                strokeOpacity={0.65}
              />
            ))}
          {/* 실 CCTV 12개 마커 · 3단계 이후 노출 · 클릭 시 팝업 (§handoff frontend.md #1). */}
          {step >= 3 && <LiveCctvLayer vehicleId={vehicleId} />}
          {step >= 4 &&
            vehicleRoutes.map(
              ({ vehicle: routeVehicle, route }) =>
                route && (
                  <Polyline
                    key={routeVehicle.id}
                    path={route.coordinates.map(([lng, lat]) => ({ lat, lng }))}
                    strokeWeight={routeVehicle.id === vehicleId ? 8 : 5}
                    strokeColor={vehicleRouteColor(routeVehicle.id)}
                    strokeOpacity={routeVehicle.id === vehicleId ? 0.95 : 0.58}
                    strokeStyle={route.passableForVehicle ? "solid" : "dash"}
                  />
                ),
            )}
        </KakaoCanvas>

        {/* 접수 번호 배지 · 2단계 이후 상시 노출 · "실 접수됐다" 신호. */}
        {step >= 2 && incident && (
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2 rounded-full border border-neutral-300 bg-white/95 px-3 py-1.5 text-[11px] shadow-md backdrop-blur-sm">
            <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9.5px] font-bold text-white">
              접수 완료
            </span>
            <span className="font-mono text-[11px] font-semibold text-neutral-900">
              {incident.incidentNo}
            </span>
          </div>
        )}

        <section
          aria-label="라이브 시연 결과"
          className="border-border bg-surface absolute right-4 bottom-4 z-10 max-h-[80%] w-96 overflow-y-auto rounded-lg border p-4 shadow-xl"
        >
          <h1 className="text-base font-semibold">{LIVE_ADDRESS}</h1>
          <p className="text-muted-foreground mt-1 text-xs">
            {step >= 4 ? `${vehicle.label} 상세` : "소형·중형·대형 동시 분석"} ·{" "}
            {STEP_TITLES[step - 1]} · AI 판독: 목데이터
          </p>
          {step === 1 && (
            <p className="my-4 text-sm">
              화재 신고를 접수하면 소형·중형·대형 소방차의 CCTV 판정과 경로를 동시에 계산합니다.
            </p>
          )}
          {step === 2 && (
            <>
              <p className="my-4 text-sm">
                접수된 화점 기준으로 모든 출동 차량의 통행 가능 골목과 도로 경로를 병렬 분석하고
                있습니다. 차량 선택은 계산 대상이 아니라 상세 경로 필터입니다.
              </p>
              {incident && (
                <p className="text-muted-foreground my-2 text-xs">
                  접수 번호 <span className="font-mono">{incident.incidentNo}</span> · 상태{" "}
                  {incident.status}
                </p>
              )}
            </>
          )}
          {step >= 3 && (
            <>
              {loading && (
                <p role="status" className="my-4 text-sm">
                  소형·중형·대형 CCTV 판정 및 도로 경로 동시 탐색 중…
                </p>
              )}
              {error && (
                <p role="alert" className="text-danger my-4 text-sm">
                  {error}
                </p>
              )}
              {data && (
                <>
                  <p className="my-3 text-sm">
                    CCTV 통과 {data.assessments.filter((a) => a.verdict === "PASS").length}개 · 불가{" "}
                    {data.assessments.filter((a) => a.verdict === "FAIL").length}개 · 미확인/불확실{" "}
                    {data.assessments.filter((a) => !["PASS", "FAIL"].includes(a.verdict)).length}개
                  </p>
                  {step === 3 && (
                    <ul className="mb-3 max-h-48 space-y-2 overflow-y-auto text-xs">
                      {data.assessments.map((a) => (
                        <li key={a.edgeId} className="border-border rounded border p-2">
                          {a.edgeId} · {a.verdict}
                          <br />
                          {a.cctvId
                            ? `CCTV ${a.cctvId} · 판독 신뢰도 ${Math.round(a.confidence * 100)}%`
                            : "모의 판독 없음"}
                        </li>
                      ))}
                    </ul>
                  )}
                  {!best && (
                    <p role="status" className="text-danger my-3 text-sm">
                      통행 가능한 경로를 찾지 못했습니다. 판독 자료와 현장 상황을 확인하거나 다른
                      차량을 선택해 주세요.
                    </p>
                  )}
                  {step >= 4 && (
                    <div className="my-3 space-y-2">
                      {vehicleRoutes.map(({ vehicle: routeVehicle, route }) => (
                        <button
                          key={routeVehicle.id}
                          type="button"
                          onClick={() => setVehicleId(routeVehicle.id)}
                          className={`border-border w-full rounded border p-3 text-left text-sm ${routeVehicle.id === vehicleId ? "ring-primary ring-2" : ""}`}
                        >
                          <span
                            className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: vehicleRouteColor(routeVehicle.id) }}
                          />
                          <b>{routeVehicle.label}</b> ·{" "}
                          {route
                            ? route.passableForVehicle
                              ? "통행 가능"
                              : "진입 제한"
                            : "계산 중"}
                          {route && (
                            <span className="text-muted-foreground ml-2 text-xs">
                              {Math.floor(route.etaSec / 60)}분 {route.etaSec % 60}초 ·{" "}
                              {(route.distanceM / 1000).toFixed(2)}km
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  {step === 5 && best && (
                    <div className="border-border my-2 rounded border p-3 text-sm">
                      <b>{vehicle.label} 선택 경로 상세</b>
                      <p className="text-muted-foreground mt-2 text-xs">{best.explanation}</p>
                      <p className="mt-1 text-xs">
                        CCTV 통과 근거: {best.unlockedByCctv?.join(", ") || "해제 대상 구간 없음"}
                      </p>
                    </div>
                  )}
                  {data.warnings.map((w) => (
                    <p key={w} className="text-muted-foreground my-2 text-xs">
                      {w.replace(/^[a-z_]+:\s*/, "")}
                    </p>
                  ))}
                </>
              )}
              <button
                onClick={() => setRevision((r) => r + 1)}
                disabled={loading}
                className="border-border my-2 rounded border p-2 text-xs disabled:opacity-50"
              >
                CCTV 판정·경로 다시 조회
              </button>
            </>
          )}
          {/*
            신고 첨부 · 접수 완료 이후 (2단계 이상) 상시 노출. 심사 시연에서 "실 접수 · 실 첨부" 흐름을
            눈으로 확인할 수 있어야 한다. 신고 없으면 안내 카드만 (§AttachPanel).
          */}
          {step >= 2 && <AttachPanel incidentNo={incident ? incident.incidentNo : null} />}
          <div className="mt-3 flex justify-between gap-2">
            {step > 1 && (
              <button
                onClick={() => go((step - 1) as StepId)}
                className="border-border rounded border px-3 py-2 text-sm"
              >
                이전
              </button>
            )}
            <button
              disabled={!destination || submitting || (step === 3 && (!data || !best))}
              onClick={() => {
                if (step === 1) {
                  void advanceFromStepOne();
                } else {
                  go(step === 5 ? 1 : ((step + 1) as StepId));
                }
              }}
              className="bg-primary text-primary-foreground ml-auto rounded px-3 py-2 text-sm disabled:opacity-40"
            >
              {step === 1
                ? submitting
                  ? "접수 요청 중…"
                  : "119 신고 접수 → CCTV 판정"
                : step === 5
                  ? "처음부터"
                  : step === 2
                    ? "전체 차량 CCTV 판정 보기"
                    : "다음"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function bestRoute(routes: NonNullable<ReturnType<typeof useLiveRoutes>["data"]>["routes"]) {
  return (
    routes.find((route) => route.passableForVehicle && !route.hasUnresolvedStaticNoGo) ?? routes[0]
  );
}

function vehicleRouteColor(vehicleId: string) {
  if (vehicleId === "pump-3.5") return "#2563eb";
  if (vehicleId === "pump-8") return "#f59e0b";
  return "#dc2626";
}
function readStep(): StepId {
  const n = Number(window.location.hash.match(/^#step=([1-5])$/)?.[1] ?? 1);
  return n as StepId;
}
function subscribeHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
