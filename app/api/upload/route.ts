import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { sessions, cleanupSessions } from "@/lib/store";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
  try {
    cleanupSessions();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const lowerName = file.name.toLowerCase();
    const fileType = lowerName.endsWith(".pdf")
      ? "pdf"
      : lowerName.endsWith(".pptx")
      ? "pptx"
      : null;

    if (!fileType) {
      return NextResponse.json(
        { error: "Only PDF and PPTX files are supported" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50 MB." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const id = uuidv4();

    sessions.set(id, {
      id,
      fileName: file.name,
      fileType,
      fileData: buffer,
      currentSlide: 1,
      totalSlides: 0,
      createdAt: Date.now(),
    });

    return NextResponse.json({ id, fileType, fileName: file.name });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
