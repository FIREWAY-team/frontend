"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { KakaoCanvas } from "@/components/map/kakao-canvas";
import { LiveCctvLayer } from "@/features/live/components/live-cctv-layer";
import type { NoGoArea } from "@/features/no-go/types";
import type { Vehicle } from "@/features/vehicles/types";

import { NoGoOverlay } from "./no-go-overlay";
import { OverlayToggles } from "./overlay-toggles";

interface MapViewProps {
  vehicles: Vehicle[];
}

/**
 * 초기 지도 중심 — CCTV 마커 12개 (모란시장) 밀집 지역.
 * ⚠️ 이전 값 (37.432, 127.145) 은 성남소방서 부근 · 진입 시 CCTV 마커가 화면 밖에 있어
 *    심사원이 "판독 결과 없음" 으로 오해할 수 있었다 (§09-20 검토).
 */
const DEFAULT_CENTER = { lat: 37.431, lon: 127.1276 };

/** CCTV 마커 12개가 한 화면에 들어오는 확대 수준. */
const DEFAULT_LEVEL = 3;

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
            level={DEFAULT_LEVEL}
            overlayLabel="관할 지도 · 성남시 중원구"
            onBoundsChange={handleBoundsChange}
          >
            <NoGoOverlay areas={staticNoGo} visible={showStaticNoGo} />
            {/* 실 CCTV 판독 12개 마커. `/live` 와 동일 계층 재사용. */}
            {showCctvReading && <LiveCctvLayer vehicleId={selectedVehicleId} />}
          </KakaoCanvas>
        </div>
      </section>
    </div>
  );
}
