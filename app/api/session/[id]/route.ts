import { NextRequest, NextResponse } from "next/server";
import { sessions } from "@/lib/store";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = sessions.get(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: session.id,
    fileName: session.fileName,
    fileType: session.fileType,
    currentSlide: session.currentSlide,
    totalSlides: session.totalSlides,
  });
}

/** Called by the presenter once the file is loaded to set the slide count. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = sessions.get(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body = await request.json();
  if (typeof body.totalSlides === "number" && body.totalSlides > 0) {
    session.totalSlides = body.totalSlides;
  }

  return NextResponse.json({ success: true });
}
