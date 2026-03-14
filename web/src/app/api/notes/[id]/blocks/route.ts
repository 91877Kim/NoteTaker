import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureMockUser } from "@/lib/mock-user";

const postSchema = z.object({
  sectionTitle: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: noteId } = await params;
  const user = await ensureMockUser();

  const note = await prisma.note.findFirst({
    where: { id: noteId, userId: user.id },
    include: { blocks: { orderBy: { orderIndex: "asc" } } },
  });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const { sectionTitle } = postSchema.parse(body);

  const maxOrder = note.blocks.reduce((m, b) => Math.max(m, b.orderIndex), -1);
  const orderIndex = maxOrder + 1;

  const blockKey = `section-${Date.now()}`;
  const block = await prisma.noteBlock.create({
    data: {
      noteId,
      blockKey,
      sectionTitle: sectionTitle ?? "New section",
      content: "",
      orderIndex,
    },
  });

  const updated = await prisma.note.findUnique({
    where: { id: noteId },
    include: { blocks: { orderBy: { orderIndex: "asc" } } },
  });

  const snapshotJson = {
    blocks: updated!.blocks.map((b) => ({
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
    data: {
      currentJson: snapshotJson as object,
      updatedAt: new Date(),
    },
  });
  await prisma.noteVersion.create({
    data: {
      noteId,
      versionNum: (latest?.versionNum ?? 0) + 1,
      snapshotJson: snapshotJson as object,
    },
  });

  return NextResponse.json(block);
}
