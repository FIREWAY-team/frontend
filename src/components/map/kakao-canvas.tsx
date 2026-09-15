"use client";

import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";
import { Map, useKakaoLoader } from "react-kakao-maps-sdk";

import { MapPlaceholder } from "@/features/map/components/map-placeholder";
import { env, isKakaoMapConfigured } from "@/lib/env";
import { cn } from "@/lib/utils";

interface KakaoCanvasProps {
  center: { lat: number; lon: number };
  /** Kakao Map 줌 레벨 (1 = 확대 최대, 14 = 광역). 상황실 골목 판정은 3~4가 적정. */
  level?: number;
  className?: string;
  children?: ReactNode;
  /** 지도 아래 표시할 라벨 (썸네일에 쓸 때). */
  overlayLabel?: string;
}

/**
 * Kakao Map 실 렌더링 셸.
 *
 * ⚠️ **`react-kakao-maps-sdk`의 `useKakaoLoader`**로 SDK 스크립트를 로드한다. `next/script`를
 *    직접 관리하지 않는 이유 — 이 훅이 이미 idempotent 로더를 관리해 여러 지도 인스턴스가
 *    같은 스크립트를 중복 로드하지 않는다(§CLAUDE.md 지도 SDK 규칙 "앱 루트에서 1회").
 * ⚠️ **키가 비어 있으면 로드 시도조차 안 한다** — 빈 키로 요청하면 401 도배가 콘솔에 뜬다.
 *    대신 `MapPlaceholder`에 명시적 안내를 띄운다(§정직성).
 * ⚠️ **로딩·에러 상태는 `MapPlaceholder`로 재사용** — 톤 일치. 지도 자리는 언제나 같은 그림이
 *    보이다가 SDK가 준비되면 진짜 지도로 스왑되는 흐름.
 */
export function KakaoCanvas({
  center,
  level = 4,
  className,
  children,
  overlayLabel,
}: KakaoCanvasProps) {
  const configured = isKakaoMapConfigured();

  // 훅은 조건부로 못 부른다 — 키가 없어도 훅은 호출하되 빈 키로 로드 시도하지 않게 한다.
  // 실제로 `useKakaoLoader`가 빈 appkey를 받으면 SDK를 로드하지 않고 loading 상태를 유지한다.
  const [loading, error] = useKakaoLoader({
    appkey: env.kakaoMapAppKey,
    // 라이브러리 확장이 필요하면 여기 추가(`services`는 지오코딩·주소 검색 · `clusterer`는 마커 클러스터).
    // 지금은 필요 시점에 붙임 — 로드 시간 늘어난다.
  });

  if (!configured) {
    return (
      <MapPlaceholder
        className={className}
        label="지도를 표시하려면 NEXT_PUBLIC_KAKAO_MAP_APP_KEY 세팅이 필요합니다"
      />
    );
  }

  if (loading) {
    return <MapPlaceholder className={className} label="지도를 불러오는 중입니다…" />;
  }

  if (error) {
    return (
      <div
        className={cn(
          "border-danger/40 bg-danger/6 relative flex flex-1 items-center justify-center overflow-hidden rounded-md border",
          className,
        )}
      >
        <div className="text-danger flex flex-col items-center gap-1.5 text-center">
          <AlertTriangle size={20} strokeWidth={1.75} />
          <span className="text-[11.5px]">지도를 불러오지 못했습니다</span>
          <span className="text-muted-foreground text-[10.5px]">
            도메인 등록 확인 · 콘솔 로그 확인
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-border relative flex flex-1 overflow-hidden rounded-md border",
        className,
      )}
    >
      <Map
        center={{ lat: center.lat, lng: center.lon }}
        level={level}
        className="h-full w-full"
        style={{ width: "100%", height: "100%" }}
      >
        {children}
      </Map>
      {overlayLabel && (
        <div className="text-muted-foreground pointer-events-none absolute right-3 bottom-3 rounded bg-black/40 px-2 py-1 text-[10.5px] backdrop-blur-sm">
          {overlayLabel}
        </div>
      )}
    </div>
  );
}
