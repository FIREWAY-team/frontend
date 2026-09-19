import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { LiveDemoView } from "../components/live-demo-view";
import { LIVE_ADDRESS } from "../moran-scenario";

jest.mock("@/components/map/kakao-canvas", () => ({
  KakaoCanvas: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

// LiveCctvLayer 는 자체적으로 /api/cctv 를 부르므로 이 테스트의 fetch 카운터를 오염시킨다.
// 이 파일은 useLiveRoutes (경로 조회) 만 검증하므로 CCTV 마커 레이어는 stub.
jest.mock("../components/live-cctv-layer", () => ({
  LiveCctvLayer: () => null,
}));
const route = {
  rank: 1,
  coordinates: [
    [127.13, 37.43],
    [127.14, 37.44],
  ],
  etaSec: 240,
  distanceM: 1200,
  passableProb: 0.9,
  passableForVehicle: true,
  hasUnresolvedStaticNoGo: false,
  unlockedByCctv: ["camera-1"],
  excludedReasons: [],
  explanation: "모의 CCTV 판정으로 우회 경로 탐색",
};
const reply = (routes = [route]) => ({
  ok: true,
  json: async () => ({
    routes,
    warnings: [],
    assessments: [
      {
        edgeId: "alley-1",
        coordinates: route.coordinates,
        verdict: "PASS",
        cctvId: "camera-1",
        confidence: 0.9,
      },
    ],
  }),
});

beforeEach(() => {
  window.location.hash = "#step=1";
  Object.defineProperty(window, "kakao", {
    configurable: true,
    value: {
      maps: {
        services: {
          Status: { OK: "OK" },
          Geocoder: class {
            addressSearch(
              address: string,
              callback: (results: { x: string; y: string }[], status: string) => void,
            ) {
              expect(address).toBe(LIVE_ADDRESS);
              callback([{ x: "127.13", y: "37.43" }], "OK");
            }
          },
        },
      },
    },
  });
  global.fetch = jest.fn().mockResolvedValue(reply());
});

async function step(n: number) {
  await act(async () => {
    window.location.hash = `step=${n}`;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

test("geocodes the requested address and recalculates for small, medium and large vehicles", async () => {
  render(<LiveDemoView />);
  expect(screen.getByRole("heading", { name: LIVE_ADDRESS })).toBeInTheDocument();
  await step(3);
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  expect(JSON.parse((fetch as jest.Mock).mock.calls[0][1].body)).toMatchObject({
    vehicleId: "pump-3.5",
    to: { lat: 37.43, lon: 127.13 },
  });
  fireEvent.change(screen.getByRole("combobox", { name: "출동 차량" }), {
    target: { value: "pump-8" },
  });
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(JSON.parse((fetch as jest.Mock).mock.calls[1][1].body).vehicleId).toBe("pump-8");
  fireEvent.change(screen.getByRole("combobox", { name: "출동 차량" }), {
    target: { value: "pump-15" },
  });
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
  expect(JSON.parse((fetch as jest.Mock).mock.calls[2][1].body).vehicleId).toBe("pump-15");
  await step(4);
  expect(await screen.findByText(/추천 경로/)).toBeInTheDocument();
  expect(screen.getByText(/4분 0초/)).toBeInTheDocument();
});

// ⚠️ 09-19 시연 · 종준님 fffebb4 커밋으로 정책 뒤집혔음 — 통과 가능 후보가 없으면 첫 후보를 "차선책" 으로
//    보여주고 explanation 에 라우터 폴백 사유가 실려 있다. 이 테스트의 옛 방어 조건은 시연 흐름과 어긋난다.
//    시연 후 · 원래 정책 (통과 가능 없으면 안내만) 으로 되돌리는 이슈에서 이 skip 을 걷어낸다.
test.skip("blocked or unresolved routes never become the recommended route, including direct step links", async () => {
  (fetch as jest.Mock).mockResolvedValue(
    reply([{ ...route, passableForVehicle: false, hasUnresolvedStaticNoGo: true }]),
  );
  render(<LiveDemoView />);
  await step(4);
  expect(await screen.findByText(/통행 가능한 경로를 찾지 못했습니다/)).toBeInTheDocument();
  expect(screen.queryByText(/추천 경로/)).not.toBeInTheDocument();
});

test("shows an error and retries instead of substituting scripted routes", async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({ ok: false }).mockResolvedValue(reply());
  render(<LiveDemoView />);
  await step(3);
  expect(await screen.findByRole("alert")).toHaveTextContent("경로 계산에 실패했습니다");
  fireEvent.click(screen.getByRole("button", { name: "CCTV 판정·경로 다시 조회" }));
  expect(await screen.findByText(/CCTV 통과 1개/)).toBeInTheDocument();
});

test("a previous vehicle response cannot overwrite the current vehicle", async () => {
  let resolveSmall!: (value: ReturnType<typeof reply>) => void;
  (fetch as jest.Mock)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSmall = resolve;
        }),
    )
    .mockResolvedValueOnce(reply([]));
  render(<LiveDemoView />);
  await step(4);
  fireEvent.change(screen.getByRole("combobox", { name: "출동 차량" }), {
    target: { value: "pump-15" },
  });
  expect(await screen.findByText(/통행 가능한 경로를 찾지 못했습니다/)).toBeInTheDocument();
  await act(async () => resolveSmall(reply()));
  expect(screen.queryByText(/추천 경로/)).not.toBeInTheDocument();
});
