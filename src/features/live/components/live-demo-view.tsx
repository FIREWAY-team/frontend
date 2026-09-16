"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { MapMarker, Polyline } from "react-kakao-maps-sdk";

import { KakaoCanvas } from "@/components/map/kakao-canvas";
import { AttachPanel } from "@/features/incidents/components/attach-panel";
import type { Incident } from "@/features/incidents/types";

import {
  FIRE_STATION,
  LIVE_ADDRESS,
  LIVE_VEHICLES,
  STEP_TITLES,
  type StepId,
  STEPS,
} from "../moran-scenario";
import { useLiveRoutes } from "../use-live-routes";

/** Live 시연 화점 설명 · 신고 접수 payload 로 사용 · 심사 시연에서 "실 접수" 신호. */
const LIVE_INCIDENT_SUMMARY = "라이브 시연 · 중원구 주소 지오코딩 화점 · 소방차 진입 필요";

export function LiveDemoView() {
  const step = useSyncExternalStore(subscribeHash, readStep, () => 1 as StepId);
  const [vehicleId, setVehicleId] = useState<string>("pump-3.5");
  const [destination, setDestination] = useState<{ lat: number; lon: number } | null>(null);
  const [addressError, setAddressError] = useState("");
  const [revision, setRevision] = useState(0);
  const { data, error, loading } = useLiveRoutes(destination, vehicleId, step >= 3, revision);
  const routes = data?.routes ?? [];
  const best = routes.find((r) => r.passableForVehicle === true && !r.hasUnresolvedStaticNoGo);
  const vehicle = LIVE_VEHICLES.find((v) => v.id === vehicleId)!;

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
          출동 차량
          <select
            aria-label="출동 차량"
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
        <KakaoCanvas center={destination ?? FIRE_STATION} level={step < 3 ? 5 : 3}>
          <ResolveAddress onResolved={setDestination} onError={setAddressError} />
          <MapMarker
            position={{ lat: FIRE_STATION.lat, lng: FIRE_STATION.lon }}
            title="성남소방서 · 출발"
          />
          {destination && (
            <MapMarker
              position={{ lat: destination.lat, lng: destination.lon }}
              title={LIVE_ADDRESS}
            />
          )}
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
          {step >= 4 &&
            (step === 4 ? (best ? [best] : []) : routes).map((r) => (
              <Polyline
                key={r.rank}
                path={r.coordinates.map(([lng, lat]) => ({ lat, lng }))}
                strokeWeight={r === best ? 7 : 4}
                strokeColor={r === best ? "#3b82f6" : r.passableForVehicle ? "#22c55e" : "#ef4444"}
                strokeStyle={r.passableForVehicle ? "solid" : "dash"}
              />
            ))}
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
            {vehicle.label} · {STEP_TITLES[step - 1]} · AI 판독: 목데이터
          </p>
          {!destination && (
            <p role="status" className="mt-3 text-sm">
              {addressError || "주소의 지도 좌표를 확인하고 있습니다. 지도 API 설정이 필요합니다."}
            </p>
          )}
          {step === 1 && (
            <p className="my-4 text-sm">
              화재 신고 시연입니다. 주소를 확인한 뒤 출동 차량을 선택해 주세요.
            </p>
          )}
          {step === 2 && (
            <>
              <p className="my-4 text-sm">
                선택한 차량의 모의 AI 판독 결과를 조회하고, 통행 가능한 골목을 반영해 도로 경로를
                탐색합니다.
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
                  차량별 모의 AI 판정 조회 및 도로 경로 탐색 중…
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
                  {step >= 4 &&
                    (step === 4 ? (best ? [best] : []) : routes).map((r) => (
                      <div key={r.rank} className="border-border my-2 rounded border p-3 text-sm">
                        <b>
                          {r === best ? "추천 경로" : `후보 ${r.rank}`} ·{" "}
                          {r.passableForVehicle ? "통행 가능" : "진입 불가·미확인"}
                        </b>
                        <p>
                          {Math.floor(r.etaSec / 60)}분 {r.etaSec % 60}초 ·{" "}
                          {(r.distanceM / 1000).toFixed(2)} km
                        </p>
                        <p className="text-muted-foreground mt-2 text-xs">{r.explanation}</p>
                        <p className="mt-1 text-xs">
                          CCTV 통과 근거: {r.unlockedByCctv?.join(", ") || "해제 대상 구간 없음"}
                        </p>
                      </div>
                    ))}
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
                    ? "CCTV 판정·경로 탐색"
                    : "다음"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function ResolveAddress({
  onResolved,
  onError,
}: {
  onResolved: (value: { lat: number; lon: number }) => void;
  onError: (value: string) => void;
}) {
  useEffect(() => {
    let alive = true;
    new kakao.maps.services.Geocoder().addressSearch(LIVE_ADDRESS, (results, status) => {
      if (!alive) return;
      if (status === kakao.maps.services.Status.OK && results[0]) {
        onResolved({ lat: Number(results[0].y), lon: Number(results[0].x) });
      } else onError("주소 좌표를 조회하지 못했습니다. 지도 연결을 확인해 주세요.");
    });
    return () => {
      alive = false;
    };
  }, [onResolved, onError]);
  return null;
}
function readStep(): StepId {
  const n = Number(window.location.hash.match(/^#step=([1-5])$/)?.[1] ?? 1);
  return n as StepId;
}
function subscribeHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
