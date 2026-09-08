import { Truck } from "lucide-react";

import { AppHeader } from "@/components/layout/app-header";
import { VehicleList } from "@/features/vehicles/components/vehicle-list";
import { MOCK_VEHICLES } from "@/features/vehicles/mock/vehicles";

export const metadata = { title: "차량 관리" };

/**
 * `/vehicles` — 관할 차량 목록.
 * ⚠️ MVP는 조회만. 등록·수정은 BE 시드가 처리 (§FRONTEND_SPEC §5-4).
 */
export default function VehiclesPage() {
  return (
    <>
      <AppHeader title="차량 관리" icon={Truck} />
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-6 py-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-[11.5px]">
              성남소방서 · 관할 펌프차 {MOCK_VEHICLES.length}대
            </p>
          </div>
          <div className="text-muted-foreground text-[11px]">
            등록·수정은 관리자 콘솔 (본선 이후)
          </div>
        </div>
        <VehicleList vehicles={MOCK_VEHICLES} />
      </div>
    </>
  );
}
