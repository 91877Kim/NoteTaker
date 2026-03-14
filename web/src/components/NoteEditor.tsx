"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const FONT_OPTIONS = [
  { label: "Default", value: "inherit" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "Courier New", value: '"Courier New", monospace' },
];

type NoteBlock = {
  id: string;
  blockKey: string;
  sectionTitle: string | null;
  content: string;
  orderIndex: number;
  fontFamily?: string | null;
};
type Note = {
  id: string;
  title: string;
  blocks: NoteBlock[];
};

function EditableSectionTitle({
  value,
  onSave,
}: {
  value: string | null;
  onSave: (v: string) => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [editing, setEditing] = useState(false);
  const display = value?.trim() || "Untitled section";

  const startEditing = useCallback(() => setEditing(true), []);

  const handleBlur = useCallback(() => {
    setEditing(false);
    const text = ref.current?.innerText?.trim() ?? "";
    if (text !== (value ?? "")) onSave(text || "");
  }, [value, onSave]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(ref.current);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, [editing]);

  if (editing) {
    return (
      <span
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            ref.current?.blur();
          }
          if (e.key === "Escape") {
            ref.current!.innerText = display;
            ref.current?.blur();
          }
        }}
        className="outline-none rounded px-1 -mx-1 min-w-[2ch] ring-1 ring-zinc-300 dark:ring-zinc-600"
        style={{ fontFamily: "inherit" }}
      >
        {display}
      </span>
    );
  }
  return (
    <span
      onClick={startEditing}
      title="Click to rename section"
      className="cursor-text hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded px-1 -mx-1 inline-flex items-center gap-1"
    >
      {display}
      <svg className="w-3 h-3 opacity-0 group-hover/block:opacity-50 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    </span>
  );
}

