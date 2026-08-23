import { QuizQuestion, QuizSession } from '../../types/quiz.js';

export class QuizService {
  private activeQuizzes: Map<string, QuizSession> = new Map();

  startQuiz(channelId: string, question: QuizQuestion): QuizSession {
    if (this.activeQuizzes.has(channelId)) {
      throw new Error('Quiz already active in this channel');
    }

    const session: QuizSession = {
      question,
      channelId,
      startTime: Date.now(),
      participants: new Set(),
      ended: false,
    };

    this.activeQuizzes.set(channelId, session);
    return session;
  }

  endQuiz(channelId: string): void {
    const session = this.activeQuizzes.get(channelId);
    if (session) {
      session.ended = true;
      this.activeQuizzes.delete(channelId);
    }
  }

  isActive(channelId: string): boolean {
    return this.activeQuizzes.has(channelId);
  }

  getSession(channelId: string): QuizSession | undefined {
    return this.activeQuizzes.get(channelId);
  }

  submitAnswer(channelId: string, userId: string, answerIndex: number): { correct: boolean; points: number; timeBonus: number } {
    const session = this.activeQuizzes.get(channelId);
    if (!session || session.ended) {
      throw new Error('No active quiz session');
    }

    if (session.participants.has(userId)) {
      throw new Error('User already participated');
    }

    session.participants.add(userId);

    const isCorrect = session.question.correctAnswer === answerIndex;
    if (!isCorrect) {
      return { correct: false, points: 0, timeBonus: 0 };
    }

    const timeTaken = (Date.now() - session.startTime) / 1000;
    let timeBonus = 0;
    if (timeTaken < 5) timeBonus = 50;
    else if (timeTaken < 10) timeBonus = 30;
    else if (timeTaken < 15) timeBonus = 10;

    return { correct: true, points: 100, timeBonus };
  }
}

export const quizService = new QuizService();
