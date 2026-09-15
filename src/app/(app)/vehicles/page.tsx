import { Truck } from "lucide-react";

import { ConnectionBanner } from "@/components/common/connection-banner";
import { AppHeader } from "@/components/layout/app-header";
import { fetchVehicles } from "@/features/vehicles/api";
import { VehicleList } from "@/features/vehicles/components/vehicle-list";

export const metadata = { title: "차량 관리" };

/**
 * `/vehicles` — 관할 차량 목록.
 * ⚠️ 조회만. 등록·수정은 BE 시드가 처리 (§FRONTEND_SPEC §5-4).
 * ⚠️ BE 실 fetch · 실패 시 mock 폴백 + 상단 배너 (§ConnectionBanner).
 */
export default async function VehiclesPage() {
  const result = await fetchVehicles();

  return (
    <>
      <AppHeader title="차량 관리" icon={Truck} />
      {result.source === "fallback" && <ConnectionBanner domain="차량" reason={result.reason} />}
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-[11.5px]">
              성남소방서 · 관할 펌프차 {result.data.length}대
            </p>
          </div>
          <div className="text-muted-foreground text-[11px]">
            등록·수정은 관리자 콘솔 (본선 이후)
          </div>
        </div>
        <VehicleList vehicles={result.data} />
      </div>
    </>
  );
}
