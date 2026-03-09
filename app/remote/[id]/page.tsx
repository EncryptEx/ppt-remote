"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface SlideState {
  currentSlide: number;
  totalSlides: number;
}

export default function RemotePage() {
  const { id } = useParams<{ id: string }>();
  const [slide, setSlide] = useState<SlideState>({ currentSlide: 1, totalSlides: 0 });
  const [fileName, setFileName] = useState<string>("");
  const [notFound, setNotFound] = useState(false);
  const [sending, setSending] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Load session metadata
  useEffect(() => {
    if (!id) return;
    fetch(`/api/session/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setFileName(data.fileName);
          setSlide({ currentSlide: data.currentSlide, totalSlides: data.totalSlides });
        }
      })
      .catch(console.error);
  }, [id]);

  // Poll slide state
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/slide/${id}`);
        if (!r.ok) return;
        const data = await r.json();
        setSlide(data);
      } catch { /* ignore */ }
    }, 600);
    return () => clearInterval(interval);
  }, [id]);

  const sendAction = useCallback(async (action: "next" | "prev") => {
    if (sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/slide/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!r.ok) return;
      const data = await r.json();
      setSlide(data);
    } catch { /* ignore */ }
    finally { setSending(false); }
  }, [id, sending]);

  // Touch swipe support
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) sendAction("next");
    else sendAction("prev");
  };

  const isFirst = slide.currentSlide <= 1;
  const isLast = slide.totalSlides > 0 && slide.currentSlide >= slide.totalSlides;

  if (notFound) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 px-6">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Session not found</p>
          <p className="text-sm text-zinc-600">This presentation may have expired.</p>
          <Link href="/" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300 text-sm">← Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col select-none"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/60">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{fileName || "Presentation"}</p>
          <p className="text-xs text-zinc-600">Remote control</p>
        </div>
      </div>

      {/* Slide counter */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
        <div className="text-center">
          <p className="text-7xl font-bold tabular-nums text-zinc-100">{slide.currentSlide}</p>
          {slide.totalSlides > 0 && (
            <p className="text-lg text-zinc-500 mt-2">of {slide.totalSlides}</p>
          )}
        </div>

        {/* Progress bar */}
        {slide.totalSlides > 0 && (
          <div className="w-full max-w-xs h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${(slide.currentSlide / slide.totalSlides) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="px-6 pb-10 pt-6 flex gap-4">
        <button
          onClick={() => sendAction("prev")}
          disabled={isFirst || sending}
          className={`flex-1 py-6 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition-all active:scale-95
            ${isFirst
              ? "bg-zinc-800/40 text-zinc-600 cursor-not-allowed"
              : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 shadow-lg"}`}
          aria-label="Previous slide"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>

        <button
          onClick={() => sendAction("next")}
          disabled={isLast || sending}
          className={`flex-1 py-6 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 transition-all active:scale-95
            ${isLast
              ? "bg-zinc-800/40 text-zinc-600 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40"}`}
          aria-label="Next slide"
        >
          Next
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Swipe hint */}
      <p className="text-center text-xs text-zinc-700 pb-6">Swipe left / right to navigate</p>
    </div>
  );
}
