"use client";

import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

import type { RouteCandidate } from "../types";

interface CandidateCardProps {
  candidate: RouteCandidate;
  /** 지도에 미리보기 겹쳐 그리는 상태. 이 카드가 선택되었는지. */
  previewing: boolean;
  onPreview: () => void;
  onPromote: () => void;
}

/**
 * 후보 경로 카드 (2·3순위) — 지도 아래 가로로 배치.
 *
 * ⚠️ 클릭 · 지도에 미리보기 겹침 → `[이 경로로 변경]` 눌러야 상단 결정 자리와 스왑
 *    (§FRONTEND_SPEC v0.2 §5-2 시나리오 B).
 * ⚠️ 통과확률 숫자는 크게 · 나머지 메타(ETA · 거리)는 부속.
 */
export function CandidateCard({ candidate, previewing, onPreview, onPromote }: CandidateCardProps) {
  const probPct = Math.round(candidate.passableProb * 100);
  const etaMin = Math.floor(candidate.etaSec / 60);
  const etaSec = candidate.etaSec % 60;

  return (
    <div
      className={cn(
        "border-border bg-surface flex min-w-0 flex-1 flex-col gap-2 rounded-md border p-3 transition-colors",
        previewing && "border-primary/50 bg-surface-2",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10.5px] font-medium">
            {candidate.rank}순위
          </span>
          <span className="text-foreground tabular text-[15px] font-semibold">
            {probPct}
            <span className="text-muted-foreground ml-0.5 text-[11px]">%</span>
          </span>
        </div>
        <div className="text-muted-foreground tabular flex flex-col items-end text-[11px]">
          <span>
            ETA {etaMin}:{String(etaSec).padStart(2, "0")}
          </span>
          <span>{(candidate.distanceM / 1000).toFixed(2)} km</span>
        </div>
      </div>

      <p className="text-muted-foreground line-clamp-2 text-[11.5px] leading-snug">
        {candidate.explanation}
      </p>

      <div className="mt-auto flex items-center gap-1.5 pt-1">
        <button
          type="button"
          onClick={onPreview}
          className={cn(
            "flex-1 rounded px-2 py-1.5 text-[11px] font-medium transition-colors",
            previewing
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {previewing ? "미리보기 중" : "지도에 미리보기"}
        </button>
        <button
          type="button"
          onClick={onPromote}
          disabled={!previewing}
          className={cn(
            "flex items-center gap-1 rounded px-2 py-1.5 text-[11px] font-medium transition-colors",
            "bg-primary text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          변경
          <ArrowUpRight size={11} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
