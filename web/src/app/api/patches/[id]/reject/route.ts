import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureMockUser } from "@/lib/mock-user";
import { PatchStatus } from "@/generated/prisma/client";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: patchId } = await params;
  await ensureMockUser();

  const patch = await prisma.patchProposal.findUnique({
    where: { id: patchId },
  });
  if (!patch || patch.status !== PatchStatus.PENDING) {
    return NextResponse.json({ error: "Patch not found or already resolved" }, { status: 404 });
  }

  await prisma.patchProposal.update({
    where: { id: patchId },
    data: { status: PatchStatus.REJECTED },
  });

  return NextResponse.json({ ok: true });
}
