import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { normalizeTags } from "@/lib/vibe";

// One draft per user per 30 seconds — protects against bot-spam and accidental
// fast double-clicks while the user is figuring out what to type. Process-local
// map; on Vercel each instance has its own — fine for the volumes we expect.
const lastDraftAt = new Map<string, number>();
const RATE_WINDOW_MS = 30_000;

/**
 * The system prompt. Key design decision: when the input doesn't explicitly
 * mention a value, return null and add the field name to `inferred`. The UI
 * surfaces "✦ AI guessed" next to those fields so the user knows what to
 * double-check. We'd rather have a half-filled form than a silently wrong one.
 */
const SYSTEM_PROMPT = `You translate one user sentence describing something they
want to do in Paris into a structured event card. Return STRICT JSON only.

You must produce these fields. Use null where the input is genuinely silent
on the matter — DO NOT make up specifics. List every field whose value you
inferred (rather than directly extracted from the input) in the "inferred"
array; this is critical, the user needs to know what to double-check.

Schema:
- title (string, 4-60 chars): editorial, concrete, not a question. Do NOT
  echo the location or time inside the title.
- description (string|null, 0-160 chars): only when the input gives detail
  worth keeping. Otherwise null.
- tags (array of 2-5 strings): lowercase, single-concept, hyphenated. Letters,
  numbers, hyphens only. No leading "#". Tags ARE allowed to be inferred
  from the activity vibe — always produce 2-5.
- locationQuery (string|null): a Paris neighborhood, street, address, or
  landmark the user mentioned. IMPORTANT:
    • Keep the user's natural phrasing — use spaces, not hyphens.
    • If the user named multiple places (a route like "Eiffel Tower to
      Sacre Coeur"), return the FIRST/starting place.
    • If the user only named a body of water ("the Seine"), a vague region
      ("central Paris"), or no place at all, return null.
- startsAtIso (string|null): ISO 8601 in Europe/Paris timezone. Interpret
  natural phrases like "tomorrow 7pm", "next saturday at 4pm" relative to
  the current Paris time, which is provided in the user turn. Null if absent
  or ambiguous ("sometime soon" → null).
- endsAtIso (string|null): ISO 8601 in Europe/Paris timezone. Set ONLY when
  the input gives explicit duration ("for 2 hours", "all afternoon", "until
  midnight"). Compute as startsAtIso + duration. Null otherwise.
- spots (integer 2-12 | null): how many people the creator wants. Set ONLY
  when the input has a number ("looking for 2 more" → 3 total including
  creator), an explicit phrase ("solo plus one" → 2), or strong context
  ("open invite", "small group"). Null otherwise — do NOT default to 4.
- permission ("public"|"request"|null): "request" only when the input
  implies vetting ("DM me if interested", "send your portfolio", "approval
  needed"). "public" when explicitly open. Null when unclear.
- color (string|null): a 6-digit hex like "#a83a73", chosen to complement
  the activity vibe. Null if no clear vibe — color is decorative.
- externalUrl (string|null): a URL in the input. Otherwise null.

- inferred (array of strings): names of fields where you guessed rather than
  extracted. Always include "tags" if you generated tags from vibe instead
  of input. Always include "color" if you picked a hex. Include any other
  field where you applied judgement rather than reading the input verbatim.

Rules:
- Never invent specifics the user didn't say.
- Prefer null over a guess for spots, permission, locationQuery, startsAtIso,
  endsAtIso, externalUrl.
- For tags + color it's ok to infer — but always list them in "inferred".
- Output ONLY the JSON object — no preamble, no prose.`;

function parisNowIso(): string {
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
      temperature: 0.4,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Paris-local time is: ${parisNowIso()}\n\nInput:\n"""${prompt}"""`,
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

const URL_RE = /^https?:\/\/[^\s]+$/i;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function sanitize(d: Record<string, unknown>) {
  const title = typeof d.title === "string" ? d.title.trim().slice(0, 80) : "";
  const description =
    typeof d.description === "string" && d.description.trim().length > 0
      ? d.description.trim().slice(0, 240)
      : null;
  const tags = normalizeTags(d.tags, 5);

  const locationQuery =
    typeof d.locationQuery === "string" && d.locationQuery.trim().length > 0
      ? d.locationQuery.trim().slice(0, 100)
      : null;

  const startsAtIso = isoOrNull(d.startsAtIso);
  const endsAtIso = isoOrNull(d.endsAtIso);

  let spots: number | null = null;
  if (typeof d.spots === "number" && Number.isFinite(d.spots)) {
    spots = Math.max(2, Math.min(12, Math.round(d.spots)));
  }

  let permission: "public" | "request" | null = null;
  if (d.permission === "public" || d.permission === "request") permission = d.permission;

  const color = typeof d.color === "string" && HEX_RE.test(d.color)
    ? d.color.toLowerCase()
    : null;

  const externalUrl =
    typeof d.externalUrl === "string" && URL_RE.test(d.externalUrl.trim())
      ? d.externalUrl.trim().slice(0, 500)
      : null;

  // `inferred` is the list of field names that were AI-guessed (not directly
  // extracted). Filter to only known fields, dedupe.
  const KNOWN = new Set([
    "title", "description", "tags", "locationQuery",
    "startsAtIso", "endsAtIso", "spots", "permission", "color", "externalUrl",
  ]);
  const inferred = Array.isArray(d.inferred)
    ? Array.from(new Set(
        d.inferred
          .filter((v): v is string => typeof v === "string")
          .filter((v) => KNOWN.has(v)),
      ))
    : [];

  return {
    title,
    description,
    tags,
    locationQuery,
    startsAtIso,
    endsAtIso,
    spots,
    permission,
    color,
    externalUrl,
    inferred,
  };
}

function isoOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = Date.parse(v);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString();
}
