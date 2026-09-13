"use client";

import { useEffect, useState } from "react";

import type { RouteCandidate } from "../types";

/**
 * OSRM 공용 라우터로 mock 경로 좌표를 실제 도로 shape 로 스냅한다.
 *
 * ⚠️ 왜 필요한가 — 지금 BE 는 `MockValhallaClient` 라 두 좌표 사이 직선만 뱉는다. 시연에서
 *    지도의 파란 폴리라인이 도로를 따라 굽지 않아 보임새가 안 좋다. 실 Valhalla 서버가 붙기
 *    전까지 이 훅이 우회한다. Valhalla 실서버가 붙으면 이 훅을 제거하고 BE 좌표를 그대로 쓴다.
 * ⚠️ **OSRM 공용 인스턴스는 데모용 서비스** — 상용 SLA 없고 rate limit(초당 1회) 있다.
 *    실서비스에서는 자체 OSRM/Valhalla 로 교체(§본선_인프라_로드맵).
 * ⚠️ 좌표 순서: OSRM URL 은 `lon,lat` — GeoJSON 관례. Kakao 로 넘길 때만 스왑(§좌표 순서 단일책임).
 * ⚠️ 실패 시 원본 좌표를 그대로 반환 — 지도가 비지 않게 한다.
 * ⚠️ 렌더 사이클 규칙 — routes 가 바뀌자마자 훅은 그 순간 원본을 그대로 반환(잔상 방지)하고,
 *    OSRM 응답이 오면 그때 setState 로 스냅된 좌표로 교체. effect 안에서 초기화용 setState 를
 *    하지 않는다(React 19 `react-hooks/set-state-in-effect` 규칙).
 */
export function useOsrmEnrichedRoutes(routes: RouteCandidate[]): RouteCandidate[] {
  const [snapshot, setSnapshot] = useState<{ src: RouteCandidate[]; value: RouteCandidate[] }>({
    src: routes,
    value: routes,
  });

  useEffect(() => {
    let alive = true;
    if (routes.length === 0) return;

    (async () => {
      const promises = routes.map(async (r) => {
        // 후보 3개가 서로 다른 도로를 지나 보이도록 mock 의 waypoint 를 그대로 via 로 넘긴다.
        // 좌표가 2점뿐이면 그대로 origin→destination. OSRM 은 최대 25 좌표까지 허용.
        const path = r.coordinates
          .slice(0, 25)
          .map(([lon, lat]) => `${lon},${lat}`)
          .join(";");
        const url =
          `https://router.project-osrm.org/route/v1/driving/${path}` +
          `?overview=full&geometries=geojson&alternatives=false&steps=false`;
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) return r;
          const data = (await res.json()) as OsrmResponse;
          const coords = data.routes?.[0]?.geometry?.coordinates;
          if (!Array.isArray(coords) || coords.length < 2) return r;
          // OSRM 도 GeoJSON [lon,lat] — 우리 계약과 같다. 변환 불필요.
          const filtered = coords.filter(
            (pt): pt is [number, number] =>
              Array.isArray(pt) &&
              pt.length === 2 &&
              typeof pt[0] === "number" &&
              typeof pt[1] === "number",
          );
          return { ...r, coordinates: filtered };
        } catch {
          return r;
        }
      });

      const results = await Promise.all(promises);
      if (alive) setSnapshot({ src: routes, value: results });
    })();

    return () => {
      alive = false;
    };
  }, [routes]);

  // routes 가 바뀐 직후 아직 OSRM 응답이 오기 전이면 원본을 반환. 스냅샷과 현재 routes reference 가
  // 일치할 때만 스냅된 값을 반환한다.
  return snapshot.src === routes ? snapshot.value : routes;
}

interface OsrmResponse {
  code?: string;
  routes?: Array<{
    geometry?: { coordinates?: Array<Array<number>> };
  }>;
}
