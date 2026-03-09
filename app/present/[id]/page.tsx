"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

const PDFViewer = dynamic(() => import("@/components/PDFViewer"), { ssr: false });
const PPTXViewer = dynamic(() => import("@/components/PPTXViewer"), { ssr: false });

interface SessionInfo {
  id: string;
  fileName: string;
  fileType: "pdf" | "pptx";
  currentSlide: number;
  totalSlides: number;
}

export default function PresentPage() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(0);
  const [notFound, setNotFound] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localSlideRef = useRef(1);

  // Auto-hide controls after inactivity
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  // Load session info
  useEffect(() => {
    if (!id) return;
    fetch(`/api/session/${id}`)
      .then((r) => {
        if (r.status === 404) { setNotFound(true); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setSession(data);
      })
      .catch(console.error);
  }, [id]);

  // Generate QR code
  useEffect(() => {
    if (!id) return;
    const generate = async () => {
      const QRCode = (await import("qrcode")).default;
      const url = `${window.location.origin}/remote/${id}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 180,
        margin: 1,
        color: { dark: "#111827", light: "#ffffff" },
      });
      setQrDataUrl(dataUrl);
    };
    generate();
  }, [id]);

  // Poll slide state from remote
  useEffect(() => {
    if (!id) return;
    pollingRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/slide/${id}`);
        if (!r.ok) return;
        const data = await r.json();
        if (data.currentSlide !== localSlideRef.current) {
          localSlideRef.current = data.currentSlide;
          setCurrentSlide(data.currentSlide);
        }
      } catch { /* ignore */ }
    }, 600);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [id]);

  // Keyboard navigation
  const navigate = useCallback(async (action: "next" | "prev") => {
    resetControlsTimer();
    try {
      const r = await fetch(`/api/slide/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!r.ok) return;
      const data = await r.json();
      localSlideRef.current = data.currentSlide;
      setCurrentSlide(data.currentSlide);
    } catch { /* ignore */ }
  }, [id, resetControlsTimer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        navigate("next");
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        navigate("prev");
      } else if (e.key === "f" || e.key === "F") {
        document.documentElement.requestFullscreen?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  useEffect(() => {
    resetControlsTimer();
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
  }, [resetControlsTimer]);

  const handleTotalSlides = useCallback(async (total: number) => {
    setTotalSlides(total);
    if (!id || total === 0) return;
    try {
      await fetch(`/api/session/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalSlides: total }),
      });
    } catch { /* ignore */ }
  }, [id]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Session not found</p>
          <p className="text-sm text-zinc-600">This presentation may have expired.</p>
          <Link href="/" className="mt-4 inline-block text-indigo-400 hover:text-indigo-300 text-sm">← Back to home</Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className="h-screen bg-zinc-950 flex flex-col select-none overflow-hidden"
      onMouseMove={resetControlsTimer}
      onClick={resetControlsTimer}
    >
      {/* Slide area — fills all available height above the controls bar */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <div className="absolute inset-0">
          {session.fileType === "pdf" ? (
            <PDFViewer sessionId={id} currentSlide={currentSlide} onTotalSlides={handleTotalSlides} />
          ) : (
            <PPTXViewer sessionId={id} currentSlide={currentSlide} onTotalSlides={handleTotalSlides} />
          )}
        </div>
      </div>

      {/* Controls bar (auto-hides) */}
      <div
        className={`flex-shrink-0 flex items-center justify-between px-6 py-3 bg-zinc-900/90 border-t border-zinc-800 backdrop-blur transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        {/* File name */}
        <span className="text-sm text-zinc-500 truncate max-w-xs hidden sm:block">{session.fileName}</span>

        {/* Navigation */}
        <div className="flex items-center gap-4 mx-auto">
          <button
            onClick={() => navigate("prev")}
            disabled={currentSlide <= 1}
            className="p-2 rounded-lg hover:bg-zinc-800 disabled:opacity-30 text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label="Previous slide"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="text-sm font-medium text-zinc-300 tabular-nums w-20 text-center">
            {currentSlide} / {totalSlides || "—"}
          </span>

          <button
            onClick={() => navigate("next")}
            disabled={totalSlides > 0 && currentSlide >= totalSlides}
            className="p-2 rounded-lg hover:bg-zinc-800 disabled:opacity-30 text-zinc-400 hover:text-zinc-200 transition-colors"
            aria-label="Next slide"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQR((v) => !v)}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Show QR code for remote"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8H3a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2v-8a2 2 0 00-2-2h-2" />
            </svg>
          </button>
          <button
            onClick={() => document.documentElement.requestFullscreen?.()}
            className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors hidden sm:flex"
            title="Fullscreen (F)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>

      {/* QR overlay */}
      {showQR && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 flex flex-col items-center gap-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-medium text-zinc-300">Scan to open the remote</p>
            {qrDataUrl && (
              <div className="bg-white rounded-xl p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Remote QR" width={180} height={180} />
              </div>
            )}
            <p className="text-xs text-zinc-600 font-mono">{typeof window !== "undefined" ? `${window.location.origin}/remote/${id}` : ""}</p>
            <button
              onClick={() => setShowQR(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
