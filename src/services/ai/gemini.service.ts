import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { getSystemPrompt } from './prompt.service.js';

let genAI: GoogleGenerativeAI | null = null;
if (env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY.trim());
}

/**
 * Clean & format history so that Gemini API requirements are strictly met:
 * 1. Must start with role 'user'
 * 2. Roles must strictly alternate: user -> model -> user -> model
 * 3. Last message in history should be 'model' before user sends new prompt
 */
function formatHistory(history: Array<{ role: string; content: string }>) {
  const result: Array<{ role: 'user' | 'model'; parts: [{ text: string }] }> = [];

  let expectedRole: 'user' | 'model' = 'user';

  for (const item of history) {
    const role: 'user' | 'model' = item.role === 'ai' || item.role === 'model' ? 'model' : 'user';
    const text = (item.content || '').trim();
    if (!text) continue;

    if (role === expectedRole) {
      result.push({ role, parts: [{ text }] });
      expectedRole = expectedRole === 'user' ? 'model' : 'user';
    }
  }

  // Ensure last message in history is 'model' so the new prompt from user alternates properly
  while (result.length > 0 && result[result.length - 1].role === 'user') {
    result.pop();
  }

  return result;
}

export async function generateResponse(prompt: string, history: Array<{ role: string; content: string }> = []): Promise<string> {
  if (!genAI) {
    if (env.GEMINI_API_KEY) {
      genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY.trim());
    } else {
      throw new Error('GEMINI_API_KEY belum dikonfigurasi di file .env / dashboard Dokploy.');
    }
  }

  const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-2.5-flash'];
  let lastError: unknown = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: getSystemPrompt(),
      });

      const formattedHistory = formatHistory(history);

      const chat = model.startChat({
        history: formattedHistory,
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI response timed out (30s)')), 30000);
      });

      const responsePromise = chat.sendMessage(prompt);
      const result = await Promise.race([responsePromise, timeoutPromise]);

      const text = result.response.text();
      if (text) {
        return text.trim();
      }
    } catch (error) {
      lastError = error;
      logger.warn({ model: modelName, err: error }, `Model ${modelName} failed, trying fallback...`);
    }
  }

  logger.error({ err: lastError }, 'All Gemini AI models failed');
  throw lastError || new Error('Gagal mendapatkan respon dari AI.');
}
