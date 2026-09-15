"use client";

import { Polygon, Polyline } from "react-kakao-maps-sdk";

import type { NoGoArea } from "@/features/no-go/types";

interface NoGoOverlayProps {
  areas: NoGoArea[];
  /** 지도 표시 스타일 — `ok` 는 실선, `unverified` 는 점선/투명. */
  visible?: boolean;
}

/**
 * 진입곤란 도로/구간을 Kakao Map 위에 그린다.
 *
 * ⚠️ 좌표 스왑: BE 는 GeoJSON 표준 `[lon, lat]` — Kakao SDK 는 `{lat, lng}` 필요.
 *    여기서 딱 한 번 변환한다. 다른 곳에서 스왑하지 말 것(§CLAUDE.md 축 순서 단일책임).
 * ⚠️ `verificationStatus === 'unverified'` 34건: 위성 대조에서 실 도로 아닌 것 확인됨.
 *    라우팅에서는 제외되지만 상황실 재검증용으로 점선+옅은 색으로 표시한다(§staticdata PR #21).
 * ⚠️ Kakao SDK 는 이 배열 길이만큼 개별 인스턴스를 만든다. 1,274건이면 오래 걸릴 수도 —
 *    가시화 성능 문제가 뜨면 클러스터링/뷰포트 컬링을 넣는다(§FE-BE 리포트 §🔴 §4).
 * ⚠️ `visible === false` 면 오버레이 자체를 언마운트 — 지도 위 잔여 인스턴스가 남지 않게.
 */
export function NoGoOverlay({ areas, visible = true }: NoGoOverlayProps) {
  if (!visible) return null;

  return (
    <>
      {areas.map((area) => {
        const kakaoPath = area.path.map(([lon, lat]) => ({ lat, lng: lon }));
        const unverified = area.verificationStatus === "unverified";
        // 색은 위험 강조. unverified 는 회색 + 점선으로 시각적 구분.
        const stroke = unverified ? "#9ca3af" : "#ef4444";
        const style: "solid" | "shortdash" = unverified ? "shortdash" : "solid";

        if (area.geometryType === "Polygon") {
          return (
            <Polygon
              key={`ngp-${area.id}`}
              path={kakaoPath}
              strokeWeight={2}
              strokeColor={stroke}
              strokeOpacity={unverified ? 0.55 : 0.9}
              strokeStyle={style}
              fillColor={stroke}
              fillOpacity={unverified ? 0.08 : 0.18}
            />
          );
        }
        return (
          <Polyline
            key={`ngl-${area.id}`}
            path={kakaoPath}
            strokeWeight={4}
            strokeColor={stroke}
            strokeOpacity={unverified ? 0.55 : 0.9}
            strokeStyle={style}
          />
        );
      })}
    </>
  );
}
