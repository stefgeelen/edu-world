import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

    // Use Gemini via the Lovable AI proxy
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
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
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 50,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI API error:", errText);
      throw new Error(`AI API returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";

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
