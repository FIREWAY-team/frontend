import { NextResponse } from "next/server";

import { fetchNoGoAreas } from "@/features/no-go/api";

/**
 * `/api/no-go` — 클라이언트가 브라우저에서 부르는 프록시. 이 안에서 서버 사이드로 BE 컨테이너
 * `http://backend:8080/api/no_go` 를 호출해 JSON 그대로 돌려준다.
 *
 * ⚠️ 왜 이 경로가 필요한가 — 브라우저는 docker 네트워크 안의 BE 컨테이너에 직접 못 붙는다.
 *    Server Component 안에서만 fetch 하는 방식은 Next.js 가 build-time SSG 로 뽑아버려
 *    empty 결과가 static HTML 로 굳는 사고가 있었다. Route Handler 는 무조건 요청마다 실행
 *    되므로 그 함정이 없다.
 * ⚠️ `dynamic = 'force-dynamic'` 명시 — 프리렌더 방지. `revalidate = 0` 은 fetch 캐시만
 *    무효화하고 페이지 렌더 자체는 static 이 될 수 있어 이걸로는 부족했다.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const areas = await fetchNoGoAreas();
  // 진입곤란 응답은 종종 300KB 근처까지 커진다. 클라이언트가 뒤로가기/새로고침에서 캐시해서 잠깐이라도
  // 뒤늦게 검증된 판정을 보지 않게 no-store 로 못박는다.
  return NextResponse.json(areas, {
    headers: { "Cache-Control": "private, no-store, no-cache, must-revalidate" },
  });
}
