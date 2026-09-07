/*
  jest 대역 — `react-markdown`은 ESM만 내놓아 jest에서 그대로 못 부른다.
  테스트에서는 마크다운을 그대로 텍스트로 렌더링해 존재 여부만 확인한다.
*/

import type { ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

export default function ReactMarkdownStub({ children }: Props) {
  return <div data-testid="markdown-stub">{children}</div>;
}
