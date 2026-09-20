import { Clock3 } from "lucide-react";

import { RetryTicker } from "./retry-ticker";

export const metadata = {
  title: "잠시 대기 중 · FireLoad",
};

/**
 * `/busy` — 트래픽 집중·서버 부팅 지연 시 안내 대기 화면.
 *
 * ⚠️ **z-groupware `StatusScreen` 패턴** (2026-09-20 재설계) — 401·403·404 와 한 벌인
 *    "가려던 곳에 지금 못 갔다" 를 알리는 화면. 로고·색·서비스 소개로 무겁게 만들지 않고
 *    아이콘 하나 · 제목 한 줄 · 설명 한 문장 · 나갈 문 하나로 정리한다.
 * ⚠️ 자동 재시도는 `RetryTicker` 가 12초 카운트다운 후 `/dispatch` 로 이동. 사용자가
 *    "지금 이동" 을 눌러 즉시 재시도 가능.
 * ⚠️ 셸(사이드바·상단바) 을 그리지 않는다 — 이 화면만은 아무것에도 기대지 않는다.
 */
export default function BusyPage() {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center gap-7 px-6 text-center">
      <span
        className="bg-surface text-muted-foreground border-border flex size-14 shrink-0 items-center justify-center rounded-2xl border"
        aria-hidden
      >
        <Clock3 className="size-6" strokeWidth={1.75} />
      </span>

      <div className="flex flex-col gap-2.5">
        <h1 className="text-foreground text-[26px] leading-8 font-semibold tracking-[-0.6px] break-keep sm:text-[30px] sm:leading-9 sm:tracking-[-0.8px]">
          잠시 후 다시 불러옵니다
        </h1>
        <p className="text-muted-foreground max-w-[420px] text-[13px] leading-6 break-keep">
          지금 상황실이 접속을 정리하고 있습니다. 잠시 후 자동으로 다시 열립니다.
        </p>
      </div>

      <RetryTicker />
    </main>
  );
}
