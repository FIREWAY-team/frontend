import { cn } from "@/lib/utils";

import { BrandMark } from "./brand-mark";

interface WordmarkProps {
  className?: string;
  /** 심볼 크기(px). 워드마크 텍스트가 이 값에 맞춰 균형 잡힘. */
  size?: number;
  /** `false`면 텍스트 없이 심볼만. 로고 자리에 폭이 좁을 때. */
  showText?: boolean;
}

/**
 * FireLoad wordmark — 심볼 + 텍스트.
 *
 * ⚠️ **`Fire`는 primary 톤, `Load`는 foreground**. 통일된 굵기·조판이지만 두 단어의 무게
 *    차이를 만들어 시선이 왼쪽에서 오른쪽으로 자연스레 흐르게 했다.
 * ⚠️ 폰트는 `--font-sans`(Geist)를 그대로 쓴다 — 커스텀 웹폰트 안 붙인다. 브랜드 개성은
 *    심볼과 색이 담당하고, 텍스트는 UI 폰트와 하나로 읽혀야 한다.
 */
export function Wordmark({ className, size = 22, showText = true }: WordmarkProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <BrandMark size={size} label={showText ? undefined : "FireLoad"} />
      {showText && (
        <span
          className="text-foreground font-semibold tracking-tight"
          style={{ fontSize: size * 0.82 }}
        >
          <span className="text-primary">Fire</span>Load
        </span>
      )}
    </div>
  );
}
