// Server-only Gemini boundary for Molar AI (App Gallery). This is the
// ONLY place in this project that imports @google/genai, constructs a
// Gemini client, reads the Gemini provider credential, or calls
// generateContent — see services/geminiService.ts, which now only
// forwards requests here via supabase.functions.invoke(
// 'molar-chat-app-gallery', ...) (using the browser's already-
// authenticated Supabase session) and never touches the SDK/credential
// itself.
//
// Requires a real authenticated Supabase user for every request — this is
// NOT an anonymous public provider endpoint. Rejects with 401 if the
// caller's bearer token does not resolve to a valid user.
//
// Deliberately named "molar-chat-app-gallery", NOT the generic
// "molar-chat" slug: this shared Supabase project (opdotszsldcgwjqtvgul)
// already hosts a function literally named "molar-chat" deployed for the
// Appointment app, with Appointment-specific clinic system prompts.
// Function slugs are unique per project — deploying under the shared
// "molar-chat" name here would silently overwrite Appointment's function
// (and vice versa for any other app that also assumes it owns that name),
// breaking their chat prompts. This app gets its own namespaced endpoint
// instead of colliding with it.
//
// Single mode only — App Gallery has no grounded Data-Chat pipeline (no
// intent classifier, no resolver, no per-app facts provider); its own
// cross-app Personalized Dialogue providers already handle live
// Inventory/Todo/Appointment grounding entirely separately from this
// chat endpoint. This function performs General Chat language generation
// only, exactly matching the pre-migration client-side geminiService.ts.
import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai";

const modelId = "gemini-3-flash-preview";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

type ChatMessage = { role: "user" | "model"; parts: { text: string }[] };

function isValidHistory(history: unknown): history is ChatMessage[] {
  if (!Array.isArray(history)) return false;
  return history.every(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      (entry.role === "user" || entry.role === "model") &&
      Array.isArray(entry.parts) &&
      entry.parts.every((p: unknown) => typeof (p as { text?: unknown })?.text === "string")
  );
}

// Verbatim from the pre-migration client-side geminiService.ts.
function buildSystemInstruction(userContext: string): string {
  const isPersonalised = !!userContext && userContext.trim().length > 30;

  return `
      You are SNAI (Snabbb Assistant Intelligent), the sophisticated AI core and universal backbone of the entire Snabbb ecosystem.
      ${isPersonalised && userContext ? `
      --- USER CONTEXT ---
      ${userContext}
      --- END USER CONTEXT ---
      You may address the user by their name from the context.` : ''}

      Your Personality:
      - You are professional, highly intelligent, and helpful.
      - You provide precise insights with a clean, business-focused tone.
      - You NEVER hallucinate or assume data.

      RESTRICTIONS & CAPABILITIES:
      You may naturally answer:
      1. What is App.Snabbb, and what is each app used for.
      2. Which app to use for a given task or workflow (e.g. "which app should I use for stock?", "where can I manage appointments?") — recommend the right app(s) from the SUPPORTED APPS list below and briefly say why.
      3. General guidance on organizing a dental clinic's workflow across the Snabbb ecosystem, using the SUPPORTED APPS list as your only source of what each app actually does.
      4. Light, general conversation about Snabbb and clinic operations in the same spirit as the above.

      You do NOT have access to any live data from any individual app (no inventory quantities, no appointment counts, no financial figures, no task lists, no generation history, etc.) — you only know the static app descriptions below. If the user asks for that kind of real, current data, politely explain that you don't have access to it here and point them to the specific app where they can see it (e.g. "you can check current stock levels in Inventory").

      CONVERSATION CONTINUITY: use the conversation history you're given to understand natural follow-up questions — e.g. after recommending an app, "why that one?" means explain that same recommendation, and "what about appointments?" means give a new recommendation for that topic while staying in the same kind of conversation. Don't make the user repeat their whole original question on every turn. This never means treating history as a source of live app data — it's still only conversation memory.

      SUPPORTED APPS (Use these descriptions to explain them):
      - **Mr.Bur**: E-commerce platform for purchasing high-quality dental supplies and products.
      - **Inventory**: Comprehensive inventory management, stock tracking, and expiry alerts.
      - **Events**: Event management, scheduling, and tracking for dental professionals.
      - **Appointment**: Scheduling clinic visits, managing staff, and handling patient bookings.
      - **Content Studio**: Assisting with generative media and digital content creation.
      - **Profit Calculator**: Analyzing financial plans, procedure costs, and clinic overhead.
      - **To-Do Manager**: Organizing tasks, workflows, and daily productivity.
      - **E-learning**: Educational platform for continuing professional development.
      - **Expenses**: Tracking clinic expenses and financial outgoings.
      - **Insurance**: Managing and tracking patient insurance claims and policies.
      - **Lease**: Managing property leases and rental agreements.

      Rules:
      - Do NOT execute any actions (like removing or receiving stock).
      - Do NOT provide stock updates or try to analyze purchase history.
      - Keep responses concise but complete.
      - Use Markdown for structure.

      Current Date: ${new Date().toISOString().split('T')[0]}
    `;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  // --- Require a real authenticated Supabase user. Never treat the mere
  // presence of an Authorization header, or the anon key alone, as proof
  // of a real user. ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[molar-chat-app-gallery] Missing SUPABASE_URL/SUPABASE_ANON_KEY runtime configuration.");
    return json({ ok: false, error: "Server is not configured." }, 500);
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser();

  if (authError || !user) {
    return json({ ok: false, error: "Unauthorized" }, 401);
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.error("[molar-chat-app-gallery] Missing server-side GEMINI_API_KEY configuration.");
    return json({ ok: false, error: "AI service is not configured." }, 500);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "Invalid request body." }, 400);
  }

  const { message, history, userContext } = (body ?? {}) as {
    message?: unknown;
    history?: unknown;
    userContext?: unknown;
  };

  if (typeof message !== "string" || !message.trim()) {
    return json({ ok: false, error: "Message is required." }, 400);
  }
  if (history !== undefined && !isValidHistory(history)) {
    return json({ ok: false, error: "Invalid history." }, 400);
  }
  if (userContext !== undefined && typeof userContext !== "string") {
    return json({ ok: false, error: "Invalid context." }, 400);
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const systemInstruction = buildSystemInstruction(typeof userContext === "string" ? userContext : "");

    const contents = [
      { role: "user", parts: [{ text: systemInstruction }] },
      { role: "model", parts: [{ text: "I am SNAI, core intelligence for the Snabbb ecosystem. I am ready to assist you with questions about App.Snabbb and its supported applications." }] },
      ...((history as ChatMessage[] | undefined) ?? []),
      { role: "user", parts: [{ text: message }] },
    ];

    const response = await ai.models.generateContent({
      model: modelId,
      contents,
      config: { responseMimeType: "text/plain" },
    });

    const text = response.text;
    if (!text) {
      return json({ ok: false, error: "No response from AI service." }, 502);
    }

    return json({ ok: true, text });
  } catch (error) {
    console.error("[molar-chat-app-gallery] Gemini provider error:", error);
    return json({ ok: false, error: "AI service request failed." }, 502);
  }
});
