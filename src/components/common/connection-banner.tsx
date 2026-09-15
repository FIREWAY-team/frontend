import { PlugZap } from "lucide-react";

interface ConnectionBannerProps {
  /** 연동 안 된 도메인 이름 (예: "시나리오" · "차량" · "경로 · 시나리오"). */
  domain: string;
  /** 실패 이유 (예: "HTTP 502" · "empty"). 있으면 fine-print 로 표시. */
  reason?: string;
}

/**
 * 상단에 얇게 뜨는 "연동 대기 중" 배너.
 *
 * ⚠️ **팀 결정 · 2026-09-15** — BE 실패 시 mock 폴백을 조용히 채우던 이전 동작을 뒤집었다.
 *    심사 링크·라이브 시연에서 "어디가 문제인지" 를 홍근 님·팀·심사위원이 즉시 볼 수 있어야
 *    한다. 화면은 mock 으로 계속 굴리되 · 이 배너로 "지금 보는 데이터는 임시입니다" 를
 *    정직하게 알린다 (§CLAUDE.md 정직성).
 * ⚠️ 톤은 위험이 아닌 정보 (경고 tone) — 서비스가 죽은 게 아니라 백엔드 응답을 기다리는 상태.
 */
export function ConnectionBanner({ domain, reason }: ConnectionBannerProps) {
  return (
    <div
      role="status"
      className="border-warning/30 bg-warning/10 text-warning flex items-center gap-2 border-b px-4 py-2 text-[12px]"
    >
      <PlugZap size={13} strokeWidth={2} aria-hidden />
      <span className="text-foreground">
        <strong className="font-semibold">백엔드 연동 대기 중</strong>
        <span className="text-muted-foreground ml-1.5">
          · {domain} 데이터는 임시 표본으로 보여집니다.
        </span>
        {reason && (
          <span className="text-muted-foreground ml-1.5 font-mono text-[11px]">({reason})</span>
        )}
      </span>
    </div>
  );
}
