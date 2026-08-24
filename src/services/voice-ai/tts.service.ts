import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { Readable, PassThrough } from 'stream';
import { logger } from '../../utils/logger.js';

export class TtsService {
  private static instance: TtsService;
  private tts: MsEdgeTTS | null = null;
  private currentVoice = 'id-ID-GadisNeural'; // Default: Gadis (Female, friendly Indonesian voice)

  private constructor() {}

  public static getInstance(): TtsService {
    if (!TtsService.instance) {
      TtsService.instance = new TtsService();
    }
    return TtsService.instance;
  }

  private async getTtsClient(voice = this.currentVoice): Promise<MsEdgeTTS> {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    return tts;
  }

  /**
   * Synthesize text to a readable audio stream (MP3)
   */
  public async textToStream(text: string, voice = this.currentVoice): Promise<Readable> {
    try {
      // Clean text from markdown / discord formatting
      const cleanText = text
        .replace(/<@!?[0-9]+>/g, '') // remove user mentions
        .replace(/<#[0-9]+>/g, '')   // remove channel mentions
        .replace(/https?:\/\/\S+/g, '') // remove urls
        .replace(/[*_~`>#]/g, '')   // remove markdown chars
        .trim();

      if (!cleanText) {
        throw new Error('Teks kosong setelah dibersihkan.');
      }

      // Limit length to 600 chars per speech to keep voice responses concise and natural
      const textToSpeak = cleanText.length > 600 ? cleanText.slice(0, 597) + '...' : cleanText;

      const tts = await this.getTtsClient(voice);
      const stream = tts.toStream(textToSpeak);
      return stream.audioStream;
    } catch (error) {
      logger.error({ err: error, text }, 'Error synthesizing TTS audio');
      throw error;
    }
  }

  public setVoice(voice: 'gadis' | 'ardi'): void {
    if (voice === 'ardi') {
      this.currentVoice = 'id-ID-ArdiNeural';
    } else {
      this.currentVoice = 'id-ID-GadisNeural';
    }
  }

  public getVoice(): string {
    return this.currentVoice;
  }
}

export const ttsService = TtsService.getInstance();
