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
        color: { dark: "#202020", light: "#ffffff" },
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
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        <div className="text-center bg-card border-2 border-border rounded-[var(--radius)] p-8 shadow-neo">
          <p className="text-lg font-bold text-foreground mb-2">Session not found</p>
          <p className="text-sm text-muted-foreground mb-4">This presentation may have expired.</p>
          <Link href="/" className="inline-block text-primary font-bold underline underline-offset-2 text-sm hover:opacity-80">← Back to home</Link>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <svg className="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col select-none overflow-hidden"
      onMouseMove={resetControlsTimer}
      onClick={resetControlsTimer}
    >
      {/* Slide area — always dark for best presentation visibility */}
      <div className="flex-1 relative bg-[#0a0a0a]" style={{ minHeight: 0 }}>
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
        className={`flex-shrink-0 flex items-center justify-between px-6 py-3 bg-card border-t-2 border-border transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        {/* File name */}
        <span className="text-sm text-muted-foreground font-medium truncate max-w-xs hidden sm:block">{session.fileName}</span>

        {/* Navigation */}
        <div className="flex items-center gap-4 mx-auto">
          <button
            onClick={() => navigate("prev")}
            disabled={currentSlide <= 1}
            className="p-2 rounded-[var(--radius)] hover:bg-secondary disabled:opacity-30 text-muted-foreground hover:text-foreground transition-colors border-2 border-transparent hover:border-border"
            aria-label="Previous slide"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="text-sm font-bold text-foreground tabular-nums w-20 text-center">
            {currentSlide} / {totalSlides || "—"}
          </span>

          <button
            onClick={() => navigate("next")}
            disabled={totalSlides > 0 && currentSlide >= totalSlides}
            className="p-2 rounded-[var(--radius)] hover:bg-secondary disabled:opacity-30 text-muted-foreground hover:text-foreground transition-colors border-2 border-transparent hover:border-border"
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
            className="p-2 rounded-[var(--radius)] hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border-2 border-transparent hover:border-border"
            title="Show QR code for remote"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8H3a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2v-8a2 2 0 00-2-2h-2" />
            </svg>
          </button>
          <button
            onClick={() => document.documentElement.requestFullscreen?.()}
            className="p-2 rounded-[var(--radius)] hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors border-2 border-transparent hover:border-border hidden sm:flex"
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
          className="fixed inset-0 bg-foreground/40 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-card border-2 border-border rounded-[var(--radius)] p-6 flex flex-col items-center gap-4 shadow-neo"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-bold text-foreground">Scan to open the remote</p>
            {qrDataUrl && (
              <div className="bg-white border-2 border-foreground rounded-[var(--radius)] p-3 shadow-neo-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="Remote QR" width={180} height={180} />
              </div>
            )}
            <p className="text-xs text-muted-foreground font-mono">{typeof window !== "undefined" ? `${window.location.origin}/remote/${id}` : ""}</p>
            <button
              onClick={() => setShowQR(false)}
              className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors border-2 border-border px-3 py-1 rounded-[var(--radius)] hover:bg-secondary"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
