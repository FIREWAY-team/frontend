/**
 * (public) 라우트 그룹 셸 — 랜딩 · 로그인 공용.
 * ⚠️ 별도 헤더·사이드바 없음. 각 페이지가 자기 브랜드 헤더를 갖는다.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="bg-background flex min-h-screen flex-col">{children}</div>;
}
