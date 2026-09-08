/*
  jest 대역 — Kakao Map SDK는 브라우저 전용이라 jsdom에서 안 돈다.
  컴포넌트가 로드되기만 하면 되는 자리엔 이 대역이 데이터 속성만 남긴다.

  ⚠️ 지도 위 실제 로직(좌표 계산·경로 색상 판정 등)은 순수 함수로 뽑아 그것만 테스트한다
     (§CLAUDE.md 테스트).
*/

import type { ReactNode } from "react";

interface Props {
  children?: ReactNode;
  [key: string]: unknown;
}

export function Map({ children }: Props) {
  return <div data-testid="kakao-map-stub">{children}</div>;
}

export function MapMarker() {
  return <div data-testid="kakao-marker-stub" />;
}

export function Polyline() {
  return <div data-testid="kakao-polyline-stub" />;
}

export function Polygon() {
  return <div data-testid="kakao-polygon-stub" />;
}

export function CustomOverlayMap({ children }: Props) {
  return <div data-testid="kakao-overlay-stub">{children}</div>;
}
