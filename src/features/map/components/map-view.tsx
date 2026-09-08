"use client";

import { useState } from "react";

import { KakaoCanvas } from "@/components/map/kakao-canvas";
import type { Vehicle } from "@/features/vehicles/types";

import { CctvPopup } from "./cctv-popup";
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
 * ⚠️ no-go 폴리곤은 이번 이슈 스코프 밖 — BE `main` 병합 후 매퍼로 흡수.
 */
export function MapView({ vehicles }: MapViewProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id ?? "");
  const [showStaticNoGo, setShowStaticNoGo] = useState(true);
  const [showCctvReading, setShowCctvReading] = useState(true);
  const [popupOpen, setPopupOpen] = useState(true);

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
          <KakaoCanvas center={DEFAULT_CENTER} level={5} overlayLabel="관할 지도 · 성남시 중원구" />

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
