import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const MODEL = "claude-sonnet-5-5";
const MAX_CONTEXT = 20000;
const MAX_PROMPT = 2000;
const MAX_TOKENS = 1500;

const ACTIONS = {
  summarize:
    "Summarize the board content below in a short paragraph or two. Put 3-6 key takeaways in `items`.",
  cluster:
    "Group the board content below into 2-6 themes. In `text`, briefly describe the clustering. In `items`, give one entry per theme formatted as `Theme name: idea, idea, idea`.",
  brainstorm:
    "Brainstorm 5-10 fresh, concrete ideas that build on the board content below. In `text`, give a one-sentence framing. In `items`, give one idea per entry.",
  actions:
    "Extract concrete action items from the board content below. In `text`, give a one-sentence overview. In `items`, give one actionable task per entry, starting with a verb.",
  custom:
    "Follow the user's instruction using the board content below. Put the answer in `text`; if the answer is naturally a list, also put each entry in `items`.",
};

const SYSTEM =
  "You are an assistant embedded in a whiteboard app. You read the text of sticky notes, to-dos, tables and other cards the user connected to you. " +
  "Respond in the language of the content. Keep `text` concise plain prose (short paragraphs; '- ' bullets allowed). " +
  "Each entry in `items` is a single short line suitable for a sticky note, without bullets or numbering. Use an empty `items` array when there is no list.";

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    text: { type: "string" },
    items: { type: "array", items: { type: "string" } },
  },
  required: ["text", "items"],
  additionalProperties: false,
};

const json = (body, status = 200) => NextResponse.json(body, { status });

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: "AI is not configured. Add ANTHROPIC_API_KEY to .env" }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const action = Object.hasOwn(ACTIONS, body?.action) ? body.action : null;
  if (!action) return json({ error: "Unknown action" }, 400);
  const prompt = String(body?.prompt ?? "").trim().slice(0, MAX_PROMPT);
  if (action === "custom" && !prompt) return json({ error: "Write a prompt first" }, 400);
  const context = String(body?.context ?? "").trim().slice(0, MAX_CONTEXT);
  if (!context && action !== "custom") return json({ error: "Connect some notes to the AI node first" }, 400);

  const userText = [
    ACTIONS[action],
    action === "custom" ? `<instruction>\n${prompt}\n</instruction>` : null,
    `<board_content>\n${context || "(no connected content)"}\n</board_content>`,
  ]
    .filter(Boolean)
    .join("\n\n");

  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "server-side-fallback-2026-07-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM,
        messages: [{ role: "user", content: userText }],
        output_config: { effort: "low", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
        fallbacks: "default",
      }),
      signal: AbortSignal.timeout(90_000),
    });
  } catch (e) {
    console.error("[api/ai/node] request failed:", e?.name);
    return json({ error: "Couldn't reach the AI service. Try again." }, 502);
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    console.error("[api/ai/node] upstream error:", res.status, payload?.error?.type);
    const status = res.status === 429 ? 429 : 502;
    return json({ error: payload?.error?.message || `AI request failed (${res.status})` }, status);
  }

  if (payload?.stop_reason === "refusal") return json({ error: "The AI declined this request." }, 422);

  const raw = (payload?.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  try {
    const parsed = JSON.parse(raw);
    const items = Array.isArray(parsed.items)
      ? parsed.items.map((s) => String(s).trim()).filter(Boolean).slice(0, 30)
      : [];
    return json({ text: String(parsed.text ?? "").trim(), items });
  } catch {
    // Truncated (max_tokens) or malformed JSON: fall back to the raw text.
    if (!raw.trim()) return json({ error: "The AI returned an empty response." }, 502);
    return json({ text: raw.trim(), items: [] });
  }
}
