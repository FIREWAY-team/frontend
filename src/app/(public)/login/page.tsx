import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";

export const metadata = { title: "로그인" };

/**
 * `/login` — 시연 계정 단일 로그인 (§FRONTEND_SPEC §5-1).
 *
 * ⚠️ **회원가입·비번찾기·소셜 로그인 없다** (§CLAUDE.md 사용자·권한). 시연 대상은 팀·심사위원.
 * ⚠️ 실 세션 붙기 전까진 폼 제출은 그냥 `/dispatch`로 이동만 시킴 · 실 인증은 Server Action으로
 *    후속 이슈에서 붙임.
 */
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex justify-center">
          <Wordmark size={24} />
        </div>

        <form
          action="/dispatch"
          className="border-border bg-surface flex flex-col gap-4 rounded-lg border p-6 shadow-sm"
        >
          <div className="mb-1">
            <h1 className="text-foreground text-[16px] font-semibold">상황실 접속</h1>
            <p className="text-muted-foreground mt-1 text-[11.5px]">
              발급받은 시연 계정으로 로그인합니다.
            </p>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground text-[11px] font-medium">이메일</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              defaultValue="demo@fireload"
              placeholder="demo@fireload"
              className="border-border bg-background text-foreground focus:border-primary/60 focus:ring-primary/20 rounded-md border px-3 py-2 text-[12.5px] focus:ring-2 focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground text-[11px] font-medium">비밀번호</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              defaultValue="demo1234"
              placeholder="••••••••"
              className="border-border bg-background text-foreground focus:border-primary/60 focus:ring-primary/20 rounded-md border px-3 py-2 text-[12.5px] focus:ring-2 focus:outline-none"
            />
          </label>

          <button
            type="submit"
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 flex items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-[12.5px] font-semibold transition-colors"
          >
            로그인
            <ArrowRight size={12} />
          </button>

          <div className="border-border text-muted-foreground mt-1 rounded-md border border-dashed px-3 py-2 text-[10.5px]">
            <span className="text-foreground font-medium">데모 계정</span> ·
            <code className="ml-1 font-mono">demo@fireload / demo1234</code>
            <div className="mt-0.5">위 값이 미리 채워져 있습니다 · 그대로 로그인 눌러 주세요.</div>
          </div>
        </form>

        <div className="text-muted-foreground mt-4 flex items-center justify-center gap-3 text-[11px]">
          <Link href="/" className="hover:text-foreground">
            ← 랜딩으로
          </Link>
          <span aria-hidden>·</span>
          <span>실 계정 발급은 팀장 협의</span>
        </div>
      </div>
    </div>
  );
}
