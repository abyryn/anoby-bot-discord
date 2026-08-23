import { z } from 'zod';

export const QuizQuestionSchema = z.object({
  category: z.string(),
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctAnswer: z.number().int().min(0).max(3),
  explanation: z.string(),
});

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export interface QuizSession {
  question: QuizQuestion;
  channelId: string;
  startTime: number;
  participants: Set<string>;
  ended: boolean;
}
