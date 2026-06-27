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
    const { mode, fields } = await req.json();
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!apiKey) throw new Error("Missing API key");

    const prompts: Record<string, { system: string; user: string }> = {
      upwork: {
        system: `You are an expert Upwork proposal writer who has helped freelancers win over $10M in contracts. Write a proposal that: (1) Opens with a specific observation about the client's problem — never use 'I am writing to apply', (2) Shows you understand their exact pain point in one sentence, (3) Briefly explains why you're the right fit with a specific example or number, (4) Ends with a confident but not pushy call to action. Keep it 150–200 words. Use the tone specified. Sound like a human expert, not a template.`,
        user: `Job Description: ${fields.job}\nMy name: ${fields.name}\nMy skills: ${fields.skills}\nExperience: ${fields.years} years\nTone: ${fields.tone}\nPersonal touch: ${fields.touch}\nWrite the proposal now.`,
      },
      linkedin: {
        system: `You are an expert at LinkedIn outreach with a 40%+ reply rate. Write a message that feels genuine and human — not salesy or template-like. Always reference something specific about the recipient. Be concise. If format is 'Connection Note', stay strictly under 300 characters. If InMail or Email, use 150–200 words with a clear single call to action. Never use phrases like 'I hope this message finds you well'.`,
        user: `Goal: ${fields.goal}\nRecipient: ${fields.recipient}\nTheir background: ${fields.bio}\nMy background: ${fields.background}\nWhat I want: ${fields.want}\nFormat: ${fields.format}\nWrite the message now.`,
      },
      creator: {
        system: `You are a talent manager and brand partnership expert. Write a pitch that respects the creator's time, shows genuine knowledge of their content, and makes the value exchange crystal clear. Lead with what's in it for THEM, not you. Be specific about numbers and deliverables. Avoid vague flattery. Keep it under 200 words.`,
        user: `Pitch type: ${fields.pitch}\nCreator: ${fields.creator}\nTheir content style: ${fields.audience}\nMy brand: ${fields.brand}\nMy offer: ${fields.offer}\nWhy we're a fit: ${fields.fit}\nTone: ${fields.tone}\nWrite the pitch now.`,
      },
    };

    const prompt = prompts[mode];
    if (!prompt) throw new Error("Invalid mode");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: prompt.system,
        messages: [{ role: "user", content: prompt.user }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text || "";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});