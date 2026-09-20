"use client";

import { useEffect, useState } from "react";

import type { RouteCandidate } from "../types";

/**
 * 성남소방서 좌표 — 시연에서는 하나로 고정. 실 서비스에서는 BE 가 화점에 가장 가까운 관할 소방서를
 * 선택해 넘긴다 (§FRONTEND_SPEC §5-2).
 * 성남소방서 (성남시 중원구 성남대로 997). Kakao 지도 라벨 기준.
 */
export const FIRE_STATION = { lat: 37.4283, lon: 127.1394 } as const;

interface UseBackendRoutesInput {
  destination: { lat: number; lon: number } | null;
  vehicleId: string;
}

export interface UseBackendRoutesResult {
  routes: RouteCandidate[];
  /**
   * 서버에서 아직 응답이 안 왔거나 · 요청 key 가 갱신되어 이전 스냅샷이 유효하지 않은 상태.
   * ⚠️ UI 는 이 값으로 "확정 가능한 경로가 없습니다" (empty) 와 "계산 중" (loading) 을 구분한다.
   *    구분 없이 empty 만 뜨면 심사원이 시스템이 꺼진 것으로 오해한다 (§09-20 URL 심사 대응).
   */
  loading: boolean;
}

/**
 * 화점 + 차량 id 를 받아 프론트의 `/api/route` Route Handler 로 요청. Handler 는 서버 사이드에서
 * BE `POST /api/route` 를 부르고 그 응답(3층 의사결정 완결)을 그대로 돌려준다.
 *
 * ⚠️ 옛 `useRealRoutes` 가 프론트에서 OSRM + no-go 겹침 + CCTV mock 을 조합하던 로직은 backend
 *    PR #24 로 옮겨졌다. 이 훅은 이제 진짜 아키텍처 — BE 계산을 렌더할 뿐이다.
 * ⚠️ 실패/타임아웃 시 빈 배열. 지도가 비지 않게 상황실 UI 에서 loading/empty 를 구분해서 다룬다.
 */
export function useBackendRoutes({
  destination,
  vehicleId,
}: UseBackendRoutesInput): UseBackendRoutesResult {
  const [snapshot, setSnapshot] = useState<{ key: string; value: RouteCandidate[] }>({
    key: "",
    value: [],
  });
  const key = destination ? `${destination.lat},${destination.lon}|${vehicleId}` : "";

  useEffect(() => {
    let alive = true;
    if (!destination) return; // key 비교로 이미 [] 반환 중 — effect 안에서 초기화 setState 를 하지 않는다.
    (async () => {
      try {
        const res = await fetch("/api/route", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehicleId,
            from: FIRE_STATION,
            to: destination,
            k: 3,
          }),
        });
        if (!res.ok) {
          if (alive) setSnapshot({ key, value: [] });
          return;
        }
        const data = (await res.json()) as RouteCandidate[];
        if (alive) setSnapshot({ key, value: Array.isArray(data) ? data : [] });
      } catch {
        if (alive) setSnapshot({ key, value: [] });
      }
    })();
    return () => {
      alive = false;
    };
  }, [key, destination, vehicleId]);

  const isCurrent = snapshot.key === key;
  return {
    routes: isCurrent ? snapshot.value : [],
    loading: Boolean(destination) && !isCurrent,
  };
}
