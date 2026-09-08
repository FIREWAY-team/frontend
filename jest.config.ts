import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    /*
      ⚠️ `next/cache`를 대역으로 바꾼다. `"use server"` 파일을 클라이언트 컴포넌트가 import할 때
         실제 Next는 그 자리를 클라이언트 참조로 바꾸지만 jest에는 그 변환이 없어서,
         서버 내부 구현이 그대로 로드되며 jsdom에 없는 전역(`Request` 등)을 건드려 터진다.
    */
    "^next/cache$": "<rootDir>/test/next-cache-stub.ts",
    /*
      ⚠️ `react-markdown`·`remark-gfm`·`rehype-sanitize`는 ESM만 내놓는데 `next/jest`가
         `transformIgnorePatterns`를 덮어써서 변환 대상에 못 넣는다 — 대역으로 바꾼다.
         (LLM 근거 카드에서 실제로 쓰인다면 그때 이 stub을 손대거나 대역을 뗀다.)
    */
    "^react-markdown$": "<rootDir>/test/react-markdown-stub.tsx",
    /*
      ⚠️ Kakao Map SDK는 브라우저 전용이라 jsdom에서 안 돈다.
         지도 위 로직은 순수 함수로 뽑아 그것만 테스트한다(CLAUDE.md §테스트).
         컴포넌트 테스트가 필요하면 여기서 대역으로 바꾼다.
    */
    "^react-kakao-maps-sdk$": "<rootDir>/test/kakao-maps-stub.tsx",
  },
  /*
    테스트는 전부 `src/` 안에 있다. 수집 범위를 여기로 못박아야 레포 안에 생기는 체크아웃
    사본이나 임시 파일의 테스트를 끌어오지 않는다.
  */
  roots: ["<rootDir>/src"],
  // Playwright 스펙은 e2e/ 에만 둔다
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/", "<rootDir>/e2e/"],
};

export default createJestConfig(config);
