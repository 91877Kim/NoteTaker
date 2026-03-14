import OpenAI from "openai";

function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set in .env");
  return new OpenAI({ apiKey: key });
}

export async function generateNoteFromDocument(
  documentText: string,
  prompt: string
): Promise<Array<{ blockKey: string; sectionTitle: string; content: string; orderIndex: number }>> {
  const openai = getClient();
  const systemPrompt = `You are a helpful assistant that creates structured study notes from documents.
Respond with valid JSON only. Use this exact format:
{"blocks": [{"blockKey": "overview-1", "sectionTitle": "Overview", "content": "...", "orderIndex": 0}, ...]}
Each block needs: blockKey (string), sectionTitle (string), content (string), orderIndex (number 0,1,2...).
Use section titles like Overview, Key Findings, Methods, Results, Interpretation.
If a custom prompt is provided, follow its instructions for structure and focus.`;

  const userContent = prompt.trim()
    ? `Custom instruction: ${prompt}\n\nDocument text:\n${documentText.slice(0, 12000)}`
    : `Create structured notes from this document:\n\n${documentText.slice(0, 12000)}`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    response_format: { type: "json_object" },
  });

  const content = res.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI");

  const trimmed = content.trim();
  const jsonStr = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "").trim()
    : trimmed;

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error("OpenAI returned invalid JSON. Try again.");
  }

  let blocks: unknown[];
  if (Array.isArray(parsed)) {
    blocks = parsed;
  } else if (parsed && typeof parsed === "object" && "blocks" in parsed && Array.isArray((parsed as { blocks: unknown }).blocks)) {
    blocks = (parsed as { blocks: unknown[] }).blocks;
  } else {
    throw new Error("Invalid response format: expected { blocks: [...] } or array of blocks");
  }

  const normalize = (x: unknown): Record<string, unknown> =>
    x && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>) : {};

  return blocks.map((b, i) => {
    const obj = normalize(b);
    return {
      blockKey: String(obj.blockKey ?? obj.block_key ?? `section-${i}`),
      sectionTitle: String(obj.sectionTitle ?? obj.section_title ?? "Section"),
      content: String(obj.content ?? ""),
      orderIndex: typeof obj.orderIndex === "number" ? obj.orderIndex : typeof obj.order_index === "number" ? obj.order_index : i,
    };
  });
}
