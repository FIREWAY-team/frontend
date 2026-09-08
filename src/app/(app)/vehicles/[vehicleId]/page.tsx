import { ArrowLeft, MapPinned, Truck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppHeader } from "@/components/layout/app-header";
import { MapPlaceholder } from "@/features/map/components/map-placeholder";
import { MOCK_VEHICLES } from "@/features/vehicles/mock/vehicles";
import { VEHICLE_SIZE_LABEL } from "@/features/vehicles/types";

interface Props {
  params: Promise<{ vehicleId: string }>;
}

/**
 * `/vehicles/[vehicleId]` — 차량 상세 · 제원 표 + 커버리지 미니 히트맵 placeholder.
 * ⚠️ Next 15+는 `params`가 Promise.
 */
export default async function VehicleDetailPage({ params }: Props) {
  const { vehicleId } = await params;
  const vehicle = MOCK_VEHICLES.find((v) => v.id === vehicleId);
  if (!vehicle) notFound();

  return (
    <>
      <AppHeader
        title={vehicle.name}
        icon={Truck}
        actions={
          <Link
            href="/vehicles"
            className="text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11.5px] transition-colors"
          >
            <ArrowLeft size={12} />
            목록
          </Link>
        }
      />
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-6 py-6">
        <div className="border-border bg-surface flex items-center justify-between rounded-md border px-4 py-3">
          <div>
            <div className="text-muted-foreground text-[10.5px] tracking-widest uppercase">
              규격
            </div>
            <div className="text-foreground text-[15px] font-semibold">
              {VEHICLE_SIZE_LABEL[vehicle.size]} · {vehicle.id}
            </div>
          </div>
        </div>

        <section className="border-border bg-surface rounded-md border">
          <div className="border-border border-b px-4 py-2.5">
            <h2 className="text-foreground text-[13px] font-semibold">제원</h2>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 px-4 py-4">
            <SpecRow label="폭" value={`${vehicle.width.toFixed(1)} m`} />
            <SpecRow label="높이" value={`${vehicle.height.toFixed(1)} m`} />
            <SpecRow label="길이" value={`${vehicle.length.toFixed(1)} m`} />
            <SpecRow label="중량" value={`${vehicle.weight.toFixed(1)} t`} />
            <SpecRow label="최소 회전반경" value={`${vehicle.turningRadius.toFixed(1)} m`} />
          </dl>
        </section>

        <section className="border-border bg-surface rounded-md border">
          <div className="border-border flex items-center justify-between border-b px-4 py-2.5">
            <h2 className="text-foreground text-[13px] font-semibold">관할 커버리지</h2>
            <Link href="/map" className="text-primary text-[11.5px] font-medium hover:underline">
              지도에서 크게 보기 →
            </Link>
          </div>
          <div className="h-56 p-3">
            <MapPlaceholder label={`${vehicle.name} 통과 가능 도로 커버리지 · Kakao Map 로드 예정`}>
              <div className="text-muted-foreground pointer-events-none absolute right-3 bottom-3 flex items-center gap-1 rounded bg-black/40 px-2 py-1 text-[10.5px]">
                <MapPinned size={10} />
                히트맵 예정
              </div>
            </MapPlaceholder>
          </div>
        </section>
      </div>
    </>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-dashed border-transparent">
      <dt className="text-muted-foreground text-[11.5px]">{label}</dt>
      <dd className="tabular text-foreground text-[13px] font-medium">{value}</dd>
    </div>
  );
}
