"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { CustomOverlayMap, MapMarker, Polyline } from "react-kakao-maps-sdk";

import { KakaoCanvas } from "@/components/map/kakao-canvas";

import {
  type Alley,
  ALLEYS,
  ALT_ROUTES,
  FIRE_POINT,
  FIRE_STATION,
  STEP_CONFIG,
  type StepId,
  type Verdict,
} from "../moran-scenario";

const STEPS: StepId[] = [1, 2, 3, 4, 5];
const GOLDEN_ROUTE = ALT_ROUTES.find((r) => r.id === "A");

/**
 * 예선 라이브 5단계 시연 화면.
 *
 * ⚠️ 상태는 URL 해시(#step=1~5)와 동기 · 발표자가 브라우저 back/forward, 좌우 방향키, 화면
 *    버튼 어느 걸로 넘겨도 같은 흐름. 새로고침해도 그 단계에서 재개.
 * ⚠️ /api/route 를 부르지 않고 정적 좌표/경로로 스크립트. 데모 신뢰성이 최우선 — 백엔드
 *    콜드 스타트, 네트워크 순간 지연에 흔들리지 않도록.
 * ⚠️ 골목 L1~L5, 경로 A/B/C 는 moran-scenario.ts 에서 관리. 실측 좌표로 교체할 때 그 파일만.
 */
