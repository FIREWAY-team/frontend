import "server-only";

import { beHeaders } from "@/features/_shared/be-headers";
import type { ScenariosResult } from "@/features/scenarios/api";
import { MOCK_SCENARIOS } from "@/features/scenarios/mock/scenarios";
import type { Scenario, ScenarioIntake } from "@/features/scenarios/types";

import type { BeIncident } from "./mapper";
import { toIncident } from "./mapper";
import type { Incident } from "./types";
import { INCIDENT_STATUS } from "./types";

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? "http://backend:8080";

/**
 * BE `/api/incidents` → 상황실·브리핑이 쓰는 Scenario shape 으로 변환 (§D4).
 *
 * ⚠️ 전환 목적 · `/api/scenarios` 는 BE 하드코딩 3건 mock 이고 상태·intake 를 못 돌려줘서,
 *    BE 팀장이 `/api/incidents` 로 옮겨달라 요청. UI 는 Scenario shape 유지 (최소 변경).
 * ⚠️ **CLOSED·CANCELLED 는 FE 에서 필터** · BE 는 전체 리스트를 돌려주고 FE 가 숨긴다.
 * ⚠️ BE 실패·빈 응답 → `MOCK_SCENARIOS` 폴백 (ConnectionBanner 유지).
 */
export async function fetchIncidentsAsScenarios(): Promise<ScenariosResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${BACKEND_API_URL}/api/incidents`, {
      cache: "no-store",
      signal: controller.signal,
      headers: beHeaders(false),
    });
    if (!res.ok) {
      console.warn(`[incidents] list failed: HTTP ${res.status}`);
      return { data: MOCK_SCENARIOS, source: "fallback", reason: `HTTP ${res.status}` };
    }
    const raw = (await res.json()) as BeIncident[];
    if (!Array.isArray(raw)) {
      console.warn(`[incidents] list returned non-array`);
      return { data: MOCK_SCENARIOS, source: "fallback", reason: "non-array" };
    }
    const incidents = raw.map(toIncident).filter(isActive);
    if (incidents.length === 0) {
      // BE 가 scenarios 가 아니라 incidents 를 쓰기 시작했지만 접수된 신고가 아직 없는 경우.
      // 상황실이 비면 심사원에게 설명이 어려우니 mock 폴백으로 모란 등 3건을 띄운다.
      return { data: MOCK_SCENARIOS, source: "fallback", reason: "no-active-incidents" };
    }
    return { data: incidents.map(incidentToScenario), source: "live" };
  } catch (err) {
    const name = err instanceof Error ? err.name : "unknown";
    console.warn(`[incidents] list error: ${name} · using mock fallback`);
    return { data: MOCK_SCENARIOS, source: "fallback", reason: name };
  } finally {
    clearTimeout(timeout);
  }
}

/** 종결·취소를 뺀 활성 신고 (§BE 회신 '처리 완료 숨김은 FE 필터'). */
function isActive(inc: Incident): boolean {
  return inc.status !== INCIDENT_STATUS.CLOSED && inc.status !== INCIDENT_STATUS.CANCELLED;
}

/**
 * `Incident` → `Scenario` 어댑터.
 *
 * ⚠️ 상황실·브리핑 UI 가 지금 Scenario shape 을 쓴다. 전면 리팩 대신 어댑터 한 겹으로 격리.
 * ⚠️ `incidentNo` 가 Scenario.id 로 들어감 · `/live?incident={id}` 라우팅 그대로 작동.
 * ⚠️ intake 없는 경우 fallback (접수 중 · severity=medium).
 */
export function incidentToScenario(inc: Incident): Scenario {
  const intake: ScenarioIntake = inc.intake
    ? {
        reporterName: inc.intake.reporterName ?? "익명",
        reporterPhone: inc.intake.reporterPhone,
        reportedAt: inc.receivedAt,
        severity: inc.intake.severity ?? "medium",
        estimatedAreaM2: inc.intake.estimatedAreaM2,
        buildingType: inc.intake.buildingType ?? "확인 중",
        casualtiesReported: inc.intake.casualtiesReported ?? false,
        notes: inc.intake.notes,
      }
    : {
        reporterName: "익명",
        reportedAt: inc.receivedAt,
        severity: "medium",
        buildingType: "확인 중",
        casualtiesReported: false,
        notes: "접수 중 · 상세 정보 수신 대기",
      };
  return {
    id: inc.incidentNo,
    title: inc.summary ?? inc.address,
    location: { lat: inc.lat, lon: inc.lon },
    vehicleHint: intake.severity === "large" ? "pump-15" : "pump-3.5",
    address: inc.address,
    intake,
  };
}
