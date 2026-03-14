import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureMockUser } from "@/lib/mock-user";
import { PatchStatus } from "@/generated/prisma/client";
import { chatWithDocument } from "@/lib/openai-chat";

const bodySchema = z.object({
  content: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const user = await ensureMockUser();

  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, userId: user.id },
    include: {
      document: {
        include: {
          chunks: { orderBy: { chunkIndex: "asc" } },
          notes: { include: { blocks: { orderBy: { orderIndex: "asc" } } } },
        },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const body = await request.json();
  const { content } = bodySchema.parse(body);

  await prisma.chatMessage.create({
    data: { threadId, role: "user", content },
  });

  const chunks = thread.document.chunks;
  const note = thread.document.notes[0];
  const blocks = note?.blocks ?? [];
  const history = thread.messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  let answer: string;
  let patchProposal: Awaited<ReturnType<typeof chatWithDocument>>["patchProposal"];

  try {
    const result = await chatWithDocument(
      content,
      chunks.map((c) => ({
        content: c.content,
        pageNumber: c.pageNumber,
        chunkIndex: c.chunkIndex,
      })),
      blocks.map((b) => ({
        blockKey: b.blockKey,
        sectionTitle: b.sectionTitle,
        content: b.content,
      })),
      history
    );
    answer = result.answer;
    patchProposal = result.patchProposal;
  } catch (err) {
    console.error("Chat error:", err);
    answer =
      err instanceof Error
        ? err.message
        : "Failed to get response. Ensure OPENAI_API_KEY is set in .env.";
    patchProposal = null;
  }

  await prisma.chatMessage.create({
    data: { threadId, role: "assistant", content: answer },
  });

  let patch = null;
  if (
    note &&
    patchProposal?.should_propose_patch &&
    patchProposal.proposed_text
  ) {
    const targetBlockId =
      patchProposal.target_block_id ??
      blocks[0]?.blockKey ??
      "overview-1";
    patch = await prisma.patchProposal.create({
      data: {
        noteId: note.id,
        threadId,
        targetBlockId,
        patchType: patchProposal.patch_type ?? "insert_after",
        rationale: patchProposal.rationale ?? "",
        proposedText: patchProposal.proposed_text,
        citationsJson: patchProposal.citations ?? [],
        status: PatchStatus.PENDING,
      },
    });
  }

  return NextResponse.json({
    answer,
    citations: patchProposal?.citations ?? [],
    patchProposal: patch,
  });
}
