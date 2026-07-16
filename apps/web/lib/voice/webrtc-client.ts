import type { RawRealtimeEvent } from './realtime-event-mapper';

const REALTIME_API_URL = 'https://api.openai.com/v1/realtime';

export interface VoiceWebRtcClientCallbacks {
  onRemoteTrack: (stream: MediaStream) => void;
  onDataChannelMessage: (raw: RawRealtimeEvent) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
}

/**
 * Direct browser-to-provider WebRTC connection (Founder Decision 1: no
 * backend audio proxy). The backend's `clientSecret` (from
 * `startVoiceSession`) is the only credential this class ever sees — it
 * never touches the permanent provider API key. Microphone access begins
 * only inside `connect()`, which callers must only invoke after explicit
 * member action (a "Start voice conversation" press) — never on mount,
 * never automatically.
 */
export class VoiceWebRtcClient {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private micStream: MediaStream | null = null;

  constructor(private readonly callbacks: VoiceWebRtcClientCallbacks) {}

  async connect(clientSecret: string, model: string): Promise<void> {
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const pc = new RTCPeerConnection();
    this.pc = pc;

    pc.onconnectionstatechange = () => {
      this.callbacks.onConnectionStateChange(pc.connectionState);
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        this.callbacks.onRemoteTrack(stream);
      }
    };

    for (const track of this.micStream.getAudioTracks()) {
      pc.addTrack(track, this.micStream);
    }

    const dataChannel = pc.createDataChannel('oai-events');
    this.dataChannel = dataChannel;
    dataChannel.onmessage = (event) => {
      try {
        this.callbacks.onDataChannelMessage(JSON.parse(event.data) as RawRealtimeEvent);
      } catch {
        // Malformed event from the provider — drop it rather than crash the session.
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const response = await fetch(`${REALTIME_API_URL}?model=${encodeURIComponent(model)}`, {
      method: 'POST',
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${clientSecret}`,
        'Content-Type': 'application/sdp',
      },
    });

    if (!response.ok) {
      throw new Error('Unable to establish the voice connection.');
    }

    const answerSdp = await response.text();
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
  }

  setMuted(muted: boolean): void {
    this.micStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  /**
   * The accessible, explicit alternative to voice barge-in — a member who
   * cannot reliably speak over the steward (or who simply prefers a
   * button) can still interrupt. Natural barge-in (speaking while the
   * steward is speaking) is handled by the provider itself via the
   * backend-mandated `interrupt_response: true` timing policy and needs
   * no client-sent event.
   */
  interrupt(): void {
    this.sendEvent({ type: 'response.cancel' });
  }

  sendEvent(event: Record<string, unknown>): void {
    if (this.dataChannel?.readyState === 'open') {
      this.dataChannel.send(JSON.stringify(event));
    }
  }

  disconnect(): void {
    this.dataChannel?.close();
    this.dataChannel = null;
    this.micStream?.getTracks().forEach((track) => track.stop());
    this.micStream = null;
    this.pc?.close();
    this.pc = null;
  }
}
