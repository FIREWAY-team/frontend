"use client";

import { AlertTriangle, Camera, PlayCircle, Siren } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapMarker, Polyline } from "react-kakao-maps-sdk";

import { KakaoCanvas } from "@/components/map/kakao-canvas";
import { FIRE_STATION } from "@/features/dispatch/hooks/use-backend-routes";
import type { RouteCandidate } from "@/features/dispatch/types";
import a21OverlayJson from "@/features/live/fixtures/a21-overlay.json";
import { TEST_INCIDENT_POOL } from "@/features/scenarios/intake-overrides";
import type { Scenario } from "@/features/scenarios/types";
import { cn } from "@/lib/utils";

const A21_OVERLAY = a21OverlayJson as unknown as A21Overlay;

import {
  ANIMATION_TICK_MS,
  ANIMATION_TOTAL_MS,
  ARRIVAL_CCTV_RADIUS_M,
  LANE_GAP_M,
  lanePath,
  REROUTE_TRIGGER_RATIO,
  routeLeaders,
  VEHICLE_COLOR,
  VEHICLE_LABEL,
  VEHICLE_SHORT,
  vehiclesForSeverity,
} from "../briefing-constants";

interface BriefingViewProps {
  incidents: Scenario[];
}

type ViewTab = "all" | string; // "all" or vehicle id

/**
 * 상황 브리핑 메인 뷰 · 특정 신고에 대한 집중 화면.
 *
 * ⚠️ **진입 즉시 AI 분석 완료 상태** · 경로가 다 떠 있음. "단계" 네비 없음.
 * ⚠️ **URL 쿼리 `?incident=[id]`** 로 상황실에서 넘어옴. 쿼리 없으면 가장 최근 신고 자동 선택.
 * ⚠️ **애니메이션 1분** · [출동 확정] 자동 시작 · 각 차량 Marker 가 polyline 따라 이동.
 * ⚠️ **재탐색 시나리오** · 대형 펌프차에만 자동 트리거 (40% 지점) · CCTV 가 통행 불가 감지한 척.
 * ⚠️ **100m 전 CCTV** · 각 차량이 도착 100m 이내 들어오면 자동 노출 (주차 공간 사전 파악).
 */
export function BriefingView({ incidents }: BriefingViewProps) {
  const router = useRouter();
  const params = useSearchParams();
  const incidentId = params.get("incident");

  // incident 선택 로직 · 쿼리 → BE 응답 + 테스트 pool 모두 lookup · 없으면 첫 신고
  const incident = useMemo(() => {
    if (!incidentId) return incidents[0] ?? null;
    const found =
      incidents.find((it) => it.id === incidentId) ??
      TEST_INCIDENT_POOL.find((it) => it.id === incidentId);
    return found ?? incidents[0] ?? null;
  }, [incidentId, incidents]);

  // 신고 없음 or 선택 없음
  if (!incident) {
    return <EmptyState onBack={() => router.push("/dispatch")} />;
  }

  return <BriefingContent incident={incident} />;
}

// ──────────────────────────────────────────────────────────────

