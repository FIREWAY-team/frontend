import type { RouteResponse } from "../types";

/**
 * 목 경로 응답 — 시나리오별로 3개 후보(1·2·3순위).
 *
 * ⚠️ 실 API는 시나리오 위치·차량 제원을 받아 계산하지만, 목에선 시나리오 id를 키로 미리 만든
 *    응답을 돌려준다. 좌표는 대략적인 라인만 그려도 되게 4~6점만.
 */
export const MOCK_ROUTES: Record<string, RouteResponse> = {
  "eun1-234-5": {
    routes: [
      {
        rank: 1,
        coordinates: [
          [127.1386, 37.4386],
          [127.1394, 37.4372],
          [127.1408, 37.4351],
          [127.142, 37.4318],
          [127.14, 37.43],
        ],
        etaSec: 287,
        distanceM: 1420,
        passableProb: 0.94,
        explanation:
          "대원공원로 → 은행2로. 은행1동 A골목은 CCTV_042 판독 결과 잔여폭 1.9m로 통과 불가 판정 → 우회 (+40초). 다른 두 대안 대비 지연 최소.",
        excludedReasons: [
          {
            edgeId: "seongnam_v153_edge_82441",
            reason: "CCTV 판독 잔여폭 1.9m (< 2.5m)",
            evidenceUrl: "https://placehold.co/240x160/1e2a3d/8b96ab?text=CCTV+042",
          },
        ],
      },
      {
        rank: 2,
        coordinates: [
          [127.1386, 37.4386],
          [127.14, 37.437],
          [127.141, 37.435],
          [127.14, 37.43],
        ],
        etaSec: 327,
        distanceM: 1580,
        passableProb: 0.78,
        explanation: "여수대로 직진 후 은행로 진입. 진입로 폭은 적정하나 신호 대기 구간 하나.",
        excludedReasons: [],
      },
      {
        rank: 3,
        coordinates: [
          [127.1386, 37.4386],
          [127.135, 37.437],
          [127.135, 37.432],
          [127.14, 37.43],
        ],
        etaSec: 368,
        distanceM: 1720,
        passableProb: 0.85,
        explanation: "성남대로 우회. 거리가 가장 길지만 대로 위주라 통과확률은 안정적.",
        excludedReasons: [],
      },
    ],
  },
  "sd1-102": {
    routes: [
      {
        rank: 1,
        coordinates: [
          [127.144, 37.435],
          [127.1445, 37.4291],
        ],
        etaSec: 214,
        distanceM: 980,
        passableProb: 0.89,
        explanation: "상대원로 직진. 판독된 진입불가 구간 없음.",
        excludedReasons: [],
      },
      {
        rank: 2,
        coordinates: [
          [127.144, 37.435],
          [127.146, 37.432],
          [127.1445, 37.4291],
        ],
        etaSec: 268,
        distanceM: 1210,
        passableProb: 0.92,
        explanation: "우회 경로. 통과확률은 높으나 거리 증가.",
        excludedReasons: [],
      },
      {
        rank: 3,
        coordinates: [
          [127.144, 37.435],
          [127.143, 37.431],
          [127.1445, 37.4291],
        ],
        etaSec: 302,
        distanceM: 1350,
        passableProb: 0.71,
        explanation: "이면도로 경유. 폭 좁은 구간 있음.",
        excludedReasons: [
          {
            edgeId: "seongnam_v153_edge_71203",
            reason: "PDF 진입불가 등재 구간",
          },
        ],
      },
    ],
  },
  "hd-45-2": {
    routes: [
      {
        rank: 1,
        coordinates: [
          [127.15, 37.436],
          [127.1502, 37.4342],
        ],
        etaSec: 342,
        distanceM: 1680,
        passableProb: 0.86,
        explanation: "하대원로 → 공단로. 대형펌프차 통과 가능 확인.",
        excludedReasons: [],
      },
      {
        rank: 2,
        coordinates: [
          [127.15, 37.436],
          [127.148, 37.434],
          [127.1502, 37.4342],
        ],
        etaSec: 401,
        distanceM: 1890,
        passableProb: 0.79,
        explanation: "우회 경로 · 좁은 진입로 회피.",
        excludedReasons: [],
      },
      {
        rank: 3,
        coordinates: [
          [127.15, 37.436],
          [127.153, 37.435],
          [127.1502, 37.4342],
        ],
        etaSec: 456,
        distanceM: 2120,
        passableProb: 0.91,
        explanation: "장시간 우회 · 대로 위주라 안정적이지만 골든타임 위험.",
        excludedReasons: [],
      },
    ],
  },
};
