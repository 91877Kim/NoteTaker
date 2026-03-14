import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureMockUser } from "@/lib/mock-user";

const reorderSchema = z.object({
  blockIds: z.array(z.string()).min(1),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: noteId } = await params;
  const user = await ensureMockUser();

  const note = await prisma.note.findFirst({
    where: { id: noteId, userId: user.id },
    include: { blocks: true },
  });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const body = await request.json();
  const { blockIds } = reorderSchema.parse(body);

  for (let i = 0; i < blockIds.length; i++) {
    const block = note.blocks.find((b) => b.id === blockIds[i]);
    if (block) {
      await prisma.noteBlock.update({
        where: { id: block.id },
        data: { orderIndex: i },
      });
    }
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

  return NextResponse.json(updated);
}
