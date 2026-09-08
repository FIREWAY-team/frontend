import type { LucideIcon } from "lucide-react";
import { Bell } from "lucide-react";
import type { ReactNode } from "react";

import { ThemeToggle } from "./theme-toggle";

interface AppHeaderProps {
  title: string;
  icon?: LucideIcon;
  /** 우측 커스텀 액션 (특정 화면 전용 버튼 등). */
  actions?: ReactNode;
}

/**
 * 화면 상단 헤더 — 콘텐츠 영역 안쪽에 붙는다(사이드바 위에 안 걸침 · z-groupware 관례).
 *
 * ⚠️ **알림 아이콘은 시각적 자리만 잡아둠** — 실 알림 시스템은 v2 이후 결정. MVP는 클릭해도 반응 없음.
 *    §CLAUDE.md `알림 화면은 없다` 규칙 참고 (배너 방식만 지원).
 */
export function AppHeader({ title, icon: Icon, actions }: AppHeaderProps) {
  return (
    <header className="border-border bg-background/95 sticky top-0 z-10 flex h-12 items-center justify-between border-b px-5 backdrop-blur">
      <h1 className="text-foreground flex items-center gap-2 text-[14px] font-semibold">
        {Icon && <Icon size={15} strokeWidth={1.75} className="text-muted-foreground" />}
        {title}
      </h1>
      <div className="flex items-center gap-1">
        {actions}
        <button
          type="button"
          aria-label="알림"
          className="hover:bg-muted text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-md transition-colors"
        >
          <Bell size={16} />
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
