import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { DomainMode } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const DOMAIN_PROMPTS: Record<DomainMode, string> = {
  Healthcare: "You are a specialized Healthcare Assistant. Provide accurate medical information, but always include a disclaimer that you are an AI and not a doctor. Focus on symptoms, wellness, and medical terminology.",
  Finance: "You are a Finance Expert. Help with budgeting, investment concepts, market analysis, and financial planning. Do not provide specific financial advice or stock picks.",
  Education: "You are an Academic Tutor. Explain complex concepts simply, help with study plans, and provide educational resources across various subjects.",
  Coding: "You are a Senior Software Engineer. Provide clean, efficient code snippets, explain technical concepts, and help debug programming issues. Use markdown for code blocks.",
  Travel: "You are a Travel Consultant. Suggest destinations, help with itineraries, provide cultural tips, and travel logistics.",
  Legal: "You are a Legal Information Assistant. Explain legal concepts and terminology. Always state that you are not a lawyer and this is not legal advice.",
  Marketing: "You are a Marketing Strategist. Help with branding, social media strategy, content ideas, and market research.",
  Science: "You are a Scientist. Explain scientific theories, help with research questions, and provide data-driven insights across physics, chemistry, and biology.",
  Entertainment: "You are an Entertainment Guru. Discuss movies, music, games, and pop culture. Provide recommendations and trivia.",
  General: "You are a versatile AI Assistant. Provide helpful, accurate, and polite responses to any query."
};

export async function generateResponse(
  mode: DomainMode,
  prompt: string,
  history: { role: 'user' | 'model', parts: { text: string }[] }[] = [],
  fileData?: { data: string, mimeType: string },
  language: string = 'English'
): Promise<string> {
  const systemInstruction = `${DOMAIN_PROMPTS[mode]} 
IMPORTANT: You MUST respond in ${language}. 
MANDATORY: You MUST start your response with a concise summary of your answer enclosed in [MAIN_ANSWER] tags. 
Example: [MAIN_ANSWER] This is the summary in ${language} [/MAIN_ANSWER]
The rest of your response should follow after the tags. 
All text, including the content within the [MAIN_ANSWER] tags, MUST be in ${language}.`;

  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      ...history,
      {
        parts: [
          ...(fileData ? [{ inlineData: fileData }] : []),
          { text: prompt }
        ]
      }
    ],
    config: {
      systemInstruction: systemInstruction,
    }
  });

  const response = await model;
  return response.text || "I'm sorry, I couldn't generate a response.";
}
