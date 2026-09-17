"use client";

import { AlertCircle, ImageOff, X } from "lucide-react";
import Image from "next/image";

import type { CctvReading } from "@/features/cctv/types";
import { verdictForVehicle } from "@/features/cctv/types";

interface CctvPopupProps {
  reading: CctvReading;
  /** 지도 마커에 붙은 실 CCTV id (BE 확정 전에는 reading.id 그대로 넘김). */
  displayId?: string;
  /** 감지 객체 chip (BE 필드 노출 대기 · optional). */
  detectedObjects?: string[];
  /** 차종 목록 · 차종별 판정 배지 출력 (§handoff G · pump-15 UNKNOWN). */
  vehicleIds?: string[];
  onClose: () => void;
}

/**
 * 지도 위 CCTV 마커 클릭 → 판독 결과 팝업.
 *
 * ⚠️ **미디어 분기** (§handoff frontend.md D) — `contentType` 으로 image/video 분기.
 *    확장자 판별 금지 · key 에 확장자 없음.
 * ⚠️ **null URL · 미등록 · 서명 실패** (§handoff F) — 깨진 이미지 대신 안내 문구.
 * ⚠️ **원본 vs 데모** (§handoff C) — `demoAssignment` 있으면 "동일 영상 재사용 시연" 배지 필수.
 * ⚠️ **측정 상태** (§handoff F) — `measurementStatus=unavailable` 이면 이전 값을 최신 측정으로
 *    표시 X · "측정 불가" 표시 + 실패 시각 부기.
 * ⚠️ **차종별 판정** (§handoff G) — verdict.status 대신 verdictForVehicle(verdict, vehId) 로
 *    조회 · 없으면 UNKNOWN · pump-15 임의 PASS 금지.
 */
