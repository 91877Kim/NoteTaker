import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureMockUser } from "@/lib/mock-user";
import { unlink } from "node:fs/promises";
import { join } from "node:path";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await ensureMockUser();

  const doc = await prisma.document.findFirst({
    where: { id, userId: user.id },
  });
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const updated = await prisma.document.update({
    where: { id },
    data: { title },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await ensureMockUser();

  const doc = await prisma.document.findFirst({
    where: { id, userId: user.id },
  });
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    const notes = await tx.note.findMany({ where: { documentId: id }, select: { id: true } });
    const noteIds = notes.map((n) => n.id);
    const threads = await tx.chatThread.findMany({ where: { documentId: id }, select: { id: true } });
    const threadIds = threads.map((t) => t.id);

    await tx.patchProposal.deleteMany({
      where: {
        OR: [
          { note: { documentId: id } },
          { thread: { documentId: id } },
        ],
      },
    });
    await tx.noteBlock.deleteMany({ where: { noteId: { in: noteIds } } });
    await tx.noteVersion.deleteMany({ where: { noteId: { in: noteIds } } });
    await tx.note.deleteMany({ where: { documentId: id } });
    await tx.chatMessage.deleteMany({ where: { threadId: { in: threadIds } } });
    await tx.chatThread.deleteMany({ where: { documentId: id } });
    await tx.documentChunk.deleteMany({ where: { documentId: id } });
    await tx.document.delete({ where: { id } });
  });

  try {
    const filePath = join(process.cwd(), "public", doc.fileUrl);
    await unlink(filePath);
  } catch {
    // Ignore if file already missing
  }

  return NextResponse.json({ ok: true });
}
