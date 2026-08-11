import type { NormalizedVoiceEvent } from './realtime-event-mapper';
import type { GeminiLiveClientCallbacks, VoiceRealtimeClient } from './realtime-client';

const GEMINI_LIVE_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained';
const INPUT_SAMPLE_RATE = 16_000;
const OUTPUT_SAMPLE_RATE = 24_000;

type GeminiServerMessage = {
  setupComplete?: Record<string, never>;
  serverContent?: {
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    modelTurn?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
    turnComplete?: boolean;
    interrupted?: boolean;
  };
  toolCall?: {
    functionCalls?: Array<{ id?: string; name?: string; args?: Record<string, unknown> }>;
  };
};

/** Browser-to-Gemini Live client using a backend-brokered ephemeral token. */
export class GeminiLiveClient implements VoiceRealtimeClient {
  private socket: WebSocket | null = null;
  private micStream: MediaStream | null = null;
  private inputContext: AudioContext | null = null;
  private outputContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private outputCursor = 0;
  private scheduledSources = new Set<AudioBufferSourceNode>();
  private memberTranscript = '';
  private memberActive = false;
  private responseId: string | null = null;
  private responseTranscript = '';
  private pendingInterfaceContext: string | null = null;
  private readonly toolNames = new Map<string, string>();

  constructor(private readonly callbacks: GeminiLiveClientCallbacks) {}

