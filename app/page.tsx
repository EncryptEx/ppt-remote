"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface UploadResult {
  id: string;
  fileType: string;
  fileName: string;
  remoteUrl: string;
  presenterUrl: string;
  qrDataUrl: string;
}

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [copied, setCopied] = useState(false);

  const processFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);

    const name = file.name.toLowerCase();
    if (!name.endsWith(".pdf") && !name.endsWith(".pptx")) {
      setError("Please upload a PDF or PPTX file.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File too large. Maximum size is 50 MB.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload failed");
      }

      const data = await res.json();
      const origin = window.location.origin;
      const remoteUrl = `${origin}/remote/${data.id}`;
      const presenterUrl = `${origin}/present/${data.id}`;

      const QRCode = (await import("qrcode")).default;
      const qrDataUrl = await QRCode.toDataURL(remoteUrl, {
        width: 240,
        margin: 2,
        color: { dark: "#111827", light: "#ffffff" },
      });

      setResult({ id: data.id, fileType: data.fileType, fileName: data.fileName, remoteUrl, presenterUrl, qrDataUrl });
    } catch (err) {
      setError((err as Error).message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const copyLink = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/60 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
            </svg>
          </div>
          <span className="font-semibold text-lg tracking-tight">SlideRemote</span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl">
          {!result ? (
            <>
              <div className="text-center mb-10">
                <h1 className="text-4xl font-bold tracking-tight mb-3">Present from your phone</h1>
                <p className="text-zinc-400 text-lg">
                  Upload a presentation, scan the QR code, and control your slides remotely.
                </p>
              </div>

              {/* Drop zone */}
              <div
                role="button"
                tabIndex={0}
                onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                className={`relative border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200 outline-none
                  ${isDragging ? "border-indigo-500 bg-indigo-950/30" : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/50"}`}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.pptx" onChange={handleFileChange} className="hidden" />

                {uploading ? (
                  <div className="flex flex-col items-center gap-4">
                    <svg className="animate-spin w-10 h-10 text-indigo-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-zinc-400">Uploading…</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                      <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-lg font-medium text-zinc-200">Drop your file here</p>
                      <p className="text-zinc-500 mt-1">or <span className="text-indigo-400 font-medium">click to browse</span></p>
                    </div>
                    <p className="text-sm text-zinc-600">PDF or PPTX · Max 50 MB</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-950/50 border border-red-800 text-red-300 text-sm">{error}</div>
              )}

              {/* Feature hints */}
              <div className="mt-10 grid grid-cols-3 gap-6 text-center">
                {[
                  { emoji: "📤", title: "Upload", desc: "PDF or PPTX files" },
                  { emoji: "📱", title: "Scan", desc: "QR code with your phone" },
                  { emoji: "▶️", title: "Control", desc: "Navigate slides remotely" },
                ].map(({ emoji, title, desc }) => (
                  <div key={title} className="flex flex-col items-center gap-2">
                    <span className="text-2xl">{emoji}</span>
                    <p className="text-sm font-medium text-zinc-300">{title}</p>
                    <p className="text-xs text-zinc-600">{desc}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            /* Success state */
            <div>
              <div className="flex items-center gap-2 mb-8">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-emerald-400 font-medium">Ready to present</span>
                <span className="text-zinc-600 text-sm ml-1 truncate max-w-xs">· {result.fileName}</span>
              </div>

              <div className="grid gap-6 md:grid-cols-[auto_1fr]">
                {/* QR Code */}
                <div className="flex flex-col items-center gap-3">
                  <div className="bg-white rounded-2xl p-3 shadow-lg">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={result.qrDataUrl} alt="QR code for remote control" width={200} height={200} />
                  </div>
                  <p className="text-xs text-zinc-500 text-center">Scan with your phone<br />to open the remote</p>
                </div>

                {/* Links & actions */}
                <div className="flex flex-col gap-4 justify-center">
                  <div>
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
                      Remote control link
                    </label>
                    <div className="flex gap-2">
                      <input readOnly value={result.remoteUrl}
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none font-mono truncate min-w-0" />
                      <button onClick={() => copyLink(result.remoteUrl)}
                        className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm transition-colors flex-shrink-0"
                        title="Copy link">
                        {copied
                          ? <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 pt-4 flex flex-col gap-3">
                    <button onClick={() => router.push(result.presenterUrl)}
                      className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors">
                      Open Presenter View →
                    </button>
                    <button onClick={() => { setResult(null); setError(null); }}
                      className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-sm transition-colors">
                      Upload another file
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-zinc-800/60 px-6 py-4">
        <p className="text-center text-xs text-zinc-700">
          Files are stored in memory and expire after 2 hours.
        </p>
      </footer>
    </div>
  );
}
