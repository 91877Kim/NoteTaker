import OpenAI from "openai";

function getClient() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set in .env");
  return new OpenAI({ apiKey: key });
}

type PatchProposal = {
  should_propose_patch: boolean;
  target_block_id?: string;
  patch_type?: "replace" | "insert_after" | "insert_before" | "append";
  rationale?: string;
  proposed_text?: string;
  citations?: Array<{ page?: number; chunk_id?: string }>;
};

export async function chatWithDocument(
  userMessage: string,
  documentChunks: Array<{ content: string; pageNumber: number | null; chunkIndex: number }>,
  noteBlocks: Array<{ blockKey: string; sectionTitle: string | null; content: string }>,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<{ answer: string; patchProposal: PatchProposal | null }> {
  const openai = getClient();
  const contextText = documentChunks
    .map((c) => `[Chunk ${c.chunkIndex}, Page ${c.pageNumber ?? "?"}]\n${c.content}`)
    .join("\n\n---\n\n")
    .slice(0, 20000);

  const noteSummary = noteBlocks
    .map((b) => `[${b.blockKey}] ${b.sectionTitle ?? "Section"}: ${b.content.slice(0, 200)}...`)
    .join("\n");

  const systemPrompt = `You are a helpful assistant discussing an uploaded document with the user.
The user has a structured note with sections. Your job:
1. Answer questions about the document using the provided context. Cite page numbers when possible.
2. If the user's question reveals information that is NOT already in their note (e.g. "what is the protagonist's age?" and the answer is "20"), propose adding it.
3. Respond with valid JSON in this exact format:
{"answer": "Your conversational answer here with citations.", "patch": {"should_propose_patch": true/false, "target_block_id": "blockKey to add to", "patch_type": "insert_after" or "replace" or "append", "rationale": "Why add this", "proposed_text": "The text to add", "citations": [{"page": 5}]}}
If no patch is needed, set should_propose_patch to false and omit other patch fields.
Find info from the document context. Only propose a patch when you found new info that belongs in the note.`;

  const userContent = `Document context:\n${contextText}\n\nCurrent note:\n${noteSummary}\n\nUser question: ${userMessage}`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-6).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userContent },
  ];

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
  });

  const content = res.choices[0]?.message?.content ?? "";
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { answer: content, patchProposal: null };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      answer?: string;
      patch?: PatchProposal;
    };
    const answer = parsed.answer ?? content;
    const patch = parsed.patch?.should_propose_patch ? parsed.patch : null;
    return {
      answer,
      patchProposal: patch
        ? {
            should_propose_patch: true,
            target_block_id: patch.target_block_id,
            patch_type: patch.patch_type ?? "insert_after",
            rationale: patch.rationale ?? "",
            proposed_text: patch.proposed_text ?? "",
            citations: patch.citations ?? [],
          }
        : null,
    };
  } catch {
    return { answer: content, patchProposal: null };
  }
}