export function LiveDemoView() {
  // step 은 URL 해시(#step=N) 를 진실의 원천으로 삼는다. useSyncExternalStore 로 브라우저
  // 이력 이동·마운트 시점을 자연스럽게 커버해서 useEffect 안 setState 를 피한다.
  const step = useSyncExternalStore(subscribeHash, readStepFromHash, readServerStep);
  // 선택된 골목/AI 로드 여부는 step 이 바뀌면 자동 리셋되도록 key 를 함께 저장.
  const [alleySnap, setAlleySnap] = useState<{ key: StepId; alley: Alley | null }>({
    key: 1,
    alley: null,
  });
  const selectedAlley = alleySnap.key === step ? alleySnap.alley : null;
  const [aiSnap, setAiSnap] = useState<{ key: StepId; loaded: boolean }>({ key: 1, loaded: false });
  const aiLoaded = aiSnap.key === step && aiSnap.loaded;

  const go = useCallback((next: StepId) => {
    if (typeof window !== "undefined") window.location.hash = `step=${next}`;
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName))
        return;
      if (e.key === "ArrowRight" && step < 5) go((step + 1) as StepId);
      if (e.key === "ArrowLeft" && step > 1) go((step - 1) as StepId);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, go]);

  // Step 3 진입 시 3초 로딩 후 골목 오버레이 노출
  useEffect(() => {
    if (step !== 3) return;
    const t = setTimeout(() => setAiSnap({ key: 3, loaded: true }), 3000);
    return () => clearTimeout(t);
  }, [step]);

  function selectAlley(a: Alley | null) {
    setAlleySnap({ key: step, alley: a });
  }

  const config = STEP_CONFIG[step];

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      {/* 상단 스텝 인디케이터 */}
      <div className="border-border bg-surface flex items-center justify-between border-b px-5 py-2.5">
        <div className="flex items-center gap-4">
          <div className="flex gap-1.5">
            {STEPS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => go(s)}
                aria-current={s === step ? "step" : undefined}
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-[12px] font-semibold transition-colors ${
                  s === step
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="text-foreground text-[13px] font-semibold">{config.title}</div>
        </div>
        <div className="text-muted-foreground text-[11.5px]">← / → 로 단계 전환</div>
      </div>

      {/* 지도 + 오버레이 */}
      <div className="relative flex min-h-0 flex-1">
        <KakaoCanvas center={config.center} level={config.level}>
          {/* 소방서(출발) — 항상 표시 */}
          <MapMarker
            position={{ lat: FIRE_STATION.lat, lng: FIRE_STATION.lon }}
            title="성남소방서"
            image={{
              src: "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='38' viewBox='0 0 30 38'%3E%3Cpath d='M15 0C6.7 0 0 6.7 0 15c0 11 15 23 15 23s15-12 15-23C30 6.7 23.3 0 15 0z' fill='%233b82f6'/%3E%3Ccircle cx='15' cy='15' r='5' fill='white'/%3E%3C/svg%3E",
              size: { width: 30, height: 38 },
              options: { offset: { x: 15, y: 38 } },
            }}
          />

          {/* 화점(핑) — 1단계에서 크게 깜빡, 이후 계속 표시 */}
          <CustomOverlayMap
            position={{ lat: FIRE_POINT.lat, lng: FIRE_POINT.lon }}
            yAnchor={0.5}
            xAnchor={0.5}
          >
            <div className="pointer-events-none relative flex items-center justify-center">
              <span
                className={`absolute rounded-full bg-red-500/40 ${
                  step === 1 ? "h-16 w-16 animate-ping" : "h-6 w-6"
                }`}
              />
              <span className="relative h-4 w-4 rounded-full bg-red-500 shadow-md" />
            </div>
          </CustomOverlayMap>

          {/* 3단계 이후: 골목 오버레이 (3단계는 로딩 후 노출) */}
          {step >= 3 && (aiLoaded || step > 3) && (
            <>
              {ALLEYS.map((a) => (
                <Polyline
                  key={a.id}
                  path={a.path.map(([lon, lat]) => ({ lat, lng: lon }))}
                  strokeWeight={step === 3 ? 8 : 5}
                  strokeColor={verdictColor(a.verdict["pump-3.5"])}
                  strokeOpacity={step === 3 ? 0.9 : 0.55}
                  strokeStyle="solid"
                />
              ))}
              {ALLEYS.map((a) => (
                <CustomOverlayMap
                  key={`lbl-${a.id}`}
                  position={{ lat: alleyMid(a).lat, lng: alleyMid(a).lng }}
                  yAnchor={0.5}
                  xAnchor={0.5}
                >
                  <button
                    type="button"
                    onClick={() => step === 3 && selectAlley(a)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold shadow-sm ${
                      step === 3 ? "cursor-pointer" : "pointer-events-none"
                    } ${verdictBadge(a.verdict["pump-3.5"])}`}
                  >
                    {a.id}
                  </button>
                </CustomOverlayMap>
              ))}
            </>
          )}

          {/* 4단계: 확정 경로 (골든레인 A) 만 진하게 */}
          {step === 4 && GOLDEN_ROUTE && (
            <Polyline
              path={GOLDEN_ROUTE.path.map(([lon, lat]) => ({ lat, lng: lon }))}
              strokeWeight={7}
              strokeColor="#3b82f6"
              strokeOpacity={0.95}
              strokeStyle="solid"
            />
          )}

          {/* 5단계: A/B/C 경로 비교 */}
          {step === 5 &&
            ALT_ROUTES.map((r) => (
              <Polyline
                key={r.id}
                path={r.path.map(([lon, lat]) => ({ lat, lng: lon }))}
                strokeWeight={5}
                strokeColor={r.color}
                strokeOpacity={0.85}
                strokeStyle={r.strokeStyle}
              />
            ))}
        </KakaoCanvas>

        {/* 스텝별 오버레이 카드 */}
        {step === 1 && <StepOneCard onDispatch={() => go(2)} />}
        {step === 2 && <StepTwoCard onNext={() => go(3)} />}
        {step === 3 && (
          <StepThreeCard
            loaded={aiLoaded}
            selected={selectedAlley}
            onClose={() => selectAlley(null)}
            onNext={() => go(4)}
          />
        )}
        {step === 4 && <StepFourCard onNext={() => go(5)} />}
        {step === 5 && <StepFiveCard onRestart={() => go(1)} />}
      </div>
    </div>
  );
}

function readStepFromHash(): StepId {
  if (typeof window === "undefined") return 1;
  const match = window.location.hash.match(/step=(\d)/);
  const n = match ? Number(match[1]) : 1;
  return (STEPS as number[]).includes(n) ? (n as StepId) : 1;
}

function readServerStep(): StepId {
  return 1;
}

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

function alleyMid(a: Alley): { lat: number; lng: number } {
  const mid = a.path[Math.floor(a.path.length / 2)] ?? a.path[0];
  if (!mid) return { lat: 0, lng: 0 };
  return { lat: mid[1], lng: mid[0] };
}

function verdictColor(v: Verdict) {
  if (v === "PASS") return "#22c55e";
  if (v === "UNCERTAIN") return "#eab308";
  return "#ef4444";
}

function verdictBadge(v: Verdict) {
  if (v === "PASS") return "border-green-600 bg-green-50 text-green-900";
  if (v === "UNCERTAIN") return "border-yellow-600 bg-yellow-50 text-yellow-900";
  return "border-red-600 bg-red-50 text-red-900";
}

function StepOneCard({ onDispatch }: { onDispatch: () => void }) {
  return (
    <div className="absolute right-5 bottom-5 z-10 w-[340px] rounded-lg border-2 border-red-500 bg-white shadow-2xl">
      <div className="flex items-center gap-2 bg-red-500 px-3 py-2 text-white">
        <span className="text-[12px] font-bold">🚨 긴급 신고 접수</span>
        <span className="ml-auto text-[10.5px] opacity-90">119 상황실</span>
      </div>
      <div className="p-4">
        <div className="text-[12px] font-semibold text-red-900">
          경기 성남시 중원구 둔촌대로69번길 8 일대
        </div>
        <div className="text-[11.5px] text-neutral-700">모란기름골목 화재 발생 및 연기 확산</div>
        <div className="mt-3 rounded bg-neutral-50 p-2 text-[11px] text-neutral-600">
          발화 추정: 상업용 건물 1층 · 인근 노점 밀집
        </div>
        <button
          type="button"
          onClick={onDispatch}
          className="mt-3 w-full rounded-md bg-red-500 py-2 text-[13px] font-semibold text-white hover:bg-red-600"
        >
          출동하기 →
        </button>
      </div>
    </div>
  );
}

function StepTwoCard({ onNext }: { onNext: () => void }) {
  return (
    <div className="absolute right-5 bottom-5 z-10 w-[320px] rounded-lg border border-neutral-300 bg-white p-4 shadow-xl">
      <div className="text-[12px] font-semibold text-neutral-900">🚒 현장 대로 도착</div>
      <div className="mt-1 text-[11.5px] text-neutral-700">
        소방서 → 대로변 이동 완료. 화점까지 골목 진입 필요.
      </div>
      <div className="mt-3 rounded-md bg-red-50 p-3 text-center">
        <div className="text-[14px] font-bold text-red-900">대로 도착 5분. 어느 골목으로?</div>
      </div>
      <button
        type="button"
        onClick={onNext}
        className="mt-3 w-full rounded-md bg-neutral-900 py-2 text-[12.5px] font-semibold text-white hover:bg-neutral-800"
      >
        AI 골목 판정 요청 →
      </button>
    </div>
  );
}

function StepThreeCard({
  loaded,
  selected,
  onClose,
  onNext,
}: {
  loaded: boolean;
  selected: Alley | null;
  onClose: () => void;
  onNext: () => void;
}) {
  return (
    <>
      {!loaded && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <div className="rounded-lg bg-neutral-900 px-5 py-3 text-[13px] font-semibold text-white shadow-2xl">
            🧠 AI 판정 3초 · CCTV 프레임 분석 중...
          </div>
        </div>
      )}
      {loaded && !selected && (
        <div className="absolute right-5 bottom-5 z-10 w-[300px] rounded-lg border border-neutral-300 bg-white p-4 shadow-xl">
          <div className="text-[12px] font-semibold text-neutral-900">✅ 5개 골목 판정 완료</div>
          <div className="mt-1 text-[11.5px] text-neutral-700">
            지도 위 <b>L1~L5</b> 뱃지를 눌러 차량별 진입 가능 여부 확인.
          </div>
          <div className="mt-3 space-y-1 text-[11px] text-neutral-600">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" /> PASS · 진입 가능
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" /> UNCERTAIN · 실측 필요
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> FAIL · 진입 불가
            </div>
          </div>
          <button
            type="button"
            onClick={onNext}
            className="mt-3 w-full rounded-md bg-neutral-900 py-2 text-[12.5px] font-semibold text-white hover:bg-neutral-800"
          >
            최적 경로 확정 →
          </button>
        </div>
      )}
      {loaded && selected && (
        <div className="absolute right-5 bottom-5 z-10 w-[320px] rounded-lg border border-neutral-300 bg-white p-4 shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[13px] font-bold text-neutral-900">{selected.label}</div>
              <div className="mt-0.5 text-[11px] text-neutral-600">{selected.note}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-700"
              aria-label="닫기"
            >
              ×
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <VehicleVerdictRow label="pump-3.5 (2.3m)" verdict={selected.verdict["pump-3.5"]} />
            <VehicleVerdictRow label="pump-8 (2.5m)" verdict={selected.verdict["pump-8"]} />
          </div>
        </div>
      )}
    </>
  );
}

function VehicleVerdictRow({ label, verdict }: { label: string; verdict: Verdict }) {
  return (
    <div className={`rounded border p-2 text-center ${verdictBadge(verdict)}`}>
      <div className="text-[10px] font-medium opacity-80">{label}</div>
      <div className="mt-0.5 text-[13px] font-bold">{verdict}</div>
    </div>
  );
}

function StepFourCard({ onNext }: { onNext: () => void }) {
  return (
    <div className="absolute right-5 bottom-5 z-10 w-[320px] rounded-lg border-2 border-blue-500 bg-white p-4 shadow-2xl">
      <div className="flex items-center gap-2">
        <span className="rounded bg-blue-500 px-2 py-0.5 text-[10.5px] font-bold text-white">
          확정
        </span>
        <span className="text-[13px] font-bold text-neutral-900">골든레인 · L1 → L2</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="ETA" value="5:30" />
        <Stat label="거리" value="1.5 km" />
        <Stat label="통과확률" value="94%" />
      </div>
      <div className="mt-3 rounded bg-blue-50 p-2 text-[11.5px] text-blue-900">
        pump-3.5 확정 경로 · CCTV 판독 PASS · 골든타임 5분 이내 진입 가능
      </div>
      <button
        type="button"
        onClick={onNext}
        className="mt-3 w-full rounded-md bg-neutral-900 py-2 text-[12.5px] font-semibold text-white hover:bg-neutral-800"
      >
        시스템 가치 검증 →
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-neutral-200 bg-white p-2">
      <div className="text-[10px] text-neutral-500">{label}</div>
      <div className="text-[13px] font-bold text-neutral-900">{value}</div>
    </div>
  );
}

function StepFiveCard({ onRestart }: { onRestart: () => void }) {
  return (
    <div className="absolute right-5 bottom-5 z-10 w-[340px] rounded-lg border border-neutral-300 bg-white p-4 shadow-2xl">
      <div className="text-[13px] font-bold text-neutral-900">📊 대안 경로 비교</div>
      <div className="mt-3 space-y-2">
        {ALT_ROUTES.map((r) => (
          <div key={r.id} className="rounded border border-neutral-200 p-2">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-4 rounded" style={{ backgroundColor: r.color }} />
              <span className="text-[12px] font-semibold text-neutral-900">{r.label}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-600">
              <span>{r.summary}</span>
              <span className="font-mono font-semibold">
                {r.distanceKm} km · {r.etaMin}분
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded bg-red-50 p-3 text-center">
        <div className="text-[13px] font-bold text-red-900">AI 없음 8분 · 갇힘 15분+</div>
        <div className="mt-0.5 text-[10.5px] text-red-700">골든타임 방어의 필수 솔루션</div>
      </div>
      <button
        type="button"
        onClick={onRestart}
        className="mt-3 w-full rounded-md border border-neutral-300 py-2 text-[12.5px] font-semibold text-neutral-700 hover:bg-neutral-50"
      >
        1단계로 처음부터 ↺
      </button>
    </div>
  );
}
