import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { ensureMockUser } from "@/lib/mock-user";
import { DocumentStatus } from "@/generated/prisma/client";
import { extractTextFromPdf, chunkText } from "@/lib/pdf";

const UPLOADS_DIR = join(process.cwd(), "public", "uploads");

export async function POST(request: Request) {
  try {
    const user = await ensureMockUser();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    const title = file.name.replace(/\.pdf$/i, "").trim() || "Untitled";
    const buffer = Buffer.from(await file.arrayBuffer());

    const doc = await prisma.document.create({
      data: {
        userId: user.id,
        title,
        fileUrl: "", // set after saving file
        status: DocumentStatus.UPLOADING,
        pageCount: null,
      },
    });

    await mkdir(UPLOADS_DIR, { recursive: true });
    const filename = `${doc.id}.pdf`;
    const filePath = join(UPLOADS_DIR, filename);
    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${filename}`;
    await prisma.document.update({
      where: { id: doc.id },
      data: { fileUrl, status: DocumentStatus.PROCESSING },
    });

    let chunks: Array<{ pageNumber: number | undefined; content: string; chunkIndex: number }>;
    try {
      const { text, numPages } = await extractTextFromPdf(buffer);
      const chunked = chunkText(text);
      chunks = chunked.map((c, i) => ({
        pageNumber: c.pageNumber,
        content: c.content,
        chunkIndex: i,
      }));
      await prisma.document.update({
        where: { id: doc.id },
        data: { pageCount: numPages },
      });
    } catch (parseErr) {
      console.error("PDF parse error:", parseErr);
      chunks = [{ pageNumber: 1, content: "(Could not extract text from PDF)", chunkIndex: 0 }];
    }
    await prisma.documentChunk.createMany({
      data: chunks.map((c) => ({
        documentId: doc.id,
        pageNumber: c.pageNumber ?? null,
        content: c.content,
        chunkIndex: c.chunkIndex,
      })),
    });

    await prisma.document.update({
      where: { id: doc.id },
      data: { status: DocumentStatus.READY },
    });

    const updated = await prisma.document.findUnique({
      where: { id: doc.id },
      include: { chunks: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
