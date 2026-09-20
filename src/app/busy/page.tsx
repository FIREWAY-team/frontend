import { Camera, Clock3, Cpu, MapPinned } from "lucide-react";
import type { ComponentType } from "react";

import { RetryTicker } from "./retry-ticker";

export const metadata = {
  title: "잠시 대기 중 · FireLoad",
};

/**
 * `/busy` — 트래픽 집중·서버 부팅 지연 시 안내 대기 화면.
 *
 * ⚠️ **z-groupware `StatusScreen` 톤** (2026-09-20 재설계) — 아이콘/제목/설명 사이즈는
 *    401·403·404 와 같은 스케일 (아이콘 24px · 제목 30px · 설명 13px). 여백은 이 화면 안에서
 *    서비스 소개 카드가 자리를 차지하니 상하 여백을 좁힌다.
 * ⚠️ **기다리는 동안 볼 서비스 소개** — 3 카드 · 각각 얇은 라벨 하나·짧은 설명 한 줄.
 *    로그인 없이 바로 상황실로 들어가는 구조라 · 이 화면이 서비스 첫인상 자리이기도.
 * ⚠️ 자동 재시도는 `RetryTicker` 가 12초 카운트다운 후 `/dispatch` 로 이동.
 */
export default function BusyPage() {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center gap-7 px-6 py-16 text-center">
      <span
        className="bg-surface text-muted-foreground border-border flex size-14 shrink-0 items-center justify-center rounded-2xl border"
        aria-hidden
      >
        <Clock3 className="size-6" strokeWidth={1.75} />
      </span>

      <div className="flex flex-col gap-2.5">
        <p className="text-muted-foreground/70 text-[13px] leading-5 tracking-[1.2px] tabular-nums">
          BUSY
        </p>
        <h1 className="text-foreground max-w-[560px] text-[26px] leading-8 font-semibold tracking-[-0.6px] break-keep sm:text-[30px] sm:leading-9 sm:tracking-[-0.8px]">
          지금 접속이 많아 처리가 지연되고 있습니다
        </h1>
        <p className="text-muted-foreground mx-auto max-w-[420px] text-[13px] leading-6 break-keep">
          잠시 후 자동으로 다시 열립니다. 기다리는 동안 무엇을 하는 서비스인지 짧게 안내드릴게요.
        </p>
      </div>

      <RetryTicker />

      <section className="border-border/60 mt-4 grid w-full max-w-[720px] grid-cols-1 gap-2 rounded-lg border p-3 text-left sm:grid-cols-3">
        <FeatureCard
          icon={MapPinned}
          title="정적 진입불가"
          body="중원구청 공식 19개 동 진입불가 도로를 지리 정보로 정형화."
        />
        <FeatureCard
          icon={Camera}
          title="CCTV 판독"
          body="공개 CCTV 스틸에서 잔여폭·감지 객체를 실측."
        />
        <FeatureCard
          icon={Cpu}
          title="차종 × LLM"
          body="차량 폭·중량·회전반경 × LLM 이 판단 근거를 5줄로."
        />
      </section>
    </main>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md px-2.5 py-2">
      <div className="text-muted-foreground flex items-center gap-1.5">
        <Icon className="size-3.5" strokeWidth={1.75} />
        <h3 className="text-foreground text-[12px] font-semibold">{title}</h3>
      </div>
      <p className="text-muted-foreground/85 text-[11.5px] leading-[17px] break-keep">{body}</p>
    </div>
  );
}
