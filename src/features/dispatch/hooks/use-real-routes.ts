"use client";

import { useEffect, useState } from "react";

import type { NoGoArea } from "@/features/no-go/types";

import type { RouteCandidate } from "../types";

/**
 * 성남소방서 좌표 — 성남시 중원구 성남대로 997. Kakao 지도 기준 라벨 위치.
 * 시연에서는 하나로 고정. 실 서비스에서는 화점에 가장 가까운 관할 소방서를 BE 가 선택해 넘긴다
 * (§FRONTEND_SPEC §5-2).
 */
export const FIRE_STATION = { lat: 37.4283, lon: 127.1394 } as const;

const GOLDEN_TIME_SEC = 300; // 5분
const NO_GO_PROXIMITY_M = 25; // 경로 세그먼트가 no-go 도로에 이 거리 안으로 붙으면 겹친다고 본다

/**
 * 차량 폭 기준 골목 통과 가능 임계값. 진입곤란 도로 데이터에는 도로 폭 자체가 없어서, 경로가
 * no-go 세그먼트와 얼마나 겹치는지 비율(0~1)로 근사한다. 겹침이 이 임계값을 넘어가면 그
 * 차량은 이 경로를 통과 못 한다고 판정.
 *
 * 근거: 진입곤란 도로는 대부분 소형(2.3m)만 겨우 통과하는 좁은 골목. 중형(2.5m)은 반절
 * 정도 통과, 대형(2.9m)은 사실상 진입불가. §BE routing PR #11 의 truck profile 이 붙기
 * 전까지 시연용 근사.
 */
function overlapThresholdFor(widthM: number): number {
  if (widthM <= 2.3) return 1.0; // 소형: 어떤 골목이든 통과 가능으로 본다
  if (widthM <= 2.5) return 0.35; // 중형: 겹침 35% 넘어가면 큰 골목이 섞여 못 감
  return 0.1; // 대형: 골목 거의 못 감. 대로로만
}

interface UseRealRoutesInput {
  destination: { lat: number; lon: number } | null;
  noGoAreas: NoGoArea[];
  /** 선택 차량 폭 (m). 이 폭 기준으로 각 경로의 통과 가능 여부를 판정. */
  vehicleWidthM: number;
}

/**
 * 화점 좌표를 받아 소방서 → 화점 실경로 3개를 OSRM alternatives 로 계산하고, 각 경로가 진입곤란
 * 도로와 얼마나 겹치는지 근사로 통과확률을 매긴다. 골든타임(300초) 만족·차량 통과 가능 여부를
 * 함께 반영해 정렬.
 *
 * ⚠️ 이건 시연 임시 — 실서비스에서는 BE `POST /api/route` 응답을 그대로 쓴다. Valhalla 실서버가
 *    안 붙어 있는 사이 시연이 가짜로 보이지 않게 프론트가 공용 라우터를 대신 부르는 것.
 * ⚠️ OSRM 공용 인스턴스는 데모용 SLA — 초당 1회 rate limit, 다운 있을 수 있음. 실패 시 빈 배열.
 * ⚠️ 통과확률·차량 통과 여부는 진짜 CCTV 판독이 아니라 정적 no-go 도로와의 근사 겹침 비율에서
 *    온 값이다. 실서비스에서는 BE 가 CCTV·차량 제원까지 결합해 계산한 값을 그대로 받는다.
 */
