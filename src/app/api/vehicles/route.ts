import { NextResponse } from "next/server";

import { fetchVehicles } from "@/features/vehicles/api";

/**
 * `/api/vehicles` BFF — 브라우저 fetch 대상.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const vehicles = await fetchVehicles();
  return NextResponse.json(vehicles, {
    headers: { "Cache-Control": "private, no-store, no-cache, must-revalidate" },
  });
}
