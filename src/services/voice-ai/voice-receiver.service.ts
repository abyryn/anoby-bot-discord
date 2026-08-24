import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  EndBehaviorType,
  VoiceConnection,
  AudioPlayer,
  StreamType,
  entersState
} from '@discordjs/voice';
import prism from 'prism-media';
import { logger } from '../../utils/logger.js';
import { pcmToWav, sttService } from './stt.service.js';
import { ttsService } from './tts.service.js';
import { generateResponse } from '../ai/gemini.service.js';
import { getHistory, addMessage } from '../ai/conversation.service.js';
import { client } from '../../bot/client.js';
import { TextChannel, User } from 'discord.js';
import { embeds } from '../../utils/embeds.js';

interface VoiceAiSession {
  guildId: string;
  channelId: string;
  textChannelId: string;
  connection: VoiceConnection;
  player: AudioPlayer;
  isProcessing: boolean;
  isSpeaking: boolean;
  idleTimer?: NodeJS.Timeout;
}

export class VoiceReceiverService {
  private static instance: VoiceReceiverService;
  private sessions = new Map<string, VoiceAiSession>();

  private constructor() {}

  public static getInstance(): VoiceReceiverService {
    if (!VoiceReceiverService.instance) {
      VoiceReceiverService.instance = new VoiceReceiverService();
    }
    return VoiceReceiverService.instance;
  }

  public getSession(guildId: string): VoiceAiSession | undefined {
    return this.sessions.get(guildId);
  }

  public isSessionActive(guildId: string): boolean {
    return this.sessions.has(guildId);
  }

  private resetIdleTimer(guildId: string) {
    const session = this.sessions.get(guildId);
    if (!session) return;

    if (session.idleTimer) {
      clearTimeout(session.idleTimer);
    }

    // Auto-leave after 5 minutes (300s) of silence/inactivity
    session.idleTimer = setTimeout(async () => {
      logger.info({ guildId }, 'Voice AI session leaving due to inactivity');
      try {
        const channel = await client.channels.fetch(session.textChannelId) as TextChannel;
        if (channel) {
          await channel.send({ embeds: [embeds.info('🎙️ Voice AI dinonaktifkan karena tidak ada percakapan selama 5 menit.')] });
        }
      } catch (_) {}
      this.leave(guildId);
    }, 300000);
  }

