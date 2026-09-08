"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const THEME_STORAGE_KEY = "fireload:theme";

/**
 * 다크·라이트 토글.
 *
 * ⚠️ **부트 스크립트(`layout.tsx`)와 같은 key를 쓴다** — 세션 간 일관성. key가 어긋나면
 *    첫 페인트는 다크였다가 하이드레이션 후 라이트로 튀는 사고가 난다.
 * ⚠️ **`useSyncExternalStore`로 `document.documentElement.classList`를 구독**한다 —
 *    `useEffect + setState` 패턴은 하이드레이션 이후 한 프레임 늦게 값이 오지만, 이 훅은
 *    서버 스냅샷(`undefined` = 미결정)과 클라이언트 스냅샷을 갈라 React가 직접 관리한다.
 *    아이콘은 값이 결정되기 전(SSR·hydration)에는 그리지 않아 서버-클라 불일치가 원천 봉쇄.
 */
function subscribeToTheme(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getIsDarkSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot(): undefined {
  // 서버에선 알 수 없다 — 클라 마운트 후 실제 클래스로 결정.
  return undefined;
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribeToTheme, getIsDarkSnapshot, getServerSnapshot);

  function handleToggle() {
    const next = !isDark;
    if (next) {
      document.documentElement.classList.add("dark");
      try {
        localStorage.removeItem(THEME_STORAGE_KEY);
      } catch {
        /* 저장 실패 무시 — 세션 안에선 정상 동작 */
      }
    } else {
      document.documentElement.classList.remove("dark");
      try {
        localStorage.setItem(THEME_STORAGE_KEY, "light");
      } catch {
        /* 저장 실패 무시 */
      }
    }
  }

  return (
    <button
      type="button"
      aria-label="테마 변경"
      onClick={handleToggle}
      className={cn(
        "hover:bg-muted flex h-8 w-8 items-center justify-center rounded-md transition-colors",
        "text-muted-foreground hover:text-foreground",
      )}
    >
      {isDark === undefined ? null : isDark ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
