"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

const NOTE_PROMPT_KEY = "paper-note-agent:noteGenerationPrompt";

type Document = {
  id: string;
  title: string;
  status: string;
  pageCount: number | null;
};
type Note = {
  id: string;
  title: string;
  documentId: string;
};

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<Document | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchDoc = useCallback(async () => {
    if (!params.id) return;
    const [docsRes, noteRes] = await Promise.all([
      fetch("/api/documents"),
      fetch(`/api/documents/${params.id}/note`),
    ]);
    if (docsRes.ok) {
      const docs = await docsRes.json();
      const d = docs.find((x: Document) => x.id === params.id);
      setDoc(d ?? null);
    }
    if (noteRes.ok) {
      const n = await noteRes.json();
      if (n) setNote(n);
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchDoc();
  }, [fetchDoc]);

  function startRename() {
    if (doc) {
      setTitleInput(doc.title);
      setEditingTitle(true);
    }
  }

  async function saveRename() {
    if (!params.id || !titleInput.trim()) {
      setEditingTitle(false);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleInput.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDoc((d) => (d ? { ...d, title: updated.title } : null));
        setEditingTitle(false);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Failed to rename");
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteDocument() {
    if (!params.id || !confirm("Delete this document? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${params.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Failed to delete");
        setDeleting(false);
      }
    } catch {
      alert("Failed to delete");
      setDeleting(false);
    }
  }

  async function generateNote() {
    if (!params.id) return;
    setGenerating(true);
    try {
      const prompt = typeof window !== "undefined" ? localStorage.getItem(NOTE_PROMPT_KEY) ?? "" : "";
      const res = await fetch(`/api/documents/${params.id}/generate-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteGenerationPrompt: prompt }),
      });
      if (res.ok) {
        const data = await res.json();
        setNote(data);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Failed to generate note");
      }
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">← Dashboard</Link>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {editingTitle ? (
            <>
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveRename()}
                className="text-xl font-semibold px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 flex-1 min-w-[200px]"
                aria-label="Document title"
                autoFocus
              />
              <button
                onClick={saveRename}
                disabled={saving || !titleInput.trim()}
                className="text-sm px-3 py-1 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setEditingTitle(false)}
                disabled={saving}
                className="text-sm px-3 py-1 rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold">{doc?.title ?? "Document"}</h1>
              <button
                onClick={startRename}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="Rename"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </>
          )}
        </div>
        <p className="text-sm text-zinc-500 mt-1">{doc?.status ?? "—"}</p>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        {loading ? (
          <p className="text-zinc-500">Loading…</p>
        ) : !doc ? (
          <p className="text-zinc-500">Document not found.</p>
        ) : (
          <div className="space-y-6">
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
              <h2 className="font-medium mb-2">Document</h2>
              <div className="flex flex-wrap gap-3 mb-6">
                <button
                  onClick={deleteDocument}
                  disabled={deleting}
                  className="text-sm px-3 py-1.5 rounded border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete document"}
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
              <h2 className="font-medium mb-2">Generate note</h2>
              <p className="text-sm text-zinc-500 mb-4">
                Use AI to generate an initial structured note from this PDF. Configure the prompt in Settings on the dashboard.
              </p>
              {note ? (
                <Link
                  href={`/workspace/${params.id}?noteId=${note.id}`}
                  className="inline-block rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  Open reading workspace →
                </Link>
              ) : (
                <button
                  onClick={generateNote}
                  disabled={generating}
                  className="rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50"
                >
                  {generating ? "Generating…" : "Generate note"}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
