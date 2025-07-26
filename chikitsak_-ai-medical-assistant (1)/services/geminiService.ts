
import { GoogleGenAI, Content, Part } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants.ts';
import { ChatMessage } from "../types.ts";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set. Please ensure it is configured.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToGenerativePart = (dataUrl: string): Part => {
    const [meta, base64Data] = dataUrl.split(',');
    const mimeType = meta.split(':')[1].split(';')[0];
    return {
        inlineData: {
            mimeType,
            data: base64Data
        }
    };
};

const buildGeminiContents = (messages: ChatMessage[]): Content[] => {
  return messages
    .filter(msg => msg.id !== 'initial-message')
    .map(msg => {
      const parts: Part[] = [];
      
      // Add image first if it exists (only for user roles)
      if (msg.role === 'user' && msg.imageUrl) {
        parts.push(fileToGenerativePart(msg.imageUrl));
      }

      // Add text part, ensuring it's not empty
      if (msg.text && msg.text.trim()) {
        parts.push({ text: msg.text });
      }

      return {
        role: msg.role,
        parts: parts,
      };
    })
    .filter(content => content.parts.length > 0); // Ensure we don't send empty content parts
};

export const sendMessageToAI = async (history: ChatMessage[]): Promise<string> => {
  try {
    const contents = buildGeminiContents(history);
    
    // Use generateContent for multi-modal support
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // This model supports vision
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      }
    });
    
    return response.text;
  } catch (error) {
    console.error("Error sending message to AI:", error);
    return "I'm sorry, I encountered an error while processing your request. Please try sending your message again.";
  }
};