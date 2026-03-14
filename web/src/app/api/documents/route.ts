import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureMockUser } from "@/lib/mock-user";

export async function GET() {
  const user = await ensureMockUser();
  const documents = await prisma.document.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { notes: true } } },
  });
  return NextResponse.json(documents);
}
