import { NextResponse } from "next/server";

/**
 * 진단 · Next.js 서버(같은 EC2 다른 컨테이너)에서 router.project-osrm.org 로 실제 요청이
 * 붙는지 · 시간·상태·본문 앞부분을 그대로 반환. 원인 파악 후 삭제 예정.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const url = "https://router.project-osrm.org/route/v1/driving/127.1394,37.4283;127.128007683821,37.4309076894368?overview=full&geometries=geojson&alternatives=true";
  const started = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { "User-Agent": "fireroad-diag/1.0", Accept: "application/json" },
    });
    clearTimeout(timeout);
    const body = await res.text();
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      ms: Date.now() - started,
      contentType: res.headers.get("content-type"),
      bodyHead: body.slice(0, 500),
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      ms: Date.now() - started,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    }, { status: 502 });
  }
}
