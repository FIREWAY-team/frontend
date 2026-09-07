# 골목119 · Frontend

> 소방차 진입 어려운 좁은 골목을 **차종·CCTV 판독·정적 진입불가 데이터**로 걸러, 실제 통과 가능한 경로를 5분 안에 낸다.

성남 중원구 구도심 파일럿. 원티드 AI Championship 2026 · 성남×KAIST AI 경진대회 겸용.

## 스택

`Next.js 16 (App Router)` · `React 19` · `TypeScript (strict + noUncheckedIndexedAccess)` · `Tailwind v4` · `shadcn/ui` · `Kakao Map SDK` · `React Query` · `Zustand` · `Recharts` · `Jest + React Testing Library`

## 폴더

```
src/
├─ app/            ← Next.js App Router
├─ components/
│  ├─ ui/          ← shadcn 생성물 (수동 편집 지양)
│  ├─ common/      ← 공용 (EmptyState · LoadingCard 등)
│  └─ map/         ← Kakao Map 셸·오버레이·팝업
├─ features/       ← 도메인 (dispatch · vehicles · scenarios ...)
├─ hooks/          ← 커스텀 훅
├─ lib/            ← 도메인-무관 유틸 (cn · fetch 래퍼 등)
├─ types/          ← 전역 타입
├─ constants/      ← 도메인 상수 (as const + 라벨맵)
└─ styles/         ← 전역 스타일
```

## 문서 정본

| 문서 | 내용 |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | **기술·코드 규칙** (핵심 4원칙 · 폴더·네이밍 · 데이터·상태 경계 · 지도 SDK 규칙 · 디자인 토큰 · 테스트 · Git·PR) |
| [`docs/FRONTEND_SPEC.md`](docs/FRONTEND_SPEC.md) | **화면·기능 명세** (사용자 정의 · 화면 목록 · 골든패스 · 열린 질문) |
| `docs/CONVENTIONS.md` | 코드 컨벤션·시행착오 (필요 시점에 작성) |
| `docs/DECISIONS.md` | 팀 결정 이력 (필요 시점에 작성) |

> ⚠️ **바뀐 결정은 원문을 지우지 말고 `⚠️ YYYY-MM-DD 정정`으로 표기한다** — 다음 사람(사람·AI)이 왜 뒤집혔는지 볼 수 있어야 한다.

## 개발

```bash
npm install
npm run dev        # 개발 서버 · http://localhost:3000
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run test       # jest
npm run format     # prettier --write .
```

Node 22 · npm 10 이상. `.nvmrc` 참고.

### 환경변수

[`.env.example`](.env.example) 복사 → `.env.local`. 로컬은 목 데이터로도 동작(`NEXT_PUBLIC_USE_MOCK=true`).

## Git 흐름

- base 브랜치: `develop` (`main`은 릴리즈용)
- 브랜치 규칙: `feature/{도메인}-{기능}#{이슈}` · `fix/{도메인}-{내용}#{이슈}` · `docs/{내용}#{이슈}` · `test/{도메인}-{내용}#{이슈}`
- 커밋: `type: 제목 #{이슈번호}` (한글 50자, type 9종: feat/fix/style/refactor/docs/chore/test/design/merge)
- PR 본문 마지막에 `Closes #{이슈번호}`

자세한 규칙은 [`CLAUDE.md` §Git·PR](CLAUDE.md).

## 팀

- 백엔드 4명 + 프론트엔드 1명 (이홍근)
- 예선 제출: 2026-09-20

## 라이선스

[MIT](LICENSE)
