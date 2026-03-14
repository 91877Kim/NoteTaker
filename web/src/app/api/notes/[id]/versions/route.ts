import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureMockUser } from "@/lib/mock-user";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await ensureMockUser();

  const note = await prisma.note.findFirst({
    where: { id, userId: user.id },
  });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const versions = await prisma.noteVersion.findMany({
    where: { noteId: id },
    orderBy: { versionNum: "asc" },
  });
  return NextResponse.json(versions);
}
