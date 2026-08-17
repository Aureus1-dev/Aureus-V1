import type { RawRealtimeEvent } from './realtime-event-mapper';

const REALTIME_API_URL = 'https://api.openai.com/v1/realtime/calls';
const ICE_GATHERING_TIMEOUT_MS = 5_000;
const SIGNALING_TIMEOUT_MS = 20_000;

export interface VoiceWebRtcClientCallbacks {
  onRemoteTrack: (stream: MediaStream) => void;
  onDataChannelMessage: (raw: RawRealtimeEvent) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
}

async function waitForIceGatheringComplete(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === 'complete') return;

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      pc.onicegatheringstatechange = null;
      resolve();
    };
    const timeout = setTimeout(finish, ICE_GATHERING_TIMEOUT_MS);

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') finish();
    };
  });
}

export class VoiceWebRtcClient {
  private pc: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private micStream: MediaStream | null = null;

  constructor(private readonly callbacks: VoiceWebRtcClientCallbacks) {}

  async connect(clientSecret: string, _model: string): Promise<void> {
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const pc = new RTCPeerConnection();
    this.pc = pc;

    pc.onconnectionstatechange = () => {
      this.callbacks.onConnectionStateChange(pc.connectionState);
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) this.callbacks.onRemoteTrack(stream);
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
        // Malformed provider events must never crash a live session.
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIceGatheringComplete(pc);

    const localSdp = pc.localDescription?.sdp ?? offer.sdp;
    if (!localSdp) throw new Error('Unable to create the voice connection offer.');

    const formData = new FormData();
    formData.append('sdp', new Blob([localSdp], { type: 'application/sdp' }), 'offer.sdp');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SIGNALING_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(REALTIME_API_URL, {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${clientSecret}` },
        signal: controller.signal,
      });
    } catch {
      throw new Error('The voice provider did not finish connecting in time. Please try again.');
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`Unable to establish the voice connection (provider status ${response.status}).`);
    }

    const answerSdp = await response.text();
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
  }

  setMuted(muted: boolean): void {
    this.micStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

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
