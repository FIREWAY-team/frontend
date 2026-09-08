import Link from "next/link";

import { cn } from "@/lib/utils";

import type { Vehicle, VehicleSize } from "../types";
import { VEHICLE_SIZE_LABEL } from "../types";

interface VehicleListProps {
  vehicles: Vehicle[];
}

const SIZE_STRIPE: Record<VehicleSize, string> = {
  SMALL: "bg-[var(--vehicle-small)]",
  MID: "bg-[var(--vehicle-mid)]",
  LARGE: "bg-[var(--vehicle-large)]",
};

/**
 * 차량 목록 — 좌측 컬러 스트립(규격 기반)으로 카테고리 구분. z-groupware 프로젝트 목록 패턴 승계.
 */
export function VehicleList({ vehicles }: VehicleListProps) {
  return (
    <div className="border-border bg-surface rounded-md border">
      <div className="border-border text-muted-foreground grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_minmax(0,1.2fr)] items-center gap-4 border-b px-4 py-2 text-[10.5px] font-medium tracking-wider uppercase">
        <span>차량</span>
        <span className="text-right">폭 (m)</span>
        <span className="text-right">길이 (m)</span>
        <span className="text-right">중량 (t)</span>
        <span className="text-right">회전반경 (m)</span>
        <span className="text-right">동작</span>
      </div>
      <ul>
        {vehicles.map((v) => (
          <li
            key={v.id}
            className={cn(
              "border-border relative grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_minmax(0,1.2fr)] items-center gap-4 border-b px-4 py-3 last:border-b-0",
              "hover:bg-muted/40 transition-colors",
            )}
          >
            <span
              className={cn(
                "absolute top-0 bottom-0 left-0 w-0.5 rounded-l-md",
                SIZE_STRIPE[v.size],
              )}
              aria-hidden
            />
            <div className="flex min-w-0 flex-col">
              <span className="text-foreground text-[13px] font-medium">{v.name}</span>
              <span className="text-muted-foreground text-[10.5px]">
                {VEHICLE_SIZE_LABEL[v.size]} · {v.id}
              </span>
            </div>
            <span className="tabular text-foreground text-right text-[12.5px]">
              {v.width.toFixed(1)}
            </span>
            <span className="tabular text-foreground text-right text-[12.5px]">
              {v.length.toFixed(1)}
            </span>
            <span className="tabular text-foreground text-right text-[12.5px]">
              {v.weight.toFixed(1)}
            </span>
            <span className="tabular text-foreground text-right text-[12.5px]">
              {v.turningRadius.toFixed(1)}
            </span>
            <div className="flex justify-end">
              <Link
                href={`/vehicles/${v.id}`}
                className="text-primary hover:text-primary/80 text-[11.5px] font-medium"
              >
                상세 →
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
