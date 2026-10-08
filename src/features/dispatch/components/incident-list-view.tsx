"use client";

import { Flame, PlusCircle } from "lucide-react";
import { useCallback, useState } from "react";

import { TEST_INCIDENT_POOL } from "@/features/scenarios/intake-overrides";
import type { Scenario } from "@/features/scenarios/types";

import { IncidentCard } from "./incident-card";

interface IncidentListViewProps {
  initialIncidents: Scenario[];
}

/**
 * 상황실 메인 뷰 · 접수된 신고 카드 그리드.
 *
 * ⚠️ **기존 `DispatchView` 를 대체** · 지도·차량선택·경로결정 UI 는 상황 브리핑으로 이전됨.
 *    상황실은 "들어온 신고 리스트" 역할만 담당.
 * ⚠️ **합법적 테스트용 신고 받기 버튼** · 실제 소방 CAD 연동 전까지 심사·발표에서 "신고가
 *    들어오는 느낌" 을 시각화하기 위한 클라이언트 사이드 버튼. BE 호출 없이 로컬 상태에 추가.
 *    (버튼 라벨에 "테스트용" 명시로 심사 투명성 유지)
 * ⚠️ **빈 상태** · 이미 접수된 신고가 없으면 안내 문구. 테스트 버튼 안내도 함께.
 */
export function IncidentListView({ initialIncidents }: IncidentListViewProps) {
  const [incidents, setIncidents] = useState<Scenario[]>(initialIncidents);
  const [poolIndex, setPoolIndex] = useState(0);

  const handleReceiveTest = useCallback(() => {
    if (TEST_INCIDENT_POOL.length === 0) return;
    const next = TEST_INCIDENT_POOL[poolIndex % TEST_INCIDENT_POOL.length]!;
    setIncidents((prev) => {
      // 동일 id 중복 방지 · 이미 리스트에 있으면 skip
      if (prev.some((it) => it.id === next.id)) return prev;
      // 접수 시각을 지금으로 덮어 "방금 접수된 느낌" 연출
      const freshened: Scenario = {
        ...next,
        intake: next.intake ? { ...next.intake, reportedAt: new Date().toISOString() } : undefined,
      };
      return [freshened, ...prev];
    });
    setPoolIndex((i) => i + 1);
  }, [poolIndex]);

  return (
    <section className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-5 px-8 py-6">
      {/* 상단 바 · 요약 + 테스트 버튼 */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-foreground text-[16px] font-semibold">접수된 신고</h2>
          <p className="text-muted-foreground text-[11.5px]">
            성남소방서 · 접수된 신고 {incidents.length}건 · 각 신고 카드를 눌러 상황 브리핑으로
            이동합니다
          </p>
        </div>
        <button
          type="button"
          onClick={handleReceiveTest}
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring focus-visible:ring-offset-background inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label="합법적 테스트용 신고 수신"
        >
          <PlusCircle size={13} strokeWidth={2} />
          신고 받기 · 테스트용
        </button>
      </header>

      {/* 카드 그리드 */}
      {incidents.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {incidents.map((incident) => (
            <IncidentCard key={incident.id} incident={incident} />
          ))}
        </div>
      ) : (
        <div className="border-border bg-surface flex flex-col items-center justify-center gap-3 rounded-md border px-6 py-16 text-center">
          <Flame className="text-muted-foreground" size={24} strokeWidth={1.5} />
          <p className="text-foreground text-[13px] font-medium">접수된 신고가 없습니다</p>
          <p className="text-muted-foreground max-w-[320px] text-[11.5px] break-keep">
            상단의 [신고 받기 · 테스트용] 버튼으로 신고가 들어오는 과정을 확인하실 수 있습니다.
          </p>
        </div>
      )}
    </section>
  );
}
