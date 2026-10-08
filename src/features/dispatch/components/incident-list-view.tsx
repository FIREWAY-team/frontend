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
 * ⚠️ **신고 받기 버튼 (§D6)** · 로컬 state 에 즉시 꽂아 반응성 확보 (optimistic UI) ·
 *    백그라운드로 `POST /api/incidents` 호출해 BE DB 에 저장. 라벨에 '테스트용' 유지
 *    (심사 투명성 · §CLAUDE.md 정직성).
 * ⚠️ **BE 접수 실패해도 UI 는 유지** · 사용자는 카드가 뜬 걸 보고 상황 브리핑으로 넘어감.
 *    BE 가 열리는 시점부터 자동으로 실 데이터 접수가 됨.
 * ⚠️ **빈 상태** · 이미 접수된 신고가 없으면 안내 문구. 테스트 버튼 안내도 함께.
 */
export function IncidentListView({ initialIncidents }: IncidentListViewProps) {
  const [incidents, setIncidents] = useState<Scenario[]>(initialIncidents);
  const [poolIndex, setPoolIndex] = useState(0);

  const handleReceiveTest = useCallback(() => {
    if (TEST_INCIDENT_POOL.length === 0) return;
    const next = TEST_INCIDENT_POOL[poolIndex % TEST_INCIDENT_POOL.length]!;
    const nowIso = new Date().toISOString();

    // 즉시 로컬 state 에 꽂음 (optimistic UI)
    setIncidents((prev) => {
      if (prev.some((it) => it.id === next.id)) return prev;
      const freshened: Scenario = {
        ...next,
        intake: next.intake ? { ...next.intake, reportedAt: nowIso } : undefined,
      };
      return [freshened, ...prev];
    });
    setPoolIndex((i) => i + 1);

    // 백그라운드로 BE 접수 시도 (§D6). 실패해도 조용히 폴백 — UI 는 이미 노출됨.
    void (async () => {
      try {
        await fetch("/api/incidents", {
          method: "POST",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: next.address ?? "주소 미상",
            lat: next.location.lat,
            lon: next.location.lon,
            summary: next.title,
            intake: next.intake
              ? {
                  reporterName: next.intake.reporterName,
                  reporterPhone: next.intake.reporterPhone,
                  severity: next.intake.severity,
                  estimatedAreaM2: next.intake.estimatedAreaM2,
                  buildingType: next.intake.buildingType,
                  casualtiesReported: next.intake.casualtiesReported,
                  notes: next.intake.notes,
                }
              : undefined,
          }),
        });
      } catch {
        /* 조용히 폴백 · 낙관적 카드는 그대로 유지 */
      }
    })();
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
