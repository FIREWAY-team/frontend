import type { NextConfig } from "next";

/*
  ⚠️ 서버 프로세스의 시간대를 한국 시간(KST, UTC+9)으로 고정한다.
     오프셋 없는 문자열(`new Date("2026-09-05T00:00:00")`)은 **프로세스의 로컬 시간대**로
     해석된다. 배포 환경(컨테이너 등)이 기본값으로 UTC를 쓰면 자정 근처 시각이 하루 앞뒤로
     밀려 보인다 — 브라우저(사용자 KST)와 서버가 서로 다른 시간대로 같은 문자열을 해석해서
     생기는 문제다. `next.config.ts`가 가장 먼저 로드되므로 여기서 프로세스 전체에 못 박는다.
*/
process.env.TZ = "Asia/Seoul";

const nextConfig: NextConfig = {
  /*
    Docker/AWS 배포 시 이미지에 최소 런타임만 담기 위함(.next/standalone).
    ⚠️ 정적 배포는 불가 — Server Action·BFF가 Node 서버를 요구한다.
  */
  output: "standalone",
  /*
    개발 서버 좌하단 표시등(`N` 배지)을 끈다. 배포 화면엔 원래 없다.
    오류 오버레이·HMR은 그대로 살아 있다.
  */
  devIndicators: false,
  /*
    Kakao Map CDN 이미지·타일은 카카오 도메인에서 온다.
    CCTV 스틸은 프로젝트 S3+CloudFront (도메인 확정 후 여기 등록).
  */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.daumcdn.net" },
      { protocol: "https", hostname: "**.kakaocdn.net" },
    ],
  },
  experimental: {
    serverActions: {
      /*
        ⚠️ 배포 도메인은 확정 후 여기 추가한다. Vercel 프리뷰 URL도 필요하면 별도로 등록.
      */
      allowedOrigins: [],
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