function BriefingContent({ incident }: { incident: Scenario }) {
  const router = useRouter();
  // ⚠️ **차량별 라우팅은 BFF 프로파일이 처리** (§#54) · 차량마다 /api/route 를 Promise.all 로
  //    병렬 호출. BFF `VEHICLE_ROUTE_PROFILE` 이 소형 a21 · 대형 a41·a1 경유지로 OSRM 실도로
  //    경로를 뽑아주므로 각 차량은 서로 다른 polyline 을 받는다.
  const [routesByVehicle, setRoutesByVehicle] = useState<Record<string, RouteCandidate | null>>({});
  const [routeLoading, setRouteLoading] = useState(true);
  const [dispatched, setDispatched] = useState(false);
  const [progress, setProgress] = useState(0); // 0~1
  const [rerouteFired, setRerouteFired] = useState(false);
  const [viewTab, setViewTab] = useState<ViewTab>("all");

  const assignedVehicles = useMemo(
    () => vehiclesForSeverity(incident.intake?.severity),
    [incident.intake?.severity],
  );

  // 1. 차량별 경로 병렬 조회 · Promise.all 로 동시에 보내 1회 호출과 응답 시간 거의 같다.
  //    ⚠️ setState 를 effect 안에서 직접 호출하지 않도록 microtask 로 밀어낸다
  useEffect(() => {
    let alive = true;
    void Promise.resolve().then(async () => {
      if (!alive) return;
      setRouteLoading(true);
      setRoutesByVehicle({});
      try {
        const results = await Promise.all(
          assignedVehicles.map(async (vid) => {
            const res = await fetch("/api/route", {
              method: "POST",
              cache: "no-store",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                vehicleId: vid,
                from: FIRE_STATION,
                to: incident.location,
                k: 1,
              }),
            });
            if (!res.ok) return [vid, null] as const;
            const list = (await res.json()) as RouteCandidate[];
            return [vid, list[0] ?? null] as const;
          }),
        );
        if (!alive) return;
        setRoutesByVehicle(Object.fromEntries(results));
      } catch {
        if (alive) setRoutesByVehicle({});
      } finally {
        if (alive) setRouteLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [incident, assignedVehicles]);

  // 같은 길로 가는 차량 묶음 · 대표 차량의 색 · 선 하나로 그린다 (중형·대형·굴절 → 대형 빨강).
  const leaders = useMemo(
    () => routeLeaders(assignedVehicles, routesByVehicle),
    [assignedVehicles, routesByVehicle],
  );
  const rerouteGroupLabel = assignedVehicles
    .filter((v) => leaders[v] === "pump-15")
    .map((v) => VEHICLE_SHORT[v] ?? v)
    .join("·");

  // 적어도 하나의 route 가 로드됐는지 (헤더·사이드바 분기용)
  const anyRouteLoaded = useMemo(
    () => Object.values(routesByVehicle).some((r) => r !== null),
    [routesByVehicle],
  );

  // 소형·대형 공통 접두사 (갈라지는 지점 index) · Remotion live.json 의 commonPrefix 와 동치 (§C7).
  // BFF 가 vehicle profile via 를 다르게 주지만 OSRM 응답 앞부분은 보통 완전히 같은 좌표라
  // 자동으로 계산할 수 있다. 두 경로 중 짧은 쪽 길이까지 1:1 매칭. 좌표 비교는 소수점 그대로.
  const commonPrefix = useMemo(() => {
    const s = routesByVehicle["pump-3.5"]?.coordinates;
    const l = routesByVehicle["pump-15"]?.coordinates;
    if (!s || !l) return 0;
    const n = Math.min(s.length, l.length);
    let i = 0;
    while (i < n && s[i]![0] === l[i]![0] && s[i]![1] === l[i]![1]) i++;
    return i;
  }, [routesByVehicle]);

  // 2. 재탐색 trigger · 대형 포함되고 · 애니메이션 40% 지점 지나면 1회 발동 (§C7).
  //    Remotion 방식 · 좌표 shift 트릭 제거 · reroute 플래그만 세우고 polyline 레이어가
  //    공통 접두사·공유 꼬리·대형 자기 경로를 알아서 그린다 (Deathmatch.tsx 패턴).
  useEffect(() => {
    if (!dispatched || rerouteFired) return;
    if (!assignedVehicles.includes("pump-15")) return;
    if (progress < REROUTE_TRIGGER_RATIO) return;
    if (!routesByVehicle["pump-15"] || !routesByVehicle["pump-3.5"]) return;
    void Promise.resolve().then(() => {
      setRerouteFired(true);
    });
  }, [progress, dispatched, rerouteFired, routesByVehicle, assignedVehicles]);

  // 3. 애니메이션 tick + BE 상태 전이 (§D7)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startDispatch = useCallback(() => {
    if (dispatched || !anyRouteLoaded) return;
    setDispatched(true);

    // 백그라운드로 BE 에 DISPATCHED 전이 (§D7). 실패해도 UI 애니메이션은 그대로 진행.
    // BE 가 scenarios mock 상태면 404 가 뜰 수 있으므로 조용히 삼킨다.
    if (incident.id) {
      void (async () => {
        try {
          await fetch(`/api/incidents/${encodeURIComponent(incident.id)}/status`, {
            method: "PATCH",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "DISPATCHED" }),
          });
        } catch {
          /* 조용히 폴백 · 녹화 중 실패해도 애니메이션은 그대로 돈다 */
        }
      })();
    }

    const started = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - started;
      const next = Math.min(1, elapsed / ANIMATION_TOTAL_MS);
      setProgress(next);
      if (next >= 1 && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }, ANIMATION_TICK_MS);
  }, [dispatched, anyRouteLoaded, incident.id]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  // 차량별 위치 샘플링 · 각 차량이 자기 polyline 위를 progress 비율대로 이동.
  // 공유 접두사 구간에서는 소형·대형 좌표가 거의 동일하므로 시각적으로 함께 가는 것처럼
  // 보이고, 분기점 넘으면 자동으로 분리된다 (Remotion Deathmatch 와 동일 방식).
  const vehiclePositions = useMemo(() => {
    const result: Array<{ id: string; lat: number; lon: number }> = [];
    for (const vid of assignedVehicles) {
      const route = routesByVehicle[vid];
      if (!route) continue;
      // 같은 길로 가는 차량(중형·대형·굴절)이 한 점에 겹치지 않게 차량마다 속도를 조금씩 다르게.
      const speedBias = SPEED_BIAS[vid] ?? 1.0;
      const effectiveProgress = Math.min(1, progress * speedBias);
      const pt = sampleAlongPath(route.coordinates, effectiveProgress);
      if (pt) result.push({ id: vid, lat: pt[1], lon: pt[0] });
    }
    return result;
  }, [routesByVehicle, progress, assignedVehicles]);

  // 도착 100m 이내 차량 (CCTV 자동 노출용)
  const nearArrival = useMemo(() => {
    const nears: string[] = [];
    for (const v of vehiclePositions) {
      const dist = haversineM(v.lat, v.lon, incident.location.lat, incident.location.lon);
      if (dist <= ARRIVAL_CCTV_RADIUS_M) nears.push(v.id);
    }
    return nears;
  }, [vehiclePositions, incident.location]);

  const visibleVehicles =
    viewTab === "all" ? assignedVehicles : assignedVehicles.filter((v) => v === viewTab);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      {/* 상단 바 · 차량별 뷰 탭 */}
      <header className="border-border bg-surface flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/dispatch")}
            className="text-muted-foreground hover:text-foreground text-[12px]"
          >
            ← 상황실
          </button>
          <div className="bg-border h-4 w-px" />
          <h2 className="text-foreground text-[14px] font-semibold">{incident.title}</h2>
          {incident.intake?.severity && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                incident.intake.severity === "large"
                  ? "bg-danger/20 text-danger"
                  : incident.intake.severity === "medium"
                    ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    : "bg-primary/15 text-primary",
              )}
            >
              {incident.intake.severity === "large"
                ? "대형"
                : incident.intake.severity === "medium"
                  ? "중형"
                  : "소형"}
            </span>
          )}
        </div>
        <nav className="flex gap-1" aria-label="차량별 뷰 전환">
          <TabButton active={viewTab === "all"} onClick={() => setViewTab("all")}>
            전체
          </TabButton>
          {assignedVehicles.map((v) => (
            <TabButton key={v} active={viewTab === v} onClick={() => setViewTab(v)}>
              {VEHICLE_SHORT[v] ?? v}
            </TabButton>
          ))}
        </nav>
      </header>

      {/* 지도 + 사이드바 */}
      <div className="relative flex min-h-0 flex-1">
        <KakaoCanvas center={incident.location} level={5}>
          {/* 소방서 (출발) */}
          <MapMarker
            position={{ lat: FIRE_STATION.lat, lng: FIRE_STATION.lon }}
            title="성남소방서"
          />
          {/* 화재 지점 (목적지) */}
          <MapMarker
            position={{ lat: incident.location.lat, lng: incident.location.lon }}
            title={incident.title}
          />
          {/* 메인 경로 polyline (§C7 Remotion Deathmatch 패턴).
              재탐색 전: 소형 경로 하나만 그린다 (대형이 그 위에 있는 것처럼).
              재탐색 후: 소형 꼬리 회색 점선 (대형이 못 가는 길) + 소형 전체 파랑 + 대형 전체 빨강. */}
          {renderVehicleLanes(
            routesByVehicle,
            visibleVehicles,
            leaders,
            commonPrefix,
            rerouteFired,
          )}
          {/* 차량 Marker · 출동 후 애니메이션 중 */}
          {dispatched &&
            vehiclePositions
              .filter((v) => visibleVehicles.includes(v.id))
              .map((v) => (
                <MapMarker
                  key={v.id}
                  position={{ lat: v.lat, lng: v.lon }}
                  title={VEHICLE_LABEL[v.id] ?? v.id}
                  image={{
                    src: makeVehicleIconDataUri(
                      VEHICLE_COLOR[v.id] ?? "#64748b",
                      VEHICLE_SHORT[v.id]?.[0] ?? "?",
                    ),
                    size: { width: 30, height: 30 },
                    options: { offset: { x: 15, y: 15 } },
                  }}
                />
              ))}
        </KakaoCanvas>

        {/* 좌측 하단 · 재탐색 알림 토스트 (§C8) */}
        {rerouteFired && (
          <div className="animate-fade-in absolute bottom-6 left-6 z-10 flex items-start gap-2 rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-amber-900 shadow-lg dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
            <div className="text-[12px] leading-tight">
              <div className="font-semibold">{rerouteGroupLabel || "대형"} 재탐색 · A41 경유</div>
              <div>A21 골목 CCTV 통행 불확실 감지 · 북쪽 큰길로 우회 진입</div>
            </div>
          </div>
        )}

        {/* 재탐색 중 A21 CCTV 판독 패널 (§C9) · 왜 재탐색이 뜨는지 눈으로 확인용 */}
        {rerouteFired && progress < 1 && <RerouteCctvPanel overlay={A21_OVERLAY} />}
        {/* 100m 전 CCTV 영상 패널 · 재탐색 중이 아닐 때만 */}
        {!rerouteFired && viewTab !== "all" && nearArrival.includes(viewTab) && incident.id && (
          <ArrivalCctvPanel incidentId={incident.id} vehicleId={viewTab} />
        )}

        {/* 우측 패널 */}
        <aside className="border-border bg-surface/95 absolute top-4 right-4 bottom-4 z-10 w-80 overflow-y-auto rounded-lg border p-4 shadow-xl backdrop-blur">
          <BriefingSidebar
            incident={incident}
            routesByVehicle={routesByVehicle}
            routeLoading={routeLoading}
            assignedVehicles={assignedVehicles}
            dispatched={dispatched}
            progress={progress}
            onDispatch={startDispatch}
          />
        </aside>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────

