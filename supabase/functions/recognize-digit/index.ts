import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser, UPSTREAM_TIMEOUT_MS } from "../_shared/requireUser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// A child's drawing is a few tens of KB; anything far bigger is not from the app.
const MAX_IMAGE_BASE64_LENGTH = 2_000_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!(await requireUser(req))) return json({ error: "Unauthorized" }, 401);

    const { imageBase64, target } = await req.json();

    if (typeof imageBase64 !== "string" || !imageBase64 || typeof target !== "number") {
      return json({ error: "Missing imageBase64 or target" }, 400);
    }
    if (imageBase64.length > MAX_IMAGE_BASE64_LENGTH) {
      return json({ error: "Image too large" }, 413);
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 50,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: `You are a handwriting recognition system for a children's educational app. A child (age 5-8) wrote a whole number (0-100) with their finger. The image shows it in black on white, cropped to what they drew. Children's handwriting is messy - be generous in your interpretation.

Rules:
- Respond with ONLY a JSON object: {"recognized": <number>}
- If you can identify a number, return it even if it's messy, wobbly, tilted or unevenly sized
- Several digits written next to each other are one number: "1" and "0" side by side is 10, "4" and "7" is 47. Digits may be far apart or touching
- A single straight stroke, with or without a small flag at the top, is 1. Only read 7 when there is a clear horizontal bar at the top
- Mirrored digits (a backwards 2, 3, 5, 7 or 9) are common at this age: read them as the digit they mirror
- A loop that is not quite closed is still a 0, 6, 8 or 9
- If the drawing is completely unrecognizable as any number, return {"recognized": null}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", errText);
      throw new Error(`AI API returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text?.trim() ?? "";

    // Parse the JSON from the response
    let recognized: number | null = null;
    try {
      const jsonMatch = content.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // The model sometimes answers "7" instead of 7; a strict === would
        // then turn a correct answer into "ik zie 7, maar we zoeken 7".
        const value = Number(parsed.recognized);
        recognized = parsed.recognized !== null && Number.isInteger(value) ? value : null;
      }
    } catch {
      console.error("Failed to parse AI response:", content);
    }

    const isCorrect = recognized !== null && recognized === target;

    return new Response(
      JSON.stringify({ recognized, target, isCorrect }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in recognize-digit:", error);
    return json({ error: "Recognition failed" }, 500);
  }
});
