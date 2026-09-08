import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 라우트 보호 뼈대 — 실제 세션 판정은 인증 결정(§FRONTEND_SPEC §10-2) 확정 뒤 붙인다.
 *
 * ⚠️ 화면 숨김은 UX일 뿐 보안이 아니다(§CLAUDE.md 사용자·권한). Server Action·BFF에서
 *    반드시 재검사한다.
 * ⚠️ 지금은 통과만 시킨다 — 로그인 화면이 아직 없다. 인증 붙은 뒤 아래 주석 해제.
 */
export function middleware(_request: NextRequest) {
  // const isAuthed = Boolean(request.cookies.get("session"));
  // const path = request.nextUrl.pathname;
  // const isPublic = path === "/" || path.startsWith("/login") || path.startsWith("/api/auth");
  // if (!isAuthed && !isPublic) {
  //   const loginUrl = new URL("/login", request.url);
  //   loginUrl.searchParams.set("redirect", path);
  //   return NextResponse.redirect(loginUrl);
  // }
  return NextResponse.next();
}

export const config = {
  /*
    ⚠️ `_next/*`·정적 파일·이미지·favicon은 미들웨어 대상에서 뺀다 — 성능·불필요한 재검사 방지.
  */
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
