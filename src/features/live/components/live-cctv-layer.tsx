"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CustomOverlayMap } from "react-kakao-maps-sdk";

import type { CctvMarker } from "@/features/cctv/api";
import type { CctvReading, VerdictStatus } from "@/features/cctv/types";
import { CctvPopup } from "@/features/map/components/cctv-popup";

/**
 * `/live` 지도 위 12개 CCTV 마커 + 클릭 팝업.
 *
 * BE `/api/cctv` 로 목록 · `/api/cctv/{id}` 로 상세. lat/lon 이 없으면 skip.
 * 색은 verdict.status (PASS 초록·FAIL 빨강·UNCERTAIN 노랑·나머지 회색).
 *
 * ⚠️ **목록 조회 실패** — 조용히 빈 배열 · 시연 흐름은 계속 (§handoff frontend.md 정직성).
 * ⚠️ **팝업 상세 실패** — CctvPopup 안 뜸 · 마커만 남는다.
 * ⚠️ **서명 만료 자동 재조회** (§brief 09-19) — 응답의 `media_url_expires_in_seconds` 를 받아
 *    안전마진 30초 전에 자동 refetch. 심사가 팝업 오래 열어두면 URL 만료되어 미디어 깨지던 위험 방지.
 */

/** 서명 만료 안전마진 (초). 만료 시각 - 이 값 시점에 refetch 트리거. */
const REFRESH_SAFETY_MARGIN_SEC = 30;

export function LiveCctvLayer({ vehicleId }: { vehicleId: string }) {
  const [markers, setMarkers] = useState<CctvMarker[]>([]);
  const [selected, setSelected] = useState<{
    id: string;
    reading: CctvReading | null;
    loading: boolean;
  } | null>(null);
  /** 자동 재조회 타이머 · 팝업 열려있는 동안만 · 닫히거나 재조회 완료 시 clear. */
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch("/api/cctv", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as CctvMarker[];
        if (alive) setMarkers(Array.isArray(data) ? data : []);
      } catch {
        /* 조용히 넘어감 */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /**
   * 서명 URL 만료 안전마진 전에 자동 refetch 스케줄.
   * ⚠️ 만료 시간이 없거나 이미 안전마진 안쪽이면 스케줄 X · 조용히 넘어감.
   * ⚠️ 재귀 · scheduleRef 에 자기 자신을 담아 useCallback 의존성 순환을 회피.
   */
  const scheduleRef = useRef<((id: string, reading: CctvReading) => void) | null>(null);
  const scheduleRefresh = useCallback((id: string, reading: CctvReading) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = null;
    const expires = reading.mediaUrlExpiresInSeconds;
    if (typeof expires !== "number" || expires <= REFRESH_SAFETY_MARGIN_SEC) return;
    const refreshMs = (expires - REFRESH_SAFETY_MARGIN_SEC) * 1000;
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cctv/${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as CctvReading;
        setSelected((cur) => (cur && cur.id === id ? { id, reading: next, loading: false } : cur));
        scheduleRef.current?.(id, next);
      } catch {
        /* 재조회 실패는 조용히 · 이미 표시된 미디어는 유지되고 실패 시 팝업 안 갱신 */
      }
    }, refreshMs);
  }, []);
  useEffect(() => {
    scheduleRef.current = scheduleRefresh;
  }, [scheduleRefresh]);

  const openPopup = useCallback(
    async (id: string) => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      setSelected({ id, reading: null, loading: true });
      try {
        const res = await fetch(`/api/cctv/${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!res.ok) {
          setSelected({ id, reading: null, loading: false });
          return;
        }
        const data = (await res.json()) as CctvReading;
        setSelected({ id, reading: data, loading: false });
        scheduleRefresh(id, data);
      } catch {
        setSelected({ id, reading: null, loading: false });
      }
    },
    [scheduleRefresh],
  );

  function closePopup() {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    setSelected(null);
  }

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  return (
    <>
      {markers.map((m) => (
        <CustomOverlayMap
          key={m.id}
          position={{ lat: m.lat, lng: m.lon }}
          yAnchor={0.5}
          xAnchor={0.5}
        >
          <button
            type="button"
            onClick={() => openPopup(m.id)}
            aria-label={`CCTV ${m.id} · ${m.status}`}
            className="grid h-6 w-6 place-items-center rounded-full border-2 border-white shadow-md ring-1 ring-black/20 transition-transform hover:scale-110"
            style={{ backgroundColor: markerColor(m.status) }}
          >
            <span className="text-[9px] font-bold text-white drop-shadow">{shortId(m.id)}</span>
          </button>
        </CustomOverlayMap>
      ))}

      {selected && selected.reading && (
        <CustomOverlayMap
          position={{
            lat: markers.find((x) => x.id === selected.id)?.lat ?? 0,
            lng: markers.find((x) => x.id === selected.id)?.lon ?? 0,
          }}
          yAnchor={1.15}
          xAnchor={0.5}
          clickable
        >
          <CctvPopup
            reading={selected.reading}
            displayId={selected.id}
            vehicleIds={[vehicleId]}
            onClose={closePopup}
          />
        </CustomOverlayMap>
      )}

      {selected && selected.loading && (
        <CustomOverlayMap
          position={{
            lat: markers.find((x) => x.id === selected.id)?.lat ?? 0,
            lng: markers.find((x) => x.id === selected.id)?.lon ?? 0,
          }}
          yAnchor={1.15}
          xAnchor={0.5}
        >
          <div className="rounded border border-neutral-300 bg-white/95 px-3 py-2 text-[11px] shadow-md">
            CCTV {selected.id} 조회 중…
          </div>
        </CustomOverlayMap>
      )}
    </>
  );
}

function markerColor(s: VerdictStatus): string {
  if (s === "PASS") return "#22c55e";
  if (s === "FAIL") return "#ef4444";
  if (s === "UNCERTAIN") return "#eab308";
  return "#9ca3af";
}

/** cctv_id 뒤 3자 (예: "moran-a41" → "A41"). 시연 마커 라벨. */
function shortId(id: string): string {
  const tail = id
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(-3)
    .toUpperCase();
  return tail || id.slice(0, 3).toUpperCase();
}
