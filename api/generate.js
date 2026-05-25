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

  const { desc, platform, footage, otherText, vibe } = req.body || {};

  if (!desc || !String(desc).trim()) {
    return res.status(400).json({ error: "Missing shoot description." });
  }

  const PLATFORM_LABELS = {
    social: "Social vertical (Instagram Reels / TikTok / Shorts)",
    youtube: "YouTube",
    broadcast: "TV / broadcast / streaming",
    personal: "Personal / keepsake",
  };
  const FOOTAGE_LABELS = {
    interview: "Interview / talking head",
    broll: "B-roll / atmosphere",
    product: "Product or demo",
    event: "Event / live moment",
    story: "Short doc / story",
    other: "Other (see description)",
  };

  // Orientation guidance the model should follow per platform.
  const PLATFORM_ORIENTATION = {
    social: "Vertical (9:16) — these are watched full-screen on phones.",
    youtube: "Horizontal (16:9) — YouTube's player and most viewing is widescreen.",
    broadcast: "Horizontal (16:9) — TVs, cinema, and streaming players are all widescreen, so theatrical and broadcast delivery must be horizontal.",
    personal: "Your choice — decide from the description: vertical if it will mostly be watched and shared on phones, horizontal if it may be watched on a TV or computer or kept as a lasting memory. Recommend one and briefly explain the tradeoff.",
  };

  const platformLabel = PLATFORM_LABELS[platform] || platform || "general";
  const footageLabel =
    footage === "other" && otherText && String(otherText).trim()
      ? String(otherText).trim()
      : FOOTAGE_LABELS[footage] || footage || "general footage";
  const orientationGuide =
    PLATFORM_ORIENTATION[platform] ||
    "Choose the orientation that best fits how they intend to share it and say why.";

  const prompt = `You are an experienced documentary filmmaker creating a phone-filmmaking shot plan for a beginner. The user wants to shoot: "${desc}". Where it's going (distribution platform): ${platformLabel}. Kind of footage: ${footageLabel}. Desired vibe: ${vibe}.

Three things must genuinely shape your answer:
1. The VIBE ("${vibe}") should noticeably change the shots, framing, pacing, and settings — a "Cinematic & moody" plan should feel clearly different from an "Energetic & punchy" or "Clean & professional" one, not just reworded.
2. The PLATFORM (${platformLabel}) drives orientation and technical settings. Orientation guidance for this platform: ${orientationGuide}
3. The KIND OF FOOTAGE (${footageLabel}) drives the shot list and framing. If it is "Other", rely on the user's written description to infer what they're shooting.

Return ONLY valid JSON (no markdown, no backticks, no preamble) with this exact shape:
{
  "title": "a short punchy name for this shoot",
  "summary": "2 sentence overview of the approach, friendly and encouraging, reflecting the chosen vibe",
  "settings": {
    "orientation": "Vertical (9:16) or Horizontal (16:9)",
    "orientation_why": "one short, plain-language sentence on why this orientation fits the platform/use",
    "recommendations": [
      { "setting": "e.g. Resolution: 4K", "why": "one short sentence tying it to the vibe and/or platform, in plain language, never a rigid command" },
      { "setting": "e.g. Frame rate: 24fps", "why": "short why" }
    ]
  },
  "shots": [
    { "name": "shot name", "framing": "how to frame it on a phone, noting orientation where useful", "why": "one sentence on why it matters" }
  ],
  "lighting": ["3 to 4 concise, phone-specific lighting tips that suit the vibe"],
  "audio": ["2 to 3 simple audio tips that require NO change to phone settings — focus on getting the mic close to the sound, reducing wind/background noise, and recording a few seconds of room tone; never mention stereo, mono, or audio settings"],
  "gotcha": "one common beginner mistake to avoid for this kind of shoot"
}

For "settings.recommendations" give 2 to 3 items focused on resolution and frame rate, matching what the chosen platform recommends as best practice. On resolution, DEFAULT to recommending 4K — modern phones shoot it with a single tap and it is the better choice for quality and for footage worth keeping. Recommend 4K for YouTube, for TV / streaming / theatrical, and for personal keepsakes the person will want to rewatch in years to come. Only suggest 1080p as the primary choice for fast-turnaround social posting (Reels / TikTok / Shorts) where speed and small file size genuinely matter, and even then you may mention 4K as an option if their phone supports it. Do NOT use "keeps file sizes manageable" as the main reason to avoid 4K. On frame rate, match the platform and vibe (e.g. 24fps for a filmic feel, 30fps as a neutral default, 60fps for crisp action). Frame every setting as a recommendation WITH a short plain-language reason, never a rigid command. CRITICAL SIMPLICITY RULES: only recommend things a beginner can set with a single tap in their phone's normal camera app. Do NOT tell them to lock exposure, lock focus, shoot in stereo, change audio settings, enable manual/pro modes, or dive into menus. Keep their phone on its default audio. The goal is zero room for error.

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
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
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
    let text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .replace(/```json|```/g, "")
      .trim();

    // Be forgiving: if the model added any stray text before/after the JSON,
    // grab just the outermost { ... } object.
    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    }

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
