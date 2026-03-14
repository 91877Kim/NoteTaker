import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureMockUser } from "@/lib/mock-user";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  const { id: noteId, blockId } = await params;
  const user = await ensureMockUser();

  const note = await prisma.note.findFirst({
    where: { id: noteId, userId: user.id },
    include: { blocks: { orderBy: { orderIndex: "asc" } } },
  });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const block = note.blocks.find((b) => b.id === blockId);
  if (!block) {
    return NextResponse.json({ error: "Block not found" }, { status: 404 });
  }

  await prisma.noteBlock.delete({ where: { id: blockId } });

  const remaining = note.blocks.filter((b) => b.id !== blockId);
  for (let i = 0; i < remaining.length; i++) {
    await prisma.noteBlock.update({
      where: { id: remaining[i].id },
      data: { orderIndex: i },
    });
  }

  const updated = await prisma.note.findUnique({
    where: { id: noteId },
    include: { blocks: { orderBy: { orderIndex: "asc" } } },
  });
  if (!updated) return NextResponse.json({ error: "Note not found" }, { status: 404 });

  const snapshotJson = {
    blocks: updated.blocks.map((b) => ({
      blockKey: b.blockKey,
      sectionTitle: b.sectionTitle,
      content: b.content,
      orderIndex: b.orderIndex,
    })),
  };
  const latest = await prisma.noteVersion.findFirst({
    where: { noteId },
    orderBy: { versionNum: "desc" },
  });
  await prisma.note.update({
    where: { id: noteId },
    data: { currentJson: snapshotJson as object, updatedAt: new Date() },
  });
  await prisma.noteVersion.create({
    data: {
      noteId,
      versionNum: (latest?.versionNum ?? 0) + 1,
      snapshotJson: snapshotJson as object,
    },
  });

  return NextResponse.json({ ok: true });
}
