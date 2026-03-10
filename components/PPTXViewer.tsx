"use client";

import { useEffect, useState } from "react";

interface PPTXViewerProps {
  sessionId: string;
  currentSlide: number;
  onTotalSlides: (total: number) => void;
}

export default function PPTXViewer({
  sessionId,
  currentSlide,
  onTotalSlides,
}: PPTXViewerProps) {
  const [slides, setSlides] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [noThumbnails, setNoThumbnails] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const objectURLs: string[] = [];

    const load = async () => {
      try {
        const JSZip = (await import("jszip")).default;

        const response = await fetch(`/api/file/${sessionId}`);
        if (!response.ok) throw new Error("Failed to fetch file");

        const arrayBuffer = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        // Look for slide thumbnails (ppt/slides/thumbnails/slide*.png|jpg)
        const thumbnailEntries: { name: string; index: number }[] = [];
        zip.forEach((path) => {
          const match = path.match(
            /^ppt\/slides\/thumbnails\/slide(\d+)\.(png|jpg|jpeg)$/i
          );
          if (match) {
            thumbnailEntries.push({ name: path, index: parseInt(match[1]) });
          }
        });

        if (cancelled) return;

        if (thumbnailEntries.length > 0) {
          thumbnailEntries.sort((a, b) => a.index - b.index);

          const urls = await Promise.all(
            thumbnailEntries.map(async ({ name }) => {
              const file = zip.file(name);
              if (!file) return "";
              const blob = await file.async("blob");
              const url = URL.createObjectURL(blob);
              objectURLs.push(url);
              return url;
            })
          );

          if (!cancelled) {
            setSlides(urls);
            onTotalSlides(urls.length);
          }
        } else {
          // Count slide XML files to get total slide count
          let slideCount = 0;
          zip.forEach((path) => {
            if (/^ppt\/slides\/slide\d+\.xml$/i.test(path)) slideCount++;
          });

          if (!cancelled) {
            onTotalSlides(slideCount || 1);
            setNoThumbnails(true);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("PPTX load error:", err);
          setError("Failed to load presentation.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      objectURLs.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [sessionId, onTotalSlides]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-400 gap-3">
        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
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

  if (noThumbnails) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-4 p-8 text-center">
        <svg
          className="w-16 h-16 text-zinc-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="text-lg font-medium text-zinc-300">
          Slide preview unavailable
        </p>
        <p className="text-sm max-w-xs">
          This PPTX file doesn&apos;t include embedded thumbnails. For full
          slide previews, export your presentation as a{" "}
          <span className="text-indigo-400 font-medium">PDF</span>.
        </p>
        <p className="text-sm text-zinc-500">
          The remote control still works — use your phone to navigate slides.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slides[currentSlide - 1]}
        alt={`Slide ${currentSlide}`}
        className="max-w-full max-h-full object-contain shadow-2xl rounded"
      />
    </div>
  );
}
