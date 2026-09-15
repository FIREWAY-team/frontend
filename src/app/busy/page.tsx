import { Camera, Cpu, Flame, MapPinned } from "lucide-react";

import { Wordmark } from "@/components/brand/wordmark";

import { RetryTicker } from "./retry-ticker";

export const metadata = {
  title: "잠시 대기 중 · FireLoad",
};

/**
 * `/busy` — 트래픽 집중·서버 부팅 지연 시 안내 대기 화면.
 *
 * ⚠️ **로그인 · 랜딩이 없는 구조** (2026-09-15 결정) 라 사용자가 서비스 전반을 처음 볼 수 있는
 *    자리는 여기 하나다. 기다리는 시간에 서비스가 뭐 하는 물건인지도 함께 전달한다.
 * ⚠️ 상단바·사이드바 셸을 붙이지 않는다 — `/dispatch` 로 자동 복귀할 때 시각 점프 최소.
 * ⚠️ 자동 재시도는 클라이언트 (`RetryTicker`) 에서 · 12초 카운트다운 후 `/dispatch` 로 이동.
 *    사용자가 "지금 이동" 을 눌러 즉시 재시도 가능.
 */
export default function BusyPage() {
  return (
    <main className="bg-background text-foreground flex min-h-screen flex-col">
      <header className="border-border bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1144px] items-center px-7">
          <Wordmark size={22} />
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-[1144px] flex-1 flex-col items-start px-7 py-20 lg:py-28">
        <span className="border-border bg-card text-muted-foreground mb-6 inline-flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 text-[12px] leading-4 shadow-sm">
          <span className="bg-warning/15 text-warning flex items-center gap-1 rounded-full px-2 py-1 font-semibold">
            잠시 대기
          </span>
          <span className="text-foreground/80">지금 상황실이 접속을 정리하고 있습니다</span>
        </span>

        <h1 className="text-foreground max-w-[820px] text-[40px] leading-[48px] font-semibold tracking-[-1.2px] break-keep lg:text-[56px] lg:leading-[62px] lg:tracking-[-1.7px]">
          <span className="block">잠시 후 다시 불러옵니다.</span>
          <span className="from-primary via-primary bg-gradient-to-r to-[var(--vehicle-small)] bg-clip-text text-transparent">
            그동안 무엇을 하는 서비스인지 짧게 소개드릴게요.
          </span>
        </h1>

        <p className="text-muted-foreground mt-6 max-w-[560px] text-[15px] leading-[26px] break-keep">
          <span className="block">
            FireLoad 는{" "}
            <strong className="text-foreground font-semibold">
              소방차가 실제로 통과 가능한 골목
            </strong>{" "}
            만 골라 경로를 냅니다.
          </span>
          <span className="block pt-1.5">
            차종 · 진입곤란 도로 · CCTV 판독을 하나의 판정 축으로 통합해 5분 안에 도착하는 경로를
            제안합니다.
          </span>
        </p>

        <div className="mt-10 grid w-full max-w-[820px] grid-cols-1 gap-3 sm:grid-cols-3">
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
        </div>

        <div className="mt-10 flex items-center gap-3">
          <RetryTicker />
        </div>

        <p className="text-muted-foreground mt-6 flex items-center gap-2 text-[11.5px]">
          <Flame size={12} strokeWidth={2} className="text-primary" />
          FireLoad · 성남×KAIST AI 경진대회 · 원티드 AI Championship 2026
        </p>
      </section>
    </main>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="border-border bg-surface flex flex-col gap-2 rounded-md border p-4">
      <div className="bg-primary/12 text-primary flex h-8 w-8 items-center justify-center rounded-md">
        <Icon size={15} strokeWidth={1.75} />
      </div>
      <h3 className="text-foreground text-[13.5px] font-semibold">{title}</h3>
      <p className="text-muted-foreground text-[12px] leading-[18px] break-keep">{body}</p>
    </div>
  );
}
