"use client";

type Patch = {
  id: string;
  targetBlockId: string | null;
  patchType: string;
  rationale: string;
  proposedText: string;
  citationsJson: unknown;
  status: string;
};

export function PatchProposalCard({
  patch,
  onAccept,
  onReject,
}: {
  patch: Patch;
  onAccept: () => void;
  onReject: () => void;
}) {
  const citations = Array.isArray(patch.citationsJson)
    ? patch.citationsJson
    : patch.citationsJson && typeof patch.citationsJson === "object" && "citations" in (patch.citationsJson as object)
      ? (patch.citationsJson as { citations: unknown[] }).citations
      : [];

  if (patch.status !== "PENDING") {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3 text-sm">
        <span className="text-zinc-500">
          {patch.status === "ACCEPTED" ? "✓ Accepted" : "✗ Rejected"}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20 p-4 text-sm space-y-3">
      <div>
        <span className="font-medium text-amber-800 dark:text-amber-200">Proposed patch</span>
        {patch.targetBlockId && (
          <span className="ml-2 text-xs text-zinc-500">target: {patch.targetBlockId}</span>
        )}
      </div>
      <p className="text-zinc-700 dark:text-zinc-300">{patch.rationale}</p>
      <div className="rounded bg-white dark:bg-zinc-900 p-2 border border-zinc-200 dark:border-zinc-700">
        <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{patch.proposedText}</p>
      </div>
      {citations.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {citations.map((c: { page?: number; chunk_id?: string }, i: number) => (
            <span
              key={i}
              className="text-xs px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
            >
              p{c.page ?? "?"}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onAccept}
          className="rounded bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm font-medium"
        >
          Accept
        </button>
        <button
          onClick={onReject}
          className="rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 text-sm"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
