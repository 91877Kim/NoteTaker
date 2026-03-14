import { NextResponse } from "next/server";
import { z } from "zod";
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
    include: { blocks: { orderBy: { orderIndex: "asc" } }, document: true },
  });
  if (!note) {
    return NextResponse.json({ error: "Note not found" }, { status: 404 });
  }
  return NextResponse.json(note);
}

const patchSchema = z.object({
  blocks: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      sectionTitle: z.string().nullable().optional(),
      fontFamily: z.string().nullable().optional(),
    })
  ),
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
  const { blocks } = patchSchema.parse(body);

  for (const b of blocks) {
    const existing = note.blocks.find((x) => x.id === b.id);
    if (existing) {
      await prisma.noteBlock.update({
        where: { id: b.id },
        data: {
          content: b.content,
          ...(b.sectionTitle !== undefined && {
            sectionTitle: b.sectionTitle === "" ? null : b.sectionTitle,
          }),
          ...(b.fontFamily !== undefined && {
            fontFamily: b.fontFamily === "inherit" || !b.fontFamily ? null : b.fontFamily,
          }),
        },
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
  const nextVersion = (latest?.versionNum ?? 0) + 1;

  await prisma.note.update({
    where: { id: noteId },
    data: { currentJson: snapshotJson as object, updatedAt: new Date() },
  });

  await prisma.noteVersion.create({
    data: { noteId, versionNum: nextVersion, snapshotJson: snapshotJson as object },
  });

  return NextResponse.json(updated);
}
