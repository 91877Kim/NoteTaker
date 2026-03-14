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
    include: { note: { include: { blocks: true } } },
  });
  if (!patch || patch.status !== PatchStatus.PENDING) {
    return NextResponse.json({ error: "Patch not found or already resolved" }, { status: 404 });
  }

  const targetBlock = patch.note.blocks.find((b) => b.blockKey === patch.targetBlockId);
  const sortedBlocks = [...patch.note.blocks].sort((a, b) => a.orderIndex - b.orderIndex);

  if (patch.patchType === "insert_after" || patch.patchType === "append") {
    const target = targetBlock ?? sortedBlocks[0];
    const insertIdx = target
      ? sortedBlocks.findIndex((b) => b.id === target.id) + 1
      : 0;
    for (const b of sortedBlocks) {
      if (b.orderIndex >= insertIdx) {
        await prisma.noteBlock.update({
          where: { id: b.id },
          data: { orderIndex: b.orderIndex + 1 },
        });
      }
    }
    await prisma.noteBlock.create({
      data: {
        noteId: patch.noteId,
        blockKey: `section-${Date.now()}`,
        sectionTitle: "Additional note",
        content: patch.proposedText,
        orderIndex: insertIdx,
      },
    });
  } else {
    if (!targetBlock) {
      return NextResponse.json({ error: "Target block not found" }, { status: 400 });
    }
    await prisma.noteBlock.update({
      where: { id: targetBlock.id },
      data: { content: patch.proposedText },
    });
  }
  const snapshotBlocks = await prisma.noteBlock.findMany({
    where: { noteId: patch.noteId },
    orderBy: { orderIndex: "asc" },
  });
  const snapshotJson = {
    blocks: snapshotBlocks.map(({ blockKey, sectionTitle, content, orderIndex }) => ({
      blockKey,
      sectionTitle,
      content,
      orderIndex,
    })),
  };

  const latest = await prisma.noteVersion.findFirst({
    where: { noteId: patch.noteId },
    orderBy: { versionNum: "desc" },
  });
  const nextVersion = (latest?.versionNum ?? 0) + 1;

  await prisma.note.update({
    where: { id: patch.noteId },
    data: { currentJson: snapshotJson as object },
  });

  await prisma.noteVersion.create({
    data: {
      noteId: patch.noteId,
      versionNum: nextVersion,
      snapshotJson: snapshotJson as object,
    },
  });

  await prisma.patchProposal.update({
    where: { id: patchId },
    data: { status: PatchStatus.ACCEPTED },
  });

  const updated = await prisma.note.findUnique({
    where: { id: patch.noteId },
    include: { blocks: true, versions: true },
  });
  return NextResponse.json(updated);
}
