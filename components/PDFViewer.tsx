"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface PDFViewerProps {
  sessionId: string;
  currentSlide: number;
  onTotalSlides: (total: number) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PDFDocumentProxy = any;

export default function PDFViewer({
  sessionId,
  currentSlide,
  onTotalSlides,
}: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

        const doc = await pdfjsLib
          .getDocument(`/api/file/${sessionId}`)
          .promise;
        if (!cancelled) {
          setPdfDoc(doc);
          onTotalSlides(doc.numPages);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("PDF load error:", err);
          setError("Failed to load PDF.");
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, onTotalSlides]);

  const renderPage = useCallback(
    async (pageNum: number) => {
      if (!pdfDoc || !canvasRef.current || !containerRef.current) return;

      // Cancel any in-progress render
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Use container dimensions; fall back to window size if not yet laid out
        const containerWidth =
          containerRef.current.clientWidth || window.innerWidth;
        const containerHeight =
          containerRef.current.clientHeight || window.innerHeight - 56;

        const baseViewport = page.getViewport({ scale: 1 });
        const scaleW = containerWidth / baseViewport.width;
        const scaleH = containerHeight / baseViewport.height;
        const scale = Math.min(scaleW, scaleH) * 0.95;

        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const renderTask = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (err) {
        // Ignore cancelled renders
        if ((err as Error)?.message !== "Rendering cancelled") {
          console.error("Render error:", err);
        }
      }
    },
    [pdfDoc]
  );

  useEffect(() => {
    if (pdfDoc && currentSlide >= 1) {
      renderPage(currentSlide);
    }
  }, [pdfDoc, currentSlide, renderPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-400 gap-3">
        <svg
          className="animate-spin w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        Loading presentation…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center w-full h-full"
    >
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full shadow-2xl rounded"
        style={{ display: "block" }}
      />
    </div>
  );
}
