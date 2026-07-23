import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Voice + model are read from environment variables so you can swap the voice
// (paste the ID straight from your ElevenLabs dashboard) without redeploying
// code. Defaults are chosen to work on the FREE tier via the API.
//
// NOTE: the previous default ("ANHrhmaFeVN0QJaa0PhL") is a community Voice
// Library voice. Those are NOT reachable through the API on the free tier, so
// on a free-tier key that call fails and the app silently falls back to the
// browser's built-in (much worse) Dutch voice. The default below is a premade
// voice, which every plan (including free) can use via the API.
//
// Premade voices that read Dutch reasonably well (set ELEVENLABS_VOICE_ID to
// try another; confirm the exact ID in your own dashboard):
//   Rachel (warm female) 21m00Tcm4TlvDq8ikWAM   <- default
//   Sarah  (soft female)  EXAVITQu4vr4xnSDxMaL
//   Lily   (clear female) pFZP5JQG7iQjIQuC4Bku
//   George (calm male)    JBFqnCBsd6RMkjVDRZzb
//   Daniel (deep male)    onwK4e9ZLuTAKqWW03F9
const VOICE_ID = Deno.env.get("ELEVENLABS_VOICE_ID") ?? "21m00Tcm4TlvDq8ikWAM";
// eleven_turbo_v2_5 supports Dutch and is the cheapest on the character quota,
// which suits free-tier testing. Use eleven_multilingual_v2 for best quality.
const MODEL_ID = Deno.env.get("ELEVENLABS_MODEL_ID") ?? "eleven_turbo_v2_5";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Missing text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "ElevenLabs not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: MODEL_ID,
          language_code: "nl",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs TTS error:", response.status, errText);
      // Return the real ElevenLabs message (not just the status) so plan/voice
      // problems are visible during testing instead of being hidden behind the
      // client's silent browser-TTS fallback. E.g. a 401 "voice not found" here
      // means the configured voice isn't available on the current plan.
      return new Response(
        JSON.stringify({
          error: `ElevenLabs TTS returned ${response.status}`,
          details: errText,
          voiceId: VOICE_ID,
          modelId: MODEL_ID,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(audioBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    const audioBase64 = btoa(binary);

    return new Response(
      JSON.stringify({ audioBase64 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in synthesize-speech:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
