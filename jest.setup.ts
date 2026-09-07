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
*/
if (typeof window !== "undefined" && !window.IntersectionObserver) {
  class IntersectionObserverPolyfill {
    readonly root: Element | null = null;
    readonly rootMargin: string = "";
    readonly thresholds: ReadonlyArray<number> = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  // @ts-expect-error — jsdom 환경에 맞춘 최소 폴리필이라 lib.dom.d.ts와 완전히 같지 않다.
  window.IntersectionObserver = IntersectionObserverPolyfill;
}
