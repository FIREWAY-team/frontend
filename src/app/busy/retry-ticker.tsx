"use client";

import { ArrowRight, RotateCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const INITIAL_SECONDS = 12;

/**
 * `/busy` 하단 · 카운트다운 + 지금 이동 CTA.
 *
 * ⚠️ **12초 후 자동으로 `/dispatch` 로 이동** — 사용자가 손 안 대도 서버 상태가 나아지면
 *    바로 상황실로 복귀. 동시에 [지금 이동] 버튼도 있어 원할 때 즉시 재시도 가능.
 * ⚠️ `prefers-reduced-motion` 존중은 CSS 전역 (§globals.css) 이 처리 · 여기선 초 단위
 *    setInterval 만 — 애니메이션 없음.
 */
export function RetryTicker() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(INITIAL_SECONDS);

  useEffect(() => {
    if (seconds <= 0) {
      router.push("/dispatch");
      return;
    }
    const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds, router]);

  return (
    <div className="flex flex-col items-center gap-3">
      <Link
        href="/dispatch"
        className="group bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-ring focus-visible:ring-offset-background inline-flex h-11 items-center gap-1.5 rounded-md px-5 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        지금 상황실로 이동
        <ArrowRight size={14} strokeWidth={2} />
      </Link>
      <p className="text-muted-foreground/80 flex items-center gap-1.5 text-[11.5px]">
        <RotateCw size={11} strokeWidth={2} aria-hidden className="animate-spin" />
        <span className="tabular-nums">{seconds}</span>초 후 자동 재시도
      </p>
    </div>
  );
}
