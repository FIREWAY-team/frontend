import { MapPinned } from "lucide-react";

import { AppHeader } from "@/components/layout/app-header";
import { MapView } from "@/features/map/components/map-view";
import { MOCK_VEHICLES } from "@/features/vehicles/mock/vehicles";

export const metadata = { title: "관할 지도" };

/**
 * `/map` — 관할 지도 · 오버레이 토글 + 골목 팝업.
 * ⚠️ 실 지도 SDK 연결은 별도 이슈.
 */
export default function MapPage() {
  return (
    <>
      <AppHeader title="관할 지도" icon={MapPinned} />
      <MapView vehicles={MOCK_VEHICLES} />
    </>
  );
}
