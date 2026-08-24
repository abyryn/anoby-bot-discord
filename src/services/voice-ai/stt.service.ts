import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

let genAI: GoogleGenerativeAI | null = null;
if (env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY.trim());
}

/**
 * Downsample 48kHz Stereo 16-bit PCM to 16kHz Mono 16-bit PCM for 6x smaller audio size and ultra-fast upload
 */
export function downsample48kStereoTo16kMono(pcm48kStereo: Buffer): Buffer {
  const numFramesIn = Math.floor(pcm48kStereo.length / 4);
  const numFramesOut = Math.floor(numFramesIn / 3);
  const output = Buffer.alloc(numFramesOut * 2);

  for (let i = 0; i < numFramesOut; i++) {
    const srcIndex = i * 3 * 4;
    const left = pcm48kStereo.readInt16LE(srcIndex);
    const right = pcm48kStereo.readInt16LE(srcIndex + 2);
    const mono = Math.round((left + right) / 2);
    output.writeInt16LE(mono, i * 2);
  }

  return output;
}

/**
 * Calculate RMS (Root Mean Square) volume level of 16-bit PCM audio
 * Silence & background noise: RMS < 200
 * Actual human speech: RMS >= 300 - 3000+
 */
export function calculatePcmRms(pcm16bit: Buffer): number {
  if (pcm16bit.length < 2) return 0;
  let sumSquares = 0;
  const numSamples = Math.floor(pcm16bit.length / 2);

  for (let i = 0; i < numSamples; i++) {
    const sample = pcm16bit.readInt16LE(i * 2);
    sumSquares += sample * sample;
  }

  return Math.sqrt(sumSquares / numSamples);
}

/**
 * Creates a valid RIFF/WAV header for raw PCM audio data
 */
export function pcmToWav(pcmData: Buffer, sampleRate = 16000, channels = 1, bitsPerSample = 16): Buffer {
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

export interface VoiceProcessResult {
  transcript: string;
  response: string;
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
   * Ultra-fast single-pass audio understanding & direct voice response generation in a single API call
   */
  public async processAudioDirect(wavBuffer: Buffer, username = 'User'): Promise<VoiceProcessResult | null> {
    if (!genAI) {
      if (env.GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY.trim());
      } else {
        throw new Error('GEMINI_API_KEY belum dikonfigurasi.');
      }
    }

    const primaryModel = env.GEMINI_MODEL || 'gemini-3.6-flash';
    const modelsToTry = Array.from(new Set([
      primaryModel,
      'gemini-3.6-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.6-pro'
    ]));

    const base64Audio = wavBuffer.toString('base64');
    
    // Strict prompt to avoid hallucinating username or background noise
    const prompt = `Kamu adalah AnobyStore AI, asisten voice chat Discord bahasa Indonesia.
Dengarkan audio suara berikut ini.

ATURAN KETAT:
1. Jika audio HANYA berupa hening, desahan, suara nafas, ketikan keyboard, atau suara latar belakang tanpa ucapan kata yang jelas, kamu WAJIB membalas HANYA satu kata: "EMPTY".
2. Jangan mengarang kata jika tidak ada suara manusia yang berbicara dengan jelas.
3. Jika ada suara manusia berbicara:
TRANSCRIPT: <teks apa yang diucapkan secara persis>
RESPONSE: <jawaban suara kamu yang ringkas (1-2 kalimat), ramah, dan santai>`;

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
        
        // Ignore empty / silence responses
        if (!text || text === 'EMPTY' || (text.includes('EMPTY') && !text.includes('TRANSCRIPT:'))) {
          return null;
        }

        const transcriptMatch = text.match(/TRANSCRIPT:\s*([\s\S]*?)(?=RESPONSE:|$)/i);
        const responseMatch = text.match(/RESPONSE:\s*([\s\S]*?)$/i);

        let transcript = transcriptMatch ? transcriptMatch[1].trim() : '';
        let response = responseMatch ? responseMatch[1].trim() : '';

        // If format was not matched, check if text itself contains response
        if (!transcript && !response) {
          if (text.toLowerCase().includes('empty')) return null;
          response = text;
        }

        // Clean up accidental formatting
        transcript = transcript.replace(/^["']|["']$/g, '').trim();
        response = response.replace(/^["']|["']$/g, '').trim();

        // Hallucination filter: ignore if transcript is just the username or empty
        if (!transcript || transcript.toLowerCase() === username.toLowerCase() || transcript.toLowerCase() === 'empty') {
          return null;
        }

        if (!response || response.toLowerCase() === 'empty') {
          return null;
        }

        return {
          transcript,
          response
        };
      } catch (error) {
        logger.warn({ model: modelName, err: error }, 'Fast voice model call failed, trying next...');
      }
    }

    return null;
  }
}

export const sttService = SttService.getInstance();
