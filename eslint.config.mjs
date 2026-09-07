import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // shadcn 생성물은 우리 규칙(import 정렬 등) 대상에서 제외 — 업데이트 시 diff가 커진다.
    "src/components/ui/**",
  ]),
  {
    plugins: { "simple-import-sort": simpleImportSort },
    rules: {
      // 조용한 any 금지 — 타입 구멍이 런타임까지 흘러간다 (CLAUDE.md §폴더·네이밍)
      "@typescript-eslint/no-explicit-any": "error",
      // import 순서 결정론적으로 → diff 노이즈·머지 충돌 감소
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      // 커밋 금지 항목 (CLAUDE.md §Git·PR)
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
]);

export default eslintConfig;
