import "./globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * ⚠️ 배포 도메인은 `fireroad.shop`이다(2026-09-07 확정). `next.config.ts`의
 *    `allowedOrigins`와 함께 관리 — 하나만 바꾸면 Server Action이 Origin 불일치로 막힌다.
 * ⚠️ **`??`가 아니라 `||`다** — env가 빈 문자열(`""`)로 잘못 심기면 `??`는 그걸 값으로 봐서
 *    `new URL("")`이 던져 앱 전체가 죽는다.
 */
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "production" ? "https://fireroad.shop" : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "FireLoad — 소방차 골목 통과가능 경로",
    template: "%s · FireLoad",
  },
  description:
    "차종·CCTV 판독·정적 진입불가 데이터로 소방차가 실제 통과 가능한 골목만 골라 5분 안에 도착 경로를 낸다.",
  openGraph: {
    title: "FireLoad — 소방차 골목 통과가능 경로",
    description: "골목 단위 통과가능성 예측으로 골든타임을 지킵니다.",
    type: "website",
    locale: "ko_KR",
  },
};

/*
  ⚠️ **다크가 기본이다** (§CLAUDE.md 디자인 토큰 · 야간 상황실). 서버는 방문자 선택을 모르므로
     `<html>`에 `dark` 클래스를 걸어 보내고, 클라이언트가 `localStorage`로 라이트 선택을
     저장했으면 부트 스크립트에서 벗긴다.
  ⚠️ **`<head>`에 둔다.** 컴포넌트 트리 안의 `<script>`는 클라이언트 렌더에서 실행되지 않아
     React가 경고를 낸다.
  ⚠️ 스크립트가 막히거나(CSP) 저장소를 못 읽어도 화면은 산다 — 기본값(다크)으로 남을 뿐이다.
*/
const THEME_STORAGE_KEY = "fireload:theme";
const THEME_BOOT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"){document.documentElement.classList.remove("dark")}else{document.documentElement.classList.add("dark")}}catch(e){document.documentElement.classList.add("dark")}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="bg-background text-foreground flex min-h-screen flex-col">
        {children}
        {/* 변경 결과 토스트 — 앱 전체에 하나만 둔다 (§CLAUDE.md 렌더링·데이터) */}
        <Toaster richColors position="top-right" theme="dark" />
      </body>
    </html>
  );
}
