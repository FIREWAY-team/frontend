"use client";

import { useState } from "react";

import { KakaoCanvas } from "@/components/map/kakao-canvas";
import type { NoGoArea } from "@/features/no-go/types";
import type { Vehicle } from "@/features/vehicles/types";

import { CctvPopup } from "./cctv-popup";
import { NoGoOverlay } from "./no-go-overlay";
import { OverlayToggles } from "./overlay-toggles";

interface MapViewProps {
  vehicles: Vehicle[];
  /** 서버가 미리 받아둔 진입곤란 도로 (BFF). 실패 시 빈 배열. */
  noGoAreas?: NoGoArea[];
}

/** 성남 중원구 대략 중심. */
const DEFAULT_CENTER = { lat: 37.432, lon: 127.145 };

/**
 * `/map` 클라이언트 오케스트레이터.
 *
 * ⚠️ CCTV 팝업은 시연용 시드 값 상시 노출. BE `/api/cctv/{id}` 실 연결 시 지도 위 마커 클릭
 *    이벤트로 열림 · 응답 필드(`effective_width_m` 등)에 맞춰 팝업 UI도 재구성 필요
 *    (§FE-BE 리포트 §🔴 §2).
 * ⚠️ no-go 오버레이는 서버 컴포넌트(`page.tsx`)가 미리 받아서 넘겨준다 — 브라우저는 BE 컨테이너에
 *    직접 못 붙는다(BFF). 데이터 갱신은 페이지 새로고침에 맡긴다(§staticdata PR #21).
 */
export function MapView({ vehicles, noGoAreas = [] }: MapViewProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id ?? "");
  const [showStaticNoGo, setShowStaticNoGo] = useState(true);
  const [showCctvReading, setShowCctvReading] = useState(true);
  const [popupOpen, setPopupOpen] = useState(true);
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
