import { completion, ocr } from "@qvac/sdk";

/**
 * GhostAI: Privacy-First Banking Assistant
 * 
 * This module integrates Tether's QVAC SDK to provide local-first AI 
 * capabilities within GhostFi. By running inference on-device (or locally 
 * on our shielded backend), we ensure user queries never touch cloud AI providers.
 */

export async function getGhostAssistant() {
  // The @qvac/sdk uses a functional API. We return a compatible interface 
  // to minimize changes in other files if they were using the previous mock-style class.
  return {
    chat: async (params: { messages: { role: string; content: string }[] }) => {
      const run = completion({
        modelId: "llama-3-8b-ghost",
        history: params.messages,
        stream: false
      });
      return await run.final;
    },
    ocr: {
      process: async (image: Buffer) => {
        const { blocks } = ocr({ 
          modelId: "ghost-ocr", 
          image: image 
        });
        return await blocks;
      }
    }
  };
}

export async function ghostInquiry(query: string): Promise<string> {
  try {
    const assistant = await getGhostAssistant();
    
    // Ghost-specific system prompt to keep it focused on private banking
    const systemPrompt = "You are the GhostFi Banking Assistant. You help users manage their private Solana balances (USDC, USDT, PUSD). You are concise, secure, and never ask for private keys. You only use local data.";
    
    const response = await assistant.chat({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ]
    });

    return response.contentText;
  } catch (error) {
    console.error("QVAC Inference Error:", error);
    return "I'm sorry, I'm having trouble connecting to my local privacy core. Please try again later.";
  }
}

/**
 * OCR for Private Onboarding
 * Uses QVAC's local OCR to extract data from ID documents without cloud leaks.
 */
export async function privateOCR(imageBuffer: Buffer) {
  const assistant = await getGhostAssistant();
  const result = await assistant.ocr.process(imageBuffer);
  return result;
}
