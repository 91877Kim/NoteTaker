"use client";

import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type PdfViewerProps = {
  fileUrl: string;
  onPageClick?: (page: number) => void;
};

export function PdfViewer({ fileUrl, onPageClick }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [width, setWidth] = useState(280);

  useEffect(() => {
    const el = document.getElementById("pdf-container");
    if (el) setWidth(Math.min(el.offsetWidth || 280, 400));
  }, [fileUrl]);

  if (!fileUrl) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm p-4">
        No PDF
      </div>
    );
  }

  const src = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl.replace(/^\//, "")}`;

  return (
    <div id="pdf-container" className="flex flex-col h-full bg-zinc-100 dark:bg-zinc-800/50">
      <div className="flex-shrink-0 flex items-center justify-between gap-2 px-2 py-2 border-b border-zinc-200 dark:border-zinc-700">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600 disabled:opacity-40 hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          ←
        </button>
        <span className="text-xs text-zinc-600 dark:text-zinc-400">
          {page} / {numPages ?? "—"}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(numPages ?? 1, p + 1))}
          disabled={page >= (numPages ?? 1)}
          className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600 disabled:opacity-40 hover:bg-zinc-200 dark:hover:bg-zinc-700"
        >
          →
        </button>
      </div>
      <div className="flex-1 overflow-auto flex justify-center p-2">
        <Document
          file={src}
          onLoadSuccess={({ numPages: n }) => setNumPages(n)}
          loading={
            <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
              Loading PDF…
            </div>
          }
          error={
            <div className="py-8 text-center text-zinc-500 text-sm">
              Could not load PDF
            </div>
          }
        >
          <Page
            pageNumber={page}
            width={width}
            renderTextLayer
            renderAnnotationLayer
            onClick={() => onPageClick?.(page)}
            className="shadow"
          />
        </Document>
      </div>
    </div>
  );
}
