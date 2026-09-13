import { MapPinned } from "lucide-react";

import { AppHeader } from "@/components/layout/app-header";
import { MapView } from "@/features/map/components/map-view";
import { fetchNoGoAreas } from "@/features/no-go/api";
import { MOCK_VEHICLES } from "@/features/vehicles/mock/vehicles";

export const metadata = { title: "관할 지도" };
// 진입곤란 데이터는 페이지 로드마다 서버에서 새로 받는다 — CCTV 판독이 정적 판정을 뒤집을 수
// 있어서 캐시하면 안 된다(§staticdata PR #21 layer=3 항목).
export const revalidate = 0;

/**
 * `/map` — 관할 지도 · 오버레이 토글 + 골목 팝업.
 *
 * ⚠️ 서버 컴포넌트 — BFF 로 BE `/api/no_go` 를 여기서 받아 클라이언트에 넘긴다. 브라우저는
 *    docker 네트워크 안의 백엔드 컨테이너에 직접 못 붙는다.
 */
export default async function MapPage() {
  const noGoAreas = await fetchNoGoAreas();
  return (
    <>
      <AppHeader title="관할 지도" icon={MapPinned} />
      <MapView vehicles={MOCK_VEHICLES} noGoAreas={noGoAreas} />
    </>
  );
}
