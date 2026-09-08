import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  /** 픽셀 크기(정사각). 기본 24. */
  size?: number;
  /** 라벨. 로고 옆에 텍스트가 있으면 `aria-hidden` 처리하고 텍스트에 이름을 준다. */
  label?: string;
}

/**
 * FireLoad brand mark.
 *
 * ⚠️ **Firebase 톤을 참조**했다 — 삼각 불꽃 + 안쪽 접힘. 다만 색은 파스텔 블루 팔레트로
 *    리컬러해 공공기관 톤을 맞췄다. 원본 오렌지는 캐주얼로 흐른다.
 * ⚠️ **`currentColor` 안 쓴다** — 그라디언트가 브랜드 톤을 결정하므로 아이콘 위치에 따른
 *    색 상속을 막는다. 아이콘 크기만 상속받는다.
 */
export function BrandMark({ className, size = 24, label }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id="fl-outer" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#A8C4E5" />
          <stop offset="1" stopColor="#4E70A0" />
        </linearGradient>
        <linearGradient id="fl-inner" x1="18" y1="8" x2="18" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6B9BD1" />
          <stop offset="1" stopColor="#2D4A75" />
        </linearGradient>
      </defs>

      {/*
        바깥 불꽃 — 오른쪽 어깨가 둥글게 감기고 왼쪽 끝이 아래로 흘러내리는 형태.
        완만한 곡선 4개로 잡아 삼각의 딱딱함을 뺐다.
      */}
      <path
        d="M18 2
           C 20 8, 27 13, 27 21
           C 27 26, 22 30, 15 30
           C 8 30, 4 26, 4 21
           C 4 15, 10 13, 14 8
           C 15 6, 16 4, 18 2 Z"
        fill="url(#fl-outer)"
      />

      {/*
        안쪽 접힘 — Firebase 스타일. 오른쪽으로 살짝 치우쳐 접힌 종이 느낌.
        바깥 대비 어두운 톤이라 자연스러운 그림자가 된다.
      */}
      <path
        d="M20 10
           C 21 14, 24 17, 24 21
           C 24 25, 21 28, 17 28
           C 13 28, 11 25, 12 21
           C 13 17, 17 14, 20 10 Z"
        fill="url(#fl-inner)"
      />
    </svg>
  );
}
