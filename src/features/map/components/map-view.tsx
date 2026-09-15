"use client";

import { useEffect, useState } from "react";

import { KakaoCanvas } from "@/components/map/kakao-canvas";
import type { NoGoArea } from "@/features/no-go/types";
import type { Vehicle } from "@/features/vehicles/types";

import { CctvPopup } from "./cctv-popup";
import { NoGoOverlay } from "./no-go-overlay";
import { OverlayToggles } from "./overlay-toggles";

interface MapViewProps {
  vehicles: Vehicle[];
}

/** 성남 중원구 대략 중심. */
const DEFAULT_CENTER = { lat: 37.432, lon: 127.145 };

/**
 * `/map` 클라이언트 오케스트레이터.
 *
 * ⚠️ CCTV 팝업은 시연용 시드 값 상시 노출. BE `/api/cctv/{id}` 실 연결 시 지도 위 마커 클릭
 *    이벤트로 열림 · 응답 필드(`effective_width_m` 등)에 맞춰 팝업 UI도 재구성 필요
 *    (§FE-BE 리포트 §🔴 §2).
 * ⚠️ no-go 오버레이는 클라이언트 사이드에서 이 앱의 `/api/no-go` route handler 를 부른다.
 *    Server Component 안에서 fetch 하는 방식은 Next.js 가 build-time SSG 로 뽑아 empty 결과가
 *    static 으로 굳어버리는 사고가 있었다. Route Handler 는 요청마다 확실히 실행된다.
 */
export function MapView({ vehicles }: MapViewProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id ?? "");
  const [showStaticNoGo, setShowStaticNoGo] = useState(true);
  const [showCctvReading, setShowCctvReading] = useState(true);
  const [popupOpen, setPopupOpen] = useState(true);
  const [noGoAreas, setNoGoAreas] = useState<NoGoArea[]>([]);

  useEffect(() => {
    // 실패해도 지도는 그대로 뜬다. UI 는 오버레이 없이 성남 지도만 보이는 상태로 남는다.
    let alive = true;
    fetch("/api/no-go", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<NoGoArea[]>) : []))
      .then((data) => {
        if (alive) setNoGoAreas(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        /* 지도만 뜨게 두고 조용히 넘어간다. 서버 로그에는 warn 이 이미 찍혀 있다. */
      });
    return () => {
      alive = false;
    };
  }, []);

  // 정적 PDF 소스(layer=1) 만 필터. CCTV 판독(layer=3)은 별도 오버레이 예정 — 지금은 데이터가 없음.
  const staticNoGo = noGoAreas.filter((a) => a.layer === 1);

  return (
    <div className="flex h-full min-h-0 flex-1">
      {/* 좌측 얇은 패널 */}
      <aside className="border-border bg-surface w-56 shrink-0 overflow-y-auto border-r p-3">
        <OverlayToggles
          vehicles={vehicles}
          selectedVehicleId={selectedVehicleId}
          onVehicleChange={setSelectedVehicleId}
          showStaticNoGo={showStaticNoGo}
          showCctvReading={showCctvReading}
          onToggleStatic={setShowStaticNoGo}
          onToggleCctv={setShowCctvReading}
        />
      </aside>

      {/* 우측 · 지도 */}
      <section className="flex min-w-0 flex-1 flex-col p-4">
        <div className="relative flex min-h-0 flex-1 flex-col">
          <KakaoCanvas center={DEFAULT_CENTER} level={5} overlayLabel="관할 지도 · 성남시 중원구">
            <NoGoOverlay areas={staticNoGo} visible={showStaticNoGo} />
          </KakaoCanvas>

          {popupOpen && (
            <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-4">
              <div className="pointer-events-auto">
                <CctvPopup
                  edgeId="seongnam_v153_edge_82441"
                  measuredWidthM={1.9}
                  detectedObjects={["parked_truck", "trash_bin"]}
                  passableProb={{ "pump-3.5": 0.82, "pump-8": 0.15, "pump-15": 0.02 }}
                  stillUrl="https://placehold.co/560x320/1e2a3d/8b96ab?text=CCTV+042"
                  onClose={() => setPopupOpen(false)}
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
