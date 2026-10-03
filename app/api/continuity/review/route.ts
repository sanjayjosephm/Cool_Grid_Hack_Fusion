import { NextResponse } from "next/server";
import { reviewPacket, validateReviewPacket } from "../../../../lib/continuity";
import { renderReviewBrief } from "../../../../lib/brief";

/** Stateless review: no fetching, persistence, exports or payload logging. */
export async function POST(request: Request): Promise<NextResponse> {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ errors: [{ path: "$", message: "Invalid JSON syntax" }] }, { status: 400 });
  }
  const validation = validateReviewPacket(input);
  if (!validation.valid) return NextResponse.json({ errors: validation.errors }, { status: 422 });
  const result = reviewPacket(validation.packet);
  return NextResponse.json({ result, briefMarkdown: renderReviewBrief(result) });
}
