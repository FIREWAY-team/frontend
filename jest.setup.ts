import "@testing-library/jest-dom";

/*
  jsdom에 없는 브라우저 기능을 채운다.

  ⚠️ **제품 코드를 테스트에 맞춰 고치지 않는다.** 없는 건 여기서 메운다 —
     화면이 실제 브라우저에서 하는 일을 테스트 때문에 빼면 그건 다른 화면이다.
*/

if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

/*
  ⚠️ jsdom엔 ResizeObserver가 없다. 지도·차트가 이걸 자주 쓴다.
*/
if (typeof window !== "undefined" && !window.ResizeObserver) {
  class ResizeObserverPolyfill {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverPolyfill;
}

/*
  ⚠️ jsdom엔 IntersectionObserver가 없다. lazy 로딩·뷰포트 감지에 필요.
  ⚠️ **표준 인터페이스에 완전히 맞춘다** (constructor · `implements IntersectionObserver`).
     이전엔 `@ts-expect-error`로 넘겼는데, TS가 실제로 에러를 안 내는 상황이면
     "unused directive"로 `next build`가 실패한다(#5). 정직하게 계약을 맞춰 두면
     빌드가 우회 없이 통과하고 폴리필의 의도도 명확해진다.
*/
if (typeof window !== "undefined" && !window.IntersectionObserver) {
  class IntersectionObserverPolyfill implements IntersectionObserver {
    readonly root: Element | Document | null = null;
    readonly rootMargin: string = "";
    readonly thresholds: ReadonlyArray<number> = [];
    constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
    observe(_target: Element): void {}
    unobserve(_target: Element): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  window.IntersectionObserver = IntersectionObserverPolyfill;
}
