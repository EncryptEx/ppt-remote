# SlideRemote

A web-based presentation remote control that lets you use any smartphone as a wireless clicker. Upload a PDF or PPTX, share the QR code, and navigate slides from your phone.

## Features

- 📤 **Upload** PDF or PPTX presentations (up to 50 MB)
- 📱 **QR code** generated instantly — scan with any phone
- 🖥️ **Presenter view** — full-screen slides with keyboard navigation
- 🎮 **Remote control** — large, touch-friendly prev/next buttons
- 👆 **Swipe gestures** — swipe left/right on the remote to change slides
- 🔄 **Real-time sync** — remote and presenter stay in sync via polling
- 🌑 **Dark, minimalist UI**

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. Go to the home page and upload a PDF or PPTX file.
2. A QR code and remote link will appear.
3. Scan the QR code with your phone (or open the remote link on any device).
4. Click **Open Presenter View** on the laptop/projector.
5. Use your phone as a wireless remote — tap Prev/Next or swipe left/right.

## Keyboard shortcuts (Presenter View)

| Key | Action |
|-----|--------|
| `→` / `Space` | Next slide |
| `←` | Previous slide |
| `F` | Toggle fullscreen |

## Deploying to Vercel

```bash
npx vercel
```

> **Note:** The default deployment uses in-memory storage. Sessions are isolated per serverless function instance, so for production with multiple instances, configure [Vercel KV](https://vercel.com/docs/storage/vercel-kv) for shared slide state.

## Tech Stack

- [Next.js 14](https://nextjs.org/) (App Router)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [PDF.js](https://mozilla.github.io/pdf.js/) — PDF rendering
- [JSZip](https://stuk.github.io/jszip/) — PPTX slide thumbnail extraction
- [qrcode](https://github.com/soldair/node-qrcode) — QR code generation
