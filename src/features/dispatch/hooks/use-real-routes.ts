"use client";

import { useEffect, useState } from "react";

import type { NoGoArea } from "@/features/no-go/types";

import type { RouteCandidate, RouteResponse } from "../types";

/**
 * 성남 관내 소방서 좌표 — 시연에서는 하나로 고정. 실 서비스에서는 화점에 가장 가까운 관할 소방서를
 * BE 가 선택해 넘긴다(§FRONTEND_SPEC §5-2).
 * 성남소방서(성남대로 아래) 좌표.
 */
const FIRE_STATION = { lat: 37.4238, lon: 127.1367 } as const;

const GOLDEN_TIME_SEC = 300; // 5분
const NO_GO_PROXIMITY_M = 25; // 경로 세그먼트가 no-go 도로에 이 거리 안으로 붙으면 겹친다고 본다

interface UseRealRoutesInput {
  destination: { lat: number; lon: number } | null;
  vehicleId: string | null;
  noGoAreas: NoGoArea[];
}

/**
 * 화점 좌표를 받아 소방서 → 화점 경로 후보를 계산한다.
 *
 * ⚠️ **1순위: BE `POST /api/route`** — Valhalla 기반 실서비스 계산. `passableProb` 는 CCTV
 *    판독·차량 제원까지 결합해 나온 값.
 * ⚠️ **2순위: OSRM alternatives** — BE 다운·타임아웃 시 프론트가 공용 라우터로 대신 계산 · 진입
 *    곤란 도로와의 근사 겹침으로 통과확률을 매긴다. 시연이 가짜로 보이지 않게 하는 안전망.
 * ⚠️ OSRM 공용 인스턴스는 데모용 SLA — 초당 1회 rate limit, 다운 있을 수 있음. 실패 시 빈 배열.
 * ⚠️ vehicleId 가 없으면 BE 호출을 건너뛰고 바로 OSRM 로 간다 (BE 는 vehicleId 필수).
 */
export function useRealRoutes({
  destination,
  vehicleId,
  noGoAreas,
}: UseRealRoutesInput): RouteCandidate[] {
  const [snapshot, setSnapshot] = useState<{ key: string; value: RouteCandidate[] }>({
    key: "",
    value: [],
  });
  const key = destination
    ? `${destination.lat},${destination.lon}|${vehicleId ?? ""}|${noGoAreas.length}`
    : "";

  useEffect(() => {
    let alive = true;
    if (!destination) return;
    (async () => {
      // 1순위: BE 호출
      if (vehicleId) {
        const beRoutes = await fetchBeRoutes({ destination, vehicleId });
        if (!alive) return;
        if (beRoutes && beRoutes.length > 0) {
          setSnapshot({ key, value: beRoutes });
          return;
        }
      }
      // 2순위: OSRM 폴백
      const osrmRoutes = await fetchOsrmRoutes({ destination, noGoAreas });
      if (alive) setSnapshot({ key, value: osrmRoutes });
    })();

    return () => {
      alive = false;
    };
  }, [key, destination, vehicleId, noGoAreas]);

  // key 가 바뀐 직후 아직 응답이 오기 전이면 빈 배열(loading). 스냅샷 key 와 일치할 때만 반환.
  return snapshot.key === key ? snapshot.value : [];
}

/**
 * BE `/api/route` BFF 호출. 응답 성공하면 후보 배열 · 실패 시 `null`.
 * ⚠️ BFF 가 실패 (502) 하면 null 로 넘어와 호출부가 OSRM 폴백으로 간다.
 */
