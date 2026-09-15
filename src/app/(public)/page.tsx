import { ArrowRight, Camera, Cpu, Flame, MapPinned } from "lucide-react";
import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";

export const metadata = {
  title: "FireLoad — 소방차 골목 통과가능 경로",
};

/**
 * 랜딩 페이지 (`/`) — 심사·홍보용 (§FRONTEND_SPEC v0.2 확정).
 *
 * ⚠️ **공공기관 리포트 톤**. 마케팅 오버톤 (풀블리드 히어로 · 큰 감정 문구) 피하고
 *    문제 정의 → 해법 → 근거 데이터 → 진입 흐름으로 정렬. 심사 위원이 30초 안에 문제·차별점을
 *    이해할 수 있어야 한다.
 * ⚠️ **타이포는 큼직하되 · 카피는 절제**. 헤드라인 44/60px · tracking-[-1.5px] · break-keep 로
 *    한글 조판을 잡는다 (§design-lab guide 4.1 · z-groupware 랜딩 승계). 감정 톤은 죽여도
 *    글자 무게로 서비스 정체성을 낸다.
 * ⚠️ **강조는 gradient 한 줄만.** 나머지 본문은 회색 · 핵심 명사만 bold. 색상 남용 X.
 * ⚠️ max-w-[1144px] · z-groupware 와 같은 폭 (§CLAUDE.md · 새 숫자 만들지 않기).
 */
