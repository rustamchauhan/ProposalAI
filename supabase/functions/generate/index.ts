import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Request body:", JSON.stringify(body));
    
    const { mode, fields } = body;
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    console.log("API key exists:", !!apiKey);

    if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

    const prompts: Record<string, { system: string; user: string }> = {
      upwork: {
        system: `You are an expert Upwork proposal writer. Write a 150-200 word proposal that opens with a specific observation, shows you understand the pain point, explains why you're the right fit, and ends with a call to action. Sound human, not template-like.`,
        user: `Job Description: ${fields.job}\nMy name: ${fields.name}\nMy skills: ${fields.skills}\nExperience: ${fields.years} years\nTone: ${fields.tone}\nPersonal touch: ${fields.touch}\nWrite the proposal now.`,
      },
      linkedin: {
        system: `You are an expert at LinkedIn outreach with a 40%+ reply rate. Write a genuine, human message. Never use clichés like 'I hope this message finds you well'.`,
        user: `Goal: ${fields.goal}\nRecipient: ${fields.recipient}\nTheir background: ${fields.bio}\nMy background: ${fields.background}\nWhat I want: ${fields.want}\nFormat: ${fields.format}\nWrite the message now.`,
      },
      creator: {
        system: `You are a brand partnership expert. Write a pitch under 200 words that leads with value for the creator, is specific about deliverables, and sounds professional.`,
        user: `Pitch type: ${fields.pitch}\nCreator: ${fields.creator}\nTheir style: ${fields.audience}\nMy brand: ${fields.brand}\nMy offer: ${fields.offer}\nWhy we fit: ${fields.fit}\nTone: ${fields.tone}\nWrite the pitch now.`,
      },
    };

    const prompt = prompts[mode];
    if (!prompt) throw new Error("Invalid mode: " + mode);

    console.log("Calling Anthropic API...");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: prompt.system,
        messages: [{ role: "user", content: prompt.user }],
      }),
    });

    console.log("Anthropic response status:", res.status);
    const data = await res.json();
    console.log("Anthropic response:", JSON.stringify(data));

    if (!res.ok) throw new Error("Anthropic error: " + JSON.stringify(data));

    const text = data.content?.[0]?.text || "";
    console.log("Generated text length:", text.length);

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});