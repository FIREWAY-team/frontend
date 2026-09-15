/**
 * 환경변수 접근 · 검증 자리.
 *
 * ⚠️ **`NEXT_PUBLIC_*` 는 빌드 시점에 인라인**된다. 값이 없으면 코드에 빈 문자열이 박혀
 *    런타임엔 되돌릴 수 없다 — 배포 전 GHA Secret 등록 필수(§`.github/workflows/frontend-image.yml`).
 * ⚠️ **서버 전용 env는 여기서 부르지 않는다** — 서버 코드가 이 파일을 import하면 클라이언트
 *    번들이 서버 env를 알게 된다. 서버 env는 서버 코드에서만 `process.env.X`로 직접 접근.
 */

export const env = {
  /** Kakao Map JavaScript SDK 앱 키. 없으면 지도 로드 실패 · fallback 표시. */
  kakaoMapAppKey: process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY ?? "",
  /** 목/실 API 전환 플래그. `"true"`면 mock 사용. */
  useMock: (process.env.NEXT_PUBLIC_USE_MOCK ?? "true") === "true",
  /** OG 이미지 절대경로 등. */
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production" ? "https://fireroad.shop" : "http://localhost:3000"),
} as const;

/**
 * Kakao Map 사용 가능 여부. 키가 비면 로드 시도조차 안 하고 fallback으로 간다 —
 * SDK가 빈 키로 요청 던지면 401 도배가 콘솔에 뜬다.
 */
export function isKakaoMapConfigured(): boolean {
  return env.kakaoMapAppKey.length > 0;
}
