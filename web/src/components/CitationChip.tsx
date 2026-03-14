"use client";

type Citation = { page?: number; chunk_id?: string };

export function CitationChip({ citation, onClick }: { citation: Citation; onClick?: () => void }) {
  const label = citation.page != null ? `p${citation.page}` : citation.chunk_id ?? "?";
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center text-xs px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
      title={citation.chunk_id ? `Chunk ${citation.chunk_id}` : `Page ${citation.page}`}
    >
      {label}
    </button>
  );
}

export function CitationChips({
  citations,
  onCitationClick,
}: {
  citations: Citation[];
  onCitationClick?: (citation: Citation) => void;
}) {
  if (!citations?.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {citations.map((c, i) => (
        <CitationChip
          key={i}
          citation={c}
          onClick={onCitationClick ? () => onCitationClick(c) : undefined}
        />
      ))}
    </div>
  );
}
