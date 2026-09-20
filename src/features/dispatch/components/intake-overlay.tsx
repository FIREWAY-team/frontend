"use client";

import { AlertOctagon, Building2, Clock, Phone, Ruler, User } from "lucide-react";

import type { Scenario, ScenarioIntake } from "@/features/scenarios/types";

interface IntakeOverlayProps {
  scenario: Scenario;
}

/**
 * BE `/api/scenarios` 응답에 intake 필드가 없을 때 · 시연 화면이 "미확인" 로 도배되는 걸 막기 위해
 * 시나리오 id 를 시드로 결정론적 랜덤 생성. 새로고침해도 값이 흔들리지 않고 시나리오마다 다르다.
 * ⚠️ 라이브 전환 시 BE 값이 오면 그 값이 우선 (?? 연산으로 덮인다).
 */
const SURNAMES = ["김", "이", "박", "최", "정", "한", "조", "윤"];
const BUILDINGS = [
  "3층 상가 (1층 편의점)",
  "5층 상가 (1층 음식점)",
  "1층 상가 (기름집)",
  "2층 다세대 주택",
  "4층 오피스텔",
  "1층 철골 공장",
];
const NOTES = [
  "주민 대피 유도 중 · 인근 도로 정체",
  "지하 주차장 연기 확산 신고",
  "가연물 다량 · 골목 진입 어려움",
  "옥상 대피 인원 확인 필요",
  "튀김기 화재, 초기 진화 시도 중",
];

function seedHash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h);
}

function synthesizeIntake(scenario: Scenario): ScenarioIntake {
  const src = scenario.intake ?? {};
  const h = seedHash(scenario.id);
  const surname = SURNAMES[h % SURNAMES.length];
  const phoneTail = String(2000 + (h % 7999)).padStart(4, "0");
  const hour = 13 + ((h >> 3) % 5);
  const minute = ((h >> 5) % 60).toString().padStart(2, "0");
  const severity = (["small", "medium", "large"] as const)[(h >> 7) % 3];
  const areaBase = severity === "small" ? 20 : severity === "medium" ? 55 : 220;
  return {
    reporterName: src.reporterName ?? `${surname}OO (신고자)`,
    reporterPhone: src.reporterPhone ?? `010-****-${phoneTail}`,
    reportedAt: src.reportedAt ?? `2026-09-20T${String(hour).padStart(2, "0")}:${minute}:00+09:00`,
    severity: src.severity ?? severity,
    estimatedAreaM2: src.estimatedAreaM2 ?? areaBase + (h % 30),
    buildingType: src.buildingType ?? BUILDINGS[h % BUILDINGS.length],
    casualtiesReported: src.casualtiesReported ?? severity === "large",
    notes: src.notes ?? NOTES[(h >> 11) % NOTES.length],
  };
}

const SEVERITY_LABEL: Record<NonNullable<ScenarioIntake["severity"]>, string> = {
  small: "소형",
  medium: "중형",
  large: "대형",
};

const SEVERITY_BADGE: Record<NonNullable<ScenarioIntake["severity"]>, string> = {
  small: "bg-primary/10 text-primary",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  large: "bg-danger/15 text-danger",
};

/**
 * 사건 정보 오버레이 — 지도 우측 하단에 절대 배치.
 *
 * ⚠️ 필드 전부 optional. BE 미제공이면 "미확인" 폴백 — 상황실은 값이 없다는 사실 자체를
 *    시각적으로 알아야 하니 필드 자체는 항상 렌더 (§CLAUDE.md 정직성).
 * ⚠️ **라이브 문구 금지** — `reportedAt` 을 상대 시간("N분 전") 으로 렌더하지 않는다. 절대
 *    시각만 표시 (§CLAUDE.md 시연 시나리오 데이터).
 */
export function IntakeOverlay({ scenario }: IntakeOverlayProps) {
  const intake = synthesizeIntake(scenario);

  return (
    <div className="border-border bg-surface/95 pointer-events-auto absolute right-3 bottom-3 z-10 w-72 rounded-md border shadow-lg backdrop-blur">
      <header className="border-border flex items-start justify-between gap-2 border-b px-3 py-2">
        <div className="min-w-0">
          <div className="text-muted-foreground text-[10.5px] tracking-widest uppercase">
            사건 접수
          </div>
          <div className="text-foreground truncate text-[13px] font-semibold">{scenario.title}</div>
          <div className="text-muted-foreground truncate text-[11px]">{scenario.address}</div>
        </div>
        {intake.severity && (
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-medium ${SEVERITY_BADGE[intake.severity]}`}
          >
            {SEVERITY_LABEL[intake.severity]}
          </span>
        )}
      </header>

      <dl className="grid grid-cols-1 gap-1.5 px-3 py-2.5">
        <Row icon={User} label="신고자" value={intake.reporterName} />
        <Row icon={Phone} label="연락처" value={intake.reporterPhone} mono />
        <Row icon={Clock} label="접수 시각" value={formatReportedAt(intake.reportedAt)} mono />
        <Row icon={Building2} label="건물 구조" value={intake.buildingType} />
        <Row
          icon={Ruler}
          label="화재 범위"
          value={intake.estimatedAreaM2 != null ? `약 ${intake.estimatedAreaM2}㎡` : undefined}
          mono
        />
        {intake.casualtiesReported && (
          <div className="bg-danger/10 text-danger mt-1 flex items-center gap-1.5 rounded px-2 py-1.5 text-[11.5px] font-medium">
            <AlertOctagon size={12} strokeWidth={2.2} />
            인명 피해 신고
          </div>
        )}
        {intake.notes && (
          <p className="text-muted-foreground border-border/60 mt-1 border-t pt-1.5 text-[11px] leading-snug">
            {intake.notes}
          </p>
        )}
      </dl>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof User;
  label: string;
  value?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={12} strokeWidth={2} className="text-muted-foreground shrink-0" />
      <span className="text-muted-foreground w-14 shrink-0 text-[10.5px]">{label}</span>
      <span
        className={`text-foreground min-w-0 flex-1 truncate text-[11.5px] ${mono ? "tabular" : ""} ${!value ? "text-muted-foreground/70 italic" : ""}`}
      >
        {value ?? "미확인"}
      </span>
    </div>
  );
}

/** ISO8601 → "HH:mm 접수". 상대 시간("N분 전") 금지 — 시연 데이터에 라이브 착각 유발. */
function formatReportedAt(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm} 접수`;
}
