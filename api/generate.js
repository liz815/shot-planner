// Vercel serverless function.
// This runs on the SERVER, so your API key stays secret here —
// it is never sent to the visitor's browser.

export default async function handler(req, res) {
  // Only allow POST requests.
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "Server is missing its API key. Check Vercel settings." });
  }

  const { desc, shotType, vibe } = req.body || {};

  if (!desc || !String(desc).trim()) {
    return res.status(400).json({ error: "Missing shoot description." });
  }

  const SHOT_LABELS = {
    interview: "Interview / talking head",
    broll: "B-roll / atmosphere",
    product: "Product or demo",
    event: "Event / live moment",
    story: "Short doc / story",
    reel: "Instagram / Facebook reel",
    tiktok: "TikTok",
  };
  const typeLabel = SHOT_LABELS[shotType] || shotType || "general";

  const prompt = `You are an experienced documentary filmmaker creating a phone-filmmaking shot plan for a beginner. The user wants to shoot: "${desc}". Shot category: ${typeLabel}. Desired vibe: ${vibe}.

Return ONLY valid JSON (no markdown, no backticks, no preamble) with this exact shape:
{
  "title": "a short punchy name for this shoot",
  "summary": "2 sentence overview of the approach, friendly and encouraging",
  "shots": [
    { "name": "shot name", "framing": "how to frame it on a phone", "why": "one sentence on why it matters" }
  ],
  "lighting": ["3 to 4 concise, phone-specific lighting tips"],
  "audio": ["2 to 3 concise audio tips for phone shooting"],
  "gotcha": "one common beginner mistake to avoid for this kind of shoot"
}
Give 4 to 6 shots. Keep everything practical and specific to shooting on a phone. No fluff.`;

  try {
    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!apiRes.ok) {
      const detail = await apiRes.text();
      console.error("Anthropic API error:", apiRes.status, detail);
      return res
        .status(502)
        .json({ error: "The plan generator is having trouble right now." });
    }

    const data = await apiRes.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .replace(/```json|```/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      console.error("Could not parse model output:", text);
      return res
        .status(502)
        .json({ error: "Got an unexpected response. Please try again." });
    }

    return res.status(200).json(parsed);
  } catch (e) {
    console.error("Server error:", e);
    return res
      .status(500)
      .json({ error: "Something went wrong on the server. Try again shortly." });
  }
}