export function CctvPopup({
  reading,
  displayId,
  detectedObjects,
  vehicleIds = ["pump-3.5", "pump-8", "pump-15"],
  onClose,
}: CctvPopupProps) {
  const id = displayId ?? reading.id;
  const isDemo = reading.demoAssignment?.reassigned === true;
  const isUnavailable = reading.measurementStatus === "unavailable";
  const mediaHidden = reading.mediaStatus === "not_registered" || !reading.stillPublicUrl;
  const mediaFailed = reading.mediaStatus === "failed";
  const isVideo = reading.contentType?.startsWith("video/") ?? false;

  return (
    <div
      role="dialog"
      aria-label={`CCTV 판독 · ${id}`}
      className="border-border bg-surface w-[300px] rounded-md border shadow-lg"
    >
      <div className="border-border flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground font-mono text-[10.5px]">{id}</span>
          {isDemo && reading.demoAssignment && (
            <span
              className="bg-warning/15 text-warning rounded px-1.5 py-0.5 text-[9.5px] font-semibold"
              title={`원본 영상 ${reading.demoAssignment.evidenceCctvId} 재사용`}
            >
              시연 데모 · 재사용
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="팝업 닫기"
          className="hover:bg-muted text-muted-foreground hover:text-foreground focus-visible:ring-ring focus-visible:ring-offset-background flex h-6 w-6 items-center justify-center rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <X size={12} />
        </button>
      </div>

      {/* 미디어 영역 · image · video · null · failed 4 상태 */}
      <MediaFrame
        stillUrl={reading.stillPublicUrl}
        contentType={reading.contentType}
        alt={`${id} CCTV 미디어`}
        hidden={mediaHidden}
        failed={mediaFailed}
        isVideo={isVideo}
      />

      {isDemo && reading.demoAssignment && (
        <div className="border-border bg-warning/8 text-warning border-b px-3 py-1.5 text-[10.5px]">
          이 자리의 판정·영상은 원본 CCTV{" "}
          <span className="font-mono">{reading.demoAssignment.evidenceCctvId}</span> 를 재사용한
          시연 데이터입니다. 이 위치 도로 검증 결과가 아닙니다.
        </div>
      )}

      <div className="space-y-2.5 px-3 py-2.5">
        {/* 측정 불가 · 이전 값을 최신 측정으로 표시 X (§handoff F) */}
        {isUnavailable ? (
          <div className="text-muted-foreground bg-muted rounded p-2 text-[11px]">
            <div className="text-foreground mb-0.5 flex items-center gap-1 font-semibold">
              <AlertCircle size={11} strokeWidth={2} className="text-warning" />
              측정 불가
            </div>
            {reading.measuredAt && (
              <div>
                이전 측정값 잔여폭 {reading.effectiveWidthM.toFixed(2)}m · 시각{" "}
                <span className="tabular">{formatKr(reading.measuredAt)}</span>
              </div>
            )}
            {reading.measurementFailureAt && (
              <div>
                이번 시도 실패 ·{" "}
                <span className="tabular">{formatKr(reading.measurementFailureAt)}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[11px]">잔여폭</span>
            <span className="text-foreground tabular text-[13px] font-semibold">
              {reading.effectiveWidthM.toFixed(2)} m
            </span>
          </div>
        )}

        {detectedObjects && detectedObjects.length > 0 && (
          <div>
            <div className="text-muted-foreground mb-1 text-[10.5px] tracking-wide uppercase">
              감지 객체
            </div>
            <div className="flex flex-wrap gap-1">
              {detectedObjects.map((o) => (
                <span
                  key={o}
                  className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10.5px]"
                >
                  {o}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-muted-foreground mb-1 text-[10.5px] tracking-wide uppercase">
            차종별 판정
          </div>
          <div className="flex flex-col gap-1">
            {vehicleIds.map((vehId) => {
              const v = verdictForVehicle(reading.verdict, vehId);
              return (
                <div key={vehId} className="flex items-center justify-between text-[11.5px]">
                  <span className="text-muted-foreground font-mono">{vehId}</span>
                  <VerdictBadge status={v} />
                </div>
              );
            })}
          </div>
        </div>

        {reading.measuredAt && !isUnavailable && (
          <div className="text-muted-foreground text-[10.5px]">
            측정 시각 · <span className="tabular">{formatKr(reading.measuredAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MediaFrame({
  stillUrl,
  contentType,
  alt,
  hidden,
  failed,
  isVideo,
}: {
  stillUrl: string | null;
  contentType?: string;
  alt: string;
  hidden: boolean;
  failed: boolean;
  isVideo: boolean;
}) {
  const containerCls = "border-border bg-muted relative aspect-video border-b";

  if (hidden) {
    return (
      <div className={containerCls}>
        <div className="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-1 text-[11px]">
          <ImageOff size={16} strokeWidth={1.75} />
          <span>미디어 준비 중입니다</span>
        </div>
      </div>
    );
  }
  if (failed || !stillUrl) {
    return (
      <div className={containerCls}>
        <div className="text-danger flex h-full w-full flex-col items-center justify-center gap-1 text-[11px]">
          <AlertCircle size={16} strokeWidth={1.75} />
          <span>미디어 조회 실패</span>
        </div>
      </div>
    );
  }
  if (isVideo) {
    return (
      <div className={containerCls}>
        <video
          key={stillUrl}
          src={stillUrl}
          controls
          preload="metadata"
          className="h-full w-full object-cover"
          aria-label={alt}
        >
          <track kind="captions" />
        </video>
      </div>
    );
  }
  return (
    <div className={containerCls}>
      <Image src={stillUrl} alt={alt} fill sizes="300px" className="object-cover" unoptimized />
    </div>
  );
}

function VerdictBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    PASS: { label: "통과 가능", cls: "bg-success/15 text-success" },
    FAIL: { label: "진입 불가", cls: "bg-danger/15 text-danger" },
    UNCERTAIN: { label: "불확실", cls: "bg-warning/15 text-warning" },
    UNKNOWN: { label: "미확인", cls: "bg-muted text-muted-foreground" },
  };
  const v = map[status] ?? map.UNKNOWN!;
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10.5px] font-medium ${v.cls}`}>{v.label}</span>
  );
}

/** KST ISO8601 → "9월 18일 오후 2시 30분". 상대 시간 금지 (§CLAUDE.md 시연 데이터). */
function formatKr(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
