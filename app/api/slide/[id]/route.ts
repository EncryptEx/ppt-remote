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
    currentSlide: session.currentSlide,
    totalSlides: session.totalSlides,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = sessions.get(id);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const body = await request.json();
  const { action, slide } = body as {
    action?: "next" | "prev";
    slide?: number;
  };

  if (action === "next") {
    if (session.totalSlides === 0 || session.currentSlide < session.totalSlides) {
      session.currentSlide += 1;
    }
  } else if (action === "prev") {
    if (session.currentSlide > 1) {
      session.currentSlide -= 1;
    }
  } else if (
    typeof slide === "number" &&
    slide >= 1 &&
    (session.totalSlides === 0 || slide <= session.totalSlides)
  ) {
    session.currentSlide = slide;
  }

  return NextResponse.json({
    currentSlide: session.currentSlide,
    totalSlides: session.totalSlides,
  });
}
