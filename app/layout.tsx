import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SlideRemote — Present from your phone",
  description:
    "Upload a PDF or PPTX presentation, share the QR code, and control your slides wirelessly from any phone.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
