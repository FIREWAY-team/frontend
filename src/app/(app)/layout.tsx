import { AppSidebar } from "@/components/layout/app-sidebar";

/**
 * (app) 라우트 그룹 공용 셸 — 사이드바 + 콘텐츠.
 *
 * ⚠️ **로그인 필수 자리** (§CLAUDE.md 사용자·권한). MVP에선 middleware가 아직 no-op이라
 *    직접 진입도 되지만, 실 세션 붙는 시점부터 middleware가 여기 진입 전에 `/login`으로 튕김.
 * ⚠️ 사이드바는 스크롤과 별개(고정) · 콘텐츠만 자체 스크롤.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <AppSidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