export function useRealRoutes({
  destination,
  noGoAreas,
  vehicleWidthM,
}: UseRealRoutesInput): RouteCandidate[] {
  const [snapshot, setSnapshot] = useState<{ key: string; value: RouteCandidate[] }>({
    key: "",
    value: [],
  });
  const key = destination
    ? `${destination.lat},${destination.lon}|${noGoAreas.length}|${vehicleWidthM}`
    : "";

  useEffect(() => {
    let alive = true;
    if (!destination) return; // 반환 값은 key 비교로 이미 [] 를 돌려주고 있다 — effect 안에서 초기화 setState 하지 않는다.
    (async () => {
      const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${FIRE_STATION.lon},${FIRE_STATION.lat};${destination.lon},${destination.lat}` +
        `?overview=full&geometries=geojson&alternatives=3&steps=false`;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          if (alive) setSnapshot({ key, value: [] });
          return;
        }
        const data = (await res.json()) as OsrmResponse;
        const rawRoutes = data.routes ?? [];
        if (rawRoutes.length === 0) {
          if (alive) setSnapshot({ key, value: [] });
          return;
        }
        const threshold = overlapThresholdFor(vehicleWidthM);
        // 경로별로 no-go 겹침을 근사해 통과확률·통과여부를 낸다. 그리고 정렬.
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
          // 통과확률: 겹침이 0이면 0.94~0.98, 겹치는 만큼 떨어짐. 완전 겹치면 0.2 근처.
          const passableProb = Math.max(0.2, 0.96 - overlap * 0.75);
          const meetsGolden = etaSec <= GOLDEN_TIME_SEC;
          const passableForVehicle = overlap <= threshold;
          return {
            _raw: { i, meetsGolden, etaSec, passableForVehicle },
            candidate: {
              rank: 0, // sort 후에 채운다
              coordinates: coords,
              etaSec,
              distanceM,
              passableProb,
              passableForVehicle,
              explanation: explain({
                meetsGolden,
                etaSec,
                overlap,
                altIndex: i,
                passableForVehicle,
                vehicleWidthM,
              }),
              excludedReasons: [],
            } satisfies RouteCandidate,
          };
        });
        // 정렬: (1) 차량 통과 가능 우선 (2) 골든타임 만족 (3) 통과확률 내림 (4) ETA 오름.
        scored.sort((a, b) => {
          if (a._raw.passableForVehicle !== b._raw.passableForVehicle)
            return a._raw.passableForVehicle ? -1 : 1;
          if (a._raw.meetsGolden !== b._raw.meetsGolden) return a._raw.meetsGolden ? -1 : 1;
          if (a.candidate.passableProb !== b.candidate.passableProb)
            return b.candidate.passableProb - a.candidate.passableProb;
          return a.candidate.etaSec - b.candidate.etaSec;
        });
        const finalRoutes = scored.map((s, i) => ({ ...s.candidate, rank: i + 1 }));
        if (alive) setSnapshot({ key, value: finalRoutes });
      } catch {
        if (alive) setSnapshot({ key, value: [] });
      }
    })();

    return () => {
      alive = false;
    };
  }, [key, destination, noGoAreas, vehicleWidthM]);

  // key 가 바뀐 직후 아직 응답이 오기 전이면 빈 배열(loading). 스냅샷 key 와 일치할 때만 반환.
  return snapshot.key === key ? snapshot.value : [];
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
  // path 세그먼트 개수 대비 겹친 세그먼트 개수 비율.
  const pathSegs = segmentsFrom(pathCoords);
  if (pathSegs.length === 0) return 0;
  // no-go 세그먼트 전부를 flat 하게 모아둔다.
  const noGoSegs: Array<[number, number, number, number]> = [];
  for (const area of noGo) {
    if (area.verificationStatus !== "ok") continue; // unverified 는 라우팅 계산에서 제외
    const segs = segmentsFrom(area.path);
    for (const s of segs) noGoSegs.push(s);
  }
  if (noGoSegs.length === 0) return 0;

  let hits = 0;
  for (const [ax, ay, bx, by] of pathSegs) {
    const midLon = (ax + bx) / 2;
    const midLat = (ay + by) / 2;
    // 이 세그먼트가 어느 no-go 세그먼트라도 threshold 안이면 hit.
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
  passableForVehicle: boolean;
  vehicleWidthM: number;
}): string {
  const mm = Math.floor(a.etaSec / 60);
  const ss = String(a.etaSec % 60).padStart(2, "0");
  const parts: string[] = [];
  parts.push(a.meetsGolden ? `골든타임 5분 만족 (${mm}:${ss})` : `골든타임 초과 (${mm}:${ss})`);
  if (!a.passableForVehicle) {
    parts.push(`폭 ${a.vehicleWidthM}m 차량 진입 불가`);
  } else if (a.overlap > 0.2) parts.push("진입곤란 도로 다수 통과 — 조심");
  else if (a.overlap > 0.05) parts.push("진입곤란 구간 소수 포함");
  else parts.push("진입곤란 구간 회피");
  parts.push(a.altIndex === 0 ? "OSRM 최단 경로" : `OSRM 대안 ${a.altIndex}`);
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
