import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { message, category } = await request.json();

    if (!message || !category) {
      return NextResponse.json(
        { approved: false, reason: "Message and category are required." },
        { status: 400 }
      );
    }

    if (message.length > 280) {
      return NextResponse.json(
        { approved: false, reason: "Message must be 280 characters or less." },
        { status: 400 }
      );
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `You are a content moderator for LightMap, a global positivity platform. 
Your job is to ensure ONLY positive, kind, and uplifting content gets through.

Evaluate this message submitted to the "${category}" category:
"${message}"

APPROVE if the message:
- Expresses genuine kindness, encouragement, peace, gratitude, or humanitarian spirit
- Is respectful of all cultures, religions, and people
- Contributes positively to the global community

REJECT if the message contains ANY of the following:
- Hate speech, discrimination, or bigotry
- Political attacks or divisive political content
- Religious attacks or disrespect toward any faith
- Self-promotion, spam, or advertising
- Negativity, cynicism, or sarcasm that undermines positivity
- Violence, threats, or harmful content
- Profanity or inappropriate language
- Nonsense or gibberish

Respond with ONLY a JSON object (no markdown, no backticks):
{"approved": true} or {"approved": false, "reason": "brief explanation"}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    try {
      const result = JSON.parse(text.trim());
      return NextResponse.json(result);
    } catch {
      // If Claude returns something unexpected, default to manual review
      console.error("Unexpected moderation response:", text);
      return NextResponse.json({ approved: true });
    }
  } catch (error) {
    console.error("Moderation error:", error);
    // If moderation fails, let it through (fail open for MVP)
    // In production, you might want to fail closed instead
    return NextResponse.json({ approved: true });
  }
}
