"use client";

import { X } from "lucide-react";
import Image from "next/image";

import type { RouteCandidate } from "../types";

interface EvidenceSheetProps {
  candidate: RouteCandidate;
  onClose: () => void;
}

/**
 * 근거 카드 오버레이 시트 — 지도 위로 내려오며 LLM 설명 + 제외 링크 이유 + CCTV 스틸.
 *
 * ⚠️ 지도 이동을 유발하지 않는다 (§FRONTEND_SPEC v0.2 §5-2). 이동하면 시선이 바뀌어
 *    사용자가 재판정에 필요한 문맥을 잃는다.
 * ⚠️ CCTV 스틸은 `next/image` — 원본 크기가 크므로 자동 리사이즈·webp·lazy load 필수
 *    (§CLAUDE.md 지도·이미지·CCTV 스틸).
 */
export function EvidenceSheet({ candidate, onClose }: EvidenceSheetProps) {
  return (
    <div className="border-border bg-background/98 absolute inset-x-0 top-0 z-20 max-h-full overflow-y-auto rounded-md border shadow-lg backdrop-blur-sm">
      <div className="border-border sticky top-0 flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="bg-primary/15 text-primary rounded px-1.5 py-0.5 text-[10.5px] font-medium">
            근거 · 1순위
          </span>
          <span className="text-muted-foreground text-[11px]">
            LLM 요약 + 제외 링크 이유 + CCTV 판독 스틸
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="근거 카드 닫기"
          className="hover:bg-muted text-muted-foreground hover:text-foreground flex h-7 w-7 items-center justify-center rounded-md transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div>
          <div className="text-muted-foreground mb-1.5 text-[10.5px] font-medium tracking-widest uppercase">
            AI 요약
          </div>
          <p className="text-foreground text-[12.5px] leading-relaxed">{candidate.explanation}</p>
        </div>

        {candidate.excludedReasons.length > 0 && (
          <div>
            <div className="text-muted-foreground mb-2 text-[10.5px] font-medium tracking-widest uppercase">
              제외된 도로 링크 ({candidate.excludedReasons.length})
            </div>
            <ul className="flex flex-col gap-2">
              {candidate.excludedReasons.map((r) => (
                <li key={r.edgeId} className="border-border flex gap-3 rounded-md border p-2.5">
                  {r.evidenceUrl && (
                    <div className="border-border bg-muted relative h-16 w-24 shrink-0 overflow-hidden rounded border">
                      <Image
                        src={r.evidenceUrl}
                        alt={`제외 링크 ${r.edgeId} 증거 이미지`}
                        fill
                        sizes="96px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="text-muted-foreground font-mono text-[10.5px]">{r.edgeId}</div>
                    <div className="text-foreground text-[12px]">{r.reason}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
