import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const event = await prisma.event.findFirst({
    include: {
      categories: { include: { jerseys: true }, orderBy: { id: "asc" } },
    },
    orderBy: { id: "asc" },
  });
  if (!event) return NextResponse.json({ error: "Event belum dibuat" }, { status: 404 });
  return NextResponse.json(event);
}
