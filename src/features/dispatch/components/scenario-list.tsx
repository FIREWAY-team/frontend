"use client";

import { AlertTriangle } from "lucide-react";

import type { Scenario } from "@/features/scenarios/types";
import { cn } from "@/lib/utils";

interface ScenarioListProps {
  scenarios: Scenario[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * 좌측 시연 시나리오 리스트 — 카드 클릭 → 지도 이동 + 경로 계산 트리거(호출부에서).
 *
 * ⚠️ 카드에 "지금 접수됨" 같은 라이브 문구를 붙이지 않는다 — 시연이지 실시간이 아니다
 *    (§CLAUDE.md 시연 시나리오 데이터).
 */
export function ScenarioList({ scenarios, selectedId, onSelect }: ScenarioListProps) {
  return (
    <div className="flex flex-col gap-1 p-2">
      <div className="text-muted-foreground px-2 py-1.5 text-[10.5px] font-medium tracking-widest uppercase">
        신고 시나리오
      </div>
      {scenarios.map((s) => {
        const active = s.id === selectedId;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            aria-pressed={active}
            className={cn(
              "flex flex-col gap-1 rounded-md border px-2.5 py-2 text-left transition-colors",
              active
                ? "border-primary/40 bg-primary/8 text-foreground"
                : "hover:bg-muted text-foreground border-transparent",
            )}
          >
            <div className="flex items-center gap-1.5">
              <AlertTriangle
                size={12}
                strokeWidth={2}
                className={cn(active ? "text-primary" : "text-danger")}
              />
              <span className="text-[12.5px] font-medium">{s.title}</span>
            </div>
            <div className="text-muted-foreground pl-4 text-[11px]">{s.address}</div>
          </button>
        );
      })}
    </div>
  );
}
