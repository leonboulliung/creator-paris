import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { normalizeTags } from "@/lib/vibe";

// One draft per user per 30 seconds — protects against bot-spam and accidental
// fast double-clicks while the user is figuring out what to type. Process-local
// map; on Vercel each instance has its own — fine for the volumes we expect.
const lastDraftAt = new Map<string, number>();
const RATE_WINDOW_MS = 30_000;

const SYSTEM_PROMPT = `You translate one user sentence describing something they
want to do in Paris into a structured event card. Return STRICT JSON only.

Schema:
- title (string, 4-60 chars): editorial, concrete, not a question. No echoing of
  the location or time inside the title.
- description (string, 0-160 chars): optional, only when input gives detail.
- tags (array of 2-5 strings): lowercase, hyphenated, single-concept each
  (e.g. "fashion-shoot", "modeling", "avant-garde", "le-marais"). Letters,
  numbers, hyphens only. No leading "#".
- locationQuery (string|null): a Paris neighborhood, street, or landmark
  the user mentioned. Null if not present. Keep it short — what you'd type
  into a map search.
- startsAtIso (string|null): ISO 8601 in Europe/Paris timezone. Interpret
  natural phrases like "tomorrow 7pm", "next saturday at 4pm" relative to
  the current Paris time, which is provided. Null if absent or ambiguous.
- spots (integer 2-12): infer from context. "Small group" 3, "open invite" 6.
  Default 4 if unstated.
- permission ("public"|"request"): default "public" unless the user implies
  hand-picking or vetting attendees.
- color (string|null): a 6-digit hex like "#a83a73", chosen to complement
  the activity vibe (warm reds for performance, blues for talks, greens for
  walks). Null if no clear vibe.

Rules:
- Never invent specifics the user didn't say.
- If unclear, prefer null over a guess.
- Output ONLY the JSON object — no preamble, no prose.`;

function parsisNowIso(): string {
  // We give the LLM the *Paris-local* wall time so its "tomorrow" math
  // anchors correctly without us having to teach it our timezone.
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Paris",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  })
    .format(new Date())
    .replace(" ", "T") + " Europe/Paris";
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
  }

  const now = Date.now();
  const last = lastDraftAt.get(userId) || 0;
  if (now - last < RATE_WINDOW_MS) {
    const retryIn = Math.ceil((RATE_WINDOW_MS - (now - last)) / 1000);
    return NextResponse.json(
      { error: "rate_limited", retryInSeconds: retryIn },
      { status: 429 },
    );
  }
  lastDraftAt.set(userId, now);

  const body = await req.json().catch(() => ({}));
  const promptRaw = String(body?.prompt || "").trim();
  if (promptRaw.length < 8) {
    return NextResponse.json({ error: "prompt_too_short" }, { status: 400 });
  }
  const prompt = promptRaw.slice(0, 500);

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.5,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Paris-local time is: ${parsisNowIso()}\n\nInput:\n"""${prompt}"""`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "draft_unparseable" }, { status: 500 });
    }

    const draft = sanitize(parsed);
    return NextResponse.json({ ok: true, draft });
  } catch (e) {
    const msg = (e as Error).message || "unknown";
    return NextResponse.json({ error: "draft_failed", detail: msg }, { status: 502 });
  }
}

function sanitize(d: Record<string, unknown>) {
  const title = typeof d.title === "string" ? d.title.trim().slice(0, 80) : "";
  const description = typeof d.description === "string" ? d.description.trim().slice(0, 240) : "";
  const tags = normalizeTags(d.tags, 5);
  const locationQuery =
    typeof d.locationQuery === "string" && d.locationQuery.trim().length > 0
      ? d.locationQuery.trim().slice(0, 100)
      : null;

  let startsAtIso: string | null = null;
  if (typeof d.startsAtIso === "string") {
    const t = Date.parse(d.startsAtIso);
    if (Number.isFinite(t)) startsAtIso = new Date(t).toISOString();
  }

  const spotsRaw = typeof d.spots === "number" ? d.spots : 4;
  const spots = Math.max(2, Math.min(12, Math.round(spotsRaw)));

  const permission = d.permission === "request" ? "request" : "public";

  const color =
    typeof d.color === "string" && /^#[0-9a-fA-F]{6}$/.test(d.color)
      ? d.color.toLowerCase()
      : null;

  return { title, description, tags, locationQuery, startsAtIso, spots, permission, color };
}