function BriefingSidebar({
  incident,
  routesByVehicle,
  routeLoading,
  assignedVehicles,
  dispatched,
  progress,
  onDispatch,
}: {
  incident: Scenario;
  routesByVehicle: Record<string, RouteCandidate | null>;
  routeLoading: boolean;
  assignedVehicles: string[];
  dispatched: boolean;
  progress: number;
  onDispatch: () => void;
}) {
  const anyRoute = assignedVehicles.some((vid) => routesByVehicle[vid]);
  // 첫 번째 로드된 route 의 explanation 을 공통 근거로 노출 (차량별로 거의 동일)
  const primaryExplanation = useMemo(() => {
    for (const vid of assignedVehicles) {
      const r = routesByVehicle[vid];
      if (r?.explanation) return r.explanation;
    }
    return "";
  }, [routesByVehicle, assignedVehicles]);

  return (
    <div className="flex flex-col gap-3">
      <header className="flex flex-col gap-1">
        <div className="text-muted-foreground text-[10.5px] tracking-widest uppercase">
          상황 브리핑
        </div>
        <div className="text-foreground text-[13px] font-semibold">{incident.address}</div>
      </header>

      {routeLoading && (
        <p className="text-muted-foreground py-3 text-[12px]">AI 분석 중 · 경로 조회…</p>
      )}

      {!routeLoading && !anyRoute && (
        <p className="text-danger text-[12px]">
          경로를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}

      {anyRoute && (
        <>
          <section className="flex flex-col gap-1.5">
            <div className="text-muted-foreground text-[10.5px] tracking-widest uppercase">
              배정 차량 ({assignedVehicles.length}대)
            </div>
            {assignedVehicles.map((vid) => {
              const route = routesByVehicle[vid];
              return (
                <div
                  key={vid}
                  className="border-border bg-background flex items-center justify-between gap-2 rounded border px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                      style={{ backgroundColor: VEHICLE_COLOR[vid] }}
                    >
                      {VEHICLE_SHORT[vid]?.[0]}
                    </span>
                    <span className="text-foreground text-[12px] font-medium">
                      {VEHICLE_LABEL[vid] ?? vid}
                    </span>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-1.5 text-[10.5px]">
                    {route
                      ? `${Math.floor(route.etaSec / 60)}분 ${route.etaSec % 60}초 · ${(route.distanceM / 1000).toFixed(2)}km`
                      : "경로 없음"}
                  </div>
                </div>
              );
            })}
          </section>

          {!dispatched ? (
            <button
              type="button"
              onClick={onDispatch}
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-[13px] font-semibold"
            >
              <PlayCircle size={15} strokeWidth={2} />
              출동 확정
            </button>
          ) : (
            <section className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-foreground font-medium">출동 중</span>
                <span className="text-muted-foreground">{Math.round(progress * 100)}%</span>
              </div>
              <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full transition-all"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              {progress >= 1 && (
                <div className="text-primary mt-1 flex items-center gap-1 text-[11px]">
                  <Siren size={12} strokeWidth={2} />
                  모든 차량 도착
                </div>
              )}
            </section>
          )}

          {primaryExplanation && (
            <div className="text-muted-foreground border-border/60 border-t pt-2 text-[11px]">
              {primaryExplanation}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────

function ArrivalCctvPanel({ incidentId, vehicleId }: { incidentId: string; vehicleId: string }) {
  // 임시 · 도착지 CCTV 는 moran-a41 영상 재활용 (기존 S3) · 추후 incident id → 지역 CCTV 매핑 확장
  return (
    <div className="border-border bg-surface absolute bottom-4 left-4 z-10 flex w-72 flex-col gap-2 rounded-lg border p-2.5 shadow-xl">
      <div className="flex items-center gap-1.5">
        <Camera size={13} strokeWidth={2} className="text-primary" />
        <div className="text-foreground text-[12px] font-semibold">
          {VEHICLE_SHORT[vehicleId]} · 도착지 CCTV
        </div>
      </div>
      <div className="aspect-video overflow-hidden rounded bg-black">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
          src={`/api/cctv/${encodeURIComponent("cctv_moran_a41")}/media`}
          onError={(e) => {
            // 비디오 로드 실패 시 플레이스홀더
            (e.target as HTMLVideoElement).style.display = "none";
          }}
        />
      </div>
      <p className="text-muted-foreground text-[10.5px]">
        도착 100m 이내 · 주차 공간 사전 파악용 · 사건번호 {incidentId}
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 재탐색 CCTV overlay 패널 (§C9) · Remotion a21_overlay.json 그대로 사용

type A21Mask = { name: string; conf: number; poly: Array<[number, number]> };
type A21Ground = { y: number; wallL: number; wallR: number; obstacle: [number, number] };
type A21Reading = {
  cctvId: string;
  wallWidthM: number;
  obstacleWidthM: number;
  effectiveWidthM: number;
  verdict: Record<string, string>;
};
type A21Overlay = {
  frame: string;
  size: [number, number];
  masks: A21Mask[];
  ground: A21Ground;
  reading: A21Reading;
};

/**
 * 재탐색 발동 중 노출되는 A21 CCTV 판독 패널 (§C9).
 *
 * BE 팀장이 넘긴 overlay (`src/features/live/fixtures/a21-overlay.json`) 를 SVG 로 겹쳐 그려
 * 심사원이 왜 재탐색이 뜨는지 (= 좁은 골목 + 적치물) 를 눈으로 확인할 수 있게 한다.
 * 영상 작업자가 Remotion v2 에서 쓰던 포맷과 동일.
 */
function RerouteCctvPanel({ overlay }: { overlay: A21Overlay }) {
  const [w, h] = overlay.size;
  const r = overlay.reading;
  return (
    <div className="border-border bg-surface absolute bottom-4 left-4 z-10 flex w-80 flex-col gap-2 rounded-lg border p-2.5 shadow-xl">
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <Camera size={13} strokeWidth={2} className="text-amber-500" />
          <div className="text-foreground text-[12px] font-semibold">A21 골목 CCTV · 판독 중</div>
        </div>
        <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
          UNCERTAIN
        </span>
      </div>
      <div className="relative aspect-video overflow-hidden rounded bg-black">
        {/* 기준 프레임 (a21_f05.jpg) · 마스크·측정선이 이 프레임 기준으로 찍혔다 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/recording-fixtures/cctv/a21_f05.jpg"
          alt="A21 CCTV 판독 프레임"
          className="h-full w-full object-cover"
        />
        <svg
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          {/* 벽 ~ 벽 수평 측정선 */}
          <line
            x1={overlay.ground.wallL}
            x2={overlay.ground.wallR}
            y1={overlay.ground.y}
            y2={overlay.ground.y}
            stroke="#eab308"
            strokeWidth={4}
            strokeDasharray="12 8"
          />
          {/* 적치물 수평 측정선 */}
          <line
            x1={overlay.ground.obstacle[0]}
            x2={overlay.ground.obstacle[1]}
            y1={overlay.ground.y - 10}
            y2={overlay.ground.y - 10}
            stroke="#ef4444"
            strokeWidth={5}
          />
          {/* 차 마스크 polygon */}
          {overlay.masks.map((m, i) => (
            <polygon
              key={`${m.name}-${i}`}
              points={m.poly.map(([x, y]) => `${x},${y}`).join(" ")}
              fill="#ef4444"
              fillOpacity={0.28}
              stroke="#ef4444"
              strokeWidth={2}
            />
          ))}
        </svg>
      </div>
      <div className="flex flex-col gap-0.5 text-[10.5px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground">벽 ~ 벽</span>
          <span className="text-foreground font-medium">{r.wallWidthM.toFixed(2)}m</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">적치물</span>
          <span className="text-foreground font-medium">{r.obstacleWidthM.toFixed(2)}m</span>
        </div>
        <div className="flex justify-between">
          <span className="text-foreground font-semibold">유효 통행폭</span>
          <span className="font-bold text-amber-600 dark:text-amber-400">
            {r.effectiveWidthM.toFixed(2)}m
          </span>
        </div>
      </div>
      <div className="border-border/60 flex flex-wrap gap-1 border-t pt-1.5">
        {Object.entries(r.verdict).map(([vid, status]) => (
          <span
            key={vid}
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold",
              status === "PASS"
                ? "bg-primary/15 text-primary"
                : status === "FAIL"
                  ? "bg-danger/20 text-danger"
                  : "bg-amber-500/20 text-amber-600 dark:text-amber-400",
            )}
          >
            {VEHICLE_SHORT[vid] ?? vid} · {status}
          </span>
        ))}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-2.5 py-1 text-[11.5px] transition-colors",
        active
          ? "bg-primary/15 text-primary border-primary/30 border"
          : "text-muted-foreground hover:bg-muted border border-transparent",
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
      <Siren size={32} className="text-muted-foreground" strokeWidth={1.5} />
      <div className="flex flex-col gap-1">
        <p className="text-foreground text-[14px] font-medium">현재 활성 상황이 없습니다</p>
        <p className="text-muted-foreground max-w-[320px] text-[12px] break-keep">
          상황실에서 신고를 선택하면 해당 신고의 브리핑으로 이동합니다.
        </p>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-[12px] font-medium"
      >
        상황실로 이동
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// 유틸

/**
 * 차량별 경로 선 · 차량마다 고유색, 같은 도로를 함께 가면 나란히 (노선도 방식).
 *
 * - 재탐색 전: 전 차량이 소형 경로(최단경로)를 함께 간다 → 소형 경로 위에 차량 수만큼 평행선.
 * - 재탐색 후: 소형은 자기 경로, 나머지는 묶음 대표(대형) 경로. 소형 경로의 분기 이후 구간은
 *   회색 점선으로 남겨 "못 가는 길" 을 보여준다 (§C7 Deathmatch 패턴).
 * 차선 번호는 보이는 차량 기준으로 가운데 정렬 → 공통 구간에서도 선이 겹치지 않는다.
 */
function renderVehicleLanes(
  routes: Record<string, RouteCandidate | null>,
  visible: string[],
  leaders: Record<string, string>,
  prefix: number,
  rerouted: boolean,
): React.ReactNode {
  const small = routes["pump-3.5"]?.coordinates;
  const center = (visible.length - 1) / 2;
  const others = visible.some((v) => (leaders[v] ?? v) !== "pump-3.5");
  const blockedTail =
    rerouted && small && others ? small.slice(Math.max(1, Math.min(prefix, small.length)) - 1) : [];
  return (
    <>
      {blockedTail.length > 1 && (
        <Polyline
          path={blockedTail.map(([lon, lat]) => ({ lat, lng: lon }))}
          strokeWeight={6}
          strokeColor="#9ca3af"
          strokeOpacity={0.85}
          strokeStyle="shortdash"
        />
      )}
      {visible.map((vid, lane) => {
        const base = rerouted
          ? routes[leaders[vid] ?? vid]?.coordinates
          : (small ?? routes[vid]?.coordinates);
        if (!base) return null;
        return (
          <Polyline
            key={vid}
            path={lanePath(base, (lane - center) * LANE_GAP_M).map(([lon, lat]) => ({
              lat,
              lng: lon,
            }))}
            strokeWeight={4}
            strokeColor={VEHICLE_COLOR[vid] ?? "#64748b"}
            strokeOpacity={0.95}
            strokeStyle="solid"
          />
        );
      })}
    </>
  );
}

function sampleAlongPath(path: Array<[number, number]>, t: number): [number, number] | null {
  if (path.length === 0) return null;
  if (path.length === 1) return path[0] ?? null;
  const target = Math.max(0, Math.min(1, t));
  const total = path.length - 1;
  const idx = target * total;
  const lo = Math.floor(idx);
  const hi = Math.min(total, lo + 1);
  const frac = idx - lo;
  const a = path[lo];
  const b = path[hi];
  if (!a || !b) return null;
  return [a[0] + (b[0] - a[0]) * frac, a[1] + (b[1] - a[1]) * frac];
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SPEED_BIAS: Record<string, number> = {
  "pump-3.5": 1.08,
  "pump-8": 1.0,
  "pump-15": 0.94,
  "aerial-25": 0.88,
};

function makeVehicleIconDataUri(color: string, label: string): string {
  // 차량 고유색 원 + 차종 글자(소·중·대·굴). 같은 선 위에서도 차량을 구분하게 한다.
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'>
    <circle cx='15' cy='15' r='13' fill='${color}' stroke='white' stroke-width='2'/>
    <text x='15' y='20' font-size='13' font-weight='bold' text-anchor='middle' fill='white' font-family='sans-serif'>${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
