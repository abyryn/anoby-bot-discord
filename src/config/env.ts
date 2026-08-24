import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_GUILD_ID: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  DATABASE_URL: z.string().min(1),
  LAVALINK_HOST: z.string().default('localhost'),
  LAVALINK_PORT: z.string().transform(Number).default('2333'),
  LAVALINK_PASSWORD: z.string().default('youshallnotpass'),
  LAVALINK_SECURE: z.string().transform((val) => val === 'true').default('false'),
  BOT_PREFIX: z.string().default('A!'),
  BOT_OWNER_ID: z.string().optional(),
  MAX_AI_CONTEXT: z.string().transform(Number).default('10'),
  AI_COOLDOWN: z.string().transform(Number).default('5'),
  QUIZ_DURATION: z.string().transform(Number).default('20'),
  QUIZ_POINTS: z.string().transform(Number).default('100'),
});

export const env = envSchema.parse(process.env);
