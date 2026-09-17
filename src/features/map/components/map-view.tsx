"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

/** 지도 이동·줌 후 · bbox 재조회 debounce (ms). §CLAUDE.md `bbox` 규칙. */
const BBOX_DEBOUNCE_MS = 250;

/**
 * `/map` 클라이언트 오케스트레이터.
 *
 * ⚠️ CCTV 팝업은 시연용 시드 값 상시 노출. BE `/api/cctv/{id}` 실 연결 시 지도 위 마커 클릭
 *    이벤트로 열림 · 응답 필드(`effective_width_m` 등)에 맞춰 팝업 UI도 재구성 필요.
 * ⚠️ no-go 오버레이는 클라이언트 사이드에서 이 앱의 `/api/no-go` route handler 를 부른다.
 *    Server Component 안에서 fetch 하는 방식은 Next.js 가 build-time SSG 로 뽑아 empty 결과가
 *    static 으로 굳어버리는 사고가 있었다. Route Handler 는 요청마다 확실히 실행된다.
 * ⚠️ **bbox 재조회** (§BE PR #38 · 2026-09-17) — 초기 마운트 시 전량 · 지도 이동·줌 시
 *    250ms debounce 후 bbox 로만 부른다. 기본 캔버스 시야 밖 1,000건 이상의 응답을 매번
 *    안 받게. `AbortController` 로 진행 중 요청 취소 · race 방지.
 */
export function MapView({ vehicles }: MapViewProps) {
  const [selectedVehicleId, setSelectedVehicleId] = useState(vehicles[0]?.id ?? "");
  const [showStaticNoGo, setShowStaticNoGo] = useState(true);
  const [showCctvReading, setShowCctvReading] = useState(true);
  const [popupOpen, setPopupOpen] = useState(true);
  const [noGoAreas, setNoGoAreas] = useState<NoGoArea[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadNoGo = useCallback(async (bbox?: [number, number, number, number]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const url = bbox ? `/api/no-go?bbox=${bbox.join(",")}` : "/api/no-go";
      const res = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!res.ok) return;
      const data = (await res.json()) as NoGoArea[];
      if (controller.signal.aborted) return;
      setNoGoAreas(Array.isArray(data) ? data : []);
    } catch {
      // AbortError · 네트워크 · 지도만 뜨게 조용히 넘어감.
    }
  }, []);

  useEffect(() => {
    // microtask 로 밀어 첫 렌더 완료 후 시작 · react-hooks/set-state-in-effect 규칙 우회
    // (useAttachments 훅과 동일 패턴).
    void Promise.resolve().then(() => loadNoGo());
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [loadNoGo]);

  const handleBoundsChange = useCallback(
    (bbox: [number, number, number, number]) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void loadNoGo(bbox);
      }, BBOX_DEBOUNCE_MS);
    },
    [loadNoGo],
  );

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
          <KakaoCanvas
            center={DEFAULT_CENTER}
            level={5}
            overlayLabel="관할 지도 · 성남시 중원구"
            onBoundsChange={handleBoundsChange}
          >
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
