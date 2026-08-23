import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { QuizQuestion, QuizQuestionSchema } from '../../types/quiz.js';

const CATEGORIES = [
  'Pengetahuan Umum', 'Indonesia', 'Musik', 'Film', 'Game', 
  'Minecraft', 'Teknologi', 'Otomotif', 'Anime', 'Sejarah', 
  'Geografi', 'Sains', 'Random'
];

export class QuizGeneratorService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY.trim());
    }
  }

  async generateQuestion(category?: string): Promise<QuizQuestion> {
    if (!this.genAI) {
      if (env.GEMINI_API_KEY) {
        this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY.trim());
      } else {
        throw new Error('GEMINI_API_KEY belum dikonfigurasi.');
      }
    }

    const selectedCategory = category && CATEGORIES.includes(category) 
      ? category 
      : CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

    const prompt = `Buatkan 1 pertanyaan kuis pilihan ganda untuk kategori: ${selectedCategory}.
Bahasa pengantar harus bahasa Indonesia yang mudah dipahami.
Format balasan WAJIB berupa JSON murni tanpa awalan/akhiran markdown seperti \`\`\`json:
{
  "category": "${selectedCategory}",
  "question": "pertanyaan kuis di sini",
  "options": ["pilihan 1", "pilihan 2", "pilihan 3", "pilihan 4"],
  "correctAnswer": 0,
  "explanation": "penjelasan singkat mengapa jawaban tersebut benar"
}
Catatan: "correctAnswer" adalah angka index 0, 1, 2, atau 3 sesuai letak jawaban yang benar di array "options".`;

    const primaryModel = env.GEMINI_MODEL || 'gemini-3.6-flash';
    const modelsToTry = Array.from(new Set([
      primaryModel,
      'gemini-3.6-flash',
      'gemini-2.0-flash',
      'gemini-3.6-pro',
      'gemini-1.5-flash'
    ]));

    let lastError: unknown = null;

    for (const modelName of modelsToTry) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        
        let jsonString = text.trim();
        if (jsonString.startsWith('```json')) {
          jsonString = jsonString.replace(/^```json\n?/, '').replace(/\n?```$/, '');
        } else if (jsonString.startsWith('```')) {
          jsonString = jsonString.replace(/^```\n?/, '').replace(/\n?```$/, '');
        }

        const parsed = JSON.parse(jsonString.trim());
        return QuizQuestionSchema.parse(parsed);
      } catch (error) {
        lastError = error;
        logger.warn({ model: modelName, err: error }, `Quiz model ${modelName} failed, trying fallback...`);
      }
    }

    logger.error({ err: lastError }, 'Failed to generate quiz question from all models');
    throw new Error('Gagal membuat kuis otomatis dari AI.');
  }
}

export const quizGenerator = new QuizGeneratorService();
