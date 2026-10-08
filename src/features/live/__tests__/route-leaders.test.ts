import { routeLeaders, vehiclesForSeverity } from "../briefing-constants";

const shared: Array<[number, number]> = [
  [127.1394, 37.4283],
  [127.1282, 37.4308],
];
// 소형은 갈라진 뒤 A21 골목으로 여러 점이 다르다.
const small = {
  coordinates: [
    ...shared,
    [127.1277, 37.4308],
    [127.127, 37.4308],
    [127.1265, 37.4309],
    [127.1261, 37.4316],
  ] as Array<[number, number]>,
};
// 중형(a1 경유)·대형(a41 경유)은 경유지 한 점만 다른 같은 길이다 (운영 응답 2026-10-08).
const north: Array<[number, number]> = [
  [127.1282, 37.432],
  [127.127, 37.4322],
  [127.1261, 37.4316],
];
const viaA1 = {
  coordinates: [...shared, [127.12813, 37.43199], ...north] as Array<[number, number]>,
};
const viaA41 = {
  coordinates: [...shared, [127.12819, 37.4314], ...north] as Array<[number, number]>,
};

describe("routeLeaders", () => {
  it("같은 길 차량은 대형을 대표로 묶고 소형은 따로 둔다", () => {
    const leaders = routeLeaders(vehiclesForSeverity("large"), {
      "pump-3.5": small,
      "pump-8": viaA1,
      "pump-15": viaA41,
      "aerial-25": viaA1,
    });
    expect(leaders).toEqual({
      "pump-3.5": "pump-3.5",
      "pump-8": "pump-15",
      "pump-15": "pump-15",
      "aerial-25": "pump-15",
    });
  });

  it("경로가 없는 차량은 자기 자신이 대표다", () => {
    expect(routeLeaders(["pump-3.5", "pump-8"], { "pump-3.5": small, "pump-8": null })).toEqual({
      "pump-3.5": "pump-3.5",
      "pump-8": "pump-8",
    });
  });
});

describe("vehiclesForSeverity", () => {
  it("중·대 규모는 4대를 모두 배정한다", () => {
    expect(vehiclesForSeverity("large")).toHaveLength(4);
    expect(vehiclesForSeverity("medium")).toHaveLength(4);
  });
});