function EditableBlock({
  block,
  isDragging,
  onSave,
  onSaveSectionTitle,
  onContentChange,
  onSaveFont,
  onDelete,
  onDragStart,
  onDragEnd,
  onDragOver,
}: {
  block: NoteBlock;
  isDragging?: boolean;
  onSave: (content: string) => void;
  onSaveSectionTitle: (sectionTitle: string) => void;
  onContentChange: (content: string) => void;
  onSaveFont: (fontFamily: string) => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
}) {
  const divRef = useRef<HTMLDivElement>(null);
  const lastExternalContent = useRef(block.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const font = block.fontFamily || "inherit";

  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    const isFocused = document.activeElement === el;
    const contentChangedExternally = block.content !== lastExternalContent.current;
    if (!isFocused && (contentChangedExternally || el.innerText === "")) {
      el.innerText = block.content;
      lastExternalContent.current = block.content;
    }
  }, [block.content]);

  const handleBlur = useCallback(() => {
    const el = divRef.current;
    if (!el) return;
    const text = el.innerText.trim();
    lastExternalContent.current = text;
    if (text !== block.content) {
      onContentChange(text);
      onSave(text);
    }
  }, [block.content, onSave, onContentChange]);

  const handleFocus = useCallback(() => {}, []);

  return (
    <section
      id={block.blockKey}
      onDragOver={onDragOver}
      className={`space-y-1 group/block relative rounded-lg transition-opacity ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <div
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 touch-none shrink-0"
          title="Drag to reorder"
          tabIndex={0}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="6" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="9" cy="18" r="1.5" />
            <circle cx="15" cy="6" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="15" cy="18" r="1.5" />
          </svg>
        </div>
        <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 flex-1 min-w-0">
          <EditableSectionTitle
            value={block.sectionTitle}
            onSave={onSaveSectionTitle}
          />
        </h3>
        <select
          value={font}
          onChange={(e) => onSaveFont(e.target.value)}
          className="opacity-70 group-hover/block:opacity-100 text-xs rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1"
          title="Font"
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <div className="opacity-0 group-hover/block:opacity-100 flex items-center gap-1 transition-opacity">
          {showDeleteConfirm ? (
            <>
              <button
                onClick={onDelete}
                className="text-xs text-red-600 hover:underline"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-xs text-zinc-500 hover:underline"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-zinc-500 hover:text-red-600"
              title="Delete section"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        className="min-h-[1.5em] text-zinc-800 dark:text-zinc-200 leading-relaxed outline-none rounded px-2 py-1 -mx-1 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 focus:bg-zinc-100 dark:focus:bg-zinc-800/50 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-600 whitespace-pre-wrap"
        style={{ fontFamily: font }}
        onBlur={handleBlur}
        onFocus={handleFocus}
        data-block-id={block.id}
      />
    </section>
  );
}

export function NoteEditor({
  note,
  onUpdate,
}: {
  note: Note;
  onUpdate?: () => void;
}) {
  const [blocks, setBlocks] = useState(() =>
    [...note.blocks].sort((a, b) => a.orderIndex - b.orderIndex)
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBlocks([...note.blocks].sort((a, b) => a.orderIndex - b.orderIndex));
  }, [note.blocks]);

  const saveBlock = useCallback(
    async (
      blockId: string,
      updates: { content?: string; sectionTitle?: string; fontFamily?: string | null }
    ) => {
      setSaving(true);
      try {
        const body: Record<string, unknown> = {
          blocks: blocks.map((b) => {
            if (b.id !== blockId) return { id: b.id, content: b.content };
            return {
              id: b.id,
              content: updates.content ?? b.content,
              sectionTitle: updates.sectionTitle ?? b.sectionTitle,
              fontFamily: updates.fontFamily ?? b.fontFamily,
            };
          }),
        };
        const res = await fetch(`/api/notes/${note.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) onUpdate?.();
      } finally {
        setSaving(false);
      }
    },
    [note.id, blocks, onUpdate]
  );

  const handleContentChange = useCallback((blockId: string, content: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, content } : b))
    );
  }, []);

  const handleSectionTitleChange = useCallback((blockId: string, sectionTitle: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, sectionTitle } : b))
    );
  }, []);

  const addSection = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/notes/${note.id}/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionTitle: "New section" }),
      });
      if (res.ok) {
        const block = await res.json();
        setBlocks((prev) =>
          [...prev, { ...block, sectionTitle: "New section", content: "" }]
        );
        onUpdate?.();
      }
    } finally {
      setSaving(false);
    }
  }, [note.id, onUpdate]);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const reorderBlocks = useCallback(
    async (blockIds: string[]) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/notes/${note.id}/blocks/reorder`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blockIds }),
        });
        if (res.ok) {
          const data = await res.json();
          setBlocks(data.blocks);
          onUpdate?.();
        }
      } finally {
        setSaving(false);
      }
    },
    [note.id, onUpdate]
  );

  const handleDragStart = useCallback((e: React.DragEvent, blockId: string) => {
    setDraggedId(blockId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", blockId);
    if (e.dataTransfer.setDragImage) {
      const img = new Image();
      img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      e.dataTransfer.setDragImage(img, 0, 0);
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDropIndex(null);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (draggedId) setDropIndex(targetIndex);
    },
    [draggedId]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      e.stopPropagation();
      const blockId = e.dataTransfer.getData("text/plain");
      setDraggedId(null);
      setDropIndex(null);
      if (!blockId) return;
      const fromIndex = blocks.findIndex((b) => b.id === blockId);
      if (fromIndex === -1 || fromIndex === targetIndex) return;
      const newOrder = [...blocks];
      const [removed] = newOrder.splice(fromIndex, 1);
      newOrder.splice(targetIndex, 0, removed);
      reorderBlocks(newOrder.map((b) => b.id));
    },
    [blocks, reorderBlocks]
  );

  const deleteSection = useCallback(
    async (blockId: string) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/notes/${note.id}/blocks/${blockId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setBlocks((prev) => prev.filter((b) => b.id !== blockId));
          onUpdate?.();
        }
      } finally {
        setSaving(false);
      }
    },
    [note.id, onUpdate]
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {note.title}
      </h2>
      {blocks.map((block, index) => (
        <div key={block.id} className="relative group/drop">
          {dropIndex === index && (
            <div
              className="absolute -top-1 left-0 right-0 h-0.5 bg-blue-500 rounded z-10 pointer-events-none"
              aria-hidden
            />
          )}
          <div
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
          >
            <EditableBlock
              block={block}
              isDragging={draggedId === block.id}
              onSave={(content) => saveBlock(block.id, { content })}
              onSaveSectionTitle={(sectionTitle) => {
                handleSectionTitleChange(block.id, sectionTitle);
                saveBlock(block.id, { sectionTitle });
              }}
              onContentChange={(content) => handleContentChange(block.id, content)}
              onSaveFont={(fontFamily) => saveBlock(block.id, { fontFamily })}
              onDelete={() => deleteSection(block.id)}
              onDragStart={(e) => handleDragStart(e, block.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
            />
          </div>
        </div>
      ))}
      <div>
        <button
          onClick={addSection}
          disabled={saving}
          className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 border border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg px-4 py-2 w-full transition-colors disabled:opacity-50"
        >
          + Add section
        </button>
      </div>
    </div>
  );
}
