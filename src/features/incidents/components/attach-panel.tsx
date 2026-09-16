"use client";

import { AlertCircle, ImageIcon, Paperclip, Video } from "lucide-react";
import { useRef } from "react";

import { formatBytes, useAttachments } from "../hooks/use-attachments";
import type { Attachment } from "../types";

interface AttachPanelProps {
  incidentNo: string | null;
}

/**
 * 신고 첨부 UI · Live 시연 우측 패널 하단에 붙는 미니 섹션.
 *
 * ⚠️ **정직한 실패 노출** (§CLAUDE.md 정직성) — 훅이 전달하는 error 문구를 그대로 표시.
 *    S3 CORS 미설정·크기 초과·PUT 실패 등 원인을 사람이 읽을 수 있는 문구로 보여준다.
 * ⚠️ `downloadUrl` 은 BE 가 10분 TTL 로 서명 · 화면 열 때마다 훅이 자동 재조회.
 * ⚠️ 진행 중 (uploading) 은 버튼 비활성 · 파일 input reset 은 성공 후 함.
 */
export function AttachPanel({ incidentNo }: AttachPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { attachments, loading, uploading, error, upload } = useAttachments(incidentNo);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await upload(file);
    if (result.ok && inputRef.current) inputRef.current.value = "";
  }

  if (!incidentNo) {
    return (
      <div className="border-border text-muted-foreground mt-3 rounded border p-3 text-[11.5px]">
        신고 접수 후 사진·영상을 첨부할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="border-border bg-surface mt-3 rounded border p-3">
      <div className="text-foreground mb-2 flex items-center gap-1.5 text-[12px] font-semibold">
        <Paperclip size={12} strokeWidth={2} />
        현장 사진·영상 첨부
        <span className="text-muted-foreground ml-auto font-normal">사진 5MB · 영상 50MB</span>
      </div>

      <div className="flex items-center gap-2">
        <label className="border-border text-foreground hover:bg-muted focus-visible:ring-ring focus-visible:ring-offset-background inline-flex h-8 cursor-pointer items-center gap-1.5 rounded border px-3 text-[11.5px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none">
          <Paperclip size={11} strokeWidth={2} />
          {uploading ? "업로드 중…" : "파일 선택"}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
            onChange={handleChange}
            disabled={uploading}
            className="sr-only"
          />
        </label>
        {loading && <span className="text-muted-foreground text-[11px]">목록 조회 중…</span>}
      </div>

      {error && (
        <div
          role="alert"
          className="text-danger border-danger/30 bg-danger/10 mt-2 flex items-start gap-1.5 rounded border px-2 py-1.5 text-[11px]"
        >
          <AlertCircle size={12} strokeWidth={2} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {attachments.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {attachments.map((a) => (
            <AttachmentRow key={a.key} attachment={a} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AttachmentRow({ attachment }: { attachment: Attachment }) {
  const isImage = attachment.contentType.startsWith("image/");
  const Icon = isImage ? ImageIcon : Video;
  const label = attachment.key.split("/").pop() ?? attachment.key;
  return (
    <li className="border-border bg-surface-2 flex items-center gap-2 rounded border px-2 py-1.5 text-[11px]">
      <Icon
        size={12}
        strokeWidth={2}
        aria-hidden
        className={isImage ? "text-primary" : "text-warning"}
      />
      <a
        href={attachment.downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground truncate font-mono text-[10.5px] hover:underline"
        title={attachment.key}
      >
        {label}
      </a>
      <span className="text-muted-foreground tabular ml-auto">
        {formatBytes(attachment.sizeBytes)}
      </span>
    </li>
  );
}
