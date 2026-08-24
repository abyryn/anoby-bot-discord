import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

let genAI: GoogleGenerativeAI | null = null;
if (env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY.trim());
}

/**
 * Creates a valid RIFF/WAV header for raw PCM audio data
 */
export function pcmToWav(pcmData: Buffer, sampleRate = 48000, channels = 2, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const header = Buffer.alloc(44);

  // RIFF chunk descriptor
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);

  // fmt sub-chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

export class SttService {
  private static instance: SttService;

  private constructor() {}

  public static getInstance(): SttService {
    if (!SttService.instance) {
      SttService.instance = new SttService();
    }
    return SttService.instance;
  }

  /**
   * Transcribe a WAV audio buffer into Indonesian text
   */
  public async transcribe(wavBuffer: Buffer): Promise<string> {
    if (!genAI) {
      if (env.GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY.trim());
      } else {
        throw new Error('GEMINI_API_KEY belum dikonfigurasi.');
      }
    }

    const modelsToTry = [
      env.GEMINI_MODEL || 'gemini-3.6-flash',
      'gemini-3.6-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash'
    ];

    const base64Audio = wavBuffer.toString('base64');
    const prompt = 'Transkripsikan rekaman audio suara ini ke teks bahasa Indonesia secara tepat dan akurat. Balas HANYA dengan teks transkripsi apa yang diucapkan pengguna. Jika audio hanya berupa hening, desah nafas, atau suara latar belakang tanpa kata yang jelas, balas HANYA dengan kata "EMPTY".';

    for (const modelName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent([
          {
            inlineData: {
              mimeType: 'audio/wav',
              data: base64Audio,
            },
          },
          { text: prompt },
        ]);

        const text = result.response.text().trim();
        if (text && text !== 'EMPTY' && text !== '""' && text !== "''") {
          // Remove any accidental quotes or formatting
          return text.replace(/^["']|["']$/g, '').trim();
        }
        return '';
      } catch (error) {
        logger.warn({ model: modelName, err: error }, 'STT model failed, trying next...');
      }
    }

    logger.error('All STT models failed to transcribe audio');
    return '';
  }
}

export const sttService = SttService.getInstance();
