import { MapPinned } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface MapPlaceholderProps {
  className?: string;
  label?: string;
  /** 지도 위에 겹치는 요소 (경로 미리보기 SVG · 오버레이 등). */
  children?: ReactNode;
}

/**
 * Kakao Map 자리 임시 placeholder.
 *
 * ⚠️ **실제 지도 연결은 별도 이슈** (#7 스코프 밖 · §CLAUDE.md 지도 SDK 규칙). 지금은 회색
 *    배경 + 지도 라벨 + 좌표 그리드 무늬만 그려서 자리 감을 준다.
 * ⚠️ `children`으로 경로 미리보기 SVG · 오버레이를 얹을 수 있다 — 실제 지도로 교체할 때
 *    이 컨테이너를 `<Map>`으로 바꾸면 겹치는 요소는 그대로 재사용된다.
 */
export function MapPlaceholder({
  className,
  label = "지도 영역 · Kakao Map 로드 예정",
  children,
}: MapPlaceholderProps) {
  return (
    <div
      className={cn(
        "border-border bg-surface relative flex flex-1 items-center justify-center overflow-hidden rounded-md border",
        "bg-[linear-gradient(0deg,var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)]",
        "bg-[size:32px_32px]",
        className,
      )}
      aria-label={label}
    >
      <div className="text-muted-foreground pointer-events-none flex flex-col items-center gap-1.5">
        <MapPinned size={22} strokeWidth={1.5} />
        <span className="text-[11.5px] tracking-wide">{label}</span>
      </div>
      {children && <div className="pointer-events-auto absolute inset-0">{children}</div>}
    </div>
  );
}
