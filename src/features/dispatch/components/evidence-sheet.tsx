"use client";

import { Sparkles, X } from "lucide-react";
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
 * ⚠️ **AI 인터랙션 어휘 반영** (§design-lab ai-interaction-patterns):
 *    - `role="dialog"` + `aria-live="polite"` 로 스크린 리더가 근거 도착을 알림.
 *    - AI 요약 섹션에 sparkle 아이콘 + "AI 판독 정리" 문구 · "정답" 톤 대신 "정리했어요" 톤.
 *    - 제외 링크는 번호 배지 (①②③) 인용 스타일 (`ai-citation`) · 클릭 시 CCTV 이미지 확장 가능성 남김.
 * ⚠️ **slide-down 진입** (§design-lab guide · motion motivated) — 오버레이 특성상
 *    위에서 미끄러져 내려오는 신호가 "레이어가 뜬다" 는 컨텍스트 제공.
 */
export function EvidenceSheet({ candidate, onClose }: EvidenceSheetProps) {
  return (
    <div
      role="dialog"
      aria-label="결정 경로 · 근거"
      aria-live="polite"
      className="border-border bg-background/98 fireload-enter-slide absolute inset-x-0 top-0 z-20 max-h-full overflow-y-auto rounded-md border shadow-lg backdrop-blur-sm"
    >
      <div className="border-border sticky top-0 flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="bg-primary/15 text-primary rounded px-1.5 py-0.5 text-[10.5px] font-medium">
            근거 · 1순위
          </span>
          <span className="text-muted-foreground text-[11px]">
            AI 판독 정리 · 제외 링크 이유 · CCTV 스틸
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="근거 카드 닫기"
          className="hover:bg-muted text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-4 px-4 py-4">
        <section aria-label="AI 판독 정리">
          <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-[10.5px] font-medium tracking-widest uppercase">
            <Sparkles size={11} strokeWidth={2} className="text-primary" />
            AI 판독 정리
          </div>
          <p className="text-foreground text-[12.5px] leading-relaxed">{candidate.explanation}</p>
          <p className="text-muted-foreground mt-1.5 text-[10.5px]">
            판독 결과입니다. 현장 상황과 함께 검토해 주세요.
          </p>
        </section>

        {candidate.excludedReasons.length > 0 && (
          <section aria-label="제외된 도로 링크">
            <div className="text-muted-foreground mb-2 text-[10.5px] font-medium tracking-widest uppercase">
              제외된 도로 링크 ({candidate.excludedReasons.length})
            </div>
            <ul className="flex flex-col gap-2">
              {candidate.excludedReasons.map((r, i) => (
                <li key={r.edgeId} className="border-border flex gap-3 rounded-md border p-2.5">
                  <span
                    aria-hidden="true"
                    className="bg-primary/15 text-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-semibold tabular-nums"
                  >
                    {i + 1}
                  </span>
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
          </section>
        )}
      </div>
    </div>
  );
}