async function fetchBeRoutes(input: {
  destination: { lat: number; lon: number };
  vehicleId: string;
}): Promise<RouteCandidate[] | null> {
  try {
    const res = await fetch("/api/route", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vehicleId: input.vehicleId,
        from: { lat: FIRE_STATION.lat, lon: FIRE_STATION.lon },
        to: { lat: input.destination.lat, lon: input.destination.lon },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as RouteResponse;
    return Array.isArray(data.routes) ? data.routes : null;
  } catch {
    return null;
  }
}

/**
 * OSRM alternatives 폴백 — no-go 겹침 근사로 통과확률을 매기고 골든타임 우선 정렬.
 */
async function fetchOsrmRoutes(input: {
  destination: { lat: number; lon: number };
  noGoAreas: NoGoArea[];
}): Promise<RouteCandidate[]> {
  const { destination, noGoAreas } = input;
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${FIRE_STATION.lon},${FIRE_STATION.lat};${destination.lon},${destination.lat}` +
    `?overview=full&geometries=geojson&alternatives=3&steps=false`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return [];
    const data = (await res.json()) as OsrmResponse;
    const rawRoutes = data.routes ?? [];
    if (rawRoutes.length === 0) return [];
    const scored = rawRoutes.map((rr, i) => {
      const coords = (rr.geometry?.coordinates ?? []).filter(
        (pt): pt is [number, number] =>
          Array.isArray(pt) &&
          pt.length === 2 &&
          typeof pt[0] === "number" &&
          typeof pt[1] === "number",
      );
      const distanceM = Math.round(rr.distance ?? 0);
      const etaSec = Math.round(rr.duration ?? 0);
      const overlap = overlapRatio(coords, noGoAreas, NO_GO_PROXIMITY_M);
      const passableProb = Math.max(0.2, 0.96 - overlap * 0.75);
      const meetsGolden = etaSec <= GOLDEN_TIME_SEC;
      return {
        _raw: { i, meetsGolden, etaSec },
        candidate: {
          rank: 0,
          coordinates: coords,
          etaSec,
          distanceM,
          passableProb,
          meetsGoldenTime: meetsGolden,
          explanation: explain({ meetsGolden, etaSec, overlap, altIndex: i }),
          excludedReasons: [],
        } satisfies RouteCandidate,
      };
    });
    scored.sort((a, b) => {
      if (a._raw.meetsGolden !== b._raw.meetsGolden) return a._raw.meetsGolden ? -1 : 1;
      if (a.candidate.passableProb !== b.candidate.passableProb)
        return b.candidate.passableProb - a.candidate.passableProb;
      return a.candidate.etaSec - b.candidate.etaSec;
    });
    return scored.map((s, i) => ({ ...s.candidate, rank: i + 1 }));
  } catch {
    return [];
  }
}

/**
 * 경로 폴리라인이 no-go 도로들 전체 길이 중 얼마 정도를 근접해서 지나는지 근사한다.
 * 완벽한 geometry 교차 검사가 아니라, 경로의 각 세그먼트 중점이 어떤 no-go 세그먼트 중점과
 * `threshold` 미터 안이면 그 세그먼트를 "겹친 세그먼트"로 카운트.
 *
 * ⚠️ 근사법이다 — 실 서비스는 BE 가 spatial index 로 정확히 판정. 시연 시각용.
 */
function overlapRatio(
  pathCoords: [number, number][],
  noGo: NoGoArea[],
  thresholdM: number,
): number {
  if (pathCoords.length < 2 || noGo.length === 0) return 0;
  const pathSegs = segmentsFrom(pathCoords);
  if (pathSegs.length === 0) return 0;
  const noGoSegs: Array<[number, number, number, number]> = [];
  for (const area of noGo) {
    if (area.verificationStatus !== "ok") continue;
    const segs = segmentsFrom(area.path);
    for (const s of segs) noGoSegs.push(s);
  }
  if (noGoSegs.length === 0) return 0;

  let hits = 0;
  for (const [ax, ay, bx, by] of pathSegs) {
    const midLon = (ax + bx) / 2;
    const midLat = (ay + by) / 2;
    for (const [nx1, ny1, nx2, ny2] of noGoSegs) {
      const nMidLon = (nx1 + nx2) / 2;
      const nMidLat = (ny1 + ny2) / 2;
      if (approxDistM(midLat, midLon, nMidLat, nMidLon) <= thresholdM) {
        hits++;
        break;
      }
    }
  }
  return hits / pathSegs.length;
}

function segmentsFrom(pts: [number, number][]): Array<[number, number, number, number]> {
  const out: Array<[number, number, number, number]> = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i]!;
    const [bx, by] = pts[i + 1]!;
    out.push([ax, ay, bx, by]);
  }
  return out;
}

/** 위경도 두 점 사이 근사 거리(미터). 성남 위도 대략 37.4 기준. */
function approxDistM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * 111000;
  const dLon = (lon2 - lon1) * 111000 * Math.cos((lat1 * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

function explain(a: {
  meetsGolden: boolean;
  etaSec: number;
  overlap: number;
  altIndex: number;
}): string {
  const mm = Math.floor(a.etaSec / 60);
  const ss = String(a.etaSec % 60).padStart(2, "0");
  const parts: string[] = [];
  parts.push(a.meetsGolden ? `골든타임 5분 만족 (${mm}:${ss})` : `골든타임 초과 (${mm}:${ss})`);
  if (a.overlap > 0.2) parts.push("진입곤란 도로 다수 통과");
  else if (a.overlap > 0.05) parts.push("진입곤란 구간 소수 포함");
  else parts.push("진입곤란 구간 회피");
  parts.push(a.altIndex === 0 ? "OSRM 최단 경로 · 폴백" : `OSRM 대안 ${a.altIndex} · 폴백`);
  return parts.join(" · ");
}

interface OsrmResponse {
  code?: string;
  routes?: Array<{
    duration?: number;
    distance?: number;
    geometry?: { coordinates?: Array<Array<number>> };
  }>;
}
