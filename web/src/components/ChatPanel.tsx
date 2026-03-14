"use client";

import { useEffect, useState, useRef } from "react";
import { PatchProposalCard } from "./PatchProposalCard";

type Message = { id: string; role: string; content: string };
type Patch = {
  id: string;
  targetBlockId: string | null;
  patchType: string;
  rationale: string;
  proposedText: string;
  citationsJson: unknown;
  status: string;
};

export function ChatPanel({
  threadId,
  noteId,
  onPatchResolved,
}: {
  threadId: string;
  noteId: string;
  onPatchResolved?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [patches, setPatches] = useState<Patch[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchMessages() {
    const res = await fetch(`/api/chat/${threadId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages ?? []);
    }
  }

  useEffect(() => {
    fetchMessages();
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, patches]);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      const res = await fetch(`/api/chat/${threadId}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const data = await res.json();
        await fetchMessages();
        if (data.patchProposal) {
          setPatches((p) => [...p, data.patchProposal]);
        }
      }
    } finally {
      setSending(false);
    }
  }

  async function acceptPatch(patchId: string) {
    const res = await fetch(`/api/patches/${patchId}/accept`, { method: "POST" });
    if (res.ok) {
      setPatches((p) => p.map((x) => (x.id === patchId ? { ...x, status: "ACCEPTED" } : x)));
      onPatchResolved?.();
    }
  }

  async function rejectPatch(patchId: string) {
    const res = await fetch(`/api/patches/${patchId}/reject`, { method: "POST" });
    if (res.ok) {
      setPatches((p) => p.map((x) => (x.id === patchId ? { ...x, status: "REJECTED" } : x)));
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <h2 className="font-medium text-sm">Chat</h2>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-zinc-500 text-sm">Ask about the paper. The agent can propose note updates.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-4 text-right"
                : "mr-4 text-left"
            }
          >
            <span className="text-xs text-zinc-500 block mb-1">
              {m.role === "user" ? "You" : "Agent"}
            </span>
            <div
              className={
                m.role === "user"
                  ? "inline-block rounded-lg bg-zinc-200 dark:bg-zinc-700 px-3 py-2 text-sm"
                  : "rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 text-sm"
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {patches.map((p) => (
          <PatchProposalCard
            key={p.id}
            patch={p}
            onAccept={() => acceptPatch(p.id)}
            onReject={() => rejectPatch(p.id)}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex-shrink-0 border-t border-zinc-200 dark:border-zinc-800 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the paper..."
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
