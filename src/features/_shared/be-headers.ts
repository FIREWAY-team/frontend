import "server-only";

/**
 * BE 호출 공통 헤더 조립기 · BFF 서버 사이드 fetch 전용.
 *
 * ⚠️ **`X-Api-Token` 인증** (§BE PR #38 · 2026-09-17) — BE 가 `/api/incidents/**` ·
 *    `/api/files/upload-url` 을 이 헤더로 보호한다. 다른 endpoint 는 공개지만 · 여기서
 *    항상 붙여 통일 (BE 가 무시). 토큰은 `BACKEND_API_TOKEN` env · **`NEXT_PUBLIC_` 금지** —
 *    브라우저에 노출되면 시연·심사 링크에서 유출된다.
 * ⚠️ **env 가 비면 헤더 안 붙임** · BE 도 동일 정책 (env 없으면 통과). 프론트만 먼저 배포되고
 *    BE 가 나중에 켜지는 순간에도 사이트가 살아 있게 하려는 것.
 * ⚠️ Body 있으면 자동으로 `Content-Type: application/json` · 호출부는 신경 X.
 */
export function beHeaders(hasBody: boolean): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (hasBody) headers["Content-Type"] = "application/json";
  const token = process.env.BACKEND_API_TOKEN;
  if (token && token.trim() !== "") {
    headers["X-Api-Token"] = token.trim();
  }
  return headers;
}