  async connect(clientSecret: string, model: string): Promise<void> {
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(
        `${GEMINI_LIVE_URL}?access_token=${encodeURIComponent(clientSecret)}`,
      );
      this.socket = socket;
      socket.onopen = () => {
        socket.send(
          JSON.stringify({
            setup: { model: model.startsWith('models/') ? model : `models/${model}` },
          }),
        );
      };
      socket.onerror = () => {
        this.callbacks.onConnectionStateChange('failed');
        reject(new Error('Unable to establish the Gemini Live connection.'));
      };
      socket.onclose = () => this.callbacks.onConnectionStateChange('closed');
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(String(event.data)) as GeminiServerMessage;
          if (message.setupComplete) {
            void this.startMicrophone()
              .then(() => {
                this.callbacks.onConnectionStateChange('connected');
                resolve();
              })
              .catch(reject);
          }
          this.handleMessage(message);
        } catch {
          this.callbacks.onEvent({
            kind: 'provider-error',
            message: 'Gemini Live returned an unreadable event.',
          });
        }
      };
    });
  }

  setMuted(muted: boolean): void {
    this.micStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  interrupt(): void {
    this.stopPlayback();
    this.send({ clientContent: { turns: [], turnComplete: false } });
  }

  resolveToolCall(callId: string, output: Record<string, unknown>): void {
    this.send({
      toolResponse: {
        functionResponses: [{ id: callId, name: this.toolNames.get(callId), response: output }],
      },
    });
    this.toolNames.delete(callId);
  }

  syncInterfaceContext(summary: string): void {
    this.pendingInterfaceContext = summary;
    this.flushInterfaceContext();
  }

  private flushInterfaceContext(): void {
    // Gemini treats clientContent received during generation as an
    // interruption. Keep only the newest screen summary and apply it safely
    // between model turns instead of cutting off an answer in progress.
    if (this.responseId || !this.pendingInterfaceContext) return;
    const summary = this.pendingInterfaceContext;
    this.pendingInterfaceContext = null;
    this.send({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text: `[Current Aureus interface]\n${summary}` }] }],
        turnComplete: false,
      },
    });
  }

  disconnect(): void {
    if (this.socket?.readyState === WebSocket.OPEN)
      this.send({ realtimeInput: { audioStreamEnd: true } });
    this.processor?.disconnect();
    this.source?.disconnect();
    this.processor = null;
    this.source = null;
    void this.inputContext?.close();
    void this.outputContext?.close();
    this.inputContext = null;
    this.outputContext = null;
    this.stopPlayback();
    this.micStream?.getTracks().forEach((track) => track.stop());
    this.micStream = null;
    this.socket?.close();
    this.socket = null;
  }

  private async startMicrophone(): Promise<void> {
    if (!this.micStream) throw new Error('Microphone stream is unavailable.');
    const context = new AudioContext();
    this.inputContext = context;
    const source = context.createMediaStreamSource(this.micStream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    this.source = source;
    this.processor = processor;
    processor.onaudioprocess = (event) => {
      const pcm = downsampleToPcm16(
        event.inputBuffer.getChannelData(0),
        context.sampleRate,
        INPUT_SAMPLE_RATE,
      );
      this.send({
        realtimeInput: {
          audio: {
            data: bytesToBase64(new Uint8Array(pcm.buffer)),
            mimeType: 'audio/pcm;rate=16000',
          },
        },
      });
    };
    source.connect(processor);
    processor.connect(context.destination);
    await context.resume();
  }

  private handleMessage(message: GeminiServerMessage): void {
    const content = message.serverContent;
    const inputText = content?.inputTranscription?.text;
    if (inputText) {
      if (!this.memberActive) {
        this.memberActive = true;
        this.callbacks.onEvent({
          kind: 'member-speech-started',
          occurredAt: new Date().toISOString(),
        });
      }
      this.memberTranscript = mergeTranscript(this.memberTranscript, inputText);
    }

    const outputText = content?.outputTranscription?.text;
    if (outputText) {
      if (!this.responseId) {
        this.responseId = crypto.randomUUID();
        this.callbacks.onEvent({
          kind: 'steward-response-started',
          responseId: this.responseId,
          occurredAt: new Date().toISOString(),
        });
      }
      const prior = this.responseTranscript;
      this.responseTranscript = mergeTranscript(prior, outputText);
      const delta = this.responseTranscript.startsWith(prior)
        ? this.responseTranscript.slice(prior.length)
        : outputText;
      if (delta)
        this.callbacks.onEvent({
          kind: 'steward-transcript-delta',
          responseId: this.responseId,
          delta,
        });
    }

    for (const part of content?.modelTurn?.parts ?? []) {
      if (part.inlineData?.data) this.playPcm(part.inlineData.data);
    }

    for (const call of message.toolCall?.functionCalls ?? []) {
      if (!call.id || !call.name) continue;
      this.toolNames.set(call.id, call.name);
      this.callbacks.onEvent({
        kind: 'function-call-requested',
        callId: call.id,
        name: call.name,
        arguments: JSON.stringify(call.args ?? {}),
        occurredAt: new Date().toISOString(),
      });
    }

    if (content?.turnComplete || content?.interrupted)
      this.finalizeTurn(Boolean(content.interrupted));
  }

  private finalizeTurn(interrupted: boolean): void {
    const occurredAt = new Date().toISOString();
    if (this.memberActive && this.memberTranscript) {
      const itemId = crypto.randomUUID();
      this.callbacks.onEvent({ kind: 'member-speech-stopped', occurredAt });
      this.callbacks.onEvent({
        kind: 'member-turn-finalized',
        itemId,
        transcript: this.memberTranscript,
        occurredAt,
      });
    }
    if (this.responseId) {
      const event: NormalizedVoiceEvent = interrupted
        ? {
            kind: 'steward-response-interrupted',
            responseId: this.responseId,
            itemId: crypto.randomUUID(),
            transcript: this.responseTranscript,
            occurredAt,
          }
        : {
            kind: 'steward-response-completed',
            responseId: this.responseId,
            itemId: crypto.randomUUID(),
            transcript: this.responseTranscript,
            occurredAt,
          };
      this.callbacks.onEvent(event);
    }
    this.memberActive = false;
    this.memberTranscript = '';
    this.responseId = null;
    this.responseTranscript = '';
    if (interrupted) this.stopPlayback();
    this.flushInterfaceContext();
  }

  private playPcm(data: string): void {
    const bytes = base64ToBytes(data);
    const samples = new Int16Array(
      bytes.buffer,
      bytes.byteOffset,
      Math.floor(bytes.byteLength / 2),
    );
    const context = this.outputContext ?? new AudioContext({ sampleRate: OUTPUT_SAMPLE_RATE });
    this.outputContext = context;
    const buffer = context.createBuffer(1, samples.length, OUTPUT_SAMPLE_RATE);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i += 1) channel[i] = samples[i] / 32768;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    const startAt = Math.max(context.currentTime, this.outputCursor);
    this.outputCursor = startAt + buffer.duration;
    this.scheduledSources.add(source);
    source.onended = () => this.scheduledSources.delete(source);
    source.start(startAt);
  }

  private stopPlayback(): void {
    for (const source of this.scheduledSources) {
      try {
        source.stop();
      } catch {
        /* already stopped */
      }
    }
    this.scheduledSources.clear();
    this.outputCursor = this.outputContext?.currentTime ?? 0;
  }

  private send(message: Record<string, unknown>): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }
}

export function mergeTranscript(current: string, incoming: string): string {
  if (!current) return incoming;
  if (incoming.startsWith(current)) return incoming;
  return `${current}${incoming}`;
}

export function downsampleToPcm16(
  input: Float32Array,
  inputRate: number,
  outputRate: number,
): Int16Array {
  const ratio = inputRate / outputRate;
  const result = new Int16Array(Math.floor(input.length / ratio));
  for (let i = 0; i < result.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[Math.floor(i * ratio)]));
    result[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return result;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
