"use client";

import { X } from "lucide-react";
import Image from "next/image";

interface CctvPopupProps {
  edgeId: string;
  measuredWidthM: number;
  detectedObjects: string[];
  passableProb: Record<string, number>;
  stillUrl: string;
  onClose: () => void;
}

/**
 * 지도 위 골목 클릭 → CCTV 스틸 + 판독 결과 팝업.
 *
 * ⚠️ **골목 클릭 시점에만** 열림 (§FRONTEND_SPEC v0.2 §5-3). 지도 진입 시 미리 로드하지 않는다.
 * ⚠️ 팝업 안 이미지는 `next/image` · lazy · CloudFront 캐시 위임.
 */
export function CctvPopup({
  edgeId,
  measuredWidthM,
  detectedObjects,
  passableProb,
  stillUrl,
  onClose,
}: CctvPopupProps) {
  return (
    <div
      role="dialog"
      aria-label={`CCTV 판독 · ${edgeId}`}
      className="border-border bg-surface w-[280px] rounded-md border shadow-lg"
    >
      <div className="border-border flex items-center justify-between border-b px-3 py-2">
        <span className="text-muted-foreground font-mono text-[10.5px]">{edgeId}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="팝업 닫기"
          className="hover:bg-muted text-muted-foreground hover:text-foreground flex h-6 w-6 items-center justify-center rounded"
        >
          <X size={12} />
        </button>
      </div>

      <div className="border-border bg-muted relative aspect-video border-b">
        <Image
          src={stillUrl}
          alt={`${edgeId} CCTV 스틸`}
          fill
          sizes="280px"
          className="object-cover"
          unoptimized
        />
      </div>

      <div className="space-y-2.5 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[11px]">잔여폭</span>
          <span className="text-foreground tabular text-[13px] font-semibold">
            {measuredWidthM.toFixed(2)} m
          </span>
        </div>

        <div>
          <div className="text-muted-foreground mb-1 text-[10.5px] tracking-wide uppercase">
            감지 객체
          </div>
          <div className="flex flex-wrap gap-1">
            {detectedObjects.map((o) => (
              <span
                key={o}
                className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10.5px]"
              >
                {o}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="text-muted-foreground mb-1 text-[10.5px] tracking-wide uppercase">
            차량별 통과확률
          </div>
          <div className="flex flex-col gap-1">
            {Object.entries(passableProb).map(([vehId, prob]) => (
              <div key={vehId} className="flex items-center justify-between text-[11.5px]">
                <span className="text-muted-foreground">{vehId}</span>
                <span className="tabular text-foreground font-medium">
                  {Math.round(prob * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
