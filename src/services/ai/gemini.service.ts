import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { getSystemPrompt } from './prompt.service.js';

let genAI: GoogleGenerativeAI | null = null;
if (env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

export async function generateResponse(prompt: string, history: Array<{role: string, content: string}>): Promise<string> {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', systemInstruction: getSystemPrompt() });
    
    const formattedHistory = history.map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const chat = model.startChat({
      history: formattedHistory,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('AI response timed out')), 30000);
    });

    const responsePromise = chat.sendMessage(prompt);
    
    const result = await Promise.race([responsePromise, timeoutPromise]);
    
    return result.response.text();
  } catch (error) {
    logger.error({ err: error }, 'Error generating AI response');
    throw error;
  }
}
