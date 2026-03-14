import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { ensureMockUser } from "@/lib/mock-user";

const bodySchema = z.object({
  documentId: z.string().min(1),
});

export async function POST(request: Request) {
  const user = await ensureMockUser();
  const body = await request.json();
  const { documentId } = bodySchema.parse(body);

  const doc = await prisma.document.findFirst({
    where: { id: documentId, userId: user.id },
  });
  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const existing = await prisma.chatThread.findFirst({
    where: { documentId, userId: user.id },
  });
  if (existing) {
    return NextResponse.json(existing);
  }

  const thread = await prisma.chatThread.create({
    data: { userId: user.id, documentId },
  });
  return NextResponse.json(thread);
}
