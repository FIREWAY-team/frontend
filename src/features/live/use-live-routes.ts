"use client";

import { useEffect, useState } from "react";

import type { RouteCandidate } from "@/features/dispatch/types";

import { FIRE_STATION } from "./moran-scenario";

export interface CctvAssessment {
  edgeId: string;
  coordinates: Array<[number, number]>;
  verdict: string;
  cctvId: string | null;
  confidence: number;
}
export interface LiveRouteResult {
  routes: RouteCandidate[];
  assessments: CctvAssessment[];
  warnings: string[];
}

export function useLiveRoutes(
  destination: { lat: number; lon: number } | null,
  vehicleId: string,
  enabled: boolean,
  revision: number,
) {
  const key =
    enabled && destination ? `${destination.lat},${destination.lon}|${vehicleId}|${revision}` : "";
  const [snapshot, setSnapshot] = useState<{ key: string; data?: LiveRouteResult; error?: string }>(
    { key: "" },
  );
  useEffect(() => {
    if (!key || !destination) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/route?details=1", {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vehicleId, from: FIRE_STATION, to: destination, k: 3 }),
        });
        if (!response.ok) throw new Error("경로 계산에 실패했습니다. 다시 조회해 주세요.");
        const data = (await response.json()) as LiveRouteResult;
        if (!controller.signal.aborted) setSnapshot({ key, data });
      } catch (error) {
        if (!controller.signal.aborted)
          setSnapshot({ key, error: error instanceof Error ? error.message : "경로 조회 실패" });
      }
    })();
    return () => controller.abort();
  }, [key, destination, vehicleId]);
  return {
    data: key && snapshot.key === key ? snapshot.data : undefined,
    error: key && snapshot.key === key ? snapshot.error : undefined,
    loading: Boolean(key && (snapshot.key !== key || (!snapshot.data && !snapshot.error))),
  };
}
