"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { NoteEditor } from "@/components/NoteEditor";
import { ChatPanel } from "@/components/ChatPanel";
import { VersionHistoryDrawer } from "@/components/VersionHistoryDrawer";

const PdfViewer = dynamic(
  () => import("@/components/PdfViewer").then((m) => m.PdfViewer),
  { ssr: false, loading: () => <div className="p-4 text-zinc-500 text-sm">Loading PDF…</div> }
);

type NoteBlock = {
  id: string;
  blockKey: string;
  sectionTitle: string | null;
  content: string;
  orderIndex: number;
};
type Note = {
  id: string;
  title: string;
  blocks: NoteBlock[];
  documentId: string;
};
type Document = {
  id: string;
  title: string;
  fileUrl: string;
};
type ChatThread = { id: string };

export default function WorkspacePage() {
  const params = useParams<{ documentId: string }>();
  const searchParams = useSearchParams();
  const noteId = searchParams.get("noteId");
  const [note, setNote] = useState<Note | null>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false);

  const effectiveNoteId = note?.id ?? noteId;
  const refreshNote = useCallback(async () => {
    if (!effectiveNoteId) return;
    const res = await fetch(`/api/notes/${effectiveNoteId}`);
    if (res.ok) {
      const data = await res.json();
      setNote(data);
    }
  }, [effectiveNoteId]);

  useEffect(() => {
    async function load() {
      if (!params.documentId) {
        setLoading(false);
        return;
      }
      try {
        const [noteRes, docsRes, noteForDocRes] = await Promise.all([
          noteId ? fetch(`/api/notes/${noteId}`) : Promise.resolve(null),
          fetch("/api/documents"),
          fetch(`/api/documents/${params.documentId}/note`),
        ]);
        if (noteRes?.ok) {
          setNote(await noteRes.json());
        } else if (noteForDocRes.ok) {
          const n = await noteForDocRes.json();
          if (n) {
            setNote(n);
            if (!noteId) {
              window.history.replaceState(null, "", `/workspace/${params.documentId}?noteId=${n.id}`);
            }
          }
        }
        if (docsRes.ok) {
          const docs = await docsRes.json();
          const d = docs.find((x: Document) => x.id === params.documentId);
          setDoc(d ?? null);
        }
        const threadRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId: params.documentId }),
        });
        if (threadRes.ok) setThread(await threadRes.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.documentId, noteId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Loading workspace…</p>
      </div>
    );
  }

  if (!note || !noteId || !params.documentId) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <p className="text-zinc-500">Note not found. <Link href="/" className="underline">Go to dashboard</Link></p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
      <header className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 flex items-center justify-between">
        <Link href={`/documents/${params.documentId}`} className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
          ← {doc?.title ?? "Document"}
        </Link>
        <h1 className="text-sm font-medium truncate max-w-md">{note.title}</h1>
        <button
          type="button"
          onClick={() => setVersionDrawerOpen(true)}
          className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
        >
          History
        </button>
      </header>

      <div className="flex-1 flex min-h-0">
        <aside className="w-72 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 p-2 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">PDF</h2>
          </div>
          <div className="flex-1 min-h-0">
            <PdfViewer fileUrl={doc?.fileUrl ?? ""} />
          </div>
        </aside>

        <aside className="w-48 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-auto">
          <nav className="p-3">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Outline</h2>
            <ul className="space-y-1">
              {note.blocks.map((b) => (
                <li key={b.id}>
                  <a
                    href={`#${b.blockKey}`}
                    className="block text-sm text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 truncate"
                  >
                    {b.sectionTitle ?? b.blockKey}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="flex-1 min-w-0 flex overflow-hidden">
          <div className="flex-1 overflow-auto p-6">
            <NoteEditor note={note} onUpdate={refreshNote} />
          </div>

          <div className="w-96 flex-shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
            {thread ? (
              <ChatPanel
                threadId={thread.id}
                noteId={note.id}
                note={note}
                onPatchResolved={refreshNote}
              />
            ) : (
              <div className="p-4 text-zinc-500 text-sm">Loading chat…</div>
            )}
          </div>
        </div>
      </div>

      <VersionHistoryDrawer
        noteId={note.id}
        open={versionDrawerOpen}
        onClose={() => setVersionDrawerOpen(false)}
      />
    </div>
  );
}
