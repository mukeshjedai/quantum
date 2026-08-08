import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  return NextResponse.json({ user });
}
