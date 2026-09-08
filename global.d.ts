/*
  전역 타입 확장. Kakao Map SDK가 `window.kakao`를 붙이므로 여기서 declare 해 둔다.
  ⚠️ 실제 사용 시 `react-kakao-maps-sdk` 컴포넌트를 통해 접근하는 편이 안전 —
     여기 declare는 SDK 로드 확인·디버깅용.
*/

interface Window {
  kakao?: unknown;
}
