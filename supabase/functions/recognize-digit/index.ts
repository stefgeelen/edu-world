import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, target } = await req.json();

    if (!imageBase64 || target === undefined) {
      return new Response(JSON.stringify({ error: "Missing imageBase64 or target" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
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
                text: `You are a handwriting recognition system for a children's educational app. A child (age 5-7) has drawn a number on a canvas. Look at the image and determine what single number (1-10) they wrote. Children's handwriting may be messy or imperfect - be generous in your interpretation.

Rules:
- Respond with ONLY a JSON object: {"recognized": <number>}
- If you can identify a number, return it even if it's messy
- The number should be between 1 and 10
- If the drawing is completely unrecognizable as any number, return {"recognized": null}
- "10" is two digits written together
- Be lenient - children's handwriting is imperfect`,
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
        recognized = parsed.recognized;
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
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
