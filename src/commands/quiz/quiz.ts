import { Command, CommandContext } from '../../types/index.js';
import { embeds } from '../../utils/embeds.js';
import { quizService } from '../../services/quiz/quiz.service.js';
import { quizGenerator } from '../../services/quiz/quiz-generator.service.js';
import { leaderboardService } from '../../services/quiz/leaderboard.service.js';
import { env } from '../../config/env.js';
import { Message } from 'discord.js';

const command: Command = {
  name: 'quiz',
  description: 'Start a quiz session, view leaderboard, or stop a quiz.',
  execute: async (ctx: CommandContext) => {
    const subCommand = ctx.args[0]?.toLowerCase();

    if (subCommand === 'leaderboard') {
      const leaderboardCmd = (await import('./leaderboard.js')).default;
      return leaderboardCmd.execute(ctx);
    }

    if (subCommand === 'stop') {
      const stopCmd = (await import('./quizstop.js')).default;
      return stopCmd.execute(ctx);
    }

    if (quizService.isActive(ctx.channelId)) {
      await ctx.reply({ embeds: [embeds.error('Kuis sedang berlangsung di channel ini! Selesaikan dulu atau gunakan `A!quiz stop`')] });
      return;
    }

    let category = ctx.args.join(' ');
    if (!category) category = '';

    await ctx.reply({ embeds: [embeds.info('Menyiapkan pertanyaan kuis...')] });

    try {
      const question = await quizGenerator.generateQuestion(category || undefined);
      const session = quizService.startQuiz(ctx.channelId, question);

      const optionsText = question.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n');
      
      const quizEmbed = embeds.quiz(
        `Kategori: ${question.category}`,
        `**Pertanyaan:**\n${question.question}\n\n**Pilihan:**\n${optionsText}\n\n⏱️ Waktu: ${env.QUIZ_DURATION} detik`
      );

      const msg = await ctx.reply({ embeds: [quizEmbed] });

      if (!ctx.message || !ctx.message.channel.isTextBased()) {
        return;
      }

      const channel = ctx.message.channel as any;
      const filter = (m: Message) => !m.author.bot;
      const collector = channel.createMessageCollector({ filter, time: env.QUIZ_DURATION * 1000 });

      collector.on('collect', async (m: Message) => {
        if (!quizService.isActive(ctx.channelId)) return;
        
        const answer = m.content.trim().toUpperCase();
        let answerIndex = -1;

        if (['A', 'B', 'C', 'D'].includes(answer)) {
          answerIndex = answer.charCodeAt(0) - 65;
        } else {
          answerIndex = question.options.findIndex(opt => opt.toUpperCase() === answer);
        }

        if (answerIndex === -1) return;

        try {
          const result = quizService.submitAnswer(ctx.channelId, m.author.id, answerIndex);
          
          await leaderboardService.updateScore(
            m.author.id,
            m.author.username,
            result.points + result.timeBonus,
            result.correct
          );

          if (result.correct) {
            quizService.endQuiz(ctx.channelId);
            collector.stop('answered');
            await m.reply({ 
              embeds: [embeds.success(`Benar! ${m.author.username} mendapat ${result.points} poin + ${result.timeBonus} bonus waktu.\n\n**Penjelasan:** ${question.explanation}`)] 
            });
          } else {
            await m.reply({ 
              embeds: [embeds.error(`Salah, ${m.author.username}! Coba lagi.`)] 
            });
          }
        } catch (e: any) {
          if (e.message === 'User already participated') {
            await m.reply({ embeds: [embeds.error('Kamu sudah menjawab pertanyaan ini!')] });
          }
        }
      });

      collector.on('end', async (collected: any, reason: string) => {
        if (reason === 'time' && quizService.isActive(ctx.channelId)) {
          quizService.endQuiz(ctx.channelId);
          const correctLetter = String.fromCharCode(65 + question.correctAnswer);
          await channel.send({ 
            embeds: [embeds.info(`Waktu habis! Jawaban yang benar adalah **${correctLetter}. ${question.options[question.correctAnswer]}**\n\n**Penjelasan:** ${question.explanation}`)] 
          });
        }
      });

    } catch (error) {
      if (quizService.isActive(ctx.channelId)) {
        quizService.endQuiz(ctx.channelId);
      }
      if (ctx.message && ctx.message.channel.isTextBased()) {
         const channel = ctx.message.channel as any;
         await channel.send({ embeds: [embeds.error('Gagal membuat pertanyaan kuis. Coba lagi nanti.')] });
      }
    }
  },
};

export default command;
