/*
  jest 대역 — Next의 `next/cache`를 no-op으로 대체한다.

  ⚠️ `"use server"` 파일을 클라이언트 컴포넌트가 import할 때 실제 Next는 그 자리를 클라이언트
     참조로 바꾸지만 jest에는 그 변환이 없어서 서버 내부 구현이 그대로 로드되며 jsdom에 없는
     전역(`Request` 등)을 건드려 터진다. 여기서 최소 API만 통과시킨다.
*/

export const revalidatePath = () => {};
export const revalidateTag = () => {};
export const unstable_cache = <T>(fn: T) => fn;
