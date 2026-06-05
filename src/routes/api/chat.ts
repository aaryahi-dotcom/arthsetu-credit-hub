import { createFileRoute } from "@tanstack/react-router";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are "Setu", the friendly multilingual assistant for ArthSetu — an alternate credit-scoring platform that helps small businesses, MSMEs, gig workers and thin-file individuals get a fair credit assessment using alternate data (UPI activity, utility & rent payments, occupation, assets and digital footprint). Every decision is reviewed by a bank officer and is audit-ready.

Your job:
- Help customers understand what ArthSetu does, how the ArthSetu score works, how to apply, what documents/information they need, what the score bands mean, and how to improve their score.
- Guide them through the dashboard, application form, and report.
- Be warm, concise and encouraging. Use simple language. Use short paragraphs and bullet points where helpful.

CRITICAL multilingual rule:
- Detect the language the user writes in and ALWAYS reply in that same language. Support Indian languages (Hindi, Hinglish, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi, etc.) and English fluently.
- If the user mixes languages, mirror their style.

Guardrails:
- You do NOT have access to a user's private application data. If asked about their specific score or status, tell them to check their Dashboard.
- Never promise loan approval or guaranteed amounts — assessments are indicative and officer-reviewed.
- Do not give legal, tax or investment advice; suggest contacting support for account-specific issues.
- Keep responses focused on ArthSetu and credit topics.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { messages?: ChatMessage[] };
          const incoming = Array.isArray(body.messages) ? body.messages : [];

          // Basic validation / safety limits
          const messages = incoming
            .filter(
              (m) =>
                m &&
                (m.role === "user" || m.role === "assistant") &&
                typeof m.content === "string",
            )
            .slice(-20)
            .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

          if (messages.length === 0) {
            return new Response(JSON.stringify({ error: "No messages provided" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(
              JSON.stringify({ error: "AI is not configured." }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          const aiResponse = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-3-flash-preview",
                messages: [
                  { role: "system", content: SYSTEM_PROMPT },
                  ...messages,
                ],
                stream: true,
              }),
            },
          );

          if (!aiResponse.ok) {
            if (aiResponse.status === 429) {
              return new Response(
                JSON.stringify({
                  error: "I'm getting a lot of questions right now. Please try again in a moment.",
                }),
                { status: 429, headers: { "Content-Type": "application/json" } },
              );
            }
            if (aiResponse.status === 402) {
              return new Response(
                JSON.stringify({
                  error: "The assistant is temporarily unavailable. Please try again later.",
                }),
                { status: 402, headers: { "Content-Type": "application/json" } },
              );
            }
            const t = await aiResponse.text();
            console.error("AI gateway error:", aiResponse.status, t);
            return new Response(
              JSON.stringify({ error: "The assistant could not respond. Please try again." }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }

          return new Response(aiResponse.body, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
            },
          });
        } catch (e) {
          console.error("chat route error:", e);
          return new Response(
            JSON.stringify({ error: "Something went wrong. Please try again." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
