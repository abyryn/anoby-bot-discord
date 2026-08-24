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

  // Prioritize active, currently supported Gemini 3.x models
  const primaryModel = env.GEMINI_MODEL || 'gemini-3.6-flash';
  const modelsToTry = Array.from(new Set([
    primaryModel,
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.6-pro'
  ]));

  let lastError: unknown = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: getSystemPrompt(),
      });

      const formattedHistory = formatHistory(history);

      let text = '';

      if (formattedHistory.length > 0) {
        try {
          const chat = model.startChat({
            history: formattedHistory,
          });

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('AI response timed out (30s)')), 30000);
          });

          const responsePromise = chat.sendMessage(prompt);
          const result = await Promise.race([responsePromise, timeoutPromise]);
          text = result.response.text();
        } catch (chatErr) {
          logger.warn({ model: modelName, err: chatErr }, 'Chat with history failed, falling back to direct generateContent');
          const result = await model.generateContent(prompt);
          text = result.response.text();
        }
      } else {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('AI response timed out (30s)')), 30000);
        });

        const responsePromise = model.generateContent(prompt);
        const result = await Promise.race([responsePromise, timeoutPromise]);
        text = result.response.text();
      }

      if (text && text.trim().length > 0) {
        return text.trim();
      }
    } catch (error) {
      lastError = error;
      logger.warn({ model: modelName, err: error }, `Model ${modelName} failed, trying next fallback...`);
    }
  }

  logger.error({ err: lastError }, 'All Gemini AI models failed');
  throw lastError || new Error('Gagal mendapatkan respon dari AI.');
}
