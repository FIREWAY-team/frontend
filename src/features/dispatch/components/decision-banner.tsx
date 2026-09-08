"use client";

import { CheckCircle2, FileText, Send } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import type { RouteCandidate } from "../types";

interface DecisionBannerProps {
  decision: RouteCandidate | null;
  vehicleName?: string;
  onOpenEvidence: () => void;
}

/**
 * 상단 결정 경로 배너 — `rank: 1` 자동 승격 자리.
 *
 * ⚠️ **결정이 하나로 눈에 띈다** — 색·크기·여백이 후보 카드보다 확연히 큼
 *    (§FRONTEND_SPEC v0.2 §5-2 시나리오 A).
 * ⚠️ 확정 버튼은 토스트만 (시연용 · MVP). BE에 실제로 POST 나가는 자리는 실 세션 붙는
 *    시점에 서버 액션 붙임.
 */
export function DecisionBanner({ decision, vehicleName, onOpenEvidence }: DecisionBannerProps) {
  if (!decision) {
    return (
      <div className="border-border bg-surface flex items-center justify-center rounded-md border px-4 py-6">
        <span className="text-muted-foreground text-[12px]">
          좌측에서 시나리오를 선택하면 결정 경로가 여기 표시됩니다.
        </span>
      </div>
    );
  }

  const probPct = Math.round(decision.passableProb * 100);
  const etaMin = Math.floor(decision.etaSec / 60);
  const etaSec = decision.etaSec % 60;

  function handleConfirm() {
    toast.success("출동대에 경로를 전송했습니다", {
      description: vehicleName
        ? `${vehicleName} · ETA ${etaMin}:${String(etaSec).padStart(2, "0")}`
        : undefined,
    });
  }

  return (
    <section
      aria-label="결정 경로"
      className="border-primary/30 bg-primary/6 relative flex items-center gap-4 rounded-md border px-4 py-3"
    >
      <div className="bg-primary/15 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
        <CheckCircle2 size={16} strokeWidth={2} />
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-5">
        <div className="flex min-w-0 flex-col">
          <div className="text-muted-foreground text-[10.5px] font-medium tracking-widest uppercase">
            결정 경로 · 1순위
          </div>
          <p className="text-foreground line-clamp-1 text-[13px] leading-snug">
            {decision.explanation}
          </p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-6">
          <MetricPill label="통과확률" value={`${probPct}%`} accent />
          <MetricPill label="ETA" value={`${etaMin}:${String(etaSec).padStart(2, "0")}`} />
          <MetricPill label="거리" value={`${(decision.distanceM / 1000).toFixed(2)} km`} />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenEvidence}
          className="border-border text-muted-foreground hover:text-foreground hover:bg-muted flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11.5px] font-medium transition-colors"
        >
          <FileText size={12} strokeWidth={2} />
          근거 보기
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11.5px] font-semibold transition-colors"
        >
          <Send size={12} strokeWidth={2} />
          출동 확정
        </button>
      </div>
    </section>
  );
}

function MetricPill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-end">
      <span className="text-muted-foreground text-[10px] tracking-wide uppercase">{label}</span>
      <span
        className={cn(
          "tabular text-[15px] font-semibold",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
