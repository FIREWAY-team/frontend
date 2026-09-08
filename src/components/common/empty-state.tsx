import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  /** 상단 작은 코드 라벨 (404 · 403 등). 오류 화면일 때. */
  code?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * 비어있음 · 오류 · 초기 상태 공용 컴포넌트.
 *
 * ⚠️ z-groupware의 404 · 403 페이지 패턴 승계 — 아이콘/코드 → 제목 → 설명 → CTA.
 *    같은 레이아웃을 여러 상태에서 재사용해 시각적 예측성을 준다.
 */
export function EmptyState({
  icon: Icon,
  code,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center",
        className,
      )}
    >
      {Icon && <Icon size={32} strokeWidth={1.25} className="text-muted-foreground mb-1" />}
      {code && (
        <span className="text-muted-foreground text-[11px] font-medium tracking-widest uppercase">
          {code}
        </span>
      )}
      <h2 className="text-foreground text-[15px] font-semibold">{title}</h2>
      {description && (
        <p className="text-muted-foreground max-w-sm text-[12.5px] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
