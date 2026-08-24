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
import { pipeline } from 'stream';
import { logger } from '../../utils/logger.js';
import { calculatePcmRms, downsample48kStereoTo16kMono, pcmToWav, sttService } from './stt.service.js';
import { ttsService } from './tts.service.js';
import { addMessage } from '../ai/conversation.service.js';
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
      selfDeaf: false,
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

      // Subscribe to user Opus audio stream with ultra-fast 450ms silence detection
      const opusStream = receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: 450,
        },
      });

      // Decode Opus packets to 48kHz stereo 16-bit PCM
      const decoder = new prism.opus.Decoder({
        rate: 48000,
        channels: 2,
        frameSize: 960,
      });

      const pcmChunks: Buffer[] = [];

      decoder.on('data', (chunk: Buffer) => {
        pcmChunks.push(chunk);
      });

      decoder.on('error', (err) => {
        logger.debug({ err, userId }, 'Opus frame decoding notice (ignored)');
      });

      opusStream.on('error', (err) => {
        logger.debug({ err, userId }, 'Opus stream notice (ignored)');
      });

      const processAudio = async () => {
        if (session.isSpeaking || session.isProcessing) return;

        const totalPcm48k = Buffer.concat(pcmChunks);
        // Minimum 0.4s of audio (48000 * 2 * 2 * 0.4 = 76800 bytes)
        if (totalPcm48k.length < 76800) {
          return;
        }

        // Downsample from 48kHz Stereo to 16kHz Mono
        const pcm16kMono = downsample48kStereoTo16kMono(totalPcm48k);

        // VAD Audio Energy Check: Filter out silence, breathing, keyboard clicks, or mic background noise
        const rms = calculatePcmRms(pcm16kMono);
        if (rms < 250) {
          logger.debug({ guildId, userId, rms }, 'Audio below voice energy threshold (silence/ambient noise), skipping');
          return;
        }

        try {
          session.isProcessing = true;
          const wavBuffer = pcmToWav(pcm16kMono, 16000, 1, 16);

          let userObj: User | null = null;
          try {
            userObj = await client.users.fetch(userId);
          } catch (_) {}

          const username = userObj?.username || 'User';

          // Single-Pass Direct Gemini Audio Processing
          logger.info({ guildId, userId, bytes: wavBuffer.length, rms }, 'Voice speech detected, processing with AI...');
          const result = await sttService.processAudioDirect(wavBuffer, username);

          if (!result || !result.response || !result.transcript) {
            session.isProcessing = false;
            return;
          }

          const { transcript, response } = result;
          logger.info({ guildId, userId, transcript, response }, 'Voice AI response ready');

          // Save to database conversation history
          await addMessage(userId, textChannelId, 'user', transcript);
          await addMessage(userId, textChannelId, 'ai', response);

          // Convert AI text to natural Indonesian Speech (TTS)
          const audioStream = await ttsService.textToStream(response);
          const resource = createAudioResource(audioStream, {
            inputType: StreamType.Arbitrary,
          });

          // Play response immediately in Voice Channel
          player.play(resource);

          // Send transcript to text channel for readability
          try {
            const channel = await client.channels.fetch(textChannelId) as TextChannel;
            if (channel) {
              await channel.send({
                embeds: [
                  embeds.info(
                    `🗣️ **${username}:** "${transcript}"\n🤖 **Anoby AI:** "${response}"`
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
      };

      // Use stream pipeline for robust backpressure and immediate stream finalization
      pipeline(opusStream, decoder, (err) => {
        if (err && err.message !== 'Premature close') {
          logger.debug({ err, userId }, 'Opus stream pipeline closed');
        }
        processAudio().catch(() => {});
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