export default function LandingPage() {
  return (
    <>
      {/* 헤더 */}
      <header className="border-border bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1144px] items-center justify-between px-7">
          <Wordmark size={22} />
          <nav className="flex items-center gap-5 text-[12.5px]">
            <a
              href="#problem"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              문제
            </a>
            <a
              href="#solution"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              해법
            </a>
            <a
              href="#data"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              근거
            </a>
            <Link
              href="/login"
              className="bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-ring focus-visible:ring-offset-background flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11.5px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              상황실 진입
              <ArrowRight size={11} />
            </Link>
          </nav>
        </div>
      </header>

      {/* 히어로 */}
      <section className="relative py-20 lg:py-28">
        <div className="mx-auto max-w-[1144px] px-7">
          {/*
            눈썹 배지 · z-groupware 스타일 — 도메인·주체를 명확히.
            ⚠️ 배지 안 아이콘 톤은 primary · 옆 문구는 foreground/80.
          */}
          <span className="border-border bg-card text-muted-foreground animate-in fade-in-0 slide-in-from-bottom-2 mb-6 inline-flex items-center gap-2 rounded-full border py-1.5 pr-4 pl-1.5 text-[12px] leading-4 shadow-sm duration-700">
            <span className="bg-primary/12 text-primary flex items-center gap-1 rounded-full px-2 py-1 font-semibold">
              <Flame className="size-3" aria-hidden />
              <span>골든타임 라우팅</span>
            </span>
            <span className="text-foreground/80">성남시 중원구 · 소방차 진입곤란 대응</span>
          </span>

          {/*
            헤드라인 · 44 → 60px · tracking-[-1.5px] · break-keep (한글 조판).
            둘째 줄만 gradient — 색상 정체성을 여기 한 곳에 응축.
            ⚠️ `<span className="block">` 로 줄 강제 · `<br>` 대신 (좁은 화면 대응).
          */}
          <h1 className="text-foreground animate-in fade-in-0 slide-in-from-bottom-3 max-w-[820px] text-[44px] leading-[52px] font-semibold tracking-[-1.3px] break-keep delay-100 duration-700 lg:text-[60px] lg:leading-[66px] lg:tracking-[-1.9px]">
            <span className="block">골든타임 5분,</span>
            <span className="from-primary via-primary bg-gradient-to-r to-[var(--vehicle-small)] bg-clip-text text-transparent">
              골목이 결정합니다.
            </span>
          </h1>

          {/*
            본문 · 회색 기저 · 핵심 명사만 강조. 문장을 span block 두 개로 갈라
            어디까지가 한 생각인지 눈에 보이게 한다.
          */}
          <p className="text-muted-foreground animate-in fade-in-0 slide-in-from-bottom-3 mt-6 max-w-[560px] text-[16px] leading-[28px] break-keep delay-200 duration-700">
            <span className="block">
              기존 내비게이션은 <strong className="text-foreground font-semibold">최단거리</strong>
              를 안내합니다.
            </span>
            <span className="block pt-1.5">
              FireLoad 는{" "}
              <strong className="text-foreground font-semibold">
                이 차종이 지금 실제로 통과 가능한 골목
              </strong>{" "}
              만 골라 · 5분 안에 도착하는 경로를 냅니다.
            </span>
          </p>

          <div className="animate-in fade-in-0 slide-in-from-bottom-3 mt-8 flex flex-wrap items-center gap-2.5 delay-300 duration-700">
            <Link
              href="/login"
              className="group bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-ring focus-visible:ring-offset-background flex h-11 items-center gap-2 rounded-lg px-5 text-[13px] font-semibold shadow-lg transition-all hover:shadow-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              상황실 시연 접속
              <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#solution"
              className="border-border text-foreground hover:bg-muted focus-visible:ring-ring focus-visible:ring-offset-background flex h-11 items-center rounded-lg border px-5 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              해법 자세히
            </a>
          </div>
        </div>
      </section>

      {/* 문제 · 3 stat cell */}
      <section id="problem" className="border-border border-y">
        <div className="mx-auto grid max-w-[1144px] grid-cols-3 divide-x divide-[var(--border)] px-7">
          <StatCell value="19" unit="개 동" label="중원구청 공식 진입불가 도로현황 등재 지역" />
          <StatCell value="438" unit="건" label="2024년 성남 화재 발생" />
          <StatCell
            value="5"
            unit="분"
            label="화재 골든타임 · 이 안에 진화하지 못하면 플래시오버"
          />
        </div>
      </section>

      {/* 해법 */}
      <section id="solution" className="mx-auto max-w-[1144px] px-7 py-24">
        <div className="text-muted-foreground mb-3 text-[11px] font-medium tracking-widest uppercase">
          해법
        </div>
        <h2 className="text-foreground mb-2 max-w-[720px] text-[32px] leading-[40px] font-semibold tracking-[-0.8px] break-keep">
          세 가지 판정을 하나의 경로로.
        </h2>
        <p className="text-muted-foreground mb-10 max-w-[560px] text-[14px] leading-[24px] break-keep">
          정적 데이터 · 실시간 판독 · 차량 제원. 서로 다른 축을 한 번에 겹쳐 통과 가능성만 남깁니다.
        </p>
        <div className="grid grid-cols-3 gap-4">
          <SolutionCard
            icon={MapPinned}
            title="정적 진입불가 지도"
            body="중원구청 공식 자료 19개 동 진입불가 도로를 지리 정보로 정형화. 사람이 정리한 규약이 판정의 기저 레이어."
          />
          <SolutionCard
            icon={Camera}
            title="CCTV 판독 · 잔여폭"
            body="공개 CCTV 스틸을 YOLO·SAM2 로 판독해 실측 잔여폭·감지 객체를 산출. 정적 데이터 위에 최근 상태를 겹칩니다."
          />
          <SolutionCard
            icon={Cpu}
            title="차종 × LLM 근거 설명"
            body="차량 폭·중량·회전반경을 조합해 통과확률을 계산하고, LLM 이 5줄로 판단 근거를 문장으로 제공합니다."
          />
        </div>
      </section>

      {/* 근거 · 심사용 데이터 */}
      <section id="data" className="border-border bg-surface border-t">
        <div className="mx-auto max-w-[1144px] px-7 py-20">
          <div className="text-muted-foreground mb-3 text-[11px] font-medium tracking-widest uppercase">
            근거 · 성남 파일럿
          </div>
          <h2 className="text-foreground mb-8 max-w-[720px] text-[28px] leading-[36px] font-semibold tracking-[-0.6px] break-keep">
            성남 자체 데이터로 성남 문제를 풉니다.
          </h2>
          <ul className="text-muted-foreground grid grid-cols-2 gap-x-10 gap-y-3 text-[13px] leading-[22px] break-keep">
            <DataItem>
              중원구청 공식 &lsquo;소방차 진입불가 도로현황&rsquo; 19개 동 GeoJSON 정형화
            </DataItem>
            <DataItem>성남 관제센터 CCTV 프레임 판독 (MOU 전제 · 예선은 공개 이미지)</DataItem>
            <DataItem>
              국가교통 표준노드링크 · OSM <code className="font-mono text-[12px]">width</code> 태그
              · 항공사진 자동추출로 골목 커버리지 보완
            </DataItem>
            <DataItem>소방청 표준 펌프차 · 구급차 · 굴절차 제원 DB 연동</DataItem>
          </ul>
        </div>
      </section>

      {/* CTA 재확인 */}
      <section className="mx-auto max-w-[1144px] px-7 py-20">
        <div className="border-border bg-surface flex flex-col items-start justify-between gap-6 rounded-lg border px-8 py-7 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="text-foreground text-[18px] font-semibold tracking-tight">
              시연 상황실에 접속하세요.
            </div>
            <div className="text-muted-foreground mt-1.5 max-w-[540px] text-[13px] leading-[22px] break-keep">
              성남 중원구 3개 화재 시나리오와 관할 3대 차량 · 판독 결과를 실제 화면으로 확인할 수
              있습니다.
            </div>
          </div>
          <Link
            href="/login"
            className="group bg-foreground text-background hover:bg-foreground/90 focus-visible:ring-ring focus-visible:ring-offset-background flex h-11 shrink-0 items-center gap-2 rounded-lg px-5 text-[13px] font-semibold shadow-lg transition-all hover:shadow-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            상황실 진입
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <footer className="border-border text-muted-foreground border-t px-7 py-6 text-center text-[11px]">
        © 2026 FIREWAY team · FireLoad · 성남×KAIST AI 경진대회 · 원티드 AI Championship 2026
      </footer>
    </>
  );
}

function StatCell({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <div className="flex flex-col px-6 py-8">
      <div className="flex items-baseline gap-1">
        <span className="text-foreground tabular text-[36px] leading-[40px] font-semibold tracking-[-0.8px]">
          {value}
        </span>
        <span className="text-muted-foreground text-[13px]">{unit}</span>
      </div>
      <span className="text-muted-foreground mt-2 max-w-[220px] text-[12px] leading-[18px] break-keep">
        {label}
      </span>
    </div>
  );
}

function SolutionCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="border-border bg-surface hover:border-border/80 flex flex-col gap-3 rounded-lg border p-5 transition-all hover:shadow-[var(--shadow-hover)]">
      <div className="bg-primary/12 text-primary flex h-9 w-9 items-center justify-center rounded-md">
        <Icon size={17} strokeWidth={1.75} />
      </div>
      <h3 className="text-foreground text-[15px] font-semibold tracking-tight">{title}</h3>
      <p className="text-muted-foreground text-[12.5px] leading-[20px] break-keep">{body}</p>
    </div>
  );
}

function DataItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span aria-hidden className="text-primary shrink-0">
        ·
      </span>
      <span className="flex-1">{children}</span>
    </li>
  );
}
