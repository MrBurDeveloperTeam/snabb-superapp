import { GoogleGenAI, Type } from "@google/genai";
import { env } from "process";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: env.VITE_GEMINI_API_KEY });
const modelId = "gemini-3-flash-preview";
export type ChatHistory = {
  role: "user" | "model";
  parts: { text: string }[];
};

export const chatWithGemini = async (
  history: ChatHistory[],
  message: string,
  inventoryContext: string,
  purchaseHistory?: string,
  activityLogs?: string,
  userContext?: string,
): Promise<string> => {
  try {
    const isPersonalised = !!userContext && userContext.trim().length > 30;

    const systemInstruction = `
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
      You are STRICTLY RESTRICTED to answering only the following types of questions:
      1. What is Snabbb.io? (It is a comprehensive, universal application ecosystem designed for professional dental clinic operations and management).
      2. What is each app used for within Snabbb?

      If the user asks anything outside of these topics (including inventory updates, stock quantities, general knowledge, etc.), you must politely refuse and state that in the SuperApp dashboard, you are currently restricted to answering questions about what Snabbb.io is and explaining its supported applications.

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

    // Construct the full conversation for the stateless API
    const contents = [
      { role: "user", parts: [{ text: systemInstruction }] },
      { role: "model", parts: [{ text: "I am SNAI, core intelligence for the Snabbb ecosystem. I am ready to assist you with questions about Snabbb.io and its supported applications." }] },
      ...history,
      { role: "user", parts: [{ text: message }] }
    ];

    const response = await ai.models.generateContent({
      model: modelId,
      contents: contents,
      config: {
        responseMimeType: "text/plain",
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    return text;
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "I'm having trouble connecting to the Snabbb Assistant Intelligent servers right now. Please try again shortly.";
  }
};
