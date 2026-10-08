"use client";

import { AlertTriangle, Camera, PlayCircle, Siren } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapMarker, Polyline } from "react-kakao-maps-sdk";

import { KakaoCanvas } from "@/components/map/kakao-canvas";
import { FIRE_STATION } from "@/features/dispatch/hooks/use-backend-routes";
import type { RouteCandidate } from "@/features/dispatch/types";
import { TEST_INCIDENT_POOL } from "@/features/scenarios/intake-overrides";
import type { Scenario } from "@/features/scenarios/types";
import { cn } from "@/lib/utils";

import {
  ANIMATION_TICK_MS,
  ANIMATION_TOTAL_MS,
  ARRIVAL_CCTV_RADIUS_M,
  REROUTE_TRIGGER_RATIO,
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
  const [routeData, setRouteData] = useState<RouteCandidate | null>(null);
  const [routeLoading, setRouteLoading] = useState(true);
  const [dispatched, setDispatched] = useState(false);
  const [progress, setProgress] = useState(0); // 0~1
  const [rerouteFired, setRerouteFired] = useState(false);
  const [reroutedPath, setReroutedPath] = useState<Array<[number, number]> | null>(null);
  const [viewTab, setViewTab] = useState<ViewTab>("all");

  const assignedVehicles = useMemo(
    () => vehiclesForSeverity(incident.intake?.severity),
    [incident.intake?.severity],
  );

  // 1. 경로 조회 · incident 이 바뀔 때마다 재조회 (가장 큰 차량 기준으로 한 번만 호출)
  //    ⚠️ setState 를 effect 안에서 직접 호출하지 않도록 microtask 로 밀어낸다
  useEffect(() => {
    let alive = true;
    const biggest = assignedVehicles[assignedVehicles.length - 1] ?? "pump-3.5";
    void Promise.resolve().then(async () => {
      if (!alive) return;
      setRouteLoading(true);
      setRouteData(null);
      try {
        const res = await fetch("/api/route", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehicleId: biggest,
            from: FIRE_STATION,
            to: incident.location,
            k: 1,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const list = (await res.json()) as RouteCandidate[];
        if (alive) setRouteData(list[0] ?? null);
      } catch {
        if (alive) setRouteData(null);
      } finally {
        if (alive) setRouteLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [incident, assignedVehicles]);

  // 2. 재탐색 trigger · 대형 포함되고 · 애니메이션 40% 지점 지나면 1회
  //    ⚠️ setState 를 effect 안에서 직접 호출하지 않도록 microtask 로 밀어낸다
  //       (§ react-hooks/set-state-in-effect 규칙)
  useEffect(() => {
    if (!dispatched || rerouteFired || !routeData) return;
    if (!assignedVehicles.includes("pump-15")) return;
    if (progress < REROUTE_TRIGGER_RATIO) return;
    const original = routeData.coordinates;
    if (original.length < 4) return;
    const mid = Math.floor(original.length / 2);
    const detour: Array<[number, number]> = original.map(([lon, lat], i) => {
      if (i >= mid - 1 && i <= mid + 2) {
        return [lon + 0.0012, lat + 0.0008]; // 북동쪽으로 살짝 우회
      }
      return [lon, lat];
    });
    void Promise.resolve().then(() => {
      setRerouteFired(true);
      setReroutedPath(detour);
    });
  }, [progress, dispatched, rerouteFired, routeData, assignedVehicles]);

  // 3. 애니메이션 tick
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startDispatch = useCallback(() => {
    if (dispatched || !routeData) return;
    setDispatched(true);
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
  }, [dispatched, routeData]);

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  // 재탐색 발생 후 대형 펌프차의 "진행 비율" 을 원본보다 느리게 (우회로 시간 더 걸림)
  // 시각적 효과 · 다른 차량은 원본 경로 그대로
  // ⚠️ 차량별 polyline 이 완전히 겹쳐 1 색만 보이던 문제 (§#50) 해결 · 각 차량 경로를
  //    lat 방향으로 ~9m 평행 오프셋 → 지도에서 3 차선처럼 나란히 보인다. 마커도 같은
  //    오프셋을 받아야 폴리라인 위에 올라앉는다.
  const vehiclePositions = useMemo(() => {
    if (!routeData) return [] as Array<{ id: string; lat: number; lon: number }>;
    const result: Array<{ id: string; lat: number; lon: number }> = [];
    for (const vid of assignedVehicles) {
      // 차량별로 약간 다른 progress 시뮬레이션 · 소형이 가장 빠르다는 가정
      const speedBias = vid === "pump-3.5" ? 1.08 : vid === "pump-8" ? 1.0 : 0.92;
      const effectiveProgress = Math.min(1, progress * speedBias);
      const base = vid === "pump-15" && reroutedPath ? reroutedPath : routeData.coordinates;
      const idx = assignedVehicles.indexOf(vid);
      const path = offsetPath(base, idx, assignedVehicles.length);
      const pt = sampleAlongPath(path, effectiveProgress);
      if (pt) result.push({ id: vid, lat: pt[1], lon: pt[0] });
    }
    return result;
  }, [routeData, progress, reroutedPath, assignedVehicles]);

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
          {/* 메인 경로 polyline (차량별 색상 · lat 오프셋으로 평행선처럼 분리 §#50) */}
          {routeData &&
            visibleVehicles.map((vid) => {
              const base = vid === "pump-15" && reroutedPath ? reroutedPath : routeData.coordinates;
              const offsetIdx = assignedVehicles.indexOf(vid);
              const path = offsetPath(base, offsetIdx, assignedVehicles.length);
              return (
                <Polyline
                  key={vid}
                  path={path.map(([lon, lat]) => ({ lat, lng: lon }))}
                  strokeWeight={5}
                  strokeColor={VEHICLE_COLOR[vid] ?? "#64748b"}
                  strokeOpacity={0.9}
                  strokeStyle={vid === "pump-15" && reroutedPath ? "dash" : "solid"}
                />
              );
            })}
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
                    src: makeVehicleIconDataUri(VEHICLE_COLOR[v.id] ?? "#64748b"),
                    size: { width: 30, height: 30 },
                    options: { offset: { x: 15, y: 15 } },
                  }}
                />
              ))}
        </KakaoCanvas>

        {/* 좌측 하단 · 재탐색 알림 토스트 */}
        {rerouteFired && (
          <div className="animate-fade-in absolute bottom-6 left-6 z-10 flex items-start gap-2 rounded-md border border-amber-400 bg-amber-50 px-3 py-2 text-amber-900 shadow-lg dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
            <div className="text-[12px] leading-tight">
              <div className="font-semibold">대형 소방차 재탐색</div>
              <div>중간 지점 CCTV 가 통행 불가 감지 · 새 경로 안내 중</div>
            </div>
          </div>
        )}

        {/* 100m 전 CCTV 영상 패널 · 특정 차량 선택 뷰에서만 */}
        {viewTab !== "all" && nearArrival.includes(viewTab) && incident.id && (
          <ArrivalCctvPanel incidentId={incident.id} vehicleId={viewTab} />
        )}

        {/* 우측 패널 */}
        <aside className="border-border bg-surface/95 absolute top-4 right-4 bottom-4 z-10 w-80 overflow-y-auto rounded-lg border p-4 shadow-xl backdrop-blur">
          <BriefingSidebar
            incident={incident}
            routeData={routeData}
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
  routeData,
  routeLoading,
  assignedVehicles,
  dispatched,
  progress,
  onDispatch,
}: {
  incident: Scenario;
  routeData: RouteCandidate | null;
  routeLoading: boolean;
  assignedVehicles: string[];
  dispatched: boolean;
  progress: number;
  onDispatch: () => void;
}) {
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

      {!routeLoading && !routeData && (
        <p className="text-danger text-[12px]">
          경로를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
      )}

      {routeData && (
        <>
          <section className="flex flex-col gap-1.5">
            <div className="text-muted-foreground text-[10.5px] tracking-widest uppercase">
              배정 차량 ({assignedVehicles.length}대)
            </div>
            {assignedVehicles.map((vid) => (
              <div
                key={vid}
                className="border-border bg-background flex items-center justify-between gap-2 rounded border px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: VEHICLE_COLOR[vid] }}
                  />
                  <span className="text-foreground text-[12px] font-medium">
                    {VEHICLE_LABEL[vid] ?? vid}
                  </span>
                </div>
                <div className="text-muted-foreground text-[10.5px]">
                  {Math.floor(routeData.etaSec / 60)}분 {routeData.etaSec % 60}초 ·{" "}
                  {(routeData.distanceM / 1000).toFixed(2)}km
                </div>
              </div>
            ))}
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

          {routeData.explanation && (
            <div className="text-muted-foreground border-border/60 border-t pt-2 text-[11px]">
              {routeData.explanation}
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
 * 차량별 polyline 평행 오프셋 (§#50).
 *
 * BE 가 아직 차량별 라우팅을 돌려주지 않아 FE 가 단일 경로를 공유해 색상만 다르게 그리는데,
 * 좌표가 완전히 같으면 가장 위에 그려진 색만 보인다. lat 를 미세하게 평행 이동해 지도에서
 * 3 차선처럼 나란히 보이게 한다.
 *
 * 지도 레벨 5 (약 500m 가시 폭) 기준 ~9m 간격이 가장 자연스러움 — 더 크게 하면 경로가
 * 실제 도로를 벗어나 보인다. true-perpendicular 가 아니라 단순 lat 평행 이동이지만
 * 심사 영상 축척에서는 평행선처럼 보여 충분하다.
 */
function offsetPath(
  path: Array<[number, number]>,
  index: number,
  total: number,
): Array<[number, number]> {
  if (total <= 1) return path;
  const BASE_OFFSET_DEG = 0.00008; // 약 9m
  const shift = (index - (total - 1) / 2) * BASE_OFFSET_DEG;
  return path.map(([lon, lat]) => [lon, lat + shift]);
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

function makeVehicleIconDataUri(color: string): string {
  // 간단한 소방차 아이콘 SVG · 색상만 변경
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30' viewBox='0 0 30 30'>
    <circle cx='15' cy='15' r='13' fill='${color}' stroke='white' stroke-width='2'/>
    <text x='15' y='20' font-size='14' font-weight='bold' text-anchor='middle' fill='white'>🚒</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
