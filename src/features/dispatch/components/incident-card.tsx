"use client";

import { AlertOctagon, Building2, Clock, Phone, Ruler, User } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  VEHICLE_COLOR,
  VEHICLE_SHORT,
  vehiclesForSeverity,
} from "@/features/live/briefing-constants";
import type { Scenario } from "@/features/scenarios/types";
import { cn } from "@/lib/utils";

interface IncidentCardProps {
  incident: Scenario;
}

const SEVERITY_LABEL: Record<"small" | "medium" | "large", string> = {
  small: "소형",
  medium: "중형",
  large: "대형",
};

const SEVERITY_CLASS: Record<"small" | "medium" | "large", string> = {
  small: "bg-primary/15 text-primary",
  medium: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  large: "bg-danger/20 text-danger",
};

/**
 * 상황실 신고 카드 · 접수된 신고를 한 번에 다 보이게.
 *
 * ⚠️ **클릭하면 상황 브리핑 (`/live?incident=[id]`) 로 이동.** 상황 브리핑에서 AI 가 분석한
 *    경로·차량 분배·실시간 모니터링을 다룬다.
 * ⚠️ 상세 필드가 BE 에 없는 상태 — `intake-overrides.ts` 가 id 매핑으로 채워 넣음. 매핑에
 *    없는 신고는 fallback intake 가 "접수 중" 으로 표시.
 * ⚠️ **라이브 표기 금지** (§CLAUDE.md) — 접수 시각이 있어도 "지금 접수" 같은 문구 금지 ·
 *    HH:mm 고정 포맷만.
 */
export function IncidentCard({ incident }: IncidentCardProps) {
  const router = useRouter();
  const intake = incident.intake ?? {};
  const severity = intake.severity ?? "medium";

  function handleClick() {
    router.push(`/live?incident=${encodeURIComponent(incident.id)}`);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "border-border bg-surface hover:border-primary/40 hover:bg-surface-2 focus-visible:ring-ring focus-visible:ring-offset-background relative flex w-full flex-col gap-3 rounded-md border px-4 py-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
      )}
      aria-label={`${incident.title} · 상황 브리핑 열기`}
    >
      {/* 상단 · 사건 접수 라벨 + 규모 배지 */}
      <header className="flex items-start justify-between gap-2">
        <div className="text-muted-foreground text-[10.5px] font-medium tracking-widest uppercase">
          사건 접수
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
            SEVERITY_CLASS[severity],
          )}
        >
          {SEVERITY_LABEL[severity]}
        </span>
      </header>

      {/* 제목 + 위치 */}
      <div className="flex flex-col gap-0.5">
        <div className="text-foreground text-[14px] font-semibold">{incident.title}</div>
        <div className="text-muted-foreground text-[11px]">{incident.address}</div>
      </div>

      {/* 배정 예정 차량 chip · 규모만으론 몇 대 출동인지 혼동되어 추가 (§#50) */}
      <div className="flex flex-wrap gap-1">
        {vehiclesForSeverity(severity).map((vid) => (
          <span
            key={vid}
            className="border-border bg-background text-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: VEHICLE_COLOR[vid] ?? "#64748b" }}
            />
            {VEHICLE_SHORT[vid] ?? vid}
          </span>
        ))}
      </div>

      {/* 상세 정보 */}
      <dl className="flex flex-col gap-1.5 text-[11.5px]">
        <IntakeRow icon={User} label="신고자" value={intake.reporterName ?? "미확인"} />
        <IntakeRow icon={Phone} label="연락처" value={intake.reporterPhone ?? "미확인"} />
        <IntakeRow icon={Clock} label="접수 시각" value={formatReceivedAt(intake.reportedAt)} />
        <IntakeRow icon={Building2} label="건물 구조" value={intake.buildingType ?? "미확인"} />
        <IntakeRow
          icon={Ruler}
          label="화재 범위"
          value={intake.estimatedAreaM2 ? `약 ${intake.estimatedAreaM2}㎡` : "미확인"}
        />
      </dl>

      {/* 인명 피해 신고 · 있을 때만 */}
      {intake.casualtiesReported && (
        <div className="bg-danger/10 text-danger border-danger/30 flex items-center gap-1.5 rounded border px-2 py-1 text-[11px] font-semibold">
          <AlertOctagon size={13} strokeWidth={2} />
          인명 피해 신고
        </div>
      )}

      {/* 특이사항 · 있을 때만 */}
      {intake.notes && (
        <div className="text-muted-foreground border-border/60 border-t pt-2 text-[11px] break-keep">
          {intake.notes}
        </div>
      )}
    </button>
  );
}

function IntakeRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={12} strokeWidth={1.75} className="text-muted-foreground shrink-0" />
      <dt className="text-muted-foreground text-[10.5px]">{label}</dt>
      <dd className="text-foreground ml-auto text-[11.5px]">{value}</dd>
    </div>
  );
}

/** ISO8601 → "HH:mm 접수". 상대시간 금지 (§CLAUDE.md 정직성). */
function formatReceivedAt(iso?: string): string {
  if (!iso) return "미확인";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "미확인";
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m} 접수`;
}
