import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { ensureMockUser } from "@/lib/mock-user";
import { extractTextFromPdf } from "@/lib/pdf";
import { generateNoteFromDocument } from "@/lib/openai";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params;
  const user = await ensureMockUser();

  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId: user.id },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } },
  });
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const existing = await prisma.note.findFirst({
    where: { documentId },
    include: { blocks: true },
  });
  if (existing) {
    return NextResponse.json(existing, { status: 200 });
  }

  const body = await request.json().catch(() => ({}));
  const noteGenerationPrompt = typeof body.noteGenerationPrompt === "string"
    ? body.noteGenerationPrompt.trim()
    : "";

  let documentText: string;
  if (doc.chunks.length > 0) {
    documentText = doc.chunks.map((c) => c.content).join("\n\n");
  } else {
    try {
      const filePath = join(process.cwd(), "public", doc.fileUrl);
      const buffer = await readFile(filePath);
      const { text } = await extractTextFromPdf(buffer);
      documentText = text;
    } catch (err) {
      console.error("Failed to read PDF:", err);
      documentText = "(Could not read document)";
    }
  }

  let blocks: Array<{ blockKey: string; sectionTitle: string; content: string; orderIndex: number }>;
  try {
    blocks = await generateNoteFromDocument(documentText, noteGenerationPrompt);
  } catch (err) {
    console.error("OpenAI error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to generate note. Ensure OPENAI_API_KEY is set in .env",
      },
      { status: 500 }
    );
  }

  const snapshotJson = { blocks } as object;
  const note = await prisma.note.create({
    data: {
      documentId,
      userId: user.id,
      title: `Note: ${doc.title}`,
      currentJson: snapshotJson,
    },
  });

  for (const b of blocks) {
    await prisma.noteBlock.create({
      data: {
        noteId: note.id,
        blockKey: b.blockKey,
        sectionTitle: b.sectionTitle,
        content: b.content,
        orderIndex: b.orderIndex,
      },
    });
  }

  await prisma.noteVersion.create({
    data: {
      noteId: note.id,
      versionNum: 1,
      snapshotJson,
    },
  });

  const full = await prisma.note.findUnique({
    where: { id: note.id },
    include: { blocks: true, versions: true },
  });

  return NextResponse.json(full);
}
