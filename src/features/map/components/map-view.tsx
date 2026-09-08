"use client";

import { useState } from "react";

import type { Vehicle } from "@/features/vehicles/types";

import { CctvPopup } from "./cctv-popup";
import { MapPlaceholder } from "./map-placeholder";
import { OverlayToggles } from "./overlay-toggles";

interface MapViewProps {
  vehicles: Vehicle[];
}

/**
 * `/map` 클라이언트 오케스트레이터.
 *
 * ⚠️ 실제 Kakao Map SDK는 별도 이슈 (#7 스코프 밖). 지금은 placeholder + 시연용 목 CCTV 팝업
 *    한 개 상시 노출로 팝업 톤을 볼 수 있게 해 둔다.
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
          <MapPlaceholder label="관할 지도 · 성남시 중원구 · Kakao Map 로드 예정">
            <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-4">
              {popupOpen && (
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
              )}
            </div>
          </MapPlaceholder>
        </div>
      </section>
    </div>
  );
}
