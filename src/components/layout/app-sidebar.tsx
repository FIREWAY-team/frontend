"use client";

import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, MapPinned, Truck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dispatch", label: "상황실", icon: LayoutDashboard },
  { href: "/map", label: "관할 지도", icon: MapPinned },
  { href: "/vehicles", label: "차량 관리", icon: Truck },
];

/**
 * 앱 사이드바 220px.
 *
 * ⚠️ **활성 판정은 startsWith** — `/vehicles/pump-8` 같은 상세 진입에도 `차량 관리` 활성 유지.
 * ⚠️ 다크 활성은 강한 컬러 블록이 아니라 **은은한 밝기 차이만** — z-groupware 관례 승계.
 * ⚠️ 계정 카드는 하드코딩(시연 계정 1개, §CLAUDE.md 사용자·권한). 실 세션 붙으면 훅으로 교체.
 */
export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="border-border bg-surface flex w-[220px] shrink-0 flex-col border-r">
      <div className="border-border border-b px-4 py-3.5">
        <Link href="/dispatch" aria-label="FireLoad 홈">
          <Wordmark size={20} />
        </Link>
      </div>

      <nav className="flex flex-col gap-0.5 p-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors",
                active
                  ? "bg-surface-2 text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon size={15} strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-3">
        <div className="bg-surface-2 flex items-center gap-2.5 rounded-md px-2.5 py-2">
          <div className="bg-primary/20 text-primary flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold">
            데모
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-foreground truncate text-[12px] font-medium">데모 담당자</span>
            <span className="text-muted-foreground truncate text-[10.5px]">상황실</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
