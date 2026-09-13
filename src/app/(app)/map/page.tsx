import { MapPinned } from "lucide-react";

import { AppHeader } from "@/components/layout/app-header";
import { MapView } from "@/features/map/components/map-view";
import { fetchNoGoAreas } from "@/features/no-go/api";
import { MOCK_VEHICLES } from "@/features/vehicles/mock/vehicles";

export const metadata = { title: "관할 지도" };
// 이 페이지는 절대 build-time 에 미리 렌더되면 안 된다 — 빌드 시점엔 BE 컨테이너가 없어서
// fetch 가 조용히 빈 배열을 캐시하고 그게 static 으로 굳는다. 요청마다 서버에서 새로 그린다.
// CCTV 판독(layer=3)이 정적 판정(layer=1)을 뒤집을 수 있는 도메인 이유도 그대로다(§staticdata PR #21).
export const dynamic = "force-dynamic";
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
