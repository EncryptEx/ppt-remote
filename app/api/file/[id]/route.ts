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

  const contentType =
    session.fileType === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.presentationml.presentation";

  return new NextResponse(new Uint8Array(session.fileData), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(session.fileName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