  /**
   * Join a voice channel and start listening to user mics
   */
  public async join(
    guildId: string, 
    channelId: string, 
    textChannelId: string, 
    adapterCreator: unknown
  ): Promise<VoiceAiSession> {
    // If existing session, leave first
    if (this.sessions.has(guildId)) {
      this.leave(guildId);
    }

    const connection = joinVoiceChannel({
      channelId,
      guildId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      adapterCreator: adapterCreator as any,
      selfDeaf: false, // Must be false so bot receives incoming user voice packets!
      selfMute: false,
    });

    // Wait until connection is fully ready and UDP socket encryption is established
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 20000);
      logger.info({ guildId, channelId }, 'Voice connection is READY and listening');
    } catch (connErr) {
      logger.warn({ guildId, connErr }, 'Voice connection took longer than 20s to ready');
    }

    const player = createAudioPlayer();
    connection.subscribe(player);

    const session: VoiceAiSession = {
      guildId,
      channelId,
      textChannelId,
      connection,
      player,
      isProcessing: false,
      isSpeaking: false,
    };

    this.sessions.set(guildId, session);
    this.resetIdleTimer(guildId);

    // Player event listeners
    player.on(AudioPlayerStatus.Playing, () => {
      session.isSpeaking = true;
    });

    player.on(AudioPlayerStatus.Idle, () => {
      session.isSpeaking = false;
      this.resetIdleTimer(guildId);
    });

    player.on('error', (error) => {
      logger.error({ err: error, guildId }, 'Voice AI AudioPlayer error');
      session.isSpeaking = false;
    });

    // Connection event listeners
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5000),
        ]);
      } catch (error) {
        this.leave(guildId);
      }
    });

    // Setup receiver for incoming audio packets
    const receiver = connection.receiver;

    receiver.speaking.on('start', async (userId) => {
      // Don't listen if bot is currently speaking or processing previous request
      if (session.isSpeaking || session.isProcessing) {
        return;
      }

      // Don't listen to bot itself
      if (userId === client.user?.id) {
        return;
      }

      this.resetIdleTimer(guildId);

      logger.info({ guildId, userId }, 'User started speaking in voice channel');

      // Subscribe to user Opus audio stream until 1000ms silence
      const opusStream = receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: 1000,
        },
      });

      // Decode Opus packets to 48kHz stereo 16-bit PCM
      const decoder = new prism.opus.Decoder({
        rate: 48000,
        channels: 2,
        frameSize: 960,
      });

      const pcmChunks: Buffer[] = [];

      opusStream.pipe(decoder);

      decoder.on('data', (chunk: Buffer) => {
        pcmChunks.push(chunk);
      });

      decoder.on('error', (err) => {
        logger.warn({ err, userId }, 'Opus decoding error');
      });

      decoder.on('end', async () => {
        if (session.isSpeaking || session.isProcessing) return;

        const totalPcm = Buffer.concat(pcmChunks);
        // Minimum 0.4s of audio to ignore micro background clicks (48000 samples * 2 channels * 2 bytes * 0.4s = 76800 bytes)
        if (totalPcm.length < 76800) {
          logger.info({ guildId, userId, bytes: totalPcm.length }, 'Audio too short, ignoring');
          return;
        }

        try {
          session.isProcessing = true;
          const wavBuffer = pcmToWav(totalPcm, 48000, 2, 16);

          logger.info({ guildId, userId, bytes: wavBuffer.length }, 'Sending user speech audio to Gemini STT...');
          const transcribedText = await sttService.transcribe(wavBuffer);

          if (!transcribedText || transcribedText.trim().length === 0) {
            logger.info({ guildId, userId }, 'Transcribed text is empty or silence');
            session.isProcessing = false;
            return;
          }

          logger.info({ guildId, userId, transcribedText }, 'User spoken text transcribed successfully');

          // Get user details for reference
          let userObj: User | null = null;
          try {
            userObj = await client.users.fetch(userId);
          } catch (_) {}

          const username = userObj?.username || 'User';

          // Get conversation memory
          const history = await getHistory(userId, textChannelId);

          // Get response from Gemini AI
          const aiResponse = await generateResponse(transcribedText, history);

          // Save to database conversation history
          await addMessage(userId, textChannelId, 'user', transcribedText);
          await addMessage(userId, textChannelId, 'ai', aiResponse);

          // Convert AI text to natural Indonesian Speech (TTS)
          const audioStream = await ttsService.textToStream(aiResponse);
          const resource = createAudioResource(audioStream, {
            inputType: StreamType.Arbitrary,
          });

          // Play response in Voice Channel
          player.play(resource);

          // Send transcript to text channel for readability
          try {
            const channel = await client.channels.fetch(textChannelId) as TextChannel;
            if (channel) {
              await channel.send({
                embeds: [
                  embeds.info(
                    `🗣️ **${username}:** "${transcribedText}"\n🤖 **Anoby AI:** "${aiResponse}"`
                  )
                ]
              });
            }
          } catch (_) {}

        } catch (processError) {
          logger.error({ err: processError, guildId, userId }, 'Error processing voice AI speech');
        } finally {
          session.isProcessing = false;
        }
      });
    });

    return session;
  }

  /**
   * Speak a text directly into the voice channel
   */
  public async speakText(guildId: string, text: string): Promise<void> {
    const session = this.sessions.get(guildId);
    if (!session) {
      throw new Error('Bot belum berada di Voice Channel untuk Voice AI. Gunakan `A!voiceai start` terlebih dahulu.');
    }

    this.resetIdleTimer(guildId);
    const audioStream = await ttsService.textToStream(text);
    const resource = createAudioResource(audioStream, {
      inputType: StreamType.Arbitrary,
    });

    session.player.play(resource);
  }

  /**
   * Leave voice channel and cleanup session
   */
  public leave(guildId: string): void {
    const session = this.sessions.get(guildId);
    if (!session) return;

    if (session.idleTimer) {
      clearTimeout(session.idleTimer);
    }

    try {
      session.player.stop();
      session.connection.destroy();
    } catch (err) {
      logger.error({ err, guildId }, 'Error destroying voice AI connection');
    }

    this.sessions.delete(guildId);
    logger.info({ guildId }, 'Voice AI session closed');
  }
}

export const voiceReceiverService = VoiceReceiverService.getInstance();
