import { ArrowRight, Camera, Cpu, MapPinned } from "lucide-react";
import Link from "next/link";

import { Wordmark } from "@/components/brand/wordmark";

export const metadata = {
  title: "FireLoad — 소방차 골목 통과가능 경로",
};

/**
 * 랜딩 페이지 (`/`) — 심사·홍보용 (§FRONTEND_SPEC v0.2 확정).
 *
 * ⚠️ **공공기관 리포트 톤**. 마케팅 오버톤(그라디언트·큰 감정 문구·풀블리드 히어로) 피하고
 *    문제 정의 → 해법 → 근거 데이터 → 진입 흐름으로 정렬. 심사 위원이 30초 안에 문제·차별점을
 *    이해할 수 있어야 한다.
 * ⚠️ 요소가 너무 커 보이지 않게 max-w-[1080px] 좁게 잡고 밀도 유지.
 */
export default function LandingPage() {
  return (
    <>
      {/* 헤더 */}
      <header className="border-border bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between px-6">
          <Wordmark size={20} />
          <nav className="flex items-center gap-4 text-[12.5px]">
            <a href="#problem" className="text-muted-foreground hover:text-foreground">
              문제
            </a>
            <a href="#solution" className="text-muted-foreground hover:text-foreground">
              해법
            </a>
            <a href="#data" className="text-muted-foreground hover:text-foreground">
              근거
            </a>
            <Link
              href="/login"
              className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11.5px] font-semibold transition-colors"
            >
              상황실 진입
              <ArrowRight size={11} />
            </Link>
          </nav>
        </div>
      </header>

      {/* 히어로 */}
      <section className="mx-auto max-w-[1080px] px-6 pt-16 pb-14">
        <div className="text-muted-foreground mb-3 text-[11px] font-medium tracking-widest uppercase">
          성남시 중원구 · 소방차 진입곤란 대응
        </div>
        <h1 className="text-foreground text-[36px] leading-[1.15] font-semibold tracking-tight">
          골든타임 5분,
          <br />
          <span className="text-primary">골목이 결정</span>합니다.
        </h1>
        <p className="text-muted-foreground mt-5 max-w-[560px] text-[14px] leading-relaxed">
          기존 내비게이션은 최단거리를 안내합니다. FireLoad는{" "}
          <b className="text-foreground">이 차종이 지금 실제로 통과 가능한 골목</b>만 골라 5분 안에
          도착하는 경로를 제안합니다. 차종 제원 · 정적 진입불가 데이터 · CCTV 판독을 하나의 판정
          축으로 통합합니다.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/login"
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-semibold transition-colors"
          >
            상황실 시연 접속
            <ArrowRight size={13} />
          </Link>
          <a
            href="#solution"
            className="border-border text-foreground hover:bg-muted rounded-md border px-4 py-2.5 text-[13px] font-medium transition-colors"
          >
            해법 자세히
          </a>
        </div>
      </section>

      {/* 문제 */}
      <section id="problem" className="border-border border-y">
        <div className="mx-auto grid max-w-[1080px] grid-cols-3 divide-x divide-[var(--border)] px-6">
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
      <section id="solution" className="mx-auto max-w-[1080px] px-6 py-16">
        <div className="text-muted-foreground mb-2 text-[11px] font-medium tracking-widest uppercase">
          해법
        </div>
        <h2 className="text-foreground mb-8 text-[22px] font-semibold tracking-tight">
          세 가지 판정을 하나의 경로로.
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <SolutionCard
            icon={MapPinned}
            title="정적 진입불가 지도"
            body="중원구청 공식 자료 19개 동 진입불가 도로를 지리 정보로 정형화. 사람이 정리한 규약이 판정의 기저 레이어."
          />
          <SolutionCard
            icon={Camera}
            title="CCTV 판독 · 잔여폭"
            body="공개 CCTV 스틸을 YOLO·SAM2로 판독해 실측 잔여폭·감지 객체를 산출. 정적 데이터 위에 최근 상태를 겹칩니다."
          />
          <SolutionCard
            icon={Cpu}
            title="차종 × LLM 근거 설명"
            body="차량 폭·중량·회전반경을 조합해 통과확률을 계산하고, LLM이 5줄로 판단 근거를 문장으로 제공합니다."
          />
        </div>
      </section>

      {/* 근거 · 심사용 데이터 */}
      <section id="data" className="border-border bg-surface border-t">
        <div className="mx-auto max-w-[1080px] px-6 py-14">
          <div className="text-muted-foreground mb-2 text-[11px] font-medium tracking-widest uppercase">
            근거 · 성남 파일럿
          </div>
          <h2 className="text-foreground mb-6 text-[20px] font-semibold">
            성남 자체 데이터로 성남 문제를 풉니다.
          </h2>
          <ul className="text-muted-foreground grid grid-cols-2 gap-x-8 gap-y-2 text-[12.5px] leading-relaxed">
            <li>· 중원구청 공식 &lsquo;소방차 진입불가 도로현황&rsquo; 19개 동 GeoJSON 정형화</li>
            <li>· 성남 관제센터 CCTV 프레임 판독 (MOU 전제 · 예선은 공개 이미지)</li>
            <li>
              · 국가교통 표준노드링크 · OSM `width` 태그 · 항공사진 자동추출로 골목 커버리지 보완
            </li>
            <li>· 소방청 표준 펌프차 · 구급차 · 굴절차 제원 DB 연동</li>
          </ul>
        </div>
      </section>

      {/* CTA 재확인 */}
      <section className="mx-auto max-w-[1080px] px-6 py-14">
        <div className="border-border bg-surface flex items-center justify-between rounded-md border px-6 py-5">
          <div>
            <div className="text-foreground text-[16px] font-semibold">
              시연 상황실에 접속하세요.
            </div>
            <div className="text-muted-foreground mt-1 text-[12px]">
              성남 중원구 3개 화재 시나리오와 관할 3대 차량 · 판독 결과를 실제 화면으로 확인할 수
              있습니다.
            </div>
          </div>
          <Link
            href="/login"
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-semibold transition-colors"
          >
            상황실 진입
            <ArrowRight size={13} />
          </Link>
        </div>
      </section>

      <footer className="border-border text-muted-foreground border-t px-6 py-6 text-center text-[11px]">
        © 2026 FIREWAY team · FireLoad · 성남×KAIST AI 경진대회 · 원티드 AI Championship 2026
      </footer>
    </>
  );
}

function StatCell({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <div className="flex flex-col px-6 py-6">
      <div className="flex items-baseline gap-1">
        <span className="text-foreground tabular text-[28px] font-semibold">{value}</span>
        <span className="text-muted-foreground text-[12px]">{unit}</span>
      </div>
      <span className="text-muted-foreground mt-1 text-[11.5px] leading-snug">{label}</span>
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
    <div className="border-border bg-surface flex flex-col gap-2.5 rounded-md border p-4">
      <div className="bg-primary/15 text-primary flex h-8 w-8 items-center justify-center rounded-md">
        <Icon size={16} strokeWidth={1.75} />
      </div>
      <h3 className="text-foreground text-[13.5px] font-semibold">{title}</h3>
      <p className="text-muted-foreground text-[12px] leading-relaxed">{body}</p>
    </div>
  );
}
