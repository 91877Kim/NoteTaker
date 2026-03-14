"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const NOTE_PROMPT_KEY = "paper-note-agent:noteGenerationPrompt";

type Document = {
  id: string;
  title: string;
  status: string;
  pageCount: number | null;
  createdAt: string;
  _count?: { notes: number };
};

export default function Dashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notePrompt, setNotePrompt] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setNotePrompt(localStorage.getItem(NOTE_PROMPT_KEY) ?? "");
    }
  }, []);

  const saveNotePrompt = useCallback(() => {
    localStorage.setItem(NOTE_PROMPT_KEY, notePrompt);
    setSettingsOpen(false);
  }, [notePrompt]);

  async function fetchDocuments() {
    const res = await fetch("/api/documents");
    if (res.ok) {
      const data = await res.json();
      setDocuments(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDocuments();
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Upload failed");
        return;
      }
      await fetchDocuments();
    } finally {
      setUploading(false);
    }
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (uploading) return;
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Paper Note Agent</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Upload papers, generate notes, refine through chat</p>
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="shrink-0 p-2 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:text-zinc-400 dark:hover:bg-zinc-800"
          title="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
          </svg>
        </button>
      </header>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl max-w-lg w-full p-6">
            <h2 className="font-semibold mb-2">Note generation prompt</h2>
            <p className="text-sm text-zinc-500 mb-3">
              Custom instructions for the LLM when generating the initial note from a PDF. Leave empty for default behavior.
            </p>
            <textarea
              value={notePrompt}
              onChange={(e) => setNotePrompt(e.target.value)}
              placeholder="e.g. Focus on methodology and key findings. Use bullet points for results."
              className="w-full h-32 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={saveNotePrompt}
                className="px-4 py-2 text-sm rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-6 py-10">
        <section className="mb-10">
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Upload document</h2>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`
              relative rounded-xl border-2 border-dashed transition-colors
              ${dragActive ? "border-zinc-500 bg-zinc-100 dark:bg-zinc-800/50" : "border-zinc-300 dark:border-zinc-700"}
              ${uploading ? "pointer-events-none opacity-70" : "cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600"}
            `}
          >
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileInput}
              disabled={uploading}
              aria-label="Upload PDF file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="px-6 py-12 text-center">
              {uploading ? (
                <p className="text-zinc-600 dark:text-zinc-400">Uploading…</p>
              ) : (
                <>
                  <p className="text-zinc-700 dark:text-zinc-300 font-medium">
                    {dragActive ? "Drop PDF here" : "Drag and drop a PDF here"}
                  </p>
                  <p className="text-sm text-zinc-500 mt-1">or click to browse</p>
                </>
              )}
            </div>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Documents</h2>
          {loading ? (
            <p className="text-zinc-500 text-sm">Loading…</p>
          ) : documents.length === 0 ? (
            <p className="text-zinc-500 text-sm">No documents yet. Upload a PDF above.</p>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc) => (
                <li key={doc.id}>
                  <Link
                    href={`/documents/${doc.id}`}
                    className="block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                  >
                    <span className="font-medium">{doc.title}</span>
                    <span className="ml-2 text-xs text-zinc-500">
                      {doc.status} · {(doc._count?.notes ?? 0) > 0 ? "Note ready" : "No note"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
