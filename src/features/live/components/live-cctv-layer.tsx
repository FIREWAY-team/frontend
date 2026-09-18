"use client";

import { useEffect, useState } from "react";
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
 */
export function LiveCctvLayer({ vehicleId }: { vehicleId: string }) {
  const [markers, setMarkers] = useState<CctvMarker[]>([]);
  const [selected, setSelected] = useState<{ id: string; reading: CctvReading | null; loading: boolean } | null>(null);

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
    return () => { alive = false; };
  }, []);

  async function openPopup(id: string) {
    setSelected({ id, reading: null, loading: true });
    try {
      const res = await fetch(`/api/cctv/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!res.ok) {
        setSelected({ id, reading: null, loading: false });
        return;
      }
      const data = (await res.json()) as CctvReading;
      setSelected({ id, reading: data, loading: false });
    } catch {
      setSelected({ id, reading: null, loading: false });
    }
  }

  return (
    <>
      {markers.map((m) => (
        <CustomOverlayMap key={m.id} position={{ lat: m.lat, lng: m.lon }} yAnchor={0.5} xAnchor={0.5}>
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
            onClose={() => setSelected(null)}
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
  const tail = id.replace(/[^A-Za-z0-9]/g, "").slice(-3).toUpperCase();
  return tail || id.slice(0, 3).toUpperCase();
}
