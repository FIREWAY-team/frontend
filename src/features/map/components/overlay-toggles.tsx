"use client";

import type { Vehicle } from "@/features/vehicles/types";
import { cn } from "@/lib/utils";

interface OverlayTogglesProps {
  vehicles: Vehicle[];
  selectedVehicleId: string;
  onVehicleChange: (id: string) => void;
  showStaticNoGo: boolean;
  showCctvReading: boolean;
  onToggleStatic: (v: boolean) => void;
  onToggleCctv: (v: boolean) => void;
}

/**
 * 지도 오버레이 토글 · 차량 선택 — `/map` 좌측 얇은 패널.
 *
 * ⚠️ 오버레이는 **2종만** (§FRONTEND_SPEC v0.2 §5-3): 정적 진입불가 · CCTV 판독. 다른 데이터
 *    소스가 늘어나면 우선 이 두 축과 어떻게 다른지 정의부터 잡는다.
 */
export function OverlayToggles({
  vehicles,
  selectedVehicleId,
  onVehicleChange,
  showStaticNoGo,
  showCctvReading,
  onToggleStatic,
  onToggleCctv,
}: OverlayTogglesProps) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="text-muted-foreground mb-1.5 px-1 text-[10.5px] font-medium tracking-widest uppercase">
          차량 선택
        </div>
        <select
          value={selectedVehicleId}
          onChange={(e) => onVehicleChange(e.target.value)}
          aria-label="차량 선택"
          className="border-border bg-surface text-foreground focus:border-primary/60 focus:ring-primary/20 w-full rounded-md border px-2.5 py-1.5 text-[12px] focus:ring-2 focus:outline-none"
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} · 폭 {v.width}m
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="text-muted-foreground mb-1.5 px-1 text-[10.5px] font-medium tracking-widest uppercase">
          오버레이
        </div>
        <div className="flex flex-col gap-1">
          <ToggleRow
            label="정적 진입불가 (PDF)"
            hint="중원구청 19개 동 등재 구간"
            checked={showStaticNoGo}
            onChange={onToggleStatic}
          />
          <ToggleRow
            label="CCTV 판독 결과"
            hint="배치 판독 · 신뢰도별 색"
            checked={showCctvReading}
            onChange={onToggleCctv}
          />
        </div>
      </div>

      <div>
        <div className="text-muted-foreground mb-1.5 px-1 text-[10.5px] font-medium tracking-widest uppercase">
          범례
        </div>
        <div className="flex flex-col gap-1 px-1">
          <LegendRow color="var(--heat-safe)" label="통과 가능 · 85% 이상" />
          <LegendRow color="var(--heat-warn)" label="주의 · 60~85%" />
          <LegendRow color="var(--heat-danger)" label="진입 불가 · 60% 미만" />
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "hover:bg-muted flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 transition-colors",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary mt-0.5 h-3.5 w-3.5"
      />
      <div className="flex flex-col">
        <span className="text-foreground text-[12px]">{label}</span>
        <span className="text-muted-foreground text-[10.5px]">{hint}</span>
      </div>
    </label>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-muted-foreground text-[11px]">{label}</span>
    </div>
  );
}
