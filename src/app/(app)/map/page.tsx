import { MapPinned } from "lucide-react";

import { ConnectionBanner } from "@/components/common/connection-banner";
import { AppHeader } from "@/components/layout/app-header";
import { MapView } from "@/features/map/components/map-view";
import { fetchVehicles } from "@/features/vehicles/api";

export const metadata = { title: "관할 지도" };

/**
 * `/map` — 관할 지도 · 오버레이 토글 + 골목 팝업.
 *
 * ⚠️ 차량 목록은 서버 사이드 BE fetch · 실패 시 mock 폴백 + 상단 배너.
 * ⚠️ no-go 데이터는 `MapView` 가 mount 후 `/api/no-go` 로 클라이언트에서 부른다. 서버 사이드
 *    fetch 는 Next.js SSG 로 뽑혀 empty 결과가 static HTML 로 굳는 사고가 있었다.
 */
export default async function MapPage() {
  const result = await fetchVehicles();

  return (
    <>
      <AppHeader title="관할 지도" icon={MapPinned} />
      {result.source === "fallback" && <ConnectionBanner domain="차량" reason={result.reason} />}
      <MapView vehicles={result.data} />
    </>
  );
}
