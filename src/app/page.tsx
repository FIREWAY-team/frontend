import Link from "next/link";

/**
 * 임시 진입점 — 실제 라우트(`/login` · `/dispatch` · `/map` · `/vehicles`)가 붙기 전까지
 * 개발 중 어디로 갈지 안내한다. 팀장 최종 기획·화면 세부가 확정되면 이 화면은 지운다.
 */
export default function LandingPlaceholder() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col justify-center gap-8 px-8">
      <header className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">골목119 · Frontend</p>
        <h1 className="text-3xl font-semibold">
          소방차 골목 통과가능 경로 — 개발 중
        </h1>
        <p className="text-muted-foreground text-sm">
          팀장 최종 기획·프론트 담당 업무 확정 후 실제 화면 개발을 시작합니다. 지금은 뼈대만
          세팅한 상태.
        </p>
      </header>

      <section className="border-border bg-card rounded-lg border p-6">
        <h2 className="mb-3 text-lg font-medium">계획된 화면</h2>
        <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
          <li>
            <Link
              href="/login"
              className="hover:text-foreground underline underline-offset-4"
            >
              /login
            </Link>{" "}
            — 로그인 (단일 시연 계정)
          </li>
          <li>
            <Link
              href="/dispatch"
              className="hover:text-foreground underline underline-offset-4"
            >
              /dispatch
            </Link>{" "}
            — 상황실 대시보드 (메인)
          </li>
          <li>
            <Link
              href="/map"
              className="hover:text-foreground underline underline-offset-4"
            >
              /map
            </Link>{" "}
            — 관할 지도 (오버레이·CCTV 팝업)
          </li>
          <li>
            <Link
              href="/vehicles"
              className="hover:text-foreground underline underline-offset-4"
            >
              /vehicles
            </Link>{" "}
            — 차량 관리 (목록·상세)
          </li>
        </ul>
      </section>

      <footer className="text-muted-foreground text-xs">
        스펙은 <code>docs/FRONTEND_SPEC.md</code>, 기술 규칙은 <code>CLAUDE.md</code>를
        본다.
      </footer>
    </main>
  );
}
