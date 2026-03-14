import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureMockUser } from "@/lib/mock-user";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params;
  const user = await ensureMockUser();

  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId: user.id },
  });
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const note = await prisma.note.findFirst({
    where: { documentId },
    include: { blocks: true },
  });
  return NextResponse.json(note);
}
