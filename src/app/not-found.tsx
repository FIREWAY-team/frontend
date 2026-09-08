import { Compass } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/common/empty-state";

/**
 * 404 페이지 — z-groupware 패턴 승계 (아이콘 → 코드 → 제목 → 설명 → CTA).
 */
export default function NotFound() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center">
      <EmptyState
        icon={Compass}
        code="404"
        title="요청하신 화면을 찾을 수 없습니다"
        description="주소가 변경되었거나 삭제된 화면입니다. 주소를 다시 확인해 주세요."
        action={
          <Link
            href="/"
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-[12.5px] font-semibold transition-colors"
          >
            홈으로 가기
          </Link>
        }
      />
    </div>
  );
}
