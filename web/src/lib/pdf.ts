export async function extractTextFromPdf(buffer: Buffer): Promise<{
  text: string;
  numPages: number;
}> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    await parser.destroy();
    return {
      text: result.text,
      numPages: result.pages?.length ?? result.total ?? 1,
    };
  } catch (e) {
    await parser.destroy();
    throw e;
  }
}

export function chunkText(text: string, maxChunkChars = 800): Array<{ content: string; pageNumber?: number }> {
  const chunks: Array<{ content: string; pageNumber?: number }> = [];
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim());
  let current = "";
  let pageHint = 1;

  for (const p of paragraphs) {
    if (current.length + p.length > maxChunkChars && current) {
      chunks.push({ content: current.trim(), pageNumber: pageHint });
      current = "";
    }
    current += (current ? "\n\n" : "") + p;
    const pageMatch = p.match(/\bpage\s+(\d+)\b/i);
    if (pageMatch) pageHint = parseInt(pageMatch[1], 10);
  }
  if (current.trim()) chunks.push({ content: current.trim(), pageNumber: pageHint });
  return chunks.length ? chunks : [{ content: text.slice(0, 2000) || "(No text extracted)" }];
}
