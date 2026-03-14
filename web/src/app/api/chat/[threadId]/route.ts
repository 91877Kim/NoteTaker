import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureMockUser } from "@/lib/mock-user";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  const { threadId } = await params;
  const user = await ensureMockUser();

  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, userId: user.id },
    include: { messages: true },
  });
  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  return NextResponse.json(thread);
}
