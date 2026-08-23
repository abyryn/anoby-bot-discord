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
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY || '');
  }

  async generateQuestion(category?: string): Promise<QuizQuestion> {
    try {
      const selectedCategory = category && CATEGORIES.includes(category) 
        ? category 
        : CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `Generate a quiz question for category: ${selectedCategory}. 
You must respond ONLY with a valid JSON object matching exactly this schema, without markdown formatting like \`\`\`json:
{
  "category": "string",
  "question": "string",
  "options": ["string", "string", "string", "string"],
  "correctAnswer": number (0-3 representing the index of the correct option),
  "explanation": "string"
}
Ensure it is culturally relevant if about Indonesia. The language should be Indonesian.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // Clean up potential markdown formatting
      let jsonString = text.trim();
      if (jsonString.startsWith('\`\`\`json')) {
        jsonString = jsonString.replace(/^\`\`\`json\n/, '').replace(/\n\`\`\`$/, '');
      } else if (jsonString.startsWith('\`\`\`')) {
        jsonString = jsonString.replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '');
      }

      const parsed = JSON.parse(jsonString);
      return QuizQuestionSchema.parse(parsed);
    } catch (error) {
      logger.error({ err: error }, 'Failed to generate quiz question');
      throw new Error('Failed to generate quiz question');
    }
  }
}

export const quizGenerator = new QuizGeneratorService();
