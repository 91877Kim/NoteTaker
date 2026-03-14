"use client";

import { useEffect, useState } from "react";

type Version = {
  id: string;
  versionNum: number;
  snapshotJson: unknown;
  createdAt: string;
};

export function VersionHistoryDrawer({
  noteId,
  open,
  onClose,
}: {
  noteId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Version | null>(null);

  useEffect(() => {
    if (!open || !noteId) return;
    setLoading(true);
    fetch(`/api/notes/${noteId}/versions`)
      .then((r) => r.ok ? r.json() : [])
      .then((v) => setVersions(v))
      .finally(() => setLoading(false));
  }, [open, noteId]);

  const blocks = selected
    ? (selected.snapshotJson as { blocks?: Array<{ blockKey: string; sectionTitle?: string; content: string }> })?.blocks ?? []
    : [];

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed right-0 top-0 bottom-0 w-96 max-w-[90vw] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 z-50 flex flex-col shadow-xl"
        role="dialog"
        aria-label="Version history"
      >
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="font-medium">Version history</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 p-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-hidden flex">
          <div className="w-32 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 overflow-auto p-2">
            {loading ? (
              <p className="text-zinc-500 text-sm">Loading…</p>
            ) : (
              <ul className="space-y-1">
                {versions.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(v)}
                      className={`w-full text-left text-sm px-2 py-1.5 rounded ${
                        selected?.id === v.id
                          ? "bg-zinc-200 dark:bg-zinc-700 font-medium"
                          : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      }`}
                    >
                      v{v.versionNum}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex-1 overflow-auto p-4">
            {selected ? (
              <div className="space-y-4 text-sm">
                {blocks.map((b, i) => (
                  <div key={i} className="border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    <div className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                      {b.sectionTitle ?? b.blockKey}
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">
                      {b.content || "(empty)"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 text-sm">Select a version</p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
